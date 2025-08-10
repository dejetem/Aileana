import { db } from '../database/database';
import { AppError } from '../middleware/errorHandler';
import { Call, PaginatedResponse } from '../types';
import { logger } from '../utils/logger';

export class CallService {
  async startCall(callerId: string, calleeId: string, callType: 'voice' | 'video'): Promise<Call> {
    // Validate callee exists
    const callee = await db('users')
      .where('id', calleeId)
      .andWhere('is_active', true)
      .first();

    if (!callee) {
      throw new AppError('Callee not found', 404);
    }

    if (callerId === calleeId) {
      throw new AppError('Cannot call yourself', 400);
    }

    // Check if there's already an active call for either user
    const activeCall = await db('calls')
      .where((builder) => {
        builder
          .where('caller_id', callerId)
          .orWhere('callee_id', callerId)
          .orWhere('caller_id', calleeId)
          .orWhere('callee_id', calleeId);
      })
      .andWhere('status', 'in', ['initiated', 'ringing', 'answered'])
      .first();

    if (activeCall) {
      throw new AppError('User is already in a call', 409);
    }

    // Create call record
    const [call] = await db('calls')
      .insert({
        caller_id: callerId,
        callee_id: calleeId,
        call_type: callType,
        status: 'initiated',
        started_at: new Date(),
        metadata: {
          created_via: 'api',
          client_timestamp: new Date().toISOString(),
        },
      })
      .returning('*');

    logger.info(`Call initiated: ${callerId} -> ${calleeId}, type: ${callType}, id: ${call.id}`);

    return call;
  }

  async updateCallStatus(
    callId: string,
    status: 'ringing' | 'answered' | 'ended' | 'missed' | 'rejected',
    userId?: string
  ): Promise<Call> {
    const call = await db('calls')
      .where('id', callId)
      .first();

    if (!call) {
      throw new AppError('Call not found', 404);
    }

    // If userId is provided, verify the user is part of the call
    if (userId && call.caller_id !== userId && call.callee_id !== userId) {
      throw new AppError('Unauthorized to update this call', 403);
    }

    const updateData: any = {
      status,
      updated_at: new Date(),
    };

    // Set timestamps based on status
    switch (status) {
      case 'answered':
        updateData.answered_at = new Date();
        break;
      case 'ended':
      case 'missed':
      case 'rejected':
        updateData.ended_at = new Date();
        if (call.answered_at) {
          const duration = Math.floor(
            (new Date().getTime() - new Date(call.answered_at).getTime()) / 1000
          );
          updateData.duration_seconds = duration;
        }
        break;
    }

    const [updatedCall] = await db('calls')
      .where('id', callId)
      .update(updateData)
      .returning('*');

    logger.info(`Call status updated: ${callId}, status: ${status}`);

    return updatedCall;
  }

  async endCall(callId: string, userId: string, endReason: string = 'completed'): Promise<Call> {
    const call = await db('calls')
      .where('id', callId)
      .andWhere((builder) => {
        builder
          .where('caller_id', userId)
          .orWhere('callee_id', userId);
      })
      .first();

    if (!call) {
      throw new AppError('Call not found or unauthorized', 404);
    }

    if (call.status === 'ended') {
      throw new AppError('Call already ended', 400);
    }

    const endedAt = new Date();
    let duration = 0;

    if (call.answered_at) {
      duration = Math.floor(
        (endedAt.getTime() - new Date(call.answered_at).getTime()) / 1000
      );
    }

    const [updatedCall] = await db('calls')
      .where('id', callId)
      .update({
        status: 'ended',
        ended_at: endedAt,
        duration_seconds: duration,
        end_reason: endReason,
        updated_at: endedAt,
      })
      .returning('*');

    logger.info(`Call ended: ${callId}, duration: ${duration}s, reason: ${endReason}`);

    return updatedCall;
  }

  async getCall(callId: string, userId?: string): Promise<Call | null> {
    let query = db('calls').where('id', callId);

    if (userId) {
      query = query.andWhere((builder) => {
        builder
          .where('caller_id', userId)
          .orWhere('callee_id', userId);
      });
    }

    const call = await query.first();
    return call || null;
  }

  async getCallHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
    callType?: 'voice' | 'video',
    status?: string
  ): Promise<PaginatedResponse<Call>> {
    const offset = (page - 1) * limit;

    let query = db('calls')
      .select([
        'calls.*',
        'caller.name as caller_name',
        'callee.name as callee_name',
      ])
      .join('users as caller', 'calls.caller_id', 'caller.id')
      .join('users as callee', 'calls.callee_id', 'callee.id')
      .where((builder) => {
        builder
          .where('calls.caller_id', userId)
          .orWhere('calls.callee_id', userId);
      })
      .orderBy('calls.started_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (callType) {
      query = query.andWhere('calls.call_type', callType);
    }

    if (status) {
      query = query.andWhere('calls.status', status);
    }

    const calls = await query;

    // Get total count
    let countQuery = db('calls')
      .where((builder) => {
        builder
          .where('caller_id', userId)
          .orWhere('callee_id', userId);
      });

    if (callType) {
      countQuery = countQuery.andWhere('call_type', callType);
    }

    if (status) {
      countQuery = countQuery.andWhere('status', status);
    }

    const [{ count }] = await countQuery.count('id as count');

    const total = parseInt(count as string);
    const pages = Math.ceil(total / limit);

    return {
      success: true,
      message: 'Call history retrieved successfully',
      data: calls,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    };
  }

  async getActiveCall(userId: string): Promise<Call | null> {
    const call = await db('calls')
      .where((builder) => {
        builder
          .where('caller_id', userId)
          .orWhere('callee_id', userId);
      })
      .andWhere('status', 'in', ['initiated', 'ringing', 'answered'])
      .orderBy('started_at', 'desc')
      .first();

    return call || null;
  }

  async getCallStatistics(userId: string): Promise<{
    totalCalls: number;
    totalDuration: number; // in seconds
    missedCalls: number;
    averageDuration: number;
    callsByType: {
      voice: number;
      video: number;
    };
  }> {
    const [totalStats, missedStats, voiceStats, videoStats] = await Promise.all([
      db('calls')
        .where((builder) => {
          builder
            .where('caller_id', userId)
            .orWhere('callee_id', userId);
        })
        .select(
          db.raw('COUNT(*) as total_calls'),
          db.raw('SUM(COALESCE(duration_seconds, 0)) as total_duration'),
          db.raw('AVG(COALESCE(duration_seconds, 0)) as avg_duration')
        )
        .first(),

      db('calls')
        .where('callee_id', userId)
        .andWhere('status', 'missed')
        .count('id as count')
        .first(),

      db('calls')
        .where((builder) => {
          builder
            .where('caller_id', userId)
            .orWhere('callee_id', userId);
        })
        .andWhere('call_type', 'voice')
        .count('id as count')
        .first(),

      db('calls')
        .where((builder) => {
          builder
            .where('caller_id', userId)
            .orWhere('callee_id', userId);
        })
        .andWhere('call_type', 'video')
        .count('id as count')
        .first(),
    ]);

    return {
      totalCalls: parseInt(totalStats?.total_calls as string) || 0,
      totalDuration: parseInt(totalStats?.total_duration as string) || 0,
      missedCalls: parseInt(missedStats?.count as string) || 0,
      averageDuration: parseFloat(totalStats?.avg_duration as string) || 0,
      callsByType: {
        voice: parseInt(voiceStats?.count as string) || 0,
        video: parseInt(videoStats?.count as string) || 0,
      },
    };
  }

  async deleteCall(callId: string, userId: string): Promise<void> {
    const result = await db('calls')
      .where('id', callId)
      .andWhere((builder) => {
        builder
          .where('caller_id', userId)
          .orWhere('callee_id', userId);
      })
      .delete();

    if (result === 0) {
      throw new AppError('Call not found or unauthorized', 404);
    }

    logger.info(`Call deleted: ${callId} by ${userId}`);
  }

  // Mock WebRTC signaling methods (in a real implementation, these would interact with a signaling server)
  async createOffer(callId: string, offer: any): Promise<void> {
    await db('calls')
      .where('id', callId)
      .update({
        metadata: db.raw('jsonb_set(metadata::jsonb, \'{offer}\', ?, true)::json', [JSON.stringify(offer)]),
        updated_at: new Date(),
      });

    logger.info(`WebRTC offer created for call: ${callId}`);
  }

  async createAnswer(callId: string, answer: any): Promise<void> {
    await db('calls')
      .where('id', callId)
      .update({
        metadata: db.raw('jsonb_set(metadata, \'{answer}\', ?, true)', [JSON.stringify(answer)]),
        updated_at: new Date(),
      });

    logger.info(`WebRTC answer created for call: ${callId}`);
  }

  async addIceCandidate(callId: string, candidate: any): Promise<void> {
    await db('calls')
      .where('id', callId)
      .update({
        metadata: db.raw(`
        jsonb_set(
          metadata::jsonb, 
          '{ice_candidates}', 
          COALESCE(metadata::jsonb->'ice_candidates', '[]'::jsonb) || ?::jsonb, 
          true
        )::json
      `, [JSON.stringify([candidate])]),
        updated_at: new Date(),
      });

    logger.info(`ICE candidate added for call: ${callId}`);
  }
}