import { describe, it, expect } from 'vitest';
import { getBearerToken, getStorageEndpoint, getPathKey, kbytesToBytes, bytesToHumanReadable } from '../utils';
import { StrapiFile } from '../types';

describe('getBearerToken', () => {
  it('should format API key as Bearer token', () => {
    const apiKey = 'test-api-key-123';
    const result = getBearerToken(apiKey);
    expect(result).toBe('Bearer test-api-key-123');
  });

  it('should handle empty API key', () => {
    const result = getBearerToken('');
    expect(result).toBe('Bearer ');
  });

  it('should handle API key with special characters', () => {
    const apiKey = 'key-with-special!@#$%^&*()';
    const result = getBearerToken(apiKey);
    expect(result).toBe('Bearer key-with-special!@#$%^&*()');
  });
});

describe('getStorageEndpoint', () => {
  it('should append /storage/v1 to API URL', () => {
    const apiUrl = 'https://myproject.supabase.co';
    const result = getStorageEndpoint(apiUrl);
    expect(result).toBe('https://myproject.supabase.co/storage/v1');
  });

  it('should handle URL without trailing slash', () => {
    const apiUrl = 'https://example.supabase.co';
    const result = getStorageEndpoint(apiUrl);
    expect(result).toBe('https://example.supabase.co/storage/v1');
  });

  it('should handle URL with trailing slash', () => {
    const apiUrl = 'https://example.supabase.co/';
    const result = getStorageEndpoint(apiUrl);
    expect(result).toBe('https://example.supabase.co//storage/v1');
  });
});

describe('getPathKey', () => {
  const createMockFile = (hash: string, ext: string): StrapiFile => ({
    name: 'test.jpg',
    hash,
    ext,
    mime: 'image/jpeg',
    size: 100,
    url: '',
  });

  it('should generate path without directory', () => {
    const file = createMockFile('abc123', '.jpg');
    const result = getPathKey(file, '');
    expect(result).toBe('abc123.jpg');
  });

  it('should generate path with directory', () => {
    const file = createMockFile('abc123', '.jpg');
    const result = getPathKey(file, 'uploads');
    expect(result).toBe('uploads/abc123.jpg');
  });

  it('should handle nested directory paths', () => {
    const file = createMockFile('def456', '.png');
    const result = getPathKey(file, 'uploads/images');
    expect(result).toBe('uploads/images/def456.png');
  });

  it('should handle file without extension', () => {
    const file = createMockFile('xyz789', '');
    const result = getPathKey(file, 'docs');
    expect(result).toBe('docs/xyz789');
  });

  it('should use forward slashes for cross-platform compatibility', () => {
    const file = createMockFile('test123', '.pdf');
    const result = getPathKey(file, 'path/to/files');
    expect(result).toContain('/');
    expect(result).not.toContain('\\');
  });
});

describe('kbytesToBytes', () => {
  it('should convert 1 KB to 1000 bytes', () => {
    const result = kbytesToBytes(1);
    expect(result).toBe(1000);
  });

  it('should convert 100 KB to 100000 bytes', () => {
    const result = kbytesToBytes(100);
    expect(result).toBe(100000);
  });

  it('should convert 1024 KB to 1024000 bytes', () => {
    const result = kbytesToBytes(1024);
    expect(result).toBe(1024000);
  });

  it('should handle decimal values', () => {
    const result = kbytesToBytes(1.5);
    expect(result).toBe(1500);
  });

  it('should handle zero', () => {
    const result = kbytesToBytes(0);
    expect(result).toBe(0);
  });
});

describe('bytesToHumanReadable', () => {
  it('should format 0 bytes', () => {
    const result = bytesToHumanReadable(0);
    expect(result).toBe('0 Bytes');
  });

  it('should format bytes (< 1000)', () => {
    const result = bytesToHumanReadable(500);
    expect(result).toBe('500.00 Bytes');
  });

  it('should format kilobytes', () => {
    const result = bytesToHumanReadable(1500);
    expect(result).toBe('1.50 KB');
  });

  it('should format megabytes', () => {
    const result = bytesToHumanReadable(1500000);
    expect(result).toBe('1.50 MB');
  });

  it('should format gigabytes', () => {
    const result = bytesToHumanReadable(1500000000);
    expect(result).toBe('1.50 GB');
  });

  it('should format terabytes', () => {
    const result = bytesToHumanReadable(1500000000000);
    expect(result).toBe('1.50 TB');
  });

  it('should format petabytes', () => {
    const result = bytesToHumanReadable(1500000000000000);
    expect(result).toBe('1.50 PB');
  });

  it('should round to 2 decimal places', () => {
    const result = bytesToHumanReadable(1234567);
    expect(result).toMatch(/^\d+\.\d{2} \w+$/);
  });
});
