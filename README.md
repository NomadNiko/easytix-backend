# EasyTix Backend - Advanced Ticket Management API

A robust, scalable NestJS backend service for the EasyTix ticket management system, providing comprehensive REST APIs for ticket handling, user management, notifications, and administrative features.

## 🌟 Live Demo

- **API Documentation**: https://etdevserver.nomadsoft.us/docs
- **Frontend Application**: https://etdev.nomadsoft.us
- **Test Credentials**: aloha@ixplor.app / password

## 🚀 Key Features

### 🎫 Ticket Management System
- **Public Ticket Creation** - Anonymous ticket submission with user creation
- **Internal Ticket System** - Authenticated ticket management
- **Priority & Status Tracking** - High/Medium/Low priority with lifecycle management
- **Queue-based Organization** - Department/category-based ticket routing
- **Document Attachments** - File upload and management for tickets
- **History Tracking** - Complete audit trail for all ticket activities
- **Advanced Filtering** - Complex querying and search capabilities

### 👥 User & Role Management
- **Role-based Access Control** - Admin and User roles with granular permissions
- **User CRUD Operations** - Complete user lifecycle management
- **Profile Management** - User information and avatar handling
- **Queue Assignments** - User-to-queue relationship management
- **Notification Preferences** - Granular user notification settings

### 🔔 Advanced Notification System
- **Granular Preferences** - User-controlled notification settings
- **Smart Notifications** - Respects user preferences before sending
- **Email Integration** - Automated email notifications with templates
- **In-app Notifications** - Real-time notification system
- **Admin Broadcasting** - System-wide notification capabilities

### 🏗️ Queue & Category Management
- **Dynamic Queue Creation** - Flexible departmental organization
- **Category System** - Hierarchical ticket categorization
- **User Assignment** - Queue-specific user management
- **Analytics Ready** - Performance tracking capabilities

### 🔐 Authentication & Security
- **JWT Authentication** - Secure token-based authentication
- **Email Verification** - Account activation workflow
- **Password Reset** - Secure password recovery
- **Social OAuth** - Google, Facebook, Apple integration
- **Rate Limiting** - API protection and abuse prevention

### 📁 File Management
- **Multiple Storage Drivers** - Local filesystem and S3 support
- **File Upload Security** - Type validation and size limits
- **Document Associations** - Link files to tickets and users
- **Presigned URLs** - Secure file access patterns

## 🛠️ Technology Stack

- **Framework**: NestJS (Node.js)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with Passport strategies
- **Email**: Nodemailer with Handlebars templates
- **File Storage**: Local filesystem / Amazon S3
- **Validation**: Class-validator with DTOs
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest (unit) + Supertest (E2E)
- **Configuration**: Environment-based config service
- **Internationalization**: nestjs-i18n

## 📋 API Endpoints

### Authentication
```
POST   /auth/email/login              # User login
POST   /auth/email/register           # User registration
POST   /auth/email/confirm            # Email confirmation
POST   /auth/forgot/password          # Password reset request
POST   /auth/reset/password           # Password reset completion
POST   /auth/refresh                  # Token refresh
```

### Tickets
```
GET    /tickets                       # List tickets (filtered/paginated)
POST   /tickets                       # Create new ticket
GET    /tickets/:id                   # Get specific ticket
PATCH  /tickets/:id                   # Update ticket
DELETE /tickets/:id                   # Delete ticket
POST   /tickets/public                # Public ticket creation (no auth)
PATCH  /tickets/:id/assign            # Assign ticket to user
PATCH  /tickets/:id/status            # Update ticket status
```

### Users
```
GET    /users                         # List users (admin only)
POST   /users                         # Create user (admin only)
GET    /users/:id                     # Get user details
PATCH  /users/:id                     # Update user
DELETE /users/:id                     # Delete user (admin only)
GET    /users/me                      # Get current user profile
PATCH  /users/me                      # Update current user profile
PATCH  /users/:id/notification-preferences  # Update notification settings
```

### Queues
```
GET    /queues                        # List all queues
POST   /queues                        # Create new queue (admin only)
GET    /queues/:id                    # Get queue details
PATCH  /queues/:id                    # Update queue (admin only)
DELETE /queues/:id                    # Delete queue (admin only)
POST   /queues/:id/users              # Assign user to queue
DELETE /queues/:id/users/:userId      # Remove user from queue
```

### Categories
```
GET    /categories                    # List categories
POST   /categories                    # Create category (admin only)
GET    /categories/:id                # Get category details
PATCH  /categories/:id                # Update category (admin only)
DELETE /categories/:id                # Delete category (admin only)
```

### Notifications
```
GET    /notifications                 # Get user notifications
POST   /notifications                 # Create notification (admin only)
PATCH  /notifications/:id             # Mark as read/unread
DELETE /notifications/:id             # Delete notification
POST   /notifications/broadcast       # Send broadcast (admin only)
```

### History Items
```
GET    /history-items                 # Get ticket history
POST   /history-items                 # Add comment/history entry
GET    /history-items/:id             # Get specific history item
PATCH  /history-items/:id             # Update history item
DELETE /history-items/:id             # Delete history item
```

### Files
```
POST   /files/upload                  # Upload file
GET    /files/:id                     # Get file metadata
DELETE /files/:id                     # Delete file
```

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 4.4+
- SMTP service for emails

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/NomadNiko/easytix-backend.git
cd easytix-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp env-example-document .env
# Edit .env with your configuration
```

4. **Start the application**
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## ⚙️ Configuration

### Environment Variables

```env
# Application
NODE_ENV=development
APP_PORT=3001
APP_NAME=EasyTix
API_PREFIX=api/v1
FRONTEND_DOMAIN=http://localhost:3000
BACKEND_DOMAIN=http://localhost:3001

# Database
DATABASE_URL=mongodb://localhost:27017/easytix
DATABASE_NAME=easytix

# JWT Configuration
AUTH_JWT_SECRET=your-jwt-secret
AUTH_JWT_TOKEN_EXPIRES_IN=15m
AUTH_REFRESH_SECRET=your-refresh-secret
AUTH_REFRESH_TOKEN_EXPIRES_IN=3650d

# Email Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_EMAIL=noreply@yourdomain.com
MAIL_DEFAULT_NAME=EasyTix

# File Upload
FILE_DRIVER=local
ACCESS_KEY_ID=your-s3-access-key
SECRET_ACCESS_KEY=your-s3-secret-key
AWS_S3_REGION=us-east-1
AWS_DEFAULT_S3_BUCKET=your-bucket-name

# Social Authentication
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
APPLE_APP_AUDIENCE=your-apple-audience
```

## 🧪 Testing

### Unit Tests
```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:cov
```

### E2E Tests
```bash
# Run E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- auth.e2e-spec.ts
```

### Database Seeding
```bash
# Seed the database with initial data
npm run seed:run

# Create a new seed file
npm run seed:create
```

## 📁 Project Structure

```
src/
├── app.module.ts                 # Main application module
├── main.ts                       # Application entry point
├── auth/                         # Authentication module
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── dto/                      # Data Transfer Objects
│   ├── services/                 # Auth-related services
│   └── strategies/               # Passport strategies
├── users/                        # User management module
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── users.module.ts
│   ├── domain/                   # Domain entities
│   ├── dto/                      # Data Transfer Objects
│   ├── infrastructure/           # Data persistence layer
│   └── services/                 # User-related services
├── tickets/                      # Ticket management module
│   ├── tickets.controller.ts
│   ├── tickets.service.ts
│   ├── tickets.module.ts
│   ├── domain/
│   ├── dto/
│   ├── infrastructure/
│   └── services/
├── queues/                       # Queue management module
├── categories/                   # Category management module
├── notifications/                # Notification system module
├── history-items/                # Ticket history module
├── files/                        # File management module
├── database/                     # Database configuration
│   ├── mongoose-config.service.ts
│   └── seeds/                    # Database seeding
├── utils/                        # Utility functions
├── config/                       # Configuration modules
└── mail/                         # Email service module
```

## 🔒 Security Features

### API Security
- **JWT Authentication** with refresh tokens
- **Rate limiting** to prevent abuse
- **Input validation** with class-validator
- **CORS configuration** for cross-origin requests
- **Helmet** for security headers
- **File upload validation** with type and size limits

### Database Security
- **Mongoose schema validation**
- **Sanitized queries** to prevent injection
- **Connection encryption** support
- **Index optimization** for performance

## 🚀 Deployment

### Docker Deployment
```bash
# Build the image
docker build -t easytix-backend .

# Run with docker-compose
docker-compose up -d
```

### PM2 Production Deployment
```bash
# Build the application
npm run build

# Start with PM2
pm2 start dist/main.js --name "easytix-backend"

# Start with ecosystem file
pm2 start ecosystem.config.js
```

### Environment-specific Builds
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

## 📊 Monitoring & Health Checks

### Health Check Endpoints
```
GET /health          # Application health status
GET /health/database # Database connectivity check
GET /health/memory   # Memory usage information
```

### Logging
- **Structured logging** with Winston
- **Request/Response logging** middleware
- **Error tracking** with stack traces
- **Performance monitoring** capabilities

## 🔧 Development

### Code Quality
- **ESLint** for code linting
- **Prettier** for code formatting
- **Husky** for pre-commit hooks
- **TypeScript** for type safety
- **Jest** for testing

### API Documentation
- **Swagger/OpenAPI** integration
- **Auto-generated documentation** from decorators
- **Interactive API explorer**
- **Schema validation** documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `npm run test:e2e`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, questions, or feature requests:
- 📧 Email: support@nomadsoft.us
- 🐛 Issues: [GitHub Issues](https://github.com/NomadNiko/easytix-backend/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/NomadNiko/easytix-backend/discussions)

## 🙏 Acknowledgments

- Built on the excellent [NestJS Boilerplate](https://github.com/brocoders/nestjs-boilerplate)
- Database modeling with [Mongoose](https://mongoosejs.com/)
- Authentication powered by [Passport](http://www.passportjs.org/)
- Email templates with [Handlebars](https://handlebarsjs.com/)
- API documentation with [Swagger](https://swagger.io/)

---

**Made with ❤️ by the EasyTix Team**