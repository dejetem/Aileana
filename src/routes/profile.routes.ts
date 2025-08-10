import { Router } from 'express';
import { ProfileController } from '../controllers/profileController';
import { authenticateToken } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validationMiddleware';
import { updateProfileSchema } from '../validation/schemas';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const profileController = new ProfileController();

/**
 * @route   GET /api/profile
 * @desc    Get current user's profile
 * @access  Private
 */
router.get(
  '/',
  authenticateToken,
  asyncHandler(profileController.getProfile.bind(profileController))
);

/**
 * @route   PUT /api/profile
 * @desc    Update current user's profile
 * @access  Private
 */
router.put(
  '/',
  authenticateToken,
  validateBody(updateProfileSchema),
  asyncHandler(profileController.updateProfile.bind(profileController))
);

/**
 * @route   GET /api/profile/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get(
  '/stats',
  authenticateToken,
  asyncHandler(profileController.getUserStats.bind(profileController))
);

export default router;