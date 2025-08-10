import { Request, Response } from 'express';
import { CallService } from '../services/callService';
import { ApiResponse, Call } from '../types';
import { AppError } from '../middleware/errorHandler';

export class CallController {
  private callService: CallService;

  constructor() {
    this.callService = new CallService();
  }

  async startCall(req: Request, res: Response): Promise<void> {
    const callerId = req.user!.userId;
    const { calleeId, callType } = req.body;

    const call = await this.callService.startCall(callerId, calleeId, callType);

    const response: ApiResponse<Call> = {
      success: true,
      message: 'Call started successfully',
      data: call,
    };

    res.status(201).json(response);
  }

  async answerCall(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { callId } = req.params;

    const call = await this.callService.updateCallStatus(callId, 'answered', userId);

    const response: ApiResponse<Call> = {
      success: true,
      message: 'Call answered successfully',
      data: call,
    };

    res.status(200).json(response);
  }

  async rejectCall(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { callId } = req.params;

    const call = await this.callService.updateCallStatus(callId, 'rejected', userId);

    const response: ApiResponse<Call> = {
      success: true,
      message: 'Call rejected successfully',
      data: call,
    };

    res.status(200).json(response);
  }

  async endCall(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { callId } = req.params;
    const { endReason = 'completed' } = req.body;

    const call = await this.callService.endCall(callId, userId, endReason);

    const response: ApiResponse<Call> = {
      success: true,
      message: 'Call ended successfully',
      data: call,
    };

    res.status(200).json(response);
  }

  async updateCallStatus(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { callId } = req.params;
    const { status } = req.body;

    const call = await this.callService.updateCallStatus(callId, status, userId);

    const response: ApiResponse<Call> = {
      success: true,
      message: `Call status updated to ${status}`,
      data: call,
    };

    res.status(200).json(response);
  }

  async getCall(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { callId } = req.params;

    const call = await this.callService.getCall(callId, userId);

    if (!call) {
      throw new AppError('Call not found', 404);
    }

    const response: ApiResponse<Call> = {
      success: true,
      message: 'Call details retrieved successfully',
      data: call,
    };

    res.status(200).json(response);
  }

  async getCallHistory(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { 
      page = 1, 
      limit = 20, 
      callType, 
      status 
    } = req.query as any;

    const callHistory = await this.callService.getCallHistory(
      userId,
      Number(page),
      Number(limit),
      callType,
      status
    );

    res.status(200).json(callHistory);
  }

  async getActiveCall(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    const call = await this.callService.getActiveCall(userId);

    const response: ApiResponse<Call | null> = {
      success: true,
      message: call ? 'Active call found' : 'No active call',
      data: call,
    };

    res.status(200).json(response);
  }

  async getCallStatistics(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    const stats = await this.callService.getCallStatistics(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Call statistics retrieved successfully',
      data: stats,
    };

    res.status(200).json(response);
  }

  async deleteCall(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { callId } = req.params;

    await this.callService.deleteCall(callId, userId);

    const response: ApiResponse = {
      success: true,
      message: 'Call deleted successfully',
    };

    res.status(200).json(response);
  }

  // WebRTC Signaling Methods
  async createOffer(req: Request, res: Response): Promise<void> {
    const { callId } = req.params;
    const { offer } = req.body;

    await this.callService.createOffer(callId, offer);

    const response: ApiResponse = {
      success: true,
      message: 'WebRTC offer created successfully',
    };

    res.status(200).json(response);
  }

  async createAnswer(req: Request, res: Response): Promise<void> {
    const { callId } = req.params;
    const { answer } = req.body;

    await this.callService.createAnswer(callId, answer);

    const response: ApiResponse = {
      success: true,
      message: 'WebRTC answer created successfully',
    };

    res.status(200).json(response);
  }

  async addIceCandidate(req: Request, res: Response): Promise<void> {
    const { callId } = req.params;
    const { candidate } = req.body;

    await this.callService.addIceCandidate(callId, candidate);

    const response: ApiResponse = {
      success: true,
      message: 'ICE candidate added successfully',
    };

    res.status(200).json(response);
  }
}