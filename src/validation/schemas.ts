import Joi from 'joi';

// Authentication schemas
export const signupSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{7,14}$/).required(),
  password: Joi.string().min(8).max(128).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// Profile schemas
export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  phone: Joi.string().pattern(/^\+?[1-9]\d{7,14}$/),
  avatar: Joi.string().uri().allow(''),
}).min(1);

// Message schemas
export const sendMessageSchema = Joi.object({
  recipientId: Joi.string().uuid().required(),
  content: Joi.string().min(1).max(5000).required(),
  messageType: Joi.string().valid('text', 'image', 'file').default('text'),
  fileUrl: Joi.string().uri().when('messageType', {
    is: Joi.valid('image', 'file', 'text'),
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),
});

export const messageHistorySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

// Call schemas
export const startCallSchema = Joi.object({
  calleeId: Joi.string().uuid().required(),
  callType: Joi.string().valid('voice', 'video').required(),
});

export const endCallSchema = Joi.object({
  callId: Joi.string().uuid().required(),
  endReason: Joi.string().valid('completed', 'rejected', 'failed').default('completed'),
});

export const callHistorySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  callType: Joi.string().valid('voice', 'video').optional(),
  status: Joi.string().valid('initiated', 'ringing', 'answered', 'ended', 'missed', 'rejected').optional(),
});

// Wallet schemas
export const createWalletSchema = Joi.object({
  currency: Joi.string().valid('NGN', 'USD', 'EUR').default('NGN'),
});

// Common parameter schemas
export const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const userIdParamSchema = Joi.object({
  userId: Joi.string().uuid().required(),
});

export const callIdParamSchema = Joi.object({
  callId: Joi.string().uuid().required(),
});