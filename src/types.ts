import { Readable } from 'stream';

//Configuration options for the Supabase Storage provider
export interface ProviderConfig {
  apiUrl: string;  
  apiKey: string;  // Requires 'service_role' key
  bucket: string;  
  directory?: string;         // default ''
  publicFiles?: boolean;      // default true
  signedUrlExpires?: number;  // default 3600
}

export interface StrapiFile {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  path?: string;
  buffer?: Buffer;
  stream?: Readable;
}

export interface UploadProvider {
  upload(file: StrapiFile): Promise<void>;
  uploadStream(file: StrapiFile): Promise<void>;
  delete(file: StrapiFile): Promise<void>;
  checkFileSize(file: StrapiFile, options: { sizeLimit: number }): Promise<void>;

  /** Returns true if the bucket is private */
  isPrivate(): boolean; 

 /** Returns public URL or generates signed URL for private buckets */
  getSignedUrl(file: StrapiFile): Promise<{ url: string }>;
}
