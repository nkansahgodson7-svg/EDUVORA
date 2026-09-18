import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock Supabase before any imports that use it
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
  isSupabaseConfigured: true,
}));

import { calculateGrade, getCurrentSession } from '../lib/mockData';

describe('mockData utilities', () => {
  describe('calculateGrade', () => {
    // Actual scale: A+=90-100(4.0), A=80-89(3.8), B=70-79(3.0), C=60-69(2.5), D=50-59(2.0), F=0-49(0.0)

    it('returns A+ for scores >= 90', () => {
      const result = calculateGrade(95);
      expect(result.grade).toBe('A+');
      expect(result.points).toBe(4.0);
    });

    it('returns A for scores 80-89', () => {
      const result = calculateGrade(85);
      expect(result.grade).toBe('A');
      expect(result.points).toBe(3.8);
    });

    it('returns B for scores 70-79', () => {
      const result = calculateGrade(75);
      expect(result.grade).toBe('B');
      expect(result.points).toBe(3.0);
    });

    it('returns C for scores 60-69', () => {
      const result = calculateGrade(65);
      expect(result.grade).toBe('C');
      expect(result.points).toBe(2.5);
    });

    it('returns D for scores 50-59', () => {
      const result = calculateGrade(55);
      expect(result.grade).toBe('D');
      expect(result.points).toBe(2.0);
    });

    it('returns F for scores < 50', () => {
      const result = calculateGrade(30);
      expect(result.grade).toBe('F');
      expect(result.points).toBe(0.0);
    });

    it('handles exact boundary values', () => {
      expect(calculateGrade(90).grade).toBe('A+');
      expect(calculateGrade(80).grade).toBe('A');
      expect(calculateGrade(70).grade).toBe('B');
      expect(calculateGrade(60).grade).toBe('C');
      expect(calculateGrade(50).grade).toBe('D');
      expect(calculateGrade(49).grade).toBe('F');
    });

    it('clamps scores below 0 to F', () => {
      expect(calculateGrade(-10).grade).toBe('F');
    });

    it('returns F for scores above 100 (exceeds all ranges)', () => {
      // 150 > 100 so it doesn't match any rule, falls through to F
      expect(calculateGrade(150).grade).toBe('F');
    });
  });

  describe('getCurrentSession', () => {
    it('returns a session string in YYYY/YYYY format', () => {
      const session = getCurrentSession();
      expect(session).toMatch(/^\d{4}\/\d{4}$/);
    });

    it('returns current year or previous year as start', () => {
      const session = getCurrentSession();
      const now = new Date();
      // Academic year starts in September (month >= 8)
      const expectedYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
      expect(session).toBe(`${expectedYear}/${expectedYear + 1}`);
    });
  });
});
