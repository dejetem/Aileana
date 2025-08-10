import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { WalletService } from '../services/walletService';
import { CreateUserData, ApiResponse, AuthTokens } from '../types';
import { logger } from '../utils/logger';

export class AuthController {
  private authService: AuthService;
  private walletService: WalletService;

  constructor() {
    this.authService = new AuthService();
    this.walletService = new WalletService();
  }

  async signup(req: Request, res: Response): Promise<void> {
    const userData: CreateUserData = req.body;

    const result = await this.authService.signup(userData);

    // Create wallet for new user
    try {
      await this.walletService.createWallet(result.user.id);
      logger.info(`Wallet auto-created for new user: ${result.user.id}`);
    } catch (error) {
      logger.warn(`Failed to auto-create wallet for user ${result.user.id}:`, error);
      // Don't fail signup if wallet creation fails
    }

    const response: ApiResponse<{ user: typeof result.user; tokens: AuthTokens }> = {
      success: true,
      message: 'User registered successfully',
      data: result,
    };

    res.status(201).json(response);
  }

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip;

    const result = await this.authService.login(email, password, deviceInfo, ipAddress);

    const response: ApiResponse<{ user: typeof result.user; tokens: AuthTokens }> = {
      success: true,
      message: 'Login successful',
      data: result,
    };

    res.status(200).json(response);
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    const tokens = await this.authService.refreshToken(refreshToken);

    const response: ApiResponse<AuthTokens> = {
      success: true,
      message: 'Token refreshed successfully',
      data: tokens,
    };

    res.status(200).json(response);
  }

  async logout(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    await this.authService.logout(refreshToken);

    const response: ApiResponse = {
      success: true,
      message: 'Logout successful',
    };

    res.status(200).json(response);
  }
}