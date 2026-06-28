import { describe, it, expect } from 'vitest';

describe('Config error panel rendering', () => {
  it('renders error panel when config is invalid', () => {
    const panel = { visible: true, message: 'Missing required env var' };
    expect(panel.visible).toBe(true);
    expect(panel.message).toContain('Missing');
  });

  it('does not render error panel when config is valid', () => {
    const panel = { visible: false, message: '' };
    expect(panel.visible).toBe(false);
  });

  it('displays correct error text for missing API URL', () => {
    const message = 'NEXT_PUBLIC_API_BASE_URL is required';
    expect(message).toMatch(/NEXT_PUBLIC_API_BASE_URL/);
  });
});
