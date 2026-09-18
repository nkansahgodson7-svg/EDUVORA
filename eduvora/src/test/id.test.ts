import { describe, it, expect } from 'vitest';
import { generateId } from '../utils/id';

describe('generateId', () => {
  it('returns a string with the given prefix', () => {
    const id = generateId('stu');
    expect(id).toMatch(/^stu-/);
  });

  it('returns a string with prefix-school pattern', () => {
    const id = generateId('school');
    expect(id).toMatch(/^school-/);
  });

  it('generates unique IDs', () => {
    const id1 = generateId('test');
    const id2 = generateId('test');
    expect(id1).not.toBe(id2);
  });

  it('includes a UUID-like segment after the prefix', () => {
    const id = generateId('alloc');
    const suffix = id.replace('alloc-', '');
    // Should be 8 chars from a UUID
    expect(suffix).toHaveLength(8);
    expect(/^[0-9a-f]{8}$/.test(suffix)).toBe(true);
  });
});
