import * as path from 'path';
import { StrapiFile } from './types';

/** Returns "Bearer {apiKey}" */
export function getBearerToken(apiKey: string): string {
  return `Bearer ${apiKey}`;
}

/** Appends "/storage/v1" to the project URL */
export function getStorageEndpoint(apiUrl: string): string {
  return `${apiUrl}/storage/v1`;
}

/**
 * Generates file path using the file's hash and extension.
 * Uses path.posix.join to ensure forward slashes (/) on all platforms (including Windows).
 */
export function getPathKey(file: StrapiFile, directory: string = ''): string {
  const fileName = `${file.hash}${file.ext}`;
  
  if (!directory) {
    return fileName;
  }

  return path.posix.join(directory, fileName);
}

/**
 * Converts KB to Bytes.
 * Uses decimal (1000) instead of binary (1024) to match Strapi's convention.
 */
export function kbytesToBytes(sizeInKb: number): number {
  return sizeInKb * 1000;
}

/**
 * Formats bytes to human-readable string (e.g., "1.50 MB").
 * Uses decimal (1000) base calculation.
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
