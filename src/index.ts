import { StorageClient } from '@supabase/storage-js';
import { ProviderConfig, UploadProvider, StrapiFile } from './types';
import { getBearerToken, getStorageEndpoint, getPathKey, kbytesToBytes, bytesToHumanReadable } from './utils';

/**
 * Strapi instance interface (minimal typing for what we need)
 * 
 * This interface defines the minimal Strapi API surface required by the provider
 * to retrieve configuration from the Strapi v5 plugin system.
 */
interface Strapi {
  plugin(name: string): {
    config(key: string): any;
  };
}

/**
 * Initialize the Supabase Storage upload provider for Strapi v5
 * 
 * This is the main entry point for the provider. It validates configuration,
 * initializes the Supabase Storage Client, and returns an object implementing
 * the UploadProvider interface with all required methods.
 * 
 * @param strapi - The Strapi instance used to retrieve plugin configuration
 * @returns Upload provider implementation with methods for file operations
 * @throws {Error} If required configuration (apiUrl, apiKey, bucket) is missing
 * 
 * @example
 * ```typescript
 * // Strapi automatically calls this function during initialization
 * // Configuration is provided via config/plugins.js:
 * module.exports = {
 *   upload: {
 *     config: {
 *       provider: 'strapi-provider-upload-supabase',
 *       providerOptions: {
 *         apiUrl: process.env.SUPABASE_API_URL,
 *         apiKey: process.env.SUPABASE_API_KEY,
 *         bucket: process.env.SUPABASE_BUCKET,
 *         directory: 'uploads',
 *         publicFiles: true,
 *         signedUrlExpires: 3600,
 *       },
 *     },
 *   },
 * };
 * ```
 */
export default (strapi: Strapi): UploadProvider => {
  // Sub-task 4.2: Retrieve configuration from Strapi v5 config system
  const config: ProviderConfig = strapi.plugin('upload').config('providerOptions');

  // Sub-task 4.2: Validate presence of required fields
  if (!config.apiUrl || !config.apiKey || !config.bucket) {
    throw new Error(
      'Supabase provider requires apiUrl, apiKey, and bucket configuration. ' +
      'Please check your plugin configuration.'
    );
  }

  // Sub-task 4.2: Apply default values for optional fields
  const directory = config.directory ?? '';
  const publicFiles = config.publicFiles ?? true;
  const signedUrlExpires = config.signedUrlExpires ?? 3600;

  // Sub-task 4.3: Create storage endpoint using getStorageEndpoint utility
  const storageEndpoint = getStorageEndpoint(config.apiUrl);

  // Sub-task 4.3: Initialize StorageClient with endpoint and authorization headers
  const storageClient = new StorageClient(storageEndpoint, {
    apikey: config.apiKey,
    Authorization: getBearerToken(config.apiKey),
  });

  /**
   * Internal function to handle file upload to Supabase Storage
   * 
   * This function handles the actual upload process and URL generation for both
   * public and private buckets. It's used by both upload() and uploadStream() methods.
   * 
   * For public buckets:
   * - Uploads the file and generates a permanent public URL
   * - Stores the full URL in file.url
   * 
   * For private buckets:
   * - Uploads the file and stores only the file path
   * - Signed URLs must be generated later using getSignedUrl()
   * 
   * @param file - The Strapi file object containing file data and metadata
   * @throws {Error} If the upload operation fails
   * 
   * @internal
   */
  const uploadFile = async (file: StrapiFile): Promise<void> => {
    // Sub-task 5.1: Generate file path using getPathKey utility
    const filePath = getPathKey(file, directory);

    // Sub-task 5.1: Upload file to Supabase using storage.from(bucket).upload()
    const { data, error } = await storageClient
      .from(config.bucket)
      .upload(filePath, file.stream || file.buffer!, {
        contentType: file.mime,
        duplex: 'half',
        upsert: true,
        cacheControl: '3600',
      });

    // Sub-task 5.1: Handle upload errors and throw with descriptive message
    if (error) {
      throw new Error(`Failed to upload file to Supabase: ${error.message}`);
    }

    // Sub-task 5.2: Check publicFiles configuration and generate appropriate URL
    if (publicFiles) {
      // Sub-task 5.2: For public buckets, call getPublicUrl() and store full URL
      const { data: publicUrlData } = storageClient
        .from(config.bucket)
        .getPublicUrl(filePath);
      
      file.url = publicUrlData.publicUrl;
    } else {
      // Sub-task 5.2: For private buckets, store only file path
      file.url = filePath;
    }

    // Sub-task 5.2: Set file.mime to contentType
    file.mime = file.mime;
  };

  // Sub-task 4.1: Return provider object with required methods
  return {
    /**
     * Upload a file to Supabase Storage
     * 
     * Handles file uploads for both buffer and stream-based file objects.
     * The file's URL property will be updated with either a public URL
     * (for public buckets) or a file path (for private buckets).
     * 
     * @param file - The Strapi file object to upload
     * @returns Promise that resolves when upload is complete
     * @throws {Error} If the upload operation fails
     * 
     * @example
     * ```typescript
     * // Strapi calls this automatically during file upload
     * await provider.upload(file);
     * console.log(file.url); // Public URL or file path
     * ```
     */
    async upload(file: StrapiFile): Promise<void> {
      await uploadFile(file);
    },

    /**
     * Upload a file stream to Supabase Storage
     * 
     * This method is functionally identical to upload() and handles both
     * buffer and stream-based uploads. It exists to satisfy the Strapi v5
     * provider interface requirements.
     * 
     * @param file - The Strapi file object with stream to upload
     * @returns Promise that resolves when upload is complete
     * @throws {Error} If the upload operation fails
     * 
     * @example
     * ```typescript
     * // Strapi calls this automatically for stream uploads
     * await provider.uploadStream(file);
     * ```
     */
    async uploadStream(file: StrapiFile): Promise<void> {
      await uploadFile(file);
    },

    /**
     * Delete a file from Supabase Storage
     * 
     * Removes the file from the configured Supabase bucket. Works for both
     * public and private buckets.
     * 
     * @param file - The Strapi file object to delete
     * @returns Promise that resolves when deletion is complete
     * @throws {Error} If the deletion operation fails
     * 
     * @example
     * ```typescript
     * // Strapi calls this automatically when a file is deleted
     * await provider.delete(file);
     * ```
     */
    async delete(file: StrapiFile): Promise<void> {
      // Sub-task 6.1: Extract file path from file.url using getPathKey utility
      // For public buckets, file.url contains the full URL, so we need to extract just the path
      // For private buckets, file.url already contains just the path
      const filePath = getPathKey(file, directory);

      // Sub-task 6.1: Call storage.from(bucket).remove() with file path array
      const { error } = await storageClient
        .from(config.bucket)
        .remove([filePath]);

      // Sub-task 6.1: Handle deletion errors and throw with descriptive message
      if (error) {
        throw new Error(`Failed to delete file from Supabase: ${error.message}`);
      }

      // Sub-task 6.1: Return Promise<void> (implicit return)
    },

    /**
     * Validate file size against configured limits
     * 
     * Checks if the file size exceeds the configured size limit and throws
     * an error with a human-readable message if it does. This is called by
     * Strapi before attempting to upload a file.
     * 
     * @param file - The Strapi file object to validate
     * @param options - Options object containing the sizeLimit in bytes
     * @returns Promise that resolves if size is valid
     * @throws {Error} If file size exceeds the limit, with human-readable size information
     * 
     * @example
     * ```typescript
     * // Strapi calls this automatically before upload
     * await provider.checkFileSize(file, { sizeLimit: 10000000 }); // 10MB limit
     * ```
     */
    async checkFileSize(file: StrapiFile, options: { sizeLimit: number }): Promise<void> {
      // Sub-task 7.1: Convert file size from KB to bytes using kbytesToBytes utility
      const fileSizeInBytes = kbytesToBytes(file.size);
      
      // Sub-task 7.1: Compare against sizeLimit from options
      if (fileSizeInBytes > options.sizeLimit) {
        // Sub-task 7.1: Throw error with file name and human-readable size limit if exceeded
        // Sub-task 7.1: Use bytesToHumanReadable utility for error message
        throw new Error(
          `${file.name} exceeds size limit of ${bytesToHumanReadable(options.sizeLimit)}`
        );
      }
      
      // Sub-task 7.1: Return Promise<void> (implicit return)
    },

    /**
     * Check if the bucket is configured as private
     * 
     * Returns whether the bucket requires signed URLs for file access.
     * This is determined by the publicFiles configuration option.
     * 
     * @returns true if bucket is private (requires signed URLs), false if public
     * 
     * @example
     * ```typescript
     * if (provider.isPrivate()) {
     *   // Generate signed URL for private bucket
     *   const { url } = await provider.getSignedUrl(file);
     * } else {
     *   // Use public URL directly
     *   const url = file.url;
     * }
     * ```
     */
    isPrivate(): boolean {
      // Sub-task 8.1: Return inverse of publicFiles configuration
      return !publicFiles;
    },

    /**
     * Generate a signed URL for file access
     * 
     * This method provides a unified interface for getting file URLs that works
     * for both public and private buckets:
     * 
     * - For public buckets: Returns the existing permanent public URL
     * - For private buckets: Generates a new time-limited signed URL
     * 
     * This graceful fallback approach allows frontend code to always call
     * getSignedUrl() without needing to check the bucket type first.
     * 
     * @param file - The Strapi file object
     * @returns Promise resolving to object with url property
     * @throws {Error} If signed URL generation fails (private buckets only)
     * 
     * @example
     * ```typescript
     * // Works for both public and private buckets
     * const { url } = await provider.getSignedUrl(file);
     * 
     * // For private buckets, the URL will expire after signedUrlExpires seconds
     * // For public buckets, returns the permanent public URL
     * ```
     * 
     * @example
     * ```typescript
     * // In a custom controller
     * async getFileUrl(ctx) {
     *   const file = await strapi.plugins.upload.services.upload.findOne(ctx.params.id);
     *   const provider = strapi.plugins.upload.provider;
     *   const { url } = await provider.getSignedUrl(file);
     *   return ctx.send({ url });
     * }
     * ```
     */
    async getSignedUrl(file: StrapiFile): Promise<{ url: string }> {
      // Sub-task 8.2: Check if bucket is private using isPrivate()
      if (!this.isPrivate()) {
        // Sub-task 8.2: For public buckets, return existing file.url in { url } object format
        return { url: file.url };
      }

      // Sub-task 8.2: For private buckets, extract file path and call createSignedUrl()
      const filePath = file.url; // For private buckets, file.url contains just the path

      // Sub-task 8.2: Use signedUrlExpires configuration for expiration time
      const { data, error } = await storageClient
        .from(config.bucket)
        .createSignedUrl(filePath, signedUrlExpires);

      // Sub-task 8.2: Handle signed URL generation errors and throw with descriptive message
      if (error) {
        throw new Error(`Failed to generate signed URL: ${error.message}`);
      }

      // Sub-task 8.2: Return Promise<{ url: string }>
      return { url: data.signedUrl };
    },
  };
};
