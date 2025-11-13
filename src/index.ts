import { StorageClient } from '@supabase/storage-js';
import { ProviderConfig, UploadProvider, StrapiFile } from './types.js';
import { getBearerToken, getStorageEndpoint, getPathKey, kbytesToBytes, bytesToHumanReadable } from './utils.js';

export default {
  init(config: ProviderConfig): UploadProvider {
    if (!config.apiUrl || !config.apiKey || !config.bucket) {
      throw new Error(
        'Supabase provider requires apiUrl, apiKey, and bucket configuration. ' +
        'Please check your plugin configuration.'
      );
    }

    const directory = config.directory ?? '';
    const publicFiles = config.publicFiles ?? true;
    const signedUrlExpires = config.signedUrlExpires ?? 3600;

    const storageEndpoint = getStorageEndpoint(config.apiUrl);

    const storageClient = new StorageClient(storageEndpoint, {
      apikey: config.apiKey,
      Authorization: getBearerToken(config.apiKey),
    });

    /** * Unified upload logic for both buffer and stream.
     * Sets file.url to Full URL (Public) or File Path (Private).
     */
    const uploadFile = async (file: StrapiFile): Promise<void> => {
      const filePath = getPathKey(file, directory);
     
      const { data, error } = await storageClient
        .from(config.bucket)
        .upload(filePath, file.stream || file.buffer!, {
          contentType: file.mime,
          duplex: 'half',
          upsert: true,
          cacheControl: '3600',
        });

      if (error) {
        console.error(`[Supabase Provider] Upload failed for ${filePath}:`, error);
        throw new Error(`Failed to upload file to Supabase: ${error.message}`);
      }

      // Public: Store permanent public URL
      // Private: Store path only (Signed URL generated on demand)
      if (publicFiles) {
        const { data: publicUrlData } = storageClient
          .from(config.bucket)
          .getPublicUrl(filePath);
        
        file.url = publicUrlData.publicUrl;
      } else {
        file.url = filePath;
      }
      // Required by Strapi to acknowledge mime type
      file.mime = file.mime;
    };

    return {
      async upload(file: StrapiFile): Promise<void> {
        await uploadFile(file);
      },

      async uploadStream(file: StrapiFile): Promise<void> {
        await uploadFile(file);
      },

      async delete(file: StrapiFile): Promise<void> {
        const filePath = getPathKey(file, directory);
        const { error } = await storageClient
          .from(config.bucket)
          .remove([filePath]);
        if (error) {
          throw new Error(`Failed to delete file from Supabase: ${error.message}`);
        }
      },

      async checkFileSize(file: StrapiFile, options: { sizeLimit: number }): Promise<void> {
        const fileSizeInBytes = kbytesToBytes(file.size);
        if (fileSizeInBytes > options.sizeLimit) {
          throw new Error(
            `${file.name} exceeds size limit of ${bytesToHumanReadable(options.sizeLimit)}`
          );
        }
      },

      isPrivate(): boolean {
        return !publicFiles;
      },

      async getSignedUrl(file: StrapiFile): Promise<{ url: string }> {
        if (!this.isPrivate()) {
          return { url: file.url };
        }

        if (file.url.startsWith('http://') || file.url.startsWith('https://')) {
          return { url: file.url };
        }
        
        const filePath = file.url; // For private buckets, file.url is the path
        
        try {
          const { data, error } = await storageClient
            .from(config.bucket)
            .createSignedUrl(filePath, signedUrlExpires);

          if (error) {
            console.warn(`[Supabase Provider] Failed to generate signed URL for ${filePath}:`, error.message);
            return { url: `#file-not-found-${filePath}` };
          }
          return { url: data.signedUrl };
        } catch (error) {
          console.error(`[Supabase Provider] Error generating signed URL for ${filePath}:`, error);
          return { url: `#error-${filePath}` };
        }
      },
    };
  },
};
