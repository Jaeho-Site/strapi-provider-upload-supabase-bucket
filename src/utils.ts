import * as path from 'path';
import { StrapiFile } from './types';

/**
 * Generate a Bearer token from an API key
 * @param apiKey - The Supabase API key
 * @returns Bearer token string
 */
export function getBearerToken(apiKey: string): string {
  return `Bearer ${apiKey}`;
}

/**
 * Generate the Supabase Storage endpoint URL
 * @param apiUrl - The Supabase project URL
 * @returns Formatted storage endpoint URL
 */
export function getStorageEndpoint(apiUrl: string): string {
  return `${apiUrl}/storage/v1`;
}

/**
 * Generate the storage path key for a file
 * @param file - The Strapi file object
 * @param directory - Optional base directory path
 * @returns File path in format: {directory}/{hash}{ext}
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
 * Convert kilobytes to bytes
 * @param sizeInKb - Size in kilobytes
 * @returns Size in bytes
 */
export function kbytesToBytes(sizeInKb: number): number {
  return sizeInKb * 1000;
}

/**
 * Convert bytes to human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted string with appropriate unit (Bytes, KB, MB, GB, TB, PB)
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
