# Communication API

A comprehensive backend API for communication applications featuring user authentication, wallet integration, real-time messaging, and voice/video call signaling.

## 🚀 Features

- **User Authentication**: JWT-based authentication with refresh tokens
- **Profile Management**: User profile CRUD operations
- **Wallet Integration**: OnePipe wallet integration for financial transactions
- **Real-time Messaging**: WebSocket-based messaging with Socket.IO
- **Voice/Video Calls**: Call signaling with WebRTC support
- **Real-time Notifications**: Live user status and typing indicators
- **Comprehensive Logging**: Structured logging with Winston
- **Rate Limiting**: Built-in API rate limiting
- **Security**: Helmet.js security headers, CORS, input validation
- **Database Migrations**: Automated database schema management
- **Docker Support**: Full containerization with Docker Compose

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Knex.js ORM
- **Authentication**: JWT with bcrypt
- **Real-time**: Socket.IO
- **Validation**: Joi
- **Logging**: Winston
- **External API**: OnePipe (with mock implementation)
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- Docker and Docker Compose (optional)
- OnePipe API credentials (optional - has mock implementation)

## 🔧 Installation & Setup

### Method 1: Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd communication-api
   ```

2. **Copy environment file**
   ```bash
   cp .env.example .env
   ```

3. **Start services**
   ```bash
   npm install
   docker-compose up -d
   ```

4. **Check logs**
   ```bash
   docker-compose logs -f api
   ```

The API will be available at `http://localhost:3000`

### Method 2: Local Development

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd communication-api
   npm install
   ```

<!-- 2. **Set up PostgreSQL database**
   ```sql
   CREATE DATABASE communication_db;
   ``` -->

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Run migrations**
   ```bash
   npm run migrate
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🔐 Environment Variables

Create a `.env` file with the following variables:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=communication_db

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRES_IN=30d

# OnePipe (set ONEPIPE_MOCK=true to use mock implementation)
ONEPIPE_BASE_URL=https://api.onepipe.co/v1
ONEPIPE_API_KEY=your-onepipe-api-key
ONEPIPE_SECRET=your-onepipe-secret
ONEPIPE_MOCK=true

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=http://localhost:3001
```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### POST /api/auth/signup
Register a new user and automatically create a wallet.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "avatar": null,
      "email_verified": false,
      "phone_verified": false,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "jwt_token",
      "refreshToken": "refresh_token"
    }
  }
}
```

#### POST /api/auth/login
Authenticate user and return tokens.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### POST /api/auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

#### POST /api/auth/logout
Logout and revoke refresh token.

### Profile Endpoints

#### GET /api/profile
Get current user's profile (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

#### PUT /api/profile
Update user profile.

**Request Body:**
```json
{
  "name": "Updated Name",
  "phone": "+0987654321",
  "avatar": "https://example.com/avatar.jpg"
}
```

### Wallet Endpoints

#### POST /api/wallet/create
Create a wallet for the authenticated user.

**Request Body:**
```json
{
  "currency": "NGN"
}
```

#### GET /api/wallet/balance
Get current wallet balance.

**Response:**
```json
{
  "success": true,
  "message": "Balance retrieved successfully",
  "data": {
    "balance": 50000.00,
    "currency": "NGN",
    "lastUpdated": "2024-01-01T00:00:00.000Z"
  }
}
```

### Messaging Endpoints

#### POST /api/messages/send
Send a message to another user.

**Request Body:**
```json
{
  "recipientId": "recipient-uuid",
  "content": "Hello, how are you?",
  "messageType": "text"
}
```

#### GET /api/messages/history/:userId
Get message history with a specific user.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Messages per page (default: 20)

### Call Endpoints

#### POST /api/calls/start
Start a voice or video call.

**Request Body:**
```json
{
  "calleeId": "callee-uuid",
  "callType": "video"
}
```

#### POST /api/calls/end
End an ongoing call.

**Request Body:**
```json
{
  "callId": "call-uuid",
  "endReason": "completed"
}
```

#### GET /api/calls/history
Get call history for the authenticated user.

## 🔌 WebSocket Events

Connect to Socket.IO at `ws://localhost:3000` with authentication token.

### Authentication
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Message Events
- `send_message` - Send a real-time message
- `new_message` - Receive a new message
- `mark_read` - Mark messages as read
- `message_read` - Notification when message is read
- `typing_start` / `typing_stop` - Typing indicators

### Call Events
- `start_call` - Initiate a call
- `incoming_call` - Receive call notification
- `answer_call` - Answer incoming call
- `reject_call` - Reject incoming call
- `end_call` - End ongoing call
- `call_ended` - Call ended notification

### WebRTC Signaling
- `webrtc_offer` - Send/receive WebRTC offer
- `webrtc_answer` - Send/receive WebRTC answer
- `webrtc_ice_candidate` - Exchange ICE candidates

## 🧪 Testing

### Using Postman

1. **Import the API collection** (create a Postman collection with the endpoints above)

2. **Set up environment variables:**
   - `baseUrl`: `http://localhost:3000/api`
   - `accessToken`: (set after login)

3. **Test Authentication Flow:**
   - POST `/auth/signup` to create a user
   - POST `/auth/login` to get tokens
   - Use the access token for protected routes

4. **Test Real-time Features:**
   - Use a WebSocket client to connect to `ws://localhost:3000`
   - Send authentication token in connection

### Using cURL

**Register a user:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+1234567890",
    "password": "TestPass123!"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

**Get Profile:**
```bash
curl -X GET http://localhost:3000/api/profile \
  -H "Authorization: Bearer <your_access_token>"
```

## 🏗️ Architecture & Design Patterns

### Clean Architecture
- **Controllers**: Handle HTTP requests and responses
- **Services**: Business logic and external API interactions
- **Repositories**: Data access layer (implicit with Knex)
- **Middleware**: Cross-cutting concerns (auth, validation, errors)

### Key Design Decisions

1. **JWT with Refresh Tokens**: Secure authentication with token rotation
2. **Database Transactions**: Ensure data consistency
3. **Error Handling**: Centralized error handling with custom error types
4. **Validation**: Input validation with Joi schemas
5. **Logging**: Structured logging for monitoring and debugging
6. **Security**: Multiple layers of security (Helmet, CORS, rate limiting)
7. **Real-time**: WebSocket authentication and room-based messaging

### Database Schema
- **users**: User accounts and profiles
- **wallets**: OnePipe wallet integration
- **messages**: Chat messages with read status
- **calls**: Voice/video call logs and metadata
- **refresh_tokens**: Secure token management

## 🔒 Security Features

- Password hashing with bcrypt (12 salt rounds)
- JWT token authentication with expiration
- Refresh token rotation
- Rate limiting (100 requests per 15 minutes)
- CORS configuration
- Helmet.js security headers
- Input validation and sanitization
- SQL injection protection with parameterized queries
- WebSocket authentication

## 📈 Production Considerations

### Monitoring
- Winston logging with file rotation
- Health check endpoint at `/health`
- Error tracking and alerting

### Scalability
- Horizontal scaling with load balancers
- Redis for session storage (configured but optional)
- Database connection pooling
- WebSocket clustering support

### Deployment
- Docker multi-stage builds
- Environment-specific configurations
- Database migrations in CI/CD
- Health checks for container orchestration

## 🤝 Development Assumptions

1. **OnePipe Integration**: Mock implementation provided for development
2. **File Uploads**: Avatar URLs assumed to be handled by external CDN
3. **Email Verification**: Placeholder for email verification service
4. **Push Notifications**: Not implemented but architecture supports it
5. **Video Call Implementation**: WebRTC signaling only, media server separate
6. **Rate Limiting**: Basic implementation, can be enhanced with Redis
7. **Caching**: Not implemented but can be added with Redis
8. **Testing**: Integration tests would be added for production

## 📝 Development Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm start           # Start production server

# Database
npm run migrate     # Run database migrations
npm run migrate:rollback  # Rollback last migration
npm run seed        # Run database seeds

# Code Quality
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint issues
npm test           # Run tests
npm run test:watch # Run tests in watch mode
```

## 🚀 Deployment

### Production Build
```bash
# Build the application
npm run build

# Start production server
NODE_ENV=production npm start
```

### Docker Production
```bash
# Build production image
docker build --target production -t communication-api .

# Run production container
docker run -d --name api -p 3000:3000 communication-api
```

## 📞 Support

For issues and questions:
1. Check the logs: `docker-compose logs api`
2. Verify environment variables are set correctly
3. Ensure PostgreSQL is running and accessible
4. Check network connectivity for external APIs

## 📄 License

MIT License - see LICENSE file for details.