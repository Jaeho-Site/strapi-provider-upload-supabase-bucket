# Strapi Provider Upload Supabase

[![npm version](https://img.shields.io/npm/v/strapi-provider-upload-supabase-bucket.svg)](https://www.npmjs.com/package/strapi-provider-upload-supabase-bucket)
[![npm downloads](https://img.shields.io/npm/dm/strapi-provider-upload-supabase-bucket.svg)](https://www.npmjs.com/package/strapi-provider-upload-supabase-bucket)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Upload files to Supabase Storage from Strapi v5 with support for both public and private buckets.

## Features

- ✅ Strapi v5 compatible
- ✅ Node.js 20 and 22 support
- ✅ TypeScript with full type definitions
- ✅ CommonJS and ESM support
- ✅ Public buckets (permanent URLs)
- ✅ Private buckets (time-limited signed URLs)

## Installation

```bash
npm install strapi-provider-upload-supabase-bucket
```

or

```bash
yarn add strapi-provider-upload-supabase-bucket
```

## Requirements

- Node.js >= 20.0.0 and <= 22.x.x
- Strapi >= 5.0.0
- Supabase project with a storage bucket

## Quick Start

### 1. Environment Variables

Add to your `.env` file:

```env
SUPABASE_API_URL=https://your-project.supabase.co
SUPABASE_API_KEY=your-service-role-key
SUPABASE_BUCKET=your-bucket-name
SUPABASE_DIRECTORY=uploads
SUPABASE_PUBLIC_FILES=true
SUPABASE_SIGNED_URL_EXPIRES=3600
```

### 2. Plugin Configuration

Create or update `config/plugins.ts` (or `config/plugins.js` for JavaScript):

**TypeScript:**

```typescript
export default ({ env }) => ({
  upload: {
    config: {
      provider: 'strapi-provider-upload-supabase-bucket',
      providerOptions: {
        apiUrl: env('SUPABASE_API_URL'),
        apiKey: env('SUPABASE_API_KEY'),
        bucket: env('SUPABASE_BUCKET'),
        directory: env('SUPABASE_DIRECTORY', ''),
        publicFiles: env.bool('SUPABASE_PUBLIC_FILES', true),
        signedUrlExpires: env.int('SUPABASE_SIGNED_URL_EXPIRES', 3600),
      },
      sizeLimit: 250 * 1024 * 1024, // 250MB
    },
  },
});
```

**JavaScript:**

```javascript
module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'strapi-provider-upload-supabase-bucket',
      providerOptions: {
        apiUrl: env('SUPABASE_API_URL'),
        apiKey: env('SUPABASE_API_KEY'),
        bucket: env('SUPABASE_BUCKET'),
        directory: env('SUPABASE_DIRECTORY', ''),
        publicFiles: env.bool('SUPABASE_PUBLIC_FILES', true),
        signedUrlExpires: env.int('SUPABASE_SIGNED_URL_EXPIRES', 3600),
      },
      sizeLimit: 250 * 1024 * 1024, // 250MB
    },
  },
});
```

### 3. Security Configuration

Update `config/middlewares.ts` (or `config/middlewares.js`) to allow Supabase URLs:

```javascript
module.exports = [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            'https://your-project.supabase.co', // Replace with your project URL
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            'https://your-project.supabase.co', // Replace with your project URL
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
```

## Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `apiUrl` | string | Yes | - | Supabase project URL |
| `apiKey` | string | Yes | - | Supabase service role key |
| `bucket` | string | Yes | - | Storage bucket name |
| `directory` | string | No | `''` | Subdirectory for file organization |
| `publicFiles` | boolean | No | `true` | Public (`true`) or private (`false`) bucket |
| `signedUrlExpires` | number | No | `3600` | Signed URL expiration (seconds, private only) |

## Public vs Private Buckets

### Public Buckets (`publicFiles: true`)

Files are accessible via permanent public URLs without authentication.

```
https://your-project.supabase.co/storage/v1/object/public/bucket/uploads/file.jpg
```

**Best for:** Public assets, images, documents

### Private Buckets (`publicFiles: false`)

Files require time-limited signed URLs for access.

```
https://your-project.supabase.co/storage/v1/object/sign/bucket/uploads/file.jpg?token=...
```

**Best for:** User documents, sensitive files, access-controlled content

#### Accessing Private Files

```javascript
// Get file from Strapi
const file = await strapi.plugins.upload.services.upload.findOne(fileId);

// Generate signed URL
const provider = strapi.plugins.upload.provider;
const { url } = await provider.getSignedUrl(file);

// Use the temporary URL (expires after signedUrlExpires seconds)
console.log(url);
```

## Supabase Setup

1. Go to your Supabase dashboard
2. Navigate to **Storage** → **New bucket**
3. Create a bucket (choose Public or Private)
4. Get credentials from **Settings** → **API**:
   - Project URL → `SUPABASE_API_URL`
   - service_role key → `SUPABASE_API_KEY`

## Troubleshooting

### Files not displaying

Check `config/middlewares.js` includes your Supabase URL in CSP directives.

### Upload fails

- Verify `apiUrl`, `apiKey`, and `bucket` are correct
- Ensure you're using the `service_role` key (not `anon` key)
- Check bucket exists in Supabase

### Private bucket signed URLs not working

- Verify bucket is set to Private in Supabase
- Check `publicFiles: false` in configuration
- Ensure signed URLs are regenerated before expiration

## Testing

Tested and verified on:

| Bucket Type | Node 20 | Node 22 |
|-------------|---------|---------|
| Public      | ✅      | ✅      |
| Private     | ✅      | ✅      |

## Privacy

This provider does not collect, track, or transmit any usage data. All operations are performed directly between your Strapi instance and your Supabase project.

## Security

- Never commit your `service_role` key to version control
- Use environment variables for all credentials
- Set appropriate `signedUrlExpires` duration for private buckets
- Implement proper authentication before generating signed URLs

## License

MIT

## Links

- [GitHub Repository](https://github.com/Jaeho-site/strapi-provider-upload-supabase-bucket)
- [Issue Tracker](https://github.com/Jaeho-site/strapi-provider-upload-supabase-bucket/issues)
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Strapi Upload Docs](https://docs.strapi.io/dev-docs/plugins/upload)

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

---

Made with ❤️ for the Strapi community
