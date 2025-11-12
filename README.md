# Strapi Provider Upload Supabase

Supabase Storage upload provider for Strapi v5 with support for both public and private buckets.

## Features

- ✅ Strapi v5 compatible
- ✅ Node.js 22-24 support
- ✅ TypeScript implementation
- ✅ Public bucket support
- ✅ Private bucket support with signed URLs
- ✅ Configurable signed URL expiration

## Installation

```bash
npm install strapi-provider-upload-supabase
```

## Configuration

### Public Bucket Configuration

```javascript
// config/plugins.js
module.exports = {
  upload: {
    config: {
      provider: 'strapi-provider-upload-supabase',
      providerOptions: {
        apiUrl: process.env.SUPABASE_API_URL,
        apiKey: process.env.SUPABASE_API_KEY,
        bucket: process.env.SUPABASE_BUCKET,
        directory: 'uploads',
        publicFiles: true,
      },
    },
  },
};
```

### Private Bucket Configuration

```javascript
// config/plugins.js
module.exports = {
  upload: {
    config: {
      provider: 'strapi-provider-upload-supabase',
      providerOptions: {
        apiUrl: process.env.SUPABASE_API_URL,
        apiKey: process.env.SUPABASE_API_KEY,
        bucket: process.env.SUPABASE_BUCKET_PRIVATE,
        directory: 'private-uploads',
        publicFiles: false,
        signedUrlExpires: 3600, // 1 hour in seconds
      },
    },
  },
};
```

## Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `apiUrl` | string | Yes | - | Your Supabase project URL (e.g., https://xxx.supabase.co) |
| `apiKey` | string | Yes | - | Your Supabase service_role key |
| `bucket` | string | Yes | - | The name of your Supabase storage bucket |
| `directory` | string | No | `''` | Optional subdirectory within the bucket |
| `publicFiles` | boolean | No | `true` | Whether the bucket is public or private |
| `signedUrlExpires` | number | No | `3600` | Signed URL expiration time in seconds (for private buckets) |

## Environment Variables

Create a `.env` file in your Strapi project root:

```env
SUPABASE_API_URL=https://your-project.supabase.co
SUPABASE_API_KEY=your-service-role-key
SUPABASE_BUCKET=your-bucket-name
```

## Public vs Private Buckets

### Public Buckets
- Files are accessible via permanent public URLs
- No authentication required to access files
- Best for public assets like images, videos, etc.

### Private Buckets
- Files require authentication to access
- Temporary signed URLs are generated on-demand
- URLs expire after the configured time period
- Best for sensitive or user-specific content

## Requirements

- Node.js >= 22.0.0
- Strapi >= 5.0.0
- A Supabase project with a configured storage bucket

## License

MIT
