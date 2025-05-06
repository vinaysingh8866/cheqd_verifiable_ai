# Credo Next.js App with Express Backend

This project consists of a Next.js frontend application and an Express backend that handles the Credo agent functionality.

## Architecture Overview

- **Express Backend**: Handles the Credo agent functionality, including port binding and webhook handling.
- **Next.js Frontend**: Provides the user interface and communicates with the backend through REST APIs.
- **Docker**: Both applications are containerized for easy deployment.

## Setup Instructions

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)

### Environment Variables

#### Backend (.env file in backend directory)
```
# Agent configuration
AGENT_PORT=3001
AGENT_ENDPOINT=http://localhost:3001

# API configuration
API_PORT=3002

# Optional default admin wallet
# DEFAULT_ADMIN_WALLET_ID=admin-wallet
# DEFAULT_ADMIN_WALLET_KEY=admin-key
```

#### Frontend (.env file in credo-next-app directory)
```
# API URL for the Express backend
NEXT_PUBLIC_API_URL=http://localhost:3002
```

### Running with Docker Compose

1. Clone the repository
2. Set up environment variables:
   - Copy `backend/.env.example` to `backend/.env` and adjust as needed
   - Copy `credo-next-app/.env.example` to `credo-next-app/.env` and adjust as needed
3. Start the containers:
   ```
   docker-compose up -d
   ```
4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3002
   - Agent Webhook: http://localhost:3001

### Local Development

#### Backend
```bash
cd backend
npm install
npm run dev
```

#### Frontend
```bash
cd credo-next-app
npm install
npm run dev
```

## API Endpoints

### Agent API
- `POST /api/agent/initialize` - Initialize or get an agent
- `POST /api/agent/validate` - Validate wallet credentials
- `POST /api/agent/tenant` - Create a tenant

### Connections API
- `GET /api/connections` - Get all connections
- `GET /api/connections/:connectionId` - Get a connection by ID
- `POST /api/connections/invitation` - Create a new invitation

### Credentials API
- `GET /api/credentials` - Get all credentials
- `GET /api/credentials/:credentialId` - Get a credential by ID

## Architecture Benefits

- Separation of concerns between UI and agent functionality
- Support for long-running processes in the Express backend
- Container-based deployment for easier scaling and deployment
- Prevention of Next.js serverless function timeouts and port binding issues 