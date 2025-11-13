import { StorageClient } from '@supabase/storage-js';
import { ProviderConfig, UploadProvider, StrapiFile } from './types';
import { getBearerToken, getStorageEndpoint, getPathKey, kbytesToBytes, bytesToHumanReadable } from './utils';

/**
 * Strapi instance interface (minimal typing for what we need)
 */
interface Strapi {
  plugin(name: string): {
    config(key: string): any;
  };
}

/**
 * Initialize the Supabase Storage upload provider for Strapi v5
 * @param strapi - The Strapi instance
 * @returns Upload provider implementation
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
   * Sub-tasks 5.1 & 5.2: Upload file and generate appropriate URL
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
     * Sub-task 5.3: Upload a file to Supabase Storage
     */
    async upload(file: StrapiFile): Promise<void> {
      await uploadFile(file);
    },

    /**
     * Sub-task 5.4: Upload a file stream to Supabase Storage (alias pattern)
     */
    async uploadStream(file: StrapiFile): Promise<void> {
      await uploadFile(file);
    },

    /**
     * Sub-task 6.1: Delete a file from Supabase Storage
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
     * Sub-task 7.1: Validate file size against configured limits
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
     * Sub-task 8.1: Check if the bucket is configured as private
     * @returns true if bucket is private, false if public
     */
    isPrivate(): boolean {
      // Sub-task 8.1: Return inverse of publicFiles configuration
      return !publicFiles;
    },

    /**
     * Sub-task 8.2: Generate a signed URL for file access
     * For public buckets, returns the existing public URL
     * For private buckets, generates a time-limited signed URL
     * @param file - The file object
     * @returns Promise resolving to object with url property
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
