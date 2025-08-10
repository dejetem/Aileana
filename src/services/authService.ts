import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../database/database';
import { config } from '../config/config';
import { AppError } from '../middleware/errorHandler';
import { CreateUserData, User, AuthTokens, JWTPayload } from '../types';
import { logger } from '../utils/logger';

export class AuthService {
  async signup(userData: CreateUserData): Promise<{ user: Omit<User, 'password_hash'>; tokens: AuthTokens }> {
    const { name, email, phone, password } = userData;

    // Check if user already exists
    const existingUser = await db('users')
      .where('email', email)
      .orWhere('phone', phone)
      .first();

    if (existingUser) {
      if (existingUser.email === email) {
        throw new AppError('Email already registered', 409);
      }
      if (existingUser.phone === phone) {
        throw new AppError('Phone number already registered', 409);
      }
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const [newUser] = await db('users')
      .insert({
        name,
        email,
        phone,
        password_hash: passwordHash,
      })
      .returning('*');

    logger.info(`New user created: ${newUser.id}`);

    // Generate tokens
    const tokens = await this.generateTokens(newUser);

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = newUser;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  async login(email: string, password: string, deviceInfo?: string, ipAddress?: string): Promise<{ user: Omit<User, 'password_hash'>; tokens: AuthTokens }> {
    // Find user by email
    const user = await db('users')
      .where('email', email)
      .andWhere('is_active', true)
      .first();

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    await db('users')
      .where('id', user.id)
      .update({ last_login_at: new Date() });

    // Generate tokens
    const tokens = await this.generateTokens(user, deviceInfo, ipAddress);

    logger.info(`User logged in: ${user.id}`);

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const refreshTokenHash = this.hashToken(refreshToken);

    // Find and validate refresh token
    const tokenRecord = await db('refresh_tokens')
      .where('token_hash', refreshTokenHash)
      .andWhere('is_revoked', false)
      .andWhere('expires_at', '>', new Date())
      .first();

    if (!tokenRecord) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    // Get user
    const user = await db('users')
      .where('id', tokenRecord.user_id)
      .andWhere('is_active', true)
      .first();

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Revoke old refresh token
    await db('refresh_tokens')
      .where('id', tokenRecord.id)
      .update({ is_revoked: true });

    // Generate new tokens
    const tokens = await this.generateTokens(user, tokenRecord.device_info, tokenRecord.ip_address);

    logger.info(`Token refreshed for user: ${user.id}`);

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    const refreshTokenHash = this.hashToken(refreshToken);

    // Revoke refresh token
    await db('refresh_tokens')
      .where('token_hash', refreshTokenHash)
      .update({ is_revoked: true });

    logger.info('User logged out');
  }

  async revokeAllTokens(userId: string): Promise<void> {
    await db('refresh_tokens')
      .where('user_id', userId)
      .update({ is_revoked: true });

    logger.info(`All tokens revoked for user: ${userId}`);
  }

  private async generateTokens(user: User, deviceInfo?: string, ipAddress?: string): Promise<AuthTokens> {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
    };

    // Generate access token
    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    // Generate refresh token
    const refreshTokenString = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = this.hashToken(refreshTokenString);

    // Store refresh token
    await db('refresh_tokens').insert({
      user_id: user.id,
      token_hash: refreshTokenHash,
      expires_at: new Date(Date.now() + this.parseExpirationTime(config.jwt.refreshExpiresIn)),
      device_info: deviceInfo,
      ip_address: ipAddress,
    });

    return {
      accessToken,
      refreshToken: refreshTokenString,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseExpirationTime(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'm':
        return value * 60 * 1000;
      case 's':
        return value * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000; // Default to 7 days
    }
  }

  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      return jwt.verify(token, config.jwt.secret) as JWTPayload;
    } catch (error) {
      throw new AppError('Invalid token', 401);
    }
  }

  async cleanupExpiredTokens(): Promise<void> {
    await db('refresh_tokens')
      .where('expires_at', '<', new Date())
      .del();

    logger.info('Expired tokens cleaned up');
  }
}