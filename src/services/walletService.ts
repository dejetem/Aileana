import { db } from '../database/database';
import { AppError } from '../middleware/errorHandler';
import { Wallet } from '../types';
import { OnePipeService } from './onePipeService';
import { logger } from '../utils/logger';

export class WalletService {
  private onePipeService: OnePipeService;

  constructor() {
    this.onePipeService = new OnePipeService();
  }

  async createWallet(userId: string, currency: string = 'NGN'): Promise<Wallet> {
    // Check if user already has a wallet
    const existingWallet = await db('wallets')
      .where('user_id', userId)
      .first();

    if (existingWallet) {
      throw new AppError('Wallet already exists for this user', 409);
    }

    // Create wallet with OnePipe
    const onePipeResponse = await this.onePipeService.createWallet(userId, currency);

    if (!onePipeResponse.status || !onePipeResponse.data) {
      throw new AppError('Failed to create wallet with OnePipe', 500);
    }

    // Store wallet in database
    const [wallet] = await db('wallets')
      .insert({
        user_id: userId,
        wallet_id: onePipeResponse.data.wallet_id,
        account_number: onePipeResponse.data.account_number,
        bank_code: onePipeResponse.data.bank_code,
        balance: onePipeResponse.data.balance,
        currency: onePipeResponse.data.currency,
        status: 'active',
        metadata: {
          created_via: 'api',
          onepipe_data: onePipeResponse.data,
        },
      })
      .returning('*');

    logger.info(`Wallet created for user: ${userId}, wallet ID: ${wallet.wallet_id}`);

    return wallet;
  }

  async getWallet(userId: string): Promise<Wallet | null> {
    const wallet = await db('wallets')
      .where('user_id', userId)
      .andWhere('status', '!=', 'closed')
      .first();

    return wallet || null;
  }

  async getWalletBalance(userId: string): Promise<{ balance: number; currency: string; lastUpdated: Date }> {
    const wallet = await this.getWallet(userId);
    
    if (!wallet) {
      throw new AppError('Wallet not found', 404);
    }

    // Get fresh balance from OnePipe
    const balanceResponse = await this.onePipeService.getWalletBalance(wallet.wallet_id);

    if (!balanceResponse.status || !balanceResponse.data) {
      throw new AppError('Failed to retrieve wallet balance', 500);
    }

    // Update balance in database
    await db('wallets')
      .where('id', wallet.id)
      .update({
        balance: balanceResponse.data.balance,
        updated_at: new Date(),
      });

    return {
      balance: balanceResponse.data.balance,
      currency: balanceResponse.data.currency,
      lastUpdated: new Date(),
    };
  }

  async updateWalletBalance(walletId: string, newBalance: number): Promise<void> {
    // Ensure newBalance is a valid number
    const balance = Number(newBalance);
    
    if (isNaN(balance)) {
      throw new Error(`Invalid balance value: ${newBalance}`);
    }
    await db('wallets')
      .where('wallet_id', walletId)
      .update({
        balance: newBalance,
        updated_at: new Date(),
      });

    logger.info(`Wallet balance updated: ${walletId}, new balance: ${newBalance}`);
  }

  async suspendWallet(userId: string, reason?: string): Promise<void> {
    const result = await db('wallets')
      .where('user_id', userId)
      .update({
        status: 'suspended',
        metadata: db.raw('jsonb_set(metadata, \'{suspension_reason}\', ?, true)', [JSON.stringify(reason || 'Administrative action')]),
        updated_at: new Date(),
      });

    if (result === 0) {
      throw new AppError('Wallet not found', 404);
    }

    logger.info(`Wallet suspended for user: ${userId}, reason: ${reason}`);
  }

  async activateWallet(userId: string): Promise<void> {
    const result = await db('wallets')
      .where('user_id', userId)
      .update({
        status: 'active',
        metadata: db.raw('metadata - \'suspension_reason\''),
        updated_at: new Date(),
      });

    if (result === 0) {
      throw new AppError('Wallet not found', 404);
    }

    logger.info(`Wallet activated for user: ${userId}`);
  }

  async getWalletTransactions(userId: string, limit: number = 50): Promise<any[]> {
    const wallet = await this.getWallet(userId);
    
    if (!wallet) {
      throw new AppError('Wallet not found', 404);
    }

    const transactionsResponse = await this.onePipeService.getTransactionHistory(wallet.wallet_id, limit);

    if (!transactionsResponse.status) {
      throw new AppError('Failed to retrieve transaction history', 500);
    }

    return transactionsResponse.data || [];
  }

  async transferFunds(fromUserId: string, toUserId: string, amount: number, description?: string): Promise<any> {
    // Get both wallets
    const [fromWallet, toWallet] = await Promise.all([
      this.getWallet(fromUserId),
      this.getWallet(toUserId),
    ]);

    if (!fromWallet) {
      throw new AppError('Sender wallet not found', 404);
    }

    if (!toWallet) {
      throw new AppError('Recipient wallet not found', 404);
    }

    if (fromWallet.status !== 'active' || toWallet.status !== 'active') {
      throw new AppError('One or both wallets are not active', 400);
    }

    // Check sufficient balance
    const balanceResponse = await this.onePipeService.getWalletBalance(fromWallet.wallet_id);
    
    if (!balanceResponse.status || !balanceResponse.data || balanceResponse.data.balance < amount) {
      throw new AppError('Insufficient funds', 400);
    }

    // Perform transfer
    const transferResponse = await this.onePipeService.transferFunds(
      fromWallet.wallet_id,
      toWallet.wallet_id,
      amount,
      description
    );

    if (!transferResponse.status) {
      throw new AppError('Transfer failed', 500);
    }

    // Update balances in database (this would typically be done via webhooks in production)
    await Promise.all([
      this.updateWalletBalance(fromWallet.wallet_id, Number(balanceResponse.data.balance) - Number(amount)),
      this.updateWalletBalance(toWallet.wallet_id, Number(toWallet.balance || 0) + Number(amount)),
    ]);

    logger.info(`Transfer completed: ${fromUserId} -> ${toUserId}, amount: ${amount}`);

    return transferResponse.data;
  }

  async getWalletStats(userId: string): Promise<{
    totalBalance: number;
    currency: string;
    totalTransactions: number;
    walletAge: number; // in days
  }> {
    const wallet = await this.getWallet(userId);
    
    if (!wallet) {
      throw new AppError('Wallet not found', 404);
    }

    const transactions = await this.getWalletTransactions(userId, 1000); // Get all transactions for counting
    const walletAge = Math.floor((Date.now() - new Date(wallet.created_at).getTime()) / (1000 * 60 * 60 * 24));

    return {
      totalBalance: wallet.balance || 0,
      currency: wallet.currency,
      totalTransactions: transactions.length,
      walletAge,
    };
  }
}