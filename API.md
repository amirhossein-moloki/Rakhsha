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

### `POST /api/auth/secret-login`

Login to "Secret Mode" to access hidden conversations.

**Request Body:**

```json
{
    "username": "testuser",
    "secondaryPassword": "your_secret_password"
}
```

**Response:**

A special JWT token that grants access to secret mode.

```json
{
    "token": "your_secret_mode_jwt_token"
}
```

## Users

### `GET /api/users`

Get all users.

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Response:**

An array of user objects.

### `POST /api/users/secondary-password`

Set or update the user's secondary password. This password is used to access "Secret Mode".

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Request Body:**

```json
{
    "secondaryPassword": "a_strong_password_for_secret_mode"
}
```

**Response:**

```json
{
    "message": "Secondary password set successfully."
}
```

## Messages

### `POST /api/messages`

Send a new message to a conversation.

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Request Body:**

```json
{
    "conversationId": "your_conversation_id",
    "content": "Hello, world!"
}
```

**Response:**

The new message object.

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

Send a file. **Note: This feature is not yet implemented on the frontend.**

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Request Body:**

A `multipart/form-data` request with a `file` field containing the file to upload and a `conversationId` field.

**Response:**

The new message object.

### `POST /api/conversations/:conversationId/hide`

Mark a conversation as hidden. It will only be visible in "Secret Mode".

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Response:**

```json
{
    "message": "Conversation hidden successfully."
}
```

### `POST /api/conversations/:conversationId/unhide`

Mark a conversation as not hidden. It will only be visible in normal mode.

**Headers:**

```
Authorization: Bearer your_jwt_token
```

**Response:**

```json
{
    "message": "Conversation unhidden successfully."
}
```
