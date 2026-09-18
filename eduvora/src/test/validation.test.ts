import { describe, it, expect } from 'vitest';
import { isUUID } from '../utils/validation';

describe('isUUID', () => {
  it('returns true for valid UUID v4', () => {
    expect(isUUID('123e4567-e89b-4d3a-a845-465743426789')).toBe(true);
    expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isUUID('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
  });

  it('returns false for non-UUID strings', () => {
    expect(isUUID('')).toBe(false);
    expect(isUUID('not-a-uuid')).toBe(false);
    expect(isUUID('123e4567-e89b-4d3a-a845')).toBe(false);
    expect(isUUID('school-abc123')).toBe(false);
    expect(isUUID('12345678')).toBe(false);
  });

  it('returns false for UUID with wrong format', () => {
    expect(isUUID('123e4567_e89b_4d3a_a845_465743426789')).toBe(false);
    expect(isUUID('123E4567-E89B-4D3A-A845-465743426789')).toBe(true); // uppercase hex is valid
  });
});
