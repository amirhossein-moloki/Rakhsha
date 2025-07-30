# API Documentation

## Authentication

### `POST /api/auth/register`

Register a new user.

**Request Body:**

```json
{
    "username": "testuser",
    "email": "test@test.com",
    "password": "password"
}
```

**Response:**

```json
{
    "message": "User registered successfully"
}
```

### `POST /api/auth/login`

Login a user.

**Request Body:**

```json
{
    "email": "test@test.com",
    "password": "password"
}
```

**Response:**

```json
{
    "token": "your_jwt_token"
}
```

### `GET /api/auth/me`

Get the currently logged in user.

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Response:**

```json
{
    "_id": "user_id",
    "username": "testuser",
    "email": "test@test.com",
    "..."
}
```

### `POST /api/auth/generate-otp`

Generate a one-time password for hidden mode activation.

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Response:**

```json
{
    "otp": "your_otp"
}
```

### `POST /api/auth/activate-hidden-mode`

Activate hidden mode.

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Request Body:**

```json
{
    "otp": "your_otp"
}
```

**Response:**

```json
{
    "message": "Hidden mode activated"
}
```

### Stealth Mode

The API provides endpoints to activate a "stealth mode". This feature is intended to provide a layer of deniability or enhanced privacy.

- **Activation**: To activate this mode, a client must first request a one-time password (OTP) from `POST /api/auth/generate-otp`. This OTP is then sent to `POST /api/auth/activate-hidden-mode`.
- **Functionality**: Currently, activating stealth mode sets a temporary flag on the user's session on the server. However, **this flag is not yet used and has no effect on the application's behavior**. The feature is considered dormant or incomplete at this time.

## Conversations

### `POST /api/conversations`

Create a new conversation. This can be a private (one-on-one) or group conversation.

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Request Body:**

```json
{
    "type": "group",
    "participants": ["user_id_1", "user_id_2", "user_id_3"],
    "name": "My Group Chat"
}
```

**Response:**

The new conversation object.

### `GET /api/conversations`

Get all conversations for the logged in user.

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Response:**

An array of conversation objects.

### `GET /api/conversations/:conversationId/messages`

Get all messages for a conversation.

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Response:**

An array of message objects.

### `PUT /api/conversations/messages/:messageId`

Edit a message.

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Request Body:**

```json
{
    "content": "Edited message"
}
```

**Response:**

The updated message object.

### `DELETE /api/conversations/messages/:messageId`

Delete a message.

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Response:**

```json
{
    "message": "Message deleted"
}
```

### `POST /api/conversations/messages/send-file`

Send a file.

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Request Body:**

A `multipart/form-data` request with a `file` field containing the file to upload and a `conversationId` field.

**Response:**

The new message object.
