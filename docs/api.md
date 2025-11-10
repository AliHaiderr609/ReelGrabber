# SaveClip API Documentation

## Overview

The SaveClip API provides programmatic access to Instagram content downloading functionality. The API is RESTful and uses JSON for data exchange.

## Base URL

```
Production: https://api.saveclip.app
Development: http://localhost:3000/api
```

## Authentication

### API Key Authentication

Include your API key in the request headers:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.saveclip.app/download
```

### JWT Token Authentication

For user-specific endpoints, include the JWT token:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     https://api.saveclip.app/user/profile
```

## Rate Limits

| Tier | Requests per Hour | Burst Limit |
|------|------------------|-------------|
| Free | 100 | 10 |
| Pro | 1,000 | 100 |
| Enterprise | 10,000 | 1,000 |

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Endpoints

### Download Content

Download Instagram content by URL.

**Endpoint:** `POST /api/download`

**Request Body:**
```json
{
  "url": "https://www.instagram.com/p/ABC123/",
  "quality": "high",
  "format": "mp4"
}
```

**Parameters:**
- `url` (required): Instagram URL to download
- `quality` (optional): "low", "medium", "high" (default: "high")
- `format` (optional): "mp4", "jpg", "png" (default: auto-detect)

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "type": "video",
      "url": "https://cdn.instagram.com/video.mp4",
      "thumbnail": "https://cdn.instagram.com/thumb.jpg",
      "title": "Instagram Video",
      "duration": "0:15",
      "size": "2.5 MB",
      "author": "username"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Response:**
```json
{
  "error": "Invalid Instagram URL",
  "code": "INVALID_URL",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Get Download History

Retrieve user's download history.

**Endpoint:** `GET /api/user/downloads`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by content type

**Response:**
```json
{
  "success": true,
  "downloads": [
    {
      "id": "dl_123",
      "url": "https://www.instagram.com/p/ABC123/",
      "contentType": "video",
      "status": "completed",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "metadata": {
        "title": "Instagram Video",
        "duration": "0:15",
        "size": "2.5 MB"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### User Profile

Get current user profile information.

**Endpoint:** `GET /api/user/profile`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "username": "username",
    "tier": "pro",
    "subscription": {
      "plan": "PRO_MONTHLY",
      "status": "active",
      "currentPeriodEnd": "2024-02-01T00:00:00.000Z"
    },
    "usage": {
      "downloadsToday": 15,
      "downloadsLimit": 100,
      "apiCallsToday": 50,
      "apiCallsLimit": 1000
    }
  }
}
```

### Usage Statistics

Get detailed usage statistics.

**Endpoint:** `GET /api/user/usage`

**Query Parameters:**
- `period` (optional): "day", "week", "month" (default: "month")

**Response:**
```json
{
  "success": true,
  "stats": {
    "period": "month",
    "downloads": {
      "total": 150,
      "byType": {
        "video": 80,
        "photo": 50,
        "reel": 20
      },
      "daily": [
        { "date": "2024-01-01", "count": 5 },
        { "date": "2024-01-02", "count": 8 }
      ]
    },
    "apiCalls": {
      "total": 500,
      "endpoints": {
        "/download": 400,
        "/user/profile": 100
      }
    }
  }
}
```

### Create Subscription

Create a new subscription.

**Endpoint:** `POST /api/subscription/create`

**Request Body:**
```json
{
  "plan": "PRO_MONTHLY",
  "successUrl": "https://app.saveclip.app/success",
  "cancelUrl": "https://app.saveclip.app/cancel"
}
```

**Response:**
```json
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/pay/cs_123"
}
```

### Cancel Subscription

Cancel current subscription.

**Endpoint:** `POST /api/subscription/cancel`

**Response:**
```json
{
  "success": true,
  "message": "Subscription canceled successfully"
}
```

### Generate API Key

Generate a new API key for the user.

**Endpoint:** `POST /api/user/api-key`

**Response:**
```json
{
  "success": true,
  "apiKey": "sk_1234567890abcdef",
  "message": "API key generated successfully"
}
```

### Revoke API Key

Revoke the current API key.

**Endpoint:** `DELETE /api/user/api-key`

**Response:**
```json
{
  "success": true,
  "message": "API key revoked successfully"
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_URL` | Invalid Instagram URL | 400 |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded | 429 |
| `UNAUTHORIZED` | Invalid or missing authentication | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `CONTENT_UNAVAILABLE` | Instagram content unavailable | 422 |
| `EXTRACTION_FAILED` | Failed to extract content | 500 |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable | 503 |

## Webhooks

### Stripe Webhooks

Handle Stripe payment events.

**Endpoint:** `POST /api/webhooks/stripe`

**Events:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

### Usage Webhooks

Get notified of usage events.

**Endpoint:** `POST /api/webhooks/usage`

**Events:**
- `download.completed`
- `rate_limit.exceeded`
- `subscription.expired`

## SDKs

### JavaScript/TypeScript

```bash
npm install @saveclip/sdk
```

```javascript
import { SaveClipClient } from '@saveclip/sdk';

const client = new SaveClipClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.saveclip.app'
});

const result = await client.download({
  url: 'https://www.instagram.com/p/ABC123/',
  quality: 'high'
});
```

### Python

```bash
pip install saveclip-sdk
```

```python
from saveclip import SaveClipClient

client = SaveClipClient(
    api_key='your-api-key',
    base_url='https://api.saveclip.app'
)

result = client.download(
    url='https://www.instagram.com/p/ABC123/',
    quality='high'
)
```

### PHP

```bash
composer require saveclip/sdk
```

```php
use SaveClip\SaveClipClient;

$client = new SaveClipClient([
    'api_key' => 'your-api-key',
    'base_url' => 'https://api.saveclip.app'
]);

$result = $client->download([
    'url' => 'https://www.instagram.com/p/ABC123/',
    'quality' => 'high'
]);
```

## Examples

### Basic Download

```bash
curl -X POST https://api.saveclip.app/download \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.instagram.com/p/ABC123/"
  }'
```

### Download with Options

```bash
curl -X POST https://api.saveclip.app/download \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.instagram.com/reel/XYZ789/",
    "quality": "high",
    "format": "mp4"
  }'
```

### Get User Profile

```bash
curl -X GET https://api.saveclip.app/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Support

For API support:
- Email: api-support@saveclip.app
- Documentation: https://docs.saveclip.app
- Status Page: https://status.saveclip.app
