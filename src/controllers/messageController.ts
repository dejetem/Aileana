import { Request, Response } from 'express';
import { MessageService } from '../services/messageService';
import { ApiResponse, PaginatedResponse, Message } from '../types';
import { AppError } from '../middleware/errorHandler';

export class MessageController {
  private messageService: MessageService;

  constructor() {
    this.messageService = new MessageService();
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    const senderId = req.user!.userId;
    const { recipientId, content, messageType = 'text', fileUrl } = req.body;

    const message = await this.messageService.sendMessage(
      senderId,
      recipientId,
      content,
      messageType,
      fileUrl
    );

    const response: ApiResponse<Message> = {
      success: true,
      message: 'Message sent successfully',
      data: message,
    };

    res.status(201).json(response);
  }

  async getMessageHistory(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { userId: otherUserId } = req.params;
    const { page = 1, limit = 20 } = req.query as any;

    const messageHistory = await this.messageService.getMessageHistory(
      userId,
      otherUserId,
      Number(page),
      Number(limit)
    );

    res.status(200).json(messageHistory);
  }

  async markMessageAsRead(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id: messageId } = req.params;

    await this.messageService.markMessageAsRead(messageId, userId);

    const response: ApiResponse = {
      success: true,
      message: 'Message marked as read',
    };

    res.status(200).json(response);
  }

  async markMessagesAsRead(req: Request, res: Response): Promise<void> {
    const recipientId = req.user!.userId;
    const { userId: senderId } = req.params;

    const count = await this.messageService.markMessagesAsRead(senderId, recipientId);

    const response: ApiResponse = {
      success: true,
      message: `${count} messages marked as read`,
      data: { count },
    };

    res.status(200).json(response);
  }

  async deleteMessage(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id: messageId } = req.params;

    await this.messageService.deleteMessage(messageId, userId);

    const response: ApiResponse = {
      success: true,
      message: 'Message deleted successfully',
    };

    res.status(200).json(response);
  }

  async getUnreadCount(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    const count = await this.messageService.getUnreadMessagesCount(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Unread messages count retrieved successfully',
      data: { count },
    };

    res.status(200).json(response);
  }

  async getConversations(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { page = 1, limit = 20 } = req.query as any;

    const conversations = await this.messageService.getConversations(
      userId,
      Number(page),
      Number(limit)
    );

    res.status(200).json(conversations);
  }

  async searchMessages(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { q: query, page = 1, limit = 20 } = req.query as any;

    const messages = await this.messageService.searchMessages(
      userId,
      query,
      Number(page),
      Number(limit)
    );

    res.status(200).json(messages);
  }

  async getMessage(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id: messageId } = req.params;

    const message = await this.messageService.getMessageById(messageId, userId);

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    const response: ApiResponse<Message> = {
      success: true,
      message: 'Message retrieved successfully',
      data: message,
    };

    res.status(200).json(response);
  }

  async getMessageStatistics(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    const stats = await this.messageService.getMessageStatistics(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Message statistics retrieved successfully',
      data: stats,
    };

    res.status(200).json(response);
  }

  async deleteConversation(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { userId: otherUserId } = req.params;

    const count = await this.messageService.deleteConversation(userId, otherUserId);

    const response: ApiResponse = {
      success: true,
      message: `Conversation deleted successfully. ${count} messages affected.`,
      data: { deletedCount: count },
    };

    res.status(200).json(response);
  }
}