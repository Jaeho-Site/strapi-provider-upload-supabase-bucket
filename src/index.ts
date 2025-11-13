import { StorageClient } from '@supabase/storage-js';
import { ProviderConfig, UploadProvider, StrapiFile } from './types';
import { getBearerToken, getStorageEndpoint } from './utils';

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

  // Sub-task 4.1: Return provider object with required methods
  return {
    async upload(file: StrapiFile): Promise<void> {
      // To be implemented in task 5
      throw new Error('upload method not yet implemented');
    },

    async uploadStream(file: StrapiFile): Promise<void> {
      // To be implemented in task 5
      throw new Error('uploadStream method not yet implemented');
    },

    async delete(file: StrapiFile): Promise<void> {
      // To be implemented in task 6
      throw new Error('delete method not yet implemented');
    },

    async checkFileSize(file: StrapiFile, options: { sizeLimit: number }): Promise<void> {
      // To be implemented in task 7
      throw new Error('checkFileSize method not yet implemented');
    },

    isPrivate(): boolean {
      // To be implemented in task 8
      throw new Error('isPrivate method not yet implemented');
    },

    async getSignedUrl(file: StrapiFile): Promise<{ url: string }> {
      // To be implemented in task 8
      throw new Error('getSignedUrl method not yet implemented');
    },
  };
};
