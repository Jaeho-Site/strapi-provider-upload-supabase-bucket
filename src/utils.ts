import * as path from 'path';
import { StrapiFile } from './types';

/**
 * Generate a Bearer token from an API key for Supabase authentication
 * 
 * @param apiKey - The Supabase API key (typically the service_role key)
 * @returns Bearer token string in the format "Bearer {apiKey}"
 * 
 * @example
 * ```typescript
 * const token = getBearerToken('your-api-key');
 * // Returns: "Bearer your-api-key"
 * ```
 */
export function getBearerToken(apiKey: string): string {
  return `Bearer ${apiKey}`;
}

/**
 * Generate the Supabase Storage endpoint URL by appending the storage API path
 * 
 * @param apiUrl - The Supabase project URL (e.g., "https://xxx.supabase.co")
 * @returns Formatted storage endpoint URL with "/storage/v1" appended
 * 
 * @example
 * ```typescript
 * const endpoint = getStorageEndpoint('https://myproject.supabase.co');
 * // Returns: "https://myproject.supabase.co/storage/v1"
 * ```
 */
export function getStorageEndpoint(apiUrl: string): string {
  return `${apiUrl}/storage/v1`;
}

/**
 * Generate the storage path key for a file using the file's hash and extension
 * 
 * Uses path.posix.join for cross-platform compatibility to ensure forward slashes
 * are used in the path regardless of the operating system.
 * 
 * @param file - The Strapi file object containing hash and extension
 * @param directory - Optional base directory path (defaults to empty string)
 * @returns File path in format: {directory}/{hash}{ext} or just {hash}{ext} if no directory
 * 
 * @example
 * ```typescript
 * const file = { hash: 'abc123', ext: '.jpg', ... };
 * 
 * // Without directory
 * getPathKey(file, '');
 * // Returns: "abc123.jpg"
 * 
 * // With directory
 * getPathKey(file, 'uploads');
 * // Returns: "uploads/abc123.jpg"
 * ```
 */
export function getPathKey(file: StrapiFile, directory: string = ''): string {
  const fileName = `${file.hash}${file.ext}`;
  
  if (!directory) {
    return fileName;
  }
  
  // Use path.posix.join for cross-platform compatibility
  return path.posix.join(directory, fileName);
}

/**
 * Convert kilobytes to bytes using decimal conversion (1 KB = 1000 bytes)
 * 
 * Note: Uses decimal (1000) rather than binary (1024) conversion to match
 * Strapi's file size conventions.
 * 
 * @param sizeInKb - Size in kilobytes
 * @returns Size in bytes
 * 
 * @example
 * ```typescript
 * kbytesToBytes(1);    // Returns: 1000
 * kbytesToBytes(100);  // Returns: 100000
 * kbytesToBytes(1024); // Returns: 1024000
 * ```
 */
export function kbytesToBytes(sizeInKb: number): number {
  return sizeInKb * 1000;
}

/**
 * Convert bytes to human-readable format with appropriate unit
 * 
 * Automatically selects the most appropriate unit (Bytes, KB, MB, GB, TB, PB)
 * based on the size. Uses decimal conversion (1000 bytes = 1 KB).
 * 
 * @param bytes - Size in bytes
 * @returns Formatted string with size and unit (e.g., "1.50 MB")
 * 
 * @example
 * ```typescript
 * bytesToHumanReadable(0);           // Returns: "0 Bytes"
 * bytesToHumanReadable(500);         // Returns: "500.00 Bytes"
 * bytesToHumanReadable(1500);        // Returns: "1.50 KB"
 * bytesToHumanReadable(1500000);     // Returns: "1.50 MB"
 * bytesToHumanReadable(1500000000);  // Returns: "1.50 GB"
 * ```
 */
export function bytesToHumanReadable(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const k = 1000;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  return `${size.toFixed(2)} ${units[i]}`;
}
