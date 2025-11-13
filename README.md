# Strapi Provider Upload Supabase

A Supabase Storage upload provider for Strapi v5 with support for both public and private buckets.

## Features

- ✅ Full Strapi v5 compatibility
- ✅ TypeScript support with complete type definitions
- ✅ Public bucket support with permanent URLs
- ✅ Private bucket support with time-limited signed URLs
- ✅ Node.js 22 and 24 support with native fetch
- ✅ Configurable file size validation
- ✅ Automatic file path management

## Installation

```bash
npm install strapi-provider-upload-supabase
```

or

```bash
yarn add strapi-provider-upload-supabase
```

## Requirements

- Node.js >= 22.0.0 and <= 24.x.x
- Strapi >= 5.0.0
- A Supabase project with a storage bucket

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
SUPABASE_API_URL=https://your-project.supabase.co
SUPABASE_API_KEY=your-service-role-key
SUPABASE_BUCKET=your-bucket-name
```

### Plugin Configuration

Create or update `config/plugins.js` (or `config/plugins.ts` for TypeScript):

#### Public Bucket Configuration

For public buckets where files are accessible via permanent public URLs:

```javascript
module.exports = {
  upload: {
    config: {
      provider: 'strapi-provider-upload-supabase',
      providerOptions: {
        apiUrl: process.env.SUPABASE_API_URL,
        apiKey: process.env.SUPABASE_API_KEY,
        bucket: process.env.SUPABASE_BUCKET,
        directory: 'uploads', // optional, defaults to ''
        publicFiles: true, // optional, defaults to true
      },
    },
  },
};
```

#### Private Bucket Configuration

For private buckets where files require authentication and use time-limited signed URLs:

```javascript
module.exports = {
  upload: {
    config: {
      provider: 'strapi-provider-upload-supabase',
      providerOptions: {
        apiUrl: process.env.SUPABASE_API_URL,
        apiKey: process.env.SUPABASE_API_KEY,
        bucket: process.env.SUPABASE_BUCKET_PRIVATE,
        directory: 'private-uploads', // optional, defaults to ''
        publicFiles: false, // set to false for private buckets
        signedUrlExpires: 3600, // optional, defaults to 3600 (1 hour)
      },
    },
  },
};
```

## Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `apiUrl` | string | Yes | - | Your Supabase project URL (e.g., `https://xxx.supabase.co`) |
| `apiKey` | string | Yes | - | Your Supabase service role key |
| `bucket` | string | Yes | - | Name of the Supabase storage bucket |
| `directory` | string | No | `''` | Optional subdirectory within the bucket for organizing files |
| `publicFiles` | boolean | No | `true` | Whether the bucket is public (`true`) or private (`false`) |
| `signedUrlExpires` | number | No | `3600` | Expiration time in seconds for signed URLs (private buckets only) |

## Public vs Private Buckets

### Public Buckets

When `publicFiles` is set to `true` (default):

- Files are uploaded to a public Supabase bucket
- Permanent public URLs are generated and stored
- Files are accessible without authentication
- Best for: public assets, images, documents that should be freely accessible

**Example URL format:**
```
https://your-project.supabase.co/storage/v1/object/public/bucket-name/uploads/abc123.jpg
```

### Private Buckets

When `publicFiles` is set to `false`:

- Files are uploaded to a private Supabase bucket
- Only file paths are stored (not full URLs)
- Access requires generating time-limited signed URLs
- Signed URLs expire after the configured duration
- Best for: user documents, sensitive files, content requiring access control

**How it works:**
1. Files are uploaded and only the path is stored
2. When access is needed, call `getSignedUrl()` to generate a temporary URL
3. The signed URL expires after `signedUrlExpires` seconds
4. New signed URLs can be generated as needed

## Usage Examples

### Basic File Upload

```javascript
// Strapi handles file uploads automatically through the Media Library
// or through the REST API
```

### Accessing Files in Code

#### Public Bucket Files

```javascript
// For public buckets, file.url contains the permanent public URL
const file = await strapi.plugins.upload.services.upload.findOne(fileId);
console.log(file.url); // Direct public URL
```

#### Private Bucket Files

```javascript
// For private buckets, generate a signed URL
const file = await strapi.plugins.upload.services.upload.findOne(fileId);
const provider = strapi.plugins.upload.provider;

// Generate a time-limited signed URL
const { url } = await provider.getSignedUrl(file);
console.log(url); // Temporary signed URL
```

### Custom Controller Example

```javascript
// api/custom/controllers/file.js
module.exports = {
  async getSecureFile(ctx) {
    const { id } = ctx.params;
    
    // Get the file from Strapi
    const file = await strapi.plugins.upload.services.upload.findOne(id);
    
    if (!file) {
      return ctx.notFound('File not found');
    }
    
    // Get the upload provider
    const provider = strapi.plugins.upload.provider;
    
    // Check if bucket is private
    if (provider.isPrivate()) {
      // Generate signed URL for private files
      const { url } = await provider.getSignedUrl(file);
      return ctx.send({ url });
    } else {
      // Return public URL directly
      return ctx.send({ url: file.url });
    }
  },
};
```

## Setting Up Supabase Storage

### 1. Create a Storage Bucket

In your Supabase dashboard:

1. Go to **Storage** section
2. Click **New bucket**
3. Enter a bucket name
4. Choose **Public** or **Private** based on your needs
5. Click **Create bucket**

### 2. Configure Bucket Policies (Private Buckets Only)

For private buckets, you may want to set up Row Level Security (RLS) policies:

```sql
-- Example: Allow authenticated users to read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
USING (auth.uid()::text = (storage.foldername(name))[1]);
```

### 3. Get Your Credentials

1. Go to **Settings** > **API**
2. Copy your **Project URL** (apiUrl)
3. Copy your **service_role** key (apiKey) - **Keep this secret!**

## Troubleshooting

### Error: "Supabase provider requires apiUrl, apiKey, and bucket configuration"

**Cause:** Missing required configuration parameters.

**Solution:** Ensure all required fields are set in your `config/plugins.js`:
- `apiUrl`
- `apiKey`
- `bucket`

### Error: "Failed to upload file to Supabase"

**Possible causes:**
1. Invalid API credentials
2. Bucket doesn't exist
3. Insufficient permissions
4. Network connectivity issues

**Solutions:**
- Verify your `apiUrl` and `apiKey` are correct
- Check that the bucket exists in your Supabase project
- Ensure you're using the `service_role` key (not the `anon` key)
- Check your network connection and firewall settings

### Error: "File exceeds size limit"

**Cause:** File size exceeds the configured limit in Strapi.

**Solution:** Adjust the size limit in your Strapi configuration:

```javascript
// config/plugins.js
module.exports = {
  upload: {
    config: {
      sizeLimit: 250 * 1024 * 1024, // 250MB in bytes
      provider: 'strapi-provider-upload-supabase',
      // ... other options
    },
  },
};
```

### Signed URLs Not Working (Private Buckets)

**Possible causes:**
1. Bucket is not configured as private in Supabase
2. Signed URL has expired
3. Incorrect bucket permissions

**Solutions:**
- Verify bucket is set to **Private** in Supabase dashboard
- Generate a new signed URL (they expire after `signedUrlExpires` seconds)
- Check bucket policies and RLS settings in Supabase

### Files Not Accessible (Public Buckets)

**Possible causes:**
1. Bucket is not configured as public in Supabase
2. `publicFiles` is set to `false` in configuration

**Solutions:**
- Verify bucket is set to **Public** in Supabase dashboard
- Ensure `publicFiles: true` in your provider configuration

### TypeScript Errors

**Cause:** Missing type definitions.

**Solution:** The package includes TypeScript definitions. Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

## Security Considerations

### API Key Security

- **Never** commit your `service_role` key to version control
- Use environment variables for all sensitive credentials
- The `service_role` key bypasses Row Level Security - use with caution
- Consider using the `anon` key with RLS policies for user-facing operations

### Private Bucket Best Practices

- Set appropriate `signedUrlExpires` duration (shorter is more secure)
- Implement proper authentication before generating signed URLs
- Use RLS policies to control access at the database level
- Regularly audit access logs in Supabase dashboard

### Public Bucket Best Practices

- Only use public buckets for truly public content
- Be aware that public URLs are permanent and accessible to anyone
- Consider using private buckets with signed URLs for sensitive content
- Implement proper file validation before upload

## Migration from v4 Provider

If you're migrating from the deprecated Strapi v4 Supabase provider:

### Key Differences

1. **Strapi v5 Compatibility:** This provider is built for Strapi v5
2. **Private Bucket Support:** New support for private buckets with signed URLs
3. **TypeScript:** Full TypeScript implementation with type definitions
4. **Node.js Version:** Requires Node.js 22+ (uses native fetch)

### Migration Steps

1. Update to Strapi v5
2. Install this provider: `npm install strapi-provider-upload-supabase`
3. Update your configuration in `config/plugins.js`
4. Test file uploads and access
5. For private buckets, update your code to use `getSignedUrl()`

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Support

For issues and questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review [Supabase Storage documentation](https://supabase.com/docs/guides/storage)
- Review [Strapi Upload documentation](https://docs.strapi.io/dev-docs/plugins/upload)

## Changelog

### 1.0.0
- Initial release
- Strapi v5 support
- Public and private bucket support
- TypeScript implementation
- Node.js 22 and 24 support
