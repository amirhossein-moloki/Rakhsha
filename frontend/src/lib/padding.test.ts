import { describe, it, expect } from 'vitest';
import { padRequest, padRequestAsBlob } from './padding';

const PADDING_TARGET_BYTES = 4096;

describe('Padding Library', () => {
  it('should pad a small request to the target size', () => {
    const data = { message: 'hello' };
    const padded = padRequest(data);
    const byteLength = new TextEncoder().encode(padded).length;
    expect(byteLength).toBe(PADDING_TARGET_BYTES);
  });

  it('should not change the original JSON data', () => {
    const data = { message: 'hello' };
    const jsonString = JSON.stringify(data);
    const padded = padRequest(data);
    expect(padded.startsWith(jsonString)).toBe(true);
  });

  it('should throw an error if the request is too large', () => {
    const largeData = { data: 'a'.repeat(PADDING_TARGET_BYTES) };
    expect(() => padRequest(largeData)).toThrow();
  });

  it('should create a Blob with the correct content and type', async () => {
    const data = { message: 'blob test' };
    const blob = padRequestAsBlob(data);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/json');
    expect(blob.size).toBe(PADDING_TARGET_BYTES);

    // blob.text() is not available in JSDOM, so we use FileReader
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(blob);
    });

    const byteLength = new TextEncoder().encode(text as string).length;
    expect(byteLength).toBe(PADDING_TARGET_BYTES);
    expect(text.startsWith(JSON.stringify(data))).toBe(true);
  });
});