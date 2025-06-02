# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EasyTix is a full-featured ticket management system with two main components:
- **Frontend**: Next.js 15 app with TypeScript, Mantine UI, and React Query
- **Backend**: NestJS API with MongoDB, JWT auth, and hexagonal architecture

## Common Development Commands

### Frontend Commands (easytix-frontend/)
```bash
# Development
npm run dev                    # Start development server with Turbopack
npm run build                  # Build for production
npm run start                  # Start production server
npm run lint                   # Run ESLint
npm run test:e2e              # Run Playwright E2E tests
npx prettier --write .        # Format code (ALWAYS run before building)

# Testing specific features
npx playwright test auth/sign-in.spec.ts --headed  # Run specific test visually
```

### Backend Commands (easytix-backend/)
```bash
# Development
npm run start:dev             # Start with watch mode
npm run start:debug           # Start with debug mode
npm run build                 # Build for production
npm run start:prod            # Start production server

# Testing
npm run test                  # Run unit tests
npm run test:watch            # Run tests in watch mode
npm run test:cov              # Generate coverage report
npm run test:e2e              # Run E2E tests

# Database
npm run seed:run:document     # Seed MongoDB with initial data

# Code Quality
npm run lint                  # Run ESLint
npm run format                # Format with Prettier
```

### Deployment Process
```bash
# 1. Format code (CRITICAL for frontend)
cd /var/www/easytix-frontend
npx prettier --write .

# 2. Build projects
cd /var/www/easytix-frontend && yarn build
cd /var/www/easytix-backend && yarn build

# 3. Restart PM2
pm2 restart easytix-frontend
pm2 restart easytix-backend
```

## Architecture Overview

### Backend Architecture (Hexagonal/Ports & Adapters)
```
src/
├── [feature]/
│   ├── domain/               # Business entities (pure domain logic)
│   ├── dto/                  # Data Transfer Objects for API
│   ├── infrastructure/       # External dependencies
│   │   └── persistence/      # Database implementation
│   │       └── document/     # MongoDB-specific code
│   ├── services/             # Business logic services
│   ├── [feature].controller.ts
│   ├── [feature].service.ts
│   └── [feature].module.ts
```

### Frontend Architecture
```
src/
├── app/[language]/           # Next.js App Router with i18n
├── components/               # Reusable UI components
├── services/
│   ├── api/                  # API service factory pattern
│   ├── auth/                 # JWT auth with refresh tokens
│   └── react-query/          # Query client configuration
```

## Critical Implementation Details

### Role-Based Access Control
```typescript
// Backend roles (src/roles/roles.enum.ts)
export enum RoleEnum {
  "admin" = 1,         // Sees ALL tickets
  "serviceDesk" = 2,   // Sees queue tickets + own tickets
  "user" = 3,          // Sees only own tickets
}

// IMPORTANT: JWT stores role.id as string, always convert:
const userRoleId = Number(user.role?.id);
if (userRoleId === RoleEnum.admin) { /* ... */ }
```

### Authentication Flow
- JWT tokens with refresh token rotation
- Public endpoints create users with random passwords
- Email verification required for new accounts
- Social auth: Google OAuth configured

### API Patterns
```typescript
// Frontend API calls use factory pattern
const ticketsApi = apiService("tickets");
const response = await ticketsApi.findMany({ 
  page: 1, 
  limit: 10,
  filters: { status: "open" }
});

// Backend uses DTOs for validation
@IsEnum(StatusEnum)
@IsOptional()
status?: StatusEnum;
```

### File Upload
- Local filesystem and S3 storage drivers
- Presigned URLs for secure S3 uploads
- File validation by type and size

### Email System
- Handlebars templates with i18n support
- Queue for async email sending
- Templates in `src/mail/mail-templates/`

## Key Technical Considerations

### Frontend Gotchas
1. **Always format before build**: `npx prettier --write .`
2. **Language routing**: Use `router.push(\`/\${language}/path\`)`
3. **Named exports**: `import { Component } from "./Component"`
4. **Form validation**: Use Yup schemas with typed interfaces
5. **API error handling**: Check for `validationErrors` in responses

### Backend Gotchas
1. **MongoDB queries**: Use proper aggregation for complex filters
2. **Role comparisons**: Convert string IDs to numbers
3. **File paths**: Always use absolute paths in tools
4. **Email context**: Pass all required variables to templates
5. **Validation**: DTOs automatically validate with class-validator

### Testing Approach
- Backend: Jest for unit tests, Supertest for E2E
- Frontend: Playwright for E2E tests
- Test data helpers available in `playwright-tests/helpers/`

## Environment Configuration

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Backend (.env)
```env
NODE_ENV=development
APP_PORT=3001
DATABASE_URL=mongodb://localhost:27017/easytix
DATABASE_NAME=easytix
AUTH_JWT_SECRET=your-secret
MAIL_HOST=smtp.gmail.com
FILE_DRIVER=local
```

## Recent Updates & Known Issues

1. **Ticket Visibility Fix**: Role comparison fixed with Number() conversion
2. **Phone Number Field**: Added to User entity and all DTOs
3. **Public Ticket API**: `/v1/tickets/public` creates user if needed
4. **Queue Assignment**: Service desk users see tickets in assigned queues

## Live Environment
- Frontend: https://etdev.nomadsoft.us
- Backend API: https://etdevserver.nomadsoft.us
- API Docs: https://etdevserver.nomadsoft.us/docs
- Test Account: aloha@ixplor.app / password