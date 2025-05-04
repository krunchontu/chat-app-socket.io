# Chat Application API Documentation

This document provides detailed information about the REST API endpoints and Socket.IO events available in the chat application.

## REST API Endpoints

### Authentication

#### Register a new user

```
POST /api/users/register
```

**Request Body:**
```json
{
  "username": "username",
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "username": "username",
    "email": "user@example.com"
  }
}
```

#### Login

```
POST /api/users/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "username": "username",
    "email": "user@example.com"
  }
}
```

### Messages

#### Get messages

```
GET /api/messages
```

**Query Parameters:**
- `limit` (optional): Number of messages to return (default: 50)
- `before` (optional): Return messages older than this message ID

**Response:**
```json
{
  "messages": [
    {
      "id": "message-id",
      "user": "username",
      "text": "Message text",
      "timestamp": "2023-01-01T00:00:00.000Z",
      "likes": 0,
      "likedBy": [],
      "reactions": {}
    }
  ],
  "hasMore": true
}
```

#### Get message by ID

```
GET /api/messages/:id
```

**Response:**
```json
{
  "id": "message-id",
  "user": "username",
  "text": "Message text",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "likes": 0,
  "likedBy": [],
  "reactions": {},
  "replies": []
}
```

#### Get message replies

```
GET /api/messages/:id/replies
```

**Response:**
```json
{
  "replies": [
    {
      "id": "reply-id",
      "user": "username",
      "text": "Reply text",
      "timestamp": "2023-01-01T00:00:00.000Z",
      "likes": 0,
      "likedBy": [],
      "reactions": {},
      "parentId": "message-id"
    }
  ]
}
```

## Socket.IO Events

### Connection

#### Connection Authentication

The client must include a JWT token in the connection query string:

```javascript
const socket = io.connect('http://localhost:4500', {
  query: { token: 'jwt-token' }
});
```

### Emitted by Client

#### Send Message

```javascript
socket.emit('message', {
  text: 'Message text',
  tempId: 'client-generated-temp-id' // Optional, used for optimistic updates
});
```

#### Edit Message

```javascript
socket.emit('editMessage', {
  id: 'message-id',
  text: 'Updated message text'
});
```

#### Delete Message

```javascript
socket.emit('deleteMessage', {
  id: 'message-id'
});
```

#### Toggle Like (Legacy)

```javascript
socket.emit('like', {
  id: 'message-id'
});
```

#### Toggle Reaction

```javascript
socket.emit('reaction', {
  id: 'message-id',
  emoji: '👍' // Unicode emoji
});
```

#### Reply to Message

```javascript
socket.emit('replyToMessage', {
  parentId: 'message-id',
  text: 'Reply text'
});
```

### Emitted by Server

#### Message Received

```javascript
socket.on('message', (message) => {
  // Handle new message
  // message: { id, user, text, timestamp, likes, likedBy, reactions, _meta }
});
```

#### Alternative Message Event (Newer Clients)

```javascript
socket.on('sendMessage', (message) => {
  // Handle new message - same format as 'message' event
  // message: { id, user, text, timestamp, likes, likedBy, reactions, _meta }
});
```

#### Message Updated

```javascript
socket.on('messageUpdated', (update) => {
  // Handle message update
  // update: { id, likes, likedBy, reactions }
});
```

#### Message Edited

```javascript
socket.on('messageEdited', (message) => {
  // Handle edited message
  // message: { id, user, text, timestamp, likes, likedBy, reactions }
});
```

#### Message Deleted

```javascript
socket.on('messageDeleted', (data) => {
  // Handle message deletion
  // data: { id }
});
```

#### Reply Created

```javascript
socket.on('replyCreated', (reply) => {
  // Handle new reply
  // reply: { id, user, text, timestamp, likes, likedBy, reactions, parentId }
});
```

#### User Notifications

```javascript
socket.on('userNotification', (notification) => {
  // Handle user joining/leaving notification
  // notification: { type, message, timestamp }
  // type: 'join' or 'leave'
});
```

#### Online Users

```javascript
socket.on('onlineUsers', (users) => {
  // Handle list of online users
  // users: [{ id, username }]
});
```

#### Error

```javascript
socket.on('error', (error) => {
  // Handle error
  // error: { message }
});
```

## Error Handling

### HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required or invalid credentials
- `403 Forbidden`: Permission denied
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Socket.IO Errors

Socket.IO errors are sent through the `error` event with a message describing the error.

## Rate Limiting

API endpoints are rate-limited to protect against abuse. The current limits are:

- 100 requests per 15 minutes for authentication endpoints
- 300 requests per 15 minutes for other API endpoints

## Versioning

The current API version is v1. The version is implied in the endpoint paths.

## Security Considerations

- All requests should use HTTPS in production
- Authentication is handled via JWT tokens
- Socket.IO connections require valid authentication
- CORS is configured to restrict access to trusted origins
