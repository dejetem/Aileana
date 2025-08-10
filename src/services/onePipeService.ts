import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { config } from '../config/config';
import { AppError } from '../middleware/errorHandler';
import { OnePipeWalletResponse } from '../types';
import { logger } from '../utils/logger';

export class OnePipeService {
  private client: AxiosInstance;
  private isMocked: boolean;

  constructor() {
    this.isMocked = config.onePipe.mock;
    
    this.client = axios.create({
      baseURL: config.onePipe.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.onePipe.apiKey}`,
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.info(`OnePipe API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('OnePipe API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.info(`OnePipe API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('OnePipe API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async createWallet(userId: string, currency: string = 'NGN'): Promise<OnePipeWalletResponse> {
    if (this.isMocked) {
      return this.mockCreateWallet(userId, currency);
    }

    try {
      const requestData = {
        user_id: userId,
        currency,
        account_type: 'savings',
      };

      const signature = this.generateSignature(requestData);
      
      const response = await this.client.post('/wallets/create', requestData, {
        headers: {
          'X-Signature': signature,
        },
      });

      return {
        status: true,
        message: 'Wallet created successfully',
        data: response.data.data,
      };
    } catch (error: any) {
      logger.error('OnePipe wallet creation failed:', error);
      
      if (error.response?.status === 409) {
        throw new AppError('Wallet already exists for this user', 409);
      }
      
      throw new AppError('Failed to create wallet', 500);
    }
  }

  async getWalletBalance(walletId: string): Promise<OnePipeWalletResponse> {
    if (this.isMocked) {
      return this.mockGetWalletBalance(walletId);
    }

    try {
      const response = await this.client.get(`/wallets/${walletId}/balance`);

      return {
        status: true,
        message: 'Balance retrieved successfully',
        data: response.data.data,
      };
    } catch (error: any) {
      logger.error('OnePipe balance retrieval failed:', error);
      
      if (error.response?.status === 404) {
        throw new AppError('Wallet not found', 404);
      }
      
      throw new AppError('Failed to retrieve wallet balance', 500);
    }
  }

  async transferFunds(fromWalletId: string, toWalletId: string, amount: number, description?: string): Promise<OnePipeWalletResponse> {
    if (this.isMocked) {
      return this.mockTransferFunds(fromWalletId, toWalletId, amount);
    }

    try {
      const requestData = {
        from_wallet: fromWalletId,
        to_wallet: toWalletId,
        amount,
        description: description || 'Peer-to-peer transfer',
        reference: this.generateReference(),
      };

      const signature = this.generateSignature(requestData);

      const response = await this.client.post('/wallets/transfer', requestData, {
        headers: {
          'X-Signature': signature,
        },
      });

      return {
        status: true,
        message: 'Transfer completed successfully',
        data: response.data.data,
      };
    } catch (error: any) {
      logger.error('OnePipe transfer failed:', error);
      
      if (error.response?.status === 400) {
        throw new AppError('Insufficient funds or invalid transfer details', 400);
      }
      
      throw new AppError('Transfer failed', 500);
    }
  }

  async getTransactionHistory(walletId: string, limit: number = 50): Promise<OnePipeWalletResponse> {
    if (this.isMocked) {
      return this.mockGetTransactionHistory(walletId, limit);
    }

    try {
      const response = await this.client.get(`/wallets/${walletId}/transactions`, {
        params: { limit },
      });

      return {
        status: true,
        message: 'Transaction history retrieved successfully',
        data: response.data.data,
      };
    } catch (error: any) {
      logger.error('OnePipe transaction history retrieval failed:', error);
      throw new AppError('Failed to retrieve transaction history', 500);
    }
  }

  private generateSignature(data: any): string {
    const payload = JSON.stringify(data);
    return crypto
      .createHmac('sha256', config.onePipe.secret)
      .update(payload)
      .digest('hex');
  }

  private generateReference(): string {
    return `TX_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  // Mock methods for development/testing
  private mockCreateWallet(userId: string, currency: string): OnePipeWalletResponse {
    const walletId = `WALLET_${userId.substring(0, 8)}_${Date.now()}`;
    const accountNumber = this.generateMockAccountNumber();
    
    return {
      status: true,
      message: 'Wallet created successfully (Mock)',
      data: {
        wallet_id: walletId,
        account_number: accountNumber,
        bank_code: '999999',
        balance: 0,
        currency,
      },
    };
  }

  private mockGetWalletBalance(walletId: string): OnePipeWalletResponse {
    const mockBalance = Math.floor(Math.random() * 100000) + 1000; // Random balance between 1000-101000

    return {
      status: true,
      message: 'Balance retrieved successfully (Mock)',
      data: {
        wallet_id: walletId,
        account_number: this.generateMockAccountNumber(),
        bank_code: '999999',
        balance: mockBalance,
        currency: 'NGN',
      },
    };
  }

  private mockTransferFunds(fromWalletId: string, toWalletId: string, amount: number): OnePipeWalletResponse {
    return {
      status: true,
      message: 'Transfer completed successfully (Mock)',
    //   data: {
    //     reference: this.generateReference(),
    //     from_wallet: fromWalletId,
    //     to_wallet: toWalletId,
    //     amount,
    //     status: 'completed',
    //     transaction_date: new Date().toISOString(),
    //   },
    };
  }

  private mockGetTransactionHistory(walletId: string, limit: number): OnePipeWalletResponse {
    const transactions = Array.from({ length: Math.min(limit, 10) }, (_, index) => ({
      id: `TXN_${Date.now()}_${index}`,
      wallet_id: walletId,
      type: Math.random() > 0.5 ? 'credit' : 'debit',
      amount: Math.floor(Math.random() * 10000) + 100,
      description: `Mock transaction ${index + 1}`,
      created_at: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
      account_number: Math.floor(Math.random() * 10000) + 100,
      bank_code: '999999',
      balance: 0,
      currency: 'NGN',
    }));

    return {
      status: true,
      message: 'Transaction history retrieved successfully (Mock)',
    //   data: transactions,
    };
  }

  private generateMockAccountNumber(): string {
    return Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
  }
}