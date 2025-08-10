export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  avatar?: string;
  email_verified: boolean;
  phone_verified: boolean;
  is_active: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  wallet_id: string;
  account_number?: string;
  bank_code?: string;
  balance: number;
  currency: string;
  status: 'active' | 'suspended' | 'closed';
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  file_url?: string;
  is_read: boolean;
  read_at?: Date;
  is_deleted: boolean;
  deleted_at?: Date;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export interface Call {
  id: string;
  caller_id: string;
  callee_id: string;
  call_type: 'voice' | 'video';
  status: 'initiated' | 'ringing' | 'answered' | 'ended' | 'missed' | 'rejected';
  started_at: Date;
  answered_at?: Date;
  ended_at?: Date;
  duration_seconds?: number;
  end_reason?: string;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  is_revoked: boolean;
  device_info?: string;
  ip_address?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface OnePipeWalletResponse {
  status: boolean;
  message: string;
  data?: {
    wallet_id: string;
    account_number: string;
    bank_code: string;
    balance: number;
    currency: string;
  };
}

export interface SocketUser {
  userId: string;
  socketId: string;
  isOnline: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}