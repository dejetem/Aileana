import { Router } from 'express';
import { WalletController } from '../controllers/walletController';
import { authenticateToken } from '../middleware/authMiddleware';
import { validateBody, validateQuery, validateParams } from '../middleware/validationMiddleware';
import { createWalletSchema, userIdParamSchema } from '../validation/schemas';
import { asyncHandler } from '../middleware/errorHandler';
import Joi from 'joi';

const router = Router();
const walletController = new WalletController();

/**
 * @route   POST /api/wallet
 * @desc    Create wallet for current user
 * @access  Private
 */
router.post(
  '/',
  authenticateToken,
  validateBody(createWalletSchema),
  asyncHandler(walletController.createWallet.bind(walletController))
);

/**
 * @route   GET /api/wallet
 * @desc    Get current user's wallet
 * @access  Private
 */
router.get(
  '/',
  authenticateToken,
  asyncHandler(walletController.getWallet.bind(walletController))
);

/**
 * @route   GET /api/wallet/balance
 * @desc    Get wallet balance (fresh from OnePipe)
 * @access  Private
 */
router.get(
  '/balance',
  authenticateToken,
  asyncHandler(walletController.getWalletBalance.bind(walletController))
);

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get wallet transactions
 * @access  Private
 */
router.get(
  '/transactions',
  authenticateToken,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50)
  })),
  asyncHandler(walletController.getTransactions.bind(walletController))
);

/**
 * @route   POST /api/wallet/transfer
 * @desc    Transfer funds to another user
 * @access  Private
 */
router.post(
  '/transfer',
  authenticateToken,
  validateBody(Joi.object({
    toUserId: Joi.string().uuid().required(),
    amount: Joi.number().positive().precision(2).required(),
    description: Joi.string().max(255).optional()
  })),
  asyncHandler(walletController.transferFunds.bind(walletController))
);

/**
 * @route   PUT /api/wallet/suspend
 * @desc    Suspend wallet (admin action or self-suspend)
 * @access  Private
 */
router.put(
  '/suspend',
  authenticateToken,
  validateBody(Joi.object({
    reason: Joi.string().max(500).optional()
  })),
  asyncHandler(walletController.suspendWallet.bind(walletController))
);

/**
 * @route   PUT /api/wallet/activate
 * @desc    Activate suspended wallet
 * @access  Private
 */
router.put(
  '/activate',
  authenticateToken,
  asyncHandler(walletController.activateWallet.bind(walletController))
);

/**
 * @route   GET /api/wallet/stats
 * @desc    Get wallet statistics
 * @access  Private
 */
router.get(
  '/stats',
  authenticateToken,
  asyncHandler(walletController.getWalletStats.bind(walletController))
);

// Admin routes (would typically require admin authentication middleware)
/**
 * @route   GET /api/wallet/user/:userId
 * @desc    Get specific user's wallet (admin only)
 * @access  Private (Admin)
 */
router.get(
  '/user/:userId',
  authenticateToken,
  // TODO: Add admin authentication middleware
  validateParams(userIdParamSchema),
  asyncHandler(walletController.getUserWallet.bind(walletController))
);

/**
 * @route   PUT /api/wallet/user/:userId/suspend
 * @desc    Suspend specific user's wallet (admin only)
 * @access  Private (Admin)
 */
router.put(
  '/user/:userId/suspend',
  authenticateToken,
  // TODO: Add admin authentication middleware
  validateParams(userIdParamSchema),
  validateBody(Joi.object({
    reason: Joi.string().max(500).required()
  })),
  asyncHandler(walletController.suspendUserWallet.bind(walletController))
);

/**
 * @route   PUT /api/wallet/user/:userId/activate
 * @desc    Activate specific user's wallet (admin only)
 * @access  Private (Admin)
 */
router.put(
  '/user/:userId/activate',
  authenticateToken,
  // TODO: Add admin authentication middleware
  validateParams(userIdParamSchema),
  asyncHandler(walletController.activateUserWallet.bind(walletController))
);

export default router;