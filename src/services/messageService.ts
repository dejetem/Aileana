import { db } from '../database/database';
import { AppError } from '../middleware/errorHandler';
import { Message, PaginatedResponse } from '../types';
import { logger } from '../utils/logger';

export class MessageService {
  async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    messageType: string = 'text',
    fileUrl?: string
  ): Promise<Message> {
    // Validate recipient exists
    const recipient = await db('users')
      .where('id', recipientId)
      .andWhere('is_active', true)
      .first();

    if (!recipient) {
      throw new AppError('Recipient not found', 404);
    }

    // Create message
    const [message] = await db('messages')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        content,
        message_type: messageType,
        file_url: fileUrl,
        metadata: {
          sent_via: 'api',
          client_timestamp: new Date().toISOString(),
        },
      })
      .returning('*');

    logger.info(`Message sent: ${senderId} -> ${recipientId}`);

    return message;
  }

  async getMessageHistory(
    userId: string,
    otherUserId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Message>> {
    // Validate other user exists
    const otherUser = await db('users')
      .where('id', otherUserId)
      .andWhere('is_active', true)
      .first();

    if (!otherUser) {
      throw new AppError('User not found', 404);
    }

    const offset = (page - 1) * limit;

    // Get messages between users
    const messages = await db('messages')
      .where((builder) => {
        builder
          .where({ sender_id: userId, recipient_id: otherUserId })
          .orWhere({ sender_id: otherUserId, recipient_id: userId });
      })
      .andWhere('is_deleted', false)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db('messages')
      .where((builder) => {
        builder
          .where({ sender_id: userId, recipient_id: otherUserId })
          .orWhere({ sender_id: otherUserId, recipient_id: userId });
      })
      .andWhere('is_deleted', false)
      .count('id as count');

    const total = parseInt(count as string);
    const pages = Math.ceil(total / limit);

    return {
      success: true,
      message: 'Messages retrieved successfully',
      data: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    };
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    const result = await db('messages')
      .where('id', messageId)
      .andWhere('recipient_id', userId)
      .andWhere('is_read', false)
      .update({
        is_read: true,
        read_at: new Date(),
        updated_at: new Date(),
      });

    if (result > 0) {
      logger.info(`Message marked as read: ${messageId} by ${userId}`);
    }
  }

  async markMessagesAsRead(senderId: string, recipientId: string): Promise<number> {
    const result = await db('messages')
      .where('sender_id', senderId)
      .andWhere('recipient_id', recipientId)
      .andWhere('is_read', false)
      .update({
        is_read: true,
        read_at: new Date(),
        updated_at: new Date(),
      });

    if (result > 0) {
      logger.info(`${result} messages marked as read between ${senderId} and ${recipientId}`);
    }

    return result;
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await db('messages')
      .where('id', messageId)
      .andWhere((builder) => {
        builder
          .where('sender_id', userId)
          .orWhere('recipient_id', userId);
      })
      .first();

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    await db('messages')
      .where('id', messageId)
      .update({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
      });

    logger.info(`Message deleted: ${messageId} by ${userId}`);
  }

  async getUnreadMessagesCount(userId: string): Promise<number> {
    const [{ count }] = await db('messages')
      .where('recipient_id', userId)
      .andWhere('is_read', false)
      .andWhere('is_deleted', false)
      .count('id as count');

    return parseInt(count as string);
  }

  async getConversations(userId: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<any>> {
    const offset = (page - 1) * limit;

    // Using window function approach - more readable and performant
    const conversations = await db.raw(`
    WITH ranked_messages AS (
      SELECT 
        id,
        sender_id,
        recipient_id,
        content,
        message_type,
        is_read,
        created_at,
        CASE 
          WHEN sender_id = ? THEN recipient_id 
          ELSE sender_id 
        END as other_user_id,
        ROW_NUMBER() OVER (
          PARTITION BY (
            CASE 
              WHEN sender_id = ? THEN recipient_id 
              ELSE sender_id 
            END
          ) 
          ORDER BY created_at DESC
        ) as rn
      FROM messages 
      WHERE (sender_id = ? OR recipient_id = ?) 
      AND is_deleted = false
    ),
    latest_messages AS (
      SELECT * FROM ranked_messages WHERE rn = 1
    )
    SELECT 
      lm.id,
      lm.sender_id,
      lm.recipient_id,
      lm.content,
      lm.message_type,
      lm.is_read,
      lm.created_at,
      lm.other_user_id,
      u.name as other_user_name,
      u.avatar as other_user_avatar,
      COALESCE(unread.unread_count, 0) as unread_count
    FROM latest_messages lm
    JOIN users u ON u.id = lm.other_user_id
    LEFT JOIN (
      SELECT 
        sender_id,
        COUNT(*) as unread_count
      FROM messages 
      WHERE recipient_id = ? 
      AND is_read = false 
      AND is_deleted = false
      GROUP BY sender_id
    ) unread ON unread.sender_id = lm.other_user_id
    WHERE u.is_active = true
    ORDER BY lm.created_at DESC
    LIMIT ? OFFSET ?
  `, [userId, userId, userId, userId, userId, limit, offset]);

    // Simplified total count query
    const totalResult = await db.raw(`
    SELECT COUNT(DISTINCT other_user_id) as count
    FROM (
      SELECT 
        CASE 
          WHEN sender_id = ? THEN recipient_id 
          ELSE sender_id 
        END as other_user_id
      FROM messages 
      WHERE (sender_id = ? OR recipient_id = ?) 
      AND is_deleted = false
    ) conversations
    WHERE EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = conversations.other_user_id 
      AND u.is_active = true
    )
  `, [userId, userId, userId]);

    const total = parseInt(totalResult.rows[0].count);
    const pages = Math.ceil(total / limit);

    return {
      success: true,
      message: 'Conversations retrieved successfully',
      data: conversations.rows,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    };
  }

  async searchMessages(
    userId: string,
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Message>> {
    const offset = (page - 1) * limit;

    const messages = await db('messages')
      .select([
        'messages.*',
        'sender.name as sender_name',
        'recipient.name as recipient_name',
      ])
      .join('users as sender', 'messages.sender_id', 'sender.id')
      .join('users as recipient', 'messages.recipient_id', 'recipient.id')
      .where((builder) => {
        builder
          .where('messages.sender_id', userId)
          .orWhere('messages.recipient_id', userId);
      })
      .andWhere('messages.is_deleted', false)
      .andWhere('messages.content', 'ilike', `%${query}%`)
      .orderBy('messages.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db('messages')
      .where((builder) => {
        builder
          .where('sender_id', userId)
          .orWhere('recipient_id', userId);
      })
      .andWhere('is_deleted', false)
      .andWhere('content', 'ilike', `%${query}%`)
      .count('id as count');

    const total = parseInt(count as string);
    const pages = Math.ceil(total / limit);

    return {
      success: true,
      message: 'Messages found successfully',
      data: messages,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    };
  }

  async getMessageById(messageId: string, userId: string): Promise<Message | null> {
    const message = await db('messages')
      .where('id', messageId)
      .andWhere((builder) => {
        builder
          .where('sender_id', userId)
          .orWhere('recipient_id', userId);
      })
      .andWhere('is_deleted', false)
      .first();

    return message || null;
  }

  async getMessageStatistics(userId: string): Promise<{
    totalSent: number;
    totalReceived: number;
    totalUnread: number;
    activeConversations: number;
  }> {
    // Single query to get all message-related stats
    const messageStatsResult = await db.raw(`
    SELECT 
      COUNT(CASE WHEN sender_id = ? AND is_deleted = false THEN 1 END) as total_sent,
      COUNT(CASE WHEN recipient_id = ? AND is_deleted = false THEN 1 END) as total_received,
      COUNT(CASE WHEN recipient_id = ? AND is_read = false AND is_deleted = false THEN 1 END) as total_unread
    FROM messages
    WHERE (sender_id = ? OR recipient_id = ?)
  `, [userId, userId, userId, userId, userId]);

    // Separate query for active conversations (with JOIN)
    const conversationsResult = await db.raw(`
    SELECT COUNT(DISTINCT other_user_id) as count
    FROM (
      SELECT 
        CASE 
          WHEN m.sender_id = ? THEN m.recipient_id 
          ELSE m.sender_id 
        END as other_user_id
      FROM messages m
      WHERE (m.sender_id = ? OR m.recipient_id = ?) 
      AND m.is_deleted = false
      AND m.created_at >= NOW() - INTERVAL '30 days'
    ) conversations
    WHERE EXISTS (
      SELECT 1 
      FROM users u 
      WHERE u.id = conversations.other_user_id 
      AND u.is_active = true
    )
  `, [userId, userId, userId]);

    const messageStats = messageStatsResult.rows[0];
    const conversationStats = conversationsResult.rows[0];

    return {
      totalSent: parseInt(messageStats.total_sent) || 0,
      totalReceived: parseInt(messageStats.total_received) || 0,
      totalUnread: parseInt(messageStats.total_unread) || 0,
      activeConversations: parseInt(conversationStats.count) || 0,
    };
  }

  async deleteConversation(userId: string, otherUserId: string): Promise<number> {
    const result = await db('messages')
      .where((builder) => {
        builder
          .where({ sender_id: userId, recipient_id: otherUserId })
          .orWhere({ sender_id: otherUserId, recipient_id: userId });
      })
      .update({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
      });

    logger.info(`Conversation deleted: ${userId} <-> ${otherUserId}, ${result} messages affected`);

    return result;
  }
}