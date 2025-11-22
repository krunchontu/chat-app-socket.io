/**
 * Swagger API Documentation Configuration
 *
 * This file configures Swagger/OpenAPI documentation for the Chat App API.
 * Access the interactive docs at /api-docs
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Chat App API Documentation',
      version: '1.0.0',
      description: `
        A real-time chat application API built with Node.js, Express, Socket.IO, and MongoDB.

        ## Features
        - JWT-based authentication with account lockout
        - Real-time messaging via Socket.IO
        - Message editing, deletion, and reactions
        - User presence tracking
        - Rate limiting and security controls

        ## Authentication
        Most endpoints require a JWT token. Include it in the Authorization header:
        \`\`\`
        Authorization: Bearer <your-jwt-token>
        \`\`\`

        ## Rate Limiting
        - REST API: 100 requests per 15 minutes
        - Socket.IO: Event-specific limits (30-60/min)
      `,
      contact: {
        name: 'API Support',
        url: 'https://github.com/krunchontu/chat-app-socket.io',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://your-production-url.com'
          : 'http://localhost:5000',
        description: process.env.NODE_ENV === 'production'
          ? 'Production server'
          : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token obtained from /api/users/login',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
              example: '507f1f77bcf86cd799439011',
            },
            username: {
              type: 'string',
              description: 'Username (unique)',
              example: 'john_doe',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email',
              example: 'john@example.com',
            },
            isOnline: {
              type: 'boolean',
              description: 'Online status',
              example: true,
            },
            lastSeen: {
              type: 'string',
              format: 'date-time',
              description: 'Last seen timestamp',
              example: '2025-11-22T00:00:00.000Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
              example: '2025-11-22T00:00:00.000Z',
            },
          },
        },
        Message: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Message ID',
              example: '507f1f77bcf86cd799439011',
            },
            user: {
              type: 'object',
              properties: {
                _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                username: { type: 'string', example: 'john_doe' },
              },
            },
            text: {
              type: 'string',
              description: 'Message content',
              example: 'Hello, world!',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Message timestamp',
              example: '2025-11-22T00:00:00.000Z',
            },
            isEdited: {
              type: 'boolean',
              description: 'Whether message was edited',
              example: false,
            },
            isDeleted: {
              type: 'boolean',
              description: 'Whether message was deleted',
              example: false,
            },
            reactions: {
              type: 'array',
              description: 'Message reactions',
              items: {
                type: 'object',
                properties: {
                  emoji: { type: 'string', example: '👍' },
                  userId: { type: 'string', example: '507f1f77bcf86cd799439011' },
                  username: { type: 'string', example: 'john_doe' },
                },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message',
              example: 'An error occurred',
            },
            errors: {
              type: 'array',
              description: 'Validation errors',
              items: {
                type: 'string',
              },
              example: ['Username is required', 'Password must be at least 8 characters'],
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints (register, login, logout)',
      },
      {
        name: 'Users',
        description: 'User management endpoints',
      },
      {
        name: 'Messages',
        description: 'Message CRUD operations',
      },
      {
        name: 'Health',
        description: 'Health check and monitoring endpoints',
      },
    ],
  },
  apis: [
    './routes/*.js',
    './controllers/*.js',
    './index.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
