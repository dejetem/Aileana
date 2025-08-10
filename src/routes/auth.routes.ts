import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validateBody } from '../middleware/validationMiddleware';
import { signupSchema, loginSchema, refreshTokenSchema } from '../validation/schemas';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const authController = new AuthController();

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/signup',
  validateBody(signupSchema),
  asyncHandler(authController.signup.bind(authController))
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return tokens
 * @access  Public
 */
router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(authController.login.bind(authController))
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh',
  validateBody(refreshTokenSchema),
  asyncHandler(authController.refreshToken.bind(authController))
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and revoke refresh token
 * @access  Public
 */
router.post(
  '/logout',
  validateBody(refreshTokenSchema),
  asyncHandler(authController.logout.bind(authController))
);

export default router;