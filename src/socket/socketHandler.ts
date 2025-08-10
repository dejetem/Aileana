import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { MessageService } from '../services/messageService';
import { CallService } from '../services/callService';
import { JWTPayload } from '../types';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface SocketUser {
  userId: string;
  socketId: string;
  isOnline: boolean;
  lastSeen: Date;
}

export class SocketHandler {
  private io: Server;
  private messageService: MessageService;
  private callService: CallService;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private userSocketMap: Map<string, string> = new Map(); // userId -> socketId

  constructor(io: Server) {
    this.io = io;
    this.messageService = new MessageService();
    this.callService = new CallService();
  }

  initialize(): void {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
        socket.userId = decoded.userId;
        
        logger.info(`Socket authenticated: ${socket.id} for user ${decoded.userId}`);
        next();
      } catch (error) {
        logger.error('Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    
    // Add user to connected users
    this.connectedUsers.set(socket.id, {
      userId,
      socketId: socket.id,
      isOnline: true,
      lastSeen: new Date(),
    });

    this.userSocketMap.set(userId, socket.id);

    logger.info(`User connected: ${userId} (${socket.id})`);

    // Emit online status
    this.broadcastUserStatus(userId, true);

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Handle message events
    this.handleMessageEvents(socket);

    // Handle call events
    this.handleCallEvents(socket);

    // Handle typing events
    this.handleTypingEvents(socket);

    // Handle disconnect
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  private handleMessageEvents(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;

    // Send message
    socket.on('send_message', async (data, callback) => {
      try {
        const { recipientId, content, messageType = 'text', fileUrl } = data;

        if (!recipientId || !content) {
          return callback?.({ success: false, error: 'Missing required fields' });
        }

        const message = await this.messageService.sendMessage(
          userId,
          recipientId,
          content,
          messageType,
          fileUrl
        );

        // Send to recipient if online
        const recipientSocketId = this.userSocketMap.get(recipientId);
        if (recipientSocketId) {
          this.io.to(recipientSocketId).emit('new_message', {
            ...message,
            sender_name: this.connectedUsers.get(socket.id)?.userId, // In a real app, fetch user name
          });
        }

        // Confirm to sender
        callback?.({ success: true, data: message });

        logger.info(`Real-time message sent: ${userId} -> ${recipientId}`);
      } catch (error: any) {
        logger.error('Send message error:', error);
        callback?.({ success: false, error: error.message });
      }
    });

    // Mark message as read
    socket.on('mark_read', async (data, callback) => {
      try {
        const { messageId, senderId } = data;

        if (messageId) {
          await this.messageService.markMessageAsRead(messageId, userId);
        } else if (senderId) {
          await this.messageService.markMessagesAsRead(senderId, userId);
        }

        // Notify sender if online
        const senderSocketId = this.userSocketMap.get(senderId);
        if (senderSocketId) {
          this.io.to(senderSocketId).emit('message_read', {
            readBy: userId,
            messageId,
            timestamp: new Date(),
          });
        }

        callback?.({ success: true });
      } catch (error: any) {
        logger.error('Mark read error:', error);
        callback?.({ success: false, error: error.message });
      }
    });

    // Join conversation room
    socket.on('join_conversation', (data) => {
      const { otherUserId } = data;
      const roomName = this.getConversationRoom(userId, otherUserId);
      socket.join(roomName);
      logger.info(`User ${userId} joined conversation room: ${roomName}`);
    });

    // Leave conversation room
    socket.on('leave_conversation', (data) => {
      const { otherUserId } = data;
      const roomName = this.getConversationRoom(userId, otherUserId);
      socket.leave(roomName);
      logger.info(`User ${userId} left conversation room: ${roomName}`);
    });
  }

  private handleCallEvents(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;

    // Start call
    socket.on('start_call', async (data, callback) => {
      try {
        const { calleeId, callType } = data;

        const call = await this.callService.startCall(userId, calleeId, callType);

        // Notify callee if online
        const calleeSocketId = this.userSocketMap.get(calleeId);
        if (calleeSocketId) {
          this.io.to(calleeSocketId).emit('incoming_call', {
            callId: call.id,
            callerId: userId,
            callerName: 'Unknown', // In a real app, fetch caller name
            callType,
          });

          // Update call status to ringing
          await this.callService.updateCallStatus(call.id, 'ringing');
        }

        callback?.({ success: true, data: call });

        logger.info(`Real-time call initiated: ${userId} -> ${calleeId}`);
      } catch (error: any) {
        logger.error('Start call error:', error);
        callback?.({ success: false, error: error.message });
      }
    });

    // Answer call
    socket.on('answer_call', async (data, callback) => {
      try {
        const { callId } = data;

        const call = await this.callService.updateCallStatus(callId, 'answered', userId);

        // Notify caller
        const callerSocketId = this.userSocketMap.get(call.caller_id);
        if (callerSocketId) {
          this.io.to(callerSocketId).emit('call_answered', {
            callId,
            answeredBy: userId,
          });
        }

        callback?.({ success: true, data: call });

        logger.info(`Call answered: ${callId} by ${userId}`);
      } catch (error: any) {
        logger.error('Answer call error:', error);
        callback?.({ success: false, error: error.message });
      }
    });

    // Reject call
    socket.on('reject_call', async (data, callback) => {
      try {
        const { callId } = data;

        const call = await this.callService.updateCallStatus(callId, 'rejected', userId);

        // Notify caller
        const callerSocketId = this.userSocketMap.get(call.caller_id);
        if (callerSocketId) {
          this.io.to(callerSocketId).emit('call_rejected', {
            callId,
            rejectedBy: userId,
          });
        }

        callback?.({ success: true, data: call });

        logger.info(`Call rejected: ${callId} by ${userId}`);
      } catch (error: any) {
        logger.error('Reject call error:', error);
        callback?.({ success: false, error: error.message });
      }
    });

    // End call
    socket.on('end_call', async (data, callback) => {
      try {
        const { callId, endReason = 'completed' } = data;

        const call = await this.callService.endCall(callId, userId, endReason);

        // Notify other participant
        const otherUserId = call.caller_id === userId ? call.callee_id : call.caller_id;
        const otherSocketId = this.userSocketMap.get(otherUserId);
        if (otherSocketId) {
          this.io.to(otherSocketId).emit('call_ended', {
            callId,
            endedBy: userId,
            endReason,
            duration: call.duration_seconds,
          });
        }

        callback?.({ success: true, data: call });

        logger.info(`Call ended: ${callId} by ${userId}`);
      } catch (error: any) {
        logger.error('End call error:', error);
        callback?.({ success: false, error: error.message });
      }
    });

    // WebRTC signaling events
    socket.on('webrtc_offer', async (data) => {
      const { callId, offer, targetUserId } = data;
      
      await this.callService.createOffer(callId, offer);
      
      const targetSocketId = this.userSocketMap.get(targetUserId);
      if (targetSocketId) {
        this.io.to(targetSocketId).emit('webrtc_offer', { callId, offer, fromUserId: userId });
      }
    });

    socket.on('webrtc_answer', async (data) => {
      const { callId, answer, targetUserId } = data;
      
      await this.callService.createAnswer(callId, answer);
      
      const targetSocketId = this.userSocketMap.get(targetUserId);
      if (targetSocketId) {
        this.io.to(targetSocketId).emit('webrtc_answer', { callId, answer, fromUserId: userId });
      }
    });

    socket.on('webrtc_ice_candidate', async (data) => {
      const { callId, candidate, targetUserId } = data;
      
      await this.callService.addIceCandidate(callId, candidate);
      
      const targetSocketId = this.userSocketMap.get(targetUserId);
      if (targetSocketId) {
        this.io.to(targetSocketId).emit('webrtc_ice_candidate', { callId, candidate, fromUserId: userId });
      }
    });
  }

  private handleTypingEvents(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;

    socket.on('typing_start', (data) => {
      const { recipientId } = data;
      
      const recipientSocketId = this.userSocketMap.get(recipientId);
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit('user_typing', {
          userId,
          typing: true,
        });
      }
    });

    socket.on('typing_stop', (data) => {
      const { recipientId } = data;
      
      const recipientSocketId = this.userSocketMap.get(recipientId);
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit('user_typing', {
          userId,
          typing: false,
        });
      }
    });
  }

  private handleDisconnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    
    // Remove from connected users
    this.connectedUsers.delete(socket.id);
    this.userSocketMap.delete(userId);

    // Broadcast offline status
    this.broadcastUserStatus(userId, false);

    logger.info(`User disconnected: ${userId} (${socket.id})`);
  }

  private broadcastUserStatus(userId: string, isOnline: boolean): void {
    this.io.emit('user_status', {
      userId,
      isOnline,
      timestamp: new Date(),
    });
  }

  private getConversationRoom(userId1: string, userId2: string): string {
    // Create a consistent room name regardless of order
    const sortedIds = [userId1, userId2].sort();
    return `conversation:${sortedIds[0]}:${sortedIds[1]}`;
  }

  // Public methods for external use
  public sendNotificationToUser(userId: string, notification: any): void {
    const socketId = this.userSocketMap.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('notification', notification);
    }
  }

  public getUserOnlineStatus(userId: string): boolean {
    return this.userSocketMap.has(userId);
  }

  public getConnectedUsers(): SocketUser[] {
    return Array.from(this.connectedUsers.values());
  }

  public broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }
}

export function initializeSocket(io: Server): SocketHandler {
  const socketHandler = new SocketHandler(io);
  socketHandler.initialize();
  
  logger.info('Socket.IO initialized successfully');
  
  return socketHandler;
}