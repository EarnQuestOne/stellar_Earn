import { describe, it, expect } from 'vitest';
import { buildQuestsSearchParams } from './questsServer';

describe('buildQuestsSearchParams', () => {
  it('returns an empty string when no params are provided', () => {
    expect(buildQuestsSearchParams()).toBe('');
  });

  it('serializes filter and pagination params', () => {
    const query = buildQuestsSearchParams({
      status: 'Active',
      difficulty: 'beginner',
      page: 2,
      limit: 12,
    });
    const parsed = new URLSearchParams(query);
    expect(parsed.get('status')).toBe('Active');
    expect(parsed.get('difficulty')).toBe('beginner');
    expect(parsed.get('page')).toBe('2');
    expect(parsed.get('limit')).toBe('12');
  });

  it('omits undefined, null, and empty values', () => {
    const query = buildQuestsSearchParams({
      status: undefined,
      category: '',
      search: 'stellar',
    });
    const parsed = new URLSearchParams(query);
    expect(parsed.has('status')).toBe(false);
    expect(parsed.has('category')).toBe(false);
    expect(parsed.get('search')).toBe('stellar');
  });
});
