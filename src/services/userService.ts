import { db } from '../database/database';
import { AppError } from '../middleware/errorHandler';
import { User, UpdateUserData } from '../types';
import { logger } from '../utils/logger';

export class UserService {
  async getUserById(userId: string): Promise<Omit<User, 'password_hash'> | null> {
    const user = await db('users')
      .select('id', 'name', 'email', 'phone', 'avatar', 'email_verified', 'phone_verified', 'is_active', 'last_login_at', 'created_at', 'updated_at')
      .where('id', userId)
      .andWhere('is_active', true)
      .first();

    return user || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await db('users')
      .where('email', email)
      .andWhere('is_active', true)
      .first();

    return user || null;
  }

  async updateUser(userId: string, updateData: UpdateUserData): Promise<Omit<User, 'password_hash'>> {
    const { name, email, phone, avatar } = updateData;

    // Check if email or phone already exists for other users
    if (email || phone) {
      const conflictQuery = db('users')
        .where('id', '!=', userId)
        .andWhere('is_active', true);

      if (email) {
        conflictQuery.orWhere('email', email);
      }
      if (phone) {
        conflictQuery.orWhere('phone', phone);
      }

      const existingUser = await conflictQuery.first();
      if (existingUser) {
        if (existingUser.email === email) {
          throw new AppError('Email already in use', 409);
        }
        if (existingUser.phone === phone) {
          throw new AppError('Phone number already in use', 409);
        }
      }
    }

    // Update user
    const [updatedUser] = await db('users')
      .where('id', userId)
      .andWhere('is_active', true)
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning(['id', 'name', 'email', 'phone', 'avatar', 'email_verified', 'phone_verified', 'is_active', 'last_login_at', 'created_at', 'updated_at']);

    if (!updatedUser) {
      throw new AppError('User not found', 404);
    }

    logger.info(`User updated: ${userId}`);

    return updatedUser;
  }

  async deactivateUser(userId: string): Promise<void> {
    const result = await db('users')
      .where('id', userId)
      .update({
        is_active: false,
        updated_at: new Date(),
      });

    if (result === 0) {
      throw new AppError('User not found', 404);
    }

    logger.info(`User deactivated: ${userId}`);
  }

  async searchUsers(query: string, currentUserId: string, limit: number = 10): Promise<Omit<User, 'password_hash'>[]> {
    const users = await db('users')
      .select('id', 'name', 'email', 'phone', 'avatar', 'email_verified', 'phone_verified', 'is_active', 'last_login_at', 'created_at', 'updated_at')
      .where('is_active', true)
      .andWhere('id', '!=', currentUserId)
      .andWhere((builder) => {
        builder
          .whereILike('name', `%${query}%`)
          .orWhereILike('email', `%${query}%`)
          .orWhereILike('phone', `%${query}%`);
      })
      .orderBy('name')
      .limit(limit);

    return users;
  }

  async checkUserExists(userId: string): Promise<boolean> {
    const user = await db('users')
      .where('id', userId)
      .andWhere('is_active', true)
      .first();

    return !!user;
  }

  async getUserStats(userId: string): Promise<{
    totalMessages: number;
    totalCalls: number;
    lastActivity: Date | null;
  }> {
    const [messageStats, callStats, user] = await Promise.all([
      db('messages')
        .where('sender_id', userId)
        .orWhere('recipient_id', userId)
        .count('id as total')
        .first(),
      db('calls')
        .where('caller_id', userId)
        .orWhere('callee_id', userId)
        .count('id as total')
        .first(),
      db('users')
        .select('last_login_at')
        .where('id', userId)
        .first(),
    ]);

    return {
      totalMessages: parseInt(messageStats?.total as string) || 0,
      totalCalls: parseInt(callStats?.total as string) || 0,
      lastActivity: user?.last_login_at || null,
    };
  }
}