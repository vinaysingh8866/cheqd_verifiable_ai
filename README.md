# Verifiable AI Platform

This platform allows issuance and verification of AI-generated content credentials using decentralized identity technology.

## Architecture Overview

- **Express Backend**: Handles credential issuance, verification, and management through a RESTful API.
- **Next.js Frontend**: Provides a modern user interface for credential management and verification.
- **PostgreSQL Database**: Stores credential records and related metadata.

## Setup Instructions

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL database (local or remote)

### Environment Variables

#### Backend (.env file in backend directory)
```
# Database configuration
DATABASE_URL=postgresql://verifiable_ai_user:password@localhost:5432/verifiable_ai

# API configuration
PORT=3002

# JWT Secret for authentication
JWT_SECRET=your-jwt-secret

# Agent endpoint (if applicable)
AGENT_ENDPOINT=http://localhost:3001
```

#### Frontend (.env file in root directory)
```
# API URL for the Express backend
NEXT_PUBLIC_API_URL=http://localhost:3002
```

### Running with Docker Compose

1. Clone the repository
2. Set up environment variables:
   - Copy `.env.example` to `.env` and adjust as needed
   - Ensure database connection settings are correct
3. Start the containers:
   ```
   docker-compose up -d
   ```
4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3002

### Local Development

#### Backend
```bash
cd backend
npm install
npm run dev
```

#### Frontend
```bash
npm install
npm run dev
```

## Database Management

The platform uses a PostgreSQL database to store credential information. Several utility scripts are provided:

- `backend/src/dbFix.js` - Adds missing columns to the database schema
- `backend/src/dbDelete.js` - Utility to delete all credentials (use with `--confirm` flag)

To run these utilities:
```bash
node backend/src/dbFix.js
node backend/src/dbDelete.js --confirm
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Authenticate and get access token
- `POST /api/auth/register` - Register a new user

### Credentials API
- `GET /api/credentials` - Get all issued credentials
- `GET /api/credentials/:credentialId` - Get a credential by ID
- `POST /api/credentials` - Issue a new credential
- `GET /api/credentials/public/:credentialId` - Public endpoint to fetch credential details

### Tenants API
- `GET /api/tenants` - Get all tenants
- `POST /api/tenants` - Create a new tenant

## Features

- Issue verifiable credentials for AI-generated content
- Verify the authenticity of AI-generated content
- QR code scanning for credential verification
- User-friendly credential management
- Public access to credential details via shareable links 