import { Router } from 'express';
import { CallController } from '../controllers/callController';
import { authenticateToken } from '../middleware/authMiddleware';
import { validateBody, validateQuery, validateParams } from '../middleware/validationMiddleware';
import { 
  startCallSchema, 
  endCallSchema, 
  callHistorySchema,
  callIdParamSchema,
  uuidParamSchema
} from '../validation/schemas';
import { asyncHandler } from '../middleware/errorHandler';
import Joi from 'joi';

const router = Router();
const callController = new CallController();

/**
 * @route   POST /api/calls
 * @desc    Start a call
 * @access  Private
 */
router.post(
  '/',
  authenticateToken,
  validateBody(startCallSchema),
  asyncHandler(callController.startCall.bind(callController))
);

/**
 * @route   PUT /api/calls/:callId/answer
 * @desc    Answer a call
 * @access  Private
 */
router.put(
  '/:callId/answer',
  authenticateToken,
  validateParams(callIdParamSchema),
  asyncHandler(callController.answerCall.bind(callController))
);

/**
 * @route   PUT /api/calls/:callId/reject
 * @desc    Reject a call
 * @access  Private
 */
router.put(
  '/:callId/reject',
  authenticateToken,
  validateParams(callIdParamSchema),
  asyncHandler(callController.rejectCall.bind(callController))
);

/**
 * @route   PUT /api/calls/:callId/end
 * @desc    End a call
 * @access  Private
 */
router.put(
  '/:callId/end',
  authenticateToken,
  validateParams(callIdParamSchema),
  validateBody(endCallSchema.keys({
    callId: Joi.forbidden() // Remove callId from body since it's in params
  }).unknown()),
  asyncHandler(callController.endCall.bind(callController))
);

/**
 * @route   PUT /api/calls/:callId/status
 * @desc    Update call status
 * @access  Private
 */
router.put(
  '/:callId/status',
  authenticateToken,
  validateParams(callIdParamSchema),
  validateBody(Joi.object({
    status: Joi.string().valid('ringing', 'answered', 'ended', 'missed', 'rejected').required()
  })),
  asyncHandler(callController.updateCallStatus.bind(callController))
);

/**
 * @route   GET /api/calls/history
 * @desc    Get call history
 * @access  Private
 */
router.get(
  '/history',
  authenticateToken,
  validateQuery(callHistorySchema),
  asyncHandler(callController.getCallHistory.bind(callController))
);

/**
 * @route   GET /api/calls/active
 * @desc    Get active call
 * @access  Private
 */
router.get(
  '/active',
  authenticateToken,
  asyncHandler(callController.getActiveCall.bind(callController))
);

/**
 * @route   GET /api/calls/stats
 * @desc    Get call statistics
 * @access  Private
 */
router.get(
  '/stats',
  authenticateToken,
  asyncHandler(callController.getCallStatistics.bind(callController))
);

/**
 * @route   GET /api/calls/:callId
 * @desc    Get specific call details
 * @access  Private
 */
router.get(
  '/:callId',
  authenticateToken,
  validateParams(callIdParamSchema),
  asyncHandler(callController.getCall.bind(callController))
);

/**
 * @route   DELETE /api/calls/:callId
 * @desc    Delete a call record
 * @access  Private
 */
router.delete(
  '/:callId',
  authenticateToken,
  validateParams(callIdParamSchema),
  asyncHandler(callController.deleteCall.bind(callController))
);

// WebRTC Signaling Routes
/**
 * @route   POST /api/calls/:callId/offer
 * @desc    Create WebRTC offer
 * @access  Private
 */
router.post(
  '/:callId/offer',
  authenticateToken,
  validateParams(callIdParamSchema),
  validateBody(Joi.object({
    offer: Joi.object().required(),
    targetUserId: Joi.string().uuid().required()
  })),
  asyncHandler(callController.createOffer.bind(callController))
);

/**
 * @route   POST /api/calls/:callId/answer
 * @desc    Create WebRTC answer
 * @access  Private
 */
router.post(
  '/:callId/answer',
  authenticateToken,
  validateParams(callIdParamSchema),
  validateBody(Joi.object({
    answer: Joi.object().required(),
    targetUserId: Joi.string().uuid().required()
  })),
  asyncHandler(callController.createAnswer.bind(callController))
);

/**
 * @route   POST /api/calls/:callId/ice-candidate
 * @desc    Add ICE candidate
 * @access  Private
 */
router.post(
  '/:callId/ice-candidate',
  authenticateToken,
  validateParams(callIdParamSchema),
  validateBody(Joi.object({
    candidate: Joi.object().required(),
    targetUserId: Joi.string().uuid().required()
  })),
  asyncHandler(callController.addIceCandidate.bind(callController))
);

export default router;