import { Router } from 'express';
import Joi from 'joi';
import { MessageController } from '../controllers/messageController';
import { authenticateToken } from '../middleware/authMiddleware';
import { validateBody, validateQuery, validateParams } from '../middleware/validationMiddleware';
import { 
  sendMessageSchema, 
  messageHistorySchema, 
  uuidParamSchema,
  userIdParamSchema 
} from '../validation/schemas';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const messageController = new MessageController();

/**
 * @route   POST /api/messages/send
 * @desc    Send a message
 * @access  Private
 */
router.post(
  '/send',
  authenticateToken,
  validateBody(sendMessageSchema),
  asyncHandler(messageController.sendMessage.bind(messageController))
);

/**
 * @route   GET /api/messages/conversations
 * @desc    Get user's conversations
 * @access  Private
 */
router.get(
  '/conversations',
  authenticateToken,
  validateQuery(messageHistorySchema),
  asyncHandler(messageController.getConversations.bind(messageController))
);

/**
 * @route   GET /api/messages/history/:userId
 * @desc    Get message history with specific user
 * @access  Private
 */
router.get(
  '/history/:userId',
  authenticateToken,
  validateParams(userIdParamSchema),
  validateQuery(messageHistorySchema),
  asyncHandler(messageController.getMessageHistory.bind(messageController))
);

/**
 * @route   PUT /api/messages/:id/read
 * @desc    Mark message as read
 * @access  Private
 */
router.put(
  '/:id/read',
  authenticateToken,
  validateParams(uuidParamSchema),
  asyncHandler(messageController.markMessageAsRead.bind(messageController))
);

/**
 * @route   PUT /api/messages/read/:userId
 * @desc    Mark all messages from user as read
 * @access  Private
 */
router.put(
  '/read/:userId',
  authenticateToken,
  validateParams(userIdParamSchema),
  asyncHandler(messageController.markMessagesAsRead.bind(messageController))
);

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete a message
 * @access  Private
 */
router.delete(
  '/:id',
  authenticateToken,
  validateParams(uuidParamSchema),
  asyncHandler(messageController.deleteMessage.bind(messageController))
);

/**
 * @route   DELETE /api/messages/conversation/:userId
 * @desc    Delete entire conversation with user
 * @access  Private
 */
router.delete(
  '/conversation/:userId',
  authenticateToken,
  validateParams(userIdParamSchema),
  asyncHandler(messageController.deleteConversation.bind(messageController))
);

/**
 * @route   GET /api/messages/unread/count
 * @desc    Get unread messages count
 * @access  Private
 */
router.get(
  '/unread/count',
  authenticateToken,
  asyncHandler(messageController.getUnreadCount.bind(messageController))
);

/**
 * @route   GET /api/messages/search
 * @desc    Search messages
 * @access  Private
 */
router.get(
  '/search',
  authenticateToken,
  validateQuery(messageHistorySchema.keys({
    q: Joi.string().min(1).max(100).required()
  })),
  asyncHandler(messageController.searchMessages.bind(messageController))
);

/**
 * @route   GET /api/messages/stats
 * @desc    Get message statistics
 * @access  Private
 */
router.get(
  '/stats',
  authenticateToken,
  asyncHandler(messageController.getMessageStatistics.bind(messageController))
);

/**
 * @route   GET /api/messages/:id
 * @desc    Get specific message
 * @access  Private
 */
router.get(
  '/:id',
  authenticateToken,
  validateParams(uuidParamSchema),
  asyncHandler(messageController.getMessage.bind(messageController))
);

export default router;