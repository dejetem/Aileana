// src/controllers/walletController.ts
import { Request, Response } from 'express';
import { WalletService } from '../services/walletService';
import { ApiResponse, Wallet } from '../types';
import { AppError } from '../middleware/errorHandler';

export class WalletController {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  async createWallet(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { currency = 'NGN' } = req.body;

    const wallet = await this.walletService.createWallet(userId, currency);

    const response: ApiResponse = {
      success: true,
      message: 'Wallet transactions retrieved successfully',
      data: wallet,
    };

    res.status(200).json(response);
  }

  async transferFunds(req: Request, res: Response): Promise<void> {
    const fromUserId = req.user!.userId;
    const { toUserId, amount, description } = req.body;

    const transfer = await this.walletService.transferFunds(
      fromUserId,
      toUserId,
      amount,
      description
    );

    const response: ApiResponse = {
      success: true,
      message: 'Funds transferred successfully',
      data: transfer,
    };

    res.status(200).json(response);
  }

  async suspendWallet(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { reason } = req.body;

    await this.walletService.suspendWallet(userId, reason);

    const response: ApiResponse = {
      success: true,
      message: 'Wallet suspended successfully',
    };

    res.status(200).json(response);
  }

  async activateWallet(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    await this.walletService.activateWallet(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Wallet activated successfully',
    };

    res.status(200).json(response);
  }

  async getWalletStats(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    const stats = await this.walletService.getWalletStats(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Wallet statistics retrieved successfully',
      data: stats,
    };

    res.status(200).json(response);
  }

  // Admin methods
  async getUserWallet(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;

    const wallet = await this.walletService.getWallet(userId);

    if (!wallet) {
      throw new AppError('User wallet not found', 404);
    }

    const response: ApiResponse<Wallet> = {
      success: true,
      message: 'User wallet retrieved successfully',
      data: wallet,
    };

    res.status(200).json(response);
  }

  async suspendUserWallet(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    const { reason } = req.body;

    await this.walletService.suspendWallet(userId, reason);

    const response: ApiResponse = {
      success: true,
      message: 'User wallet suspended successfully',
    };

    res.status(200).json(response);
  }

  async activateUserWallet(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;

    await this.walletService.activateWallet(userId);

    const response: ApiResponse = {
      success: true,
      message: 'User wallet activated successfully',
    };

    res.status(200).json(response);
  }

  async getWallet(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    const wallet = await this.walletService.getWallet(userId);

    if (!wallet) {
      throw new AppError('Wallet not found', 404);
    }

    const response: ApiResponse<Wallet> = {
      success: true,
      message: 'Wallet retrieved successfully',
      data: wallet,
    };

    res.status(200).json(response);
  }

  async getWalletBalance(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    const balanceInfo = await this.walletService.getWalletBalance(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Wallet balance retrieved successfully',
      data: balanceInfo,
    };

    res.status(200).json(response);
  }

  async getTransactions(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { limit = 50 } = req.query as any;

    const transactions = await this.walletService.getWalletTransactions(
      userId,
      Number(limit)
    );

    const response: ApiResponse = {
      success: true,
      message: 'Transactions retrieved successfully',
      data: transactions,
    };

    res.status(200).json(response);
   }
}