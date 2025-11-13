import { describe, it, expect, vi, beforeEach } from 'vitest';
import initProvider from '../index';
import { StrapiFile } from '../types';
import { Readable } from 'stream';

// Mock the @supabase/storage-js module
vi.mock('@supabase/storage-js', () => {
  const mockStorageClient = {
    from: vi.fn(),
  };

  return {
    StorageClient: vi.fn(() => mockStorageClient),
  };
});

describe('Provider Initialization', () => {
  const createMockStrapi = (config: any) => ({
    plugin: () => ({
      config: () => config,
    }),
  });

  it('should initialize with valid configuration', () => {
    const mockStrapi = createMockStrapi({
      apiUrl: 'https://test.supabase.co',
      apiKey: 'test-key',
      bucket: 'test-bucket',
    });

    const provider = initProvider(mockStrapi as any);
    expect(provider).toBeDefined();
    expect(provider.upload).toBeDefined();
    expect(provider.delete).toBeDefined();
    expect(provider.checkFileSize).toBeDefined();
    expect(provider.isPrivate).toBeDefined();
    expect(provider.getSignedUrl).toBeDefined();
  });

  it('should apply default values for optional fields', () => {
    const mockStrapi = createMockStrapi({
      apiUrl: 'https://test.supabase.co',
      apiKey: 'test-key',
      bucket: 'test-bucket',
    });

    const provider = initProvider(mockStrapi as any);
    expect(provider.isPrivate()).toBe(false); // publicFiles defaults to true
  });

  it('should use provided optional configuration', () => {
    const mockStrapi = createMockStrapi({
      apiUrl: 'https://test.supabase.co',
      apiKey: 'test-key',
      bucket: 'test-bucket',
      publicFiles: false,
      signedUrlExpires: 7200,
    });

    const provider = initProvider(mockStrapi as any);
    expect(provider.isPrivate()).toBe(true);
  });
});

describe('Provider Methods', () => {
  let mockStorageClient: any;
  let mockBucket: any;

  const createMockStrapi = (config: any) => ({
    plugin: () => ({
      config: () => config,
    }),
  });

  const createMockFile = (overrides?: Partial<StrapiFile>): StrapiFile => ({
    name: 'test.jpg',
    hash: 'abc123',
    ext: '.jpg',
    mime: 'image/jpeg',
    size: 100,
    url: '',
    buffer: Buffer.from('test'),
    ...overrides,
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup mock bucket methods
    mockBucket = {
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
      createSignedUrl: vi.fn(),
    };

    // Setup mock storage client
    mockStorageClient = {
      from: vi.fn(() => mockBucket),
    };

    // Reset the module and update the mock
    vi.resetModules();
    const storageMock = await import('@supabase/storage-js');
    vi.mocked(storageMock.StorageClient).mockImplementation(() => mockStorageClient as any);
  });

  describe('upload method', () => {
    it('should upload file to public bucket and set public URL', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'public-bucket',
        publicFiles: true,
      });

      mockBucket.upload.mockResolvedValue({ data: { path: 'abc123.jpg' }, error: null });
      mockBucket.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/public-bucket/abc123.jpg' },
      });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile();

      await provider.upload(file);

      expect(mockBucket.upload).toHaveBeenCalledWith(
        'abc123.jpg',
        file.buffer,
        expect.objectContaining({
          contentType: 'image/jpeg',
          duplex: 'half',
          upsert: true,
          cacheControl: '3600',
        })
      );
      expect(file.url).toContain('https://test.supabase.co');
    });

    it('should upload file to private bucket and set path', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'private-bucket',
        publicFiles: false,
      });

      mockBucket.upload.mockResolvedValue({ data: { path: 'abc123.jpg' }, error: null });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile();

      await provider.upload(file);

      expect(mockBucket.upload).toHaveBeenCalled();
      expect(file.url).toBe('abc123.jpg');
    });

    it('should handle file with stream', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
      });

      mockBucket.upload.mockResolvedValue({ data: { path: 'abc123.jpg' }, error: null });
      mockBucket.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/test-bucket/abc123.jpg' },
      });

      const provider = initProvider(mockStrapi as any);
      const stream = new Readable();
      stream.push('test data');
      stream.push(null);
      
      const file = createMockFile({ stream, buffer: undefined });

      await provider.upload(file);

      expect(mockBucket.upload).toHaveBeenCalledWith(
        'abc123.jpg',
        stream,
        expect.any(Object)
      );
    });

    it('should use directory in file path', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
        directory: 'uploads',
      });

      mockBucket.upload.mockResolvedValue({ data: { path: 'uploads/abc123.jpg' }, error: null });
      mockBucket.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/test-bucket/uploads/abc123.jpg' },
      });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile();

      await provider.upload(file);

      expect(mockBucket.upload).toHaveBeenCalledWith(
        'uploads/abc123.jpg',
        expect.any(Buffer),
        expect.any(Object)
      );
    });
  });

  describe('uploadStream method', () => {
    it('should upload stream using same logic as upload', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
      });

      mockBucket.upload.mockResolvedValue({ data: { path: 'abc123.jpg' }, error: null });
      mockBucket.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/test-bucket/abc123.jpg' },
      });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile();

      await provider.uploadStream(file);

      expect(mockBucket.upload).toHaveBeenCalled();
      expect(file.url).toBeDefined();
    });
  });

  describe('delete method', () => {
    it('should delete file from bucket', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
      });

      mockBucket.remove.mockResolvedValue({ data: null, error: null });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile();

      await provider.delete(file);

      expect(mockBucket.remove).toHaveBeenCalledWith(['abc123.jpg']);
    });

    it('should delete file with directory path', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
        directory: 'uploads',
      });

      mockBucket.remove.mockResolvedValue({ data: null, error: null });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile();

      await provider.delete(file);

      expect(mockBucket.remove).toHaveBeenCalledWith(['uploads/abc123.jpg']);
    });
  });

  describe('checkFileSize method', () => {
    it('should pass when file is under limit', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
      });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile({ size: 100 }); // 100 KB = 100000 bytes

      await expect(
        provider.checkFileSize(file, { sizeLimit: 200000 })
      ).resolves.toBeUndefined();
    });

    it('should throw when file exceeds limit', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
      });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile({ size: 100, name: 'large-file.jpg' }); // 100 KB = 100000 bytes

      await expect(
        provider.checkFileSize(file, { sizeLimit: 50000 })
      ).rejects.toThrow('large-file.jpg exceeds size limit');
    });

    it('should include human-readable size in error message', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
      });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile({ size: 2000 }); // 2000 KB = 2000000 bytes

      await expect(
        provider.checkFileSize(file, { sizeLimit: 1000000 })
      ).rejects.toThrow(/MB|KB|Bytes/);
    });
  });

  describe('isPrivate method', () => {
    it('should return false for public bucket', () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
        publicFiles: true,
      });

      const provider = initProvider(mockStrapi as any);
      expect(provider.isPrivate()).toBe(false);
    });

    it('should return true for private bucket', () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
        publicFiles: false,
      });

      const provider = initProvider(mockStrapi as any);
      expect(provider.isPrivate()).toBe(true);
    });
  });

  describe('getSignedUrl method', () => {
    it('should return existing URL for public bucket', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
        publicFiles: true,
      });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile({
        url: 'https://test.supabase.co/storage/v1/object/public/test-bucket/abc123.jpg',
      });

      const result = await provider.getSignedUrl(file);

      expect(result.url).toBe('https://test.supabase.co/storage/v1/object/public/test-bucket/abc123.jpg');
      expect(mockBucket.createSignedUrl).not.toHaveBeenCalled();
    });

    it('should generate signed URL for private bucket', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
        publicFiles: false,
        signedUrlExpires: 3600,
      });

      mockBucket.createSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://test.supabase.co/storage/v1/object/sign/test-bucket/abc123.jpg?token=xyz' },
        error: null,
      });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile({ url: 'abc123.jpg' });

      const result = await provider.getSignedUrl(file);

      expect(mockBucket.createSignedUrl).toHaveBeenCalledWith('abc123.jpg', 3600);
      expect(result.url).toContain('token=xyz');
    });

    it('should use custom expiration time', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
        publicFiles: false,
        signedUrlExpires: 7200,
      });

      mockBucket.createSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://test.supabase.co/storage/v1/object/sign/test-bucket/abc123.jpg?token=xyz' },
        error: null,
      });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile({ url: 'abc123.jpg' });

      await provider.getSignedUrl(file);

      expect(mockBucket.createSignedUrl).toHaveBeenCalledWith('abc123.jpg', 7200);
    });
  });
});


describe('Error Handling', () => {
  let mockStorageClient: any;
  let mockBucket: any;

  const createMockStrapi = (config: any) => ({
    plugin: () => ({
      config: () => config,
    }),
  });

  const createMockFile = (overrides?: Partial<StrapiFile>): StrapiFile => ({
    name: 'test.jpg',
    hash: 'abc123',
    ext: '.jpg',
    mime: 'image/jpeg',
    size: 100,
    url: '',
    buffer: Buffer.from('test'),
    ...overrides,
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    mockBucket = {
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
      createSignedUrl: vi.fn(),
    };

    mockStorageClient = {
      from: vi.fn(() => mockBucket),
    };

    // Reset the module and update the mock
    vi.resetModules();
    const storageMock = await import('@supabase/storage-js');
    vi.mocked(storageMock.StorageClient).mockImplementation(() => mockStorageClient as any);
  });

  describe('Configuration validation errors', () => {
    it('should throw error when apiUrl is missing', () => {
      const mockStrapi = createMockStrapi({
        apiKey: 'test-key',
        bucket: 'test-bucket',
      });

      expect(() => initProvider(mockStrapi as any)).toThrow(
        'Supabase provider requires apiUrl, apiKey, and bucket configuration'
      );
    });

    it('should throw error when apiKey is missing', () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        bucket: 'test-bucket',
      });

      expect(() => initProvider(mockStrapi as any)).toThrow(
        'Supabase provider requires apiUrl, apiKey, and bucket configuration'
      );
    });

    it('should throw error when bucket is missing', () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
      });

      expect(() => initProvider(mockStrapi as any)).toThrow(
        'Supabase provider requires apiUrl, apiKey, and bucket configuration'
      );
    });

    it('should throw error when all required fields are missing', () => {
      const mockStrapi = createMockStrapi({});

      expect(() => initProvider(mockStrapi as any)).toThrow(
        'Supabase provider requires apiUrl, apiKey, and bucket configuration'
      );
    });
  });

  describe('Upload failure scenarios', () => {
    it('should throw error when upload fails', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
      });

      mockBucket.upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded' },
      });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile();

      await expect(provider.upload(file)).rejects.toThrow(
        'Failed to upload file to Supabase: Storage quota exceeded'
      );
    });

    it('should throw error with descriptive message on network failure', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
      });

      mockBucket.upload.mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile();

      await expect(provider.upload(file)).rejects.toThrow('Network error');
    });

    it('should throw error when bucket does not exist', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'non-existent-bucket',
      });

      mockBucket.upload.mockResolvedValue({
        data: null,
        error: { message: 'Bucket not found' },
      });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile();

      await expect(provider.upload(file)).rejects.toThrow('Bucket not found');
    });
  });

  describe('Delete failure scenarios', () => {
    it('should throw error when delete fails', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
      });

      mockBucket.remove.mockResolvedValue({
        data: null,
        error: { message: 'File not found' },
      });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile();

      await expect(provider.delete(file)).rejects.toThrow(
        'Failed to delete file from Supabase: File not found'
      );
    });

    it('should throw error with descriptive message on permission error', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
      });

      mockBucket.remove.mockResolvedValue({
        data: null,
        error: { message: 'Insufficient permissions' },
      });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile();

      await expect(provider.delete(file)).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('Signed URL generation failures', () => {
    it('should throw error when signed URL generation fails', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
        publicFiles: false,
      });

      mockBucket.createSignedUrl.mockResolvedValue({
        data: null,
        error: { message: 'Invalid file path' },
      });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile({ url: 'invalid/path.jpg' });

      await expect(provider.getSignedUrl(file)).rejects.toThrow(
        'Failed to generate signed URL: Invalid file path'
      );
    });

    it('should throw error when file does not exist', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
        publicFiles: false,
      });

      mockBucket.createSignedUrl.mockResolvedValue({
        data: null,
        error: { message: 'Object not found' },
      });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile({ url: 'missing.jpg' });

      await expect(provider.getSignedUrl(file)).rejects.toThrow('Object not found');
    });
  });

  describe('File size exceeded errors', () => {
    it('should throw error with file name when size exceeded', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
      });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile({ size: 5000, name: 'huge-image.jpg' });

      await expect(
        provider.checkFileSize(file, { sizeLimit: 1000000 })
      ).rejects.toThrow('huge-image.jpg exceeds size limit');
    });

    it('should include human-readable size limit in error', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
      });

      const provider = initProvider(mockStrapi as any);
      const file = createMockFile({ size: 10000 });

      await expect(
        provider.checkFileSize(file, { sizeLimit: 5000000 })
      ).rejects.toThrow('5.00 MB');
    });

    it('should format different size units correctly in error', async () => {
      const mockStrapi = createMockStrapi({
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        bucket: 'test-bucket',
      });

      const provider = initProvider(mockStrapi as any);
      
      // Test KB limit
      const file1 = createMockFile({ size: 100 });
      await expect(
        provider.checkFileSize(file1, { sizeLimit: 50000 })
      ).rejects.toThrow('50.00 KB');

      // Test Bytes limit
      const file2 = createMockFile({ size: 1 });
      await expect(
        provider.checkFileSize(file2, { sizeLimit: 500 })
      ).rejects.toThrow('500.00 Bytes');
    });
  });
});
