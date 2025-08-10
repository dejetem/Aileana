import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { UpdateUserData, ApiResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

export class ProfileController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    const user = await this.userService.getUserById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Profile retrieved successfully',
      data: user,
    };

    res.status(200).json(response);
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const updateData: UpdateUserData = req.body;

    const updatedUser = await this.userService.updateUser(userId, updateData);

    const response: ApiResponse = {
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    };

    res.status(200).json(response);
  }

  async getUserStats(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    const stats = await this.userService.getUserStats(userId);

    const response: ApiResponse = {
      success: true,
      message: 'User statistics retrieved successfully',
      data: stats,
    };

    res.status(200).json(response);
  }
}