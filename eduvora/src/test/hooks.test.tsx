import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { useState } from 'react';
import { useAuth } from '../context/hooks/useAuth';
import { useStudentManagement } from '../context/hooks/useStudentManagement';
import { useTeacherManagement } from '../context/hooks/useTeacherManagement';
import { UserProfile, Student, Tenant } from '../types';

// Mock Supabase client
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

const mockUser: UserProfile = {
  id: 'user-1',
  school_id: 'school-1',
  email: 'admin@school.edu',
  full_name: 'Test Admin',
  role: 'school_admin',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
};

const mockTenant: Tenant = {
  id: 'school-1',
  name: 'Test School',
  subdomain: 'test-school',
  logo_url: '',
  primary_color: '#2563EB',
  subscription_tier: 'starter',
  status: 'active',
  current_session: '2025/2026',
  current_term: 'Term 1',
  address: '123 Main St',
  phone: '555-0100',
  contact_email: 'info@school.edu',
  headmaster_name: 'Head Master',
  created_at: '2026-01-01T00:00:00Z',
};

// ─── useAuth ───────────────────────────────────────────────────────
describe('useAuth', () => {
  it('returns currentUser based on currentUserId', () => {
    const { result } = renderHook(() =>
      useAuth({
        users: [mockUser],
        setUsers: vi.fn(),
        currentUserId: 'user-1',
        setCurrentUserId: vi.fn(),
        isAuthenticated: true,
        setIsAuthenticated: vi.fn(),
        currentTenant: mockTenant,
        allTenants: [mockTenant],
      })
    );
    expect(result.current.currentUser).toEqual(mockUser);
  });

  it('falls back to first user when currentUserId not found', () => {
    const { result } = renderHook(() =>
      useAuth({
        users: [mockUser],
        setUsers: vi.fn(),
        currentUserId: 'nonexistent',
        setCurrentUserId: vi.fn(),
        isAuthenticated: true,
        setIsAuthenticated: vi.fn(),
        currentTenant: mockTenant,
        allTenants: [mockTenant],
      })
    );
    expect(result.current.currentUser).toEqual(mockUser);
  });
});

// ─── useStudentManagement ──────────────────────────────────────────
describe('useStudentManagement', () => {
  it('addStudent creates a student with correct fields', () => {
    const setStudents = vi.fn();
    const { result } = renderHook(() =>
      useStudentManagement({
        students: [],
        setStudents,
        currentTenant: mockTenant,
      })
    );

    act(() => {
      result.current.addStudent({
        admission_number: 'STU-001',
        full_name: 'Test Student',
        class_id: 'cls-1',
        gender: 'Male',
        date_of_birth: '2012-01-01',
        guardian_name: 'Guardian',
        guardian_phone: '555-0101',
        attendance_percentage: 95,
      });
    });

    expect(setStudents).toHaveBeenCalledTimes(1);
    const updater = setStudents.mock.calls[0][0];
    const newStudents = updater([]);
    expect(newStudents).toHaveLength(1);
    expect(newStudents[0].full_name).toBe('Test Student');
    expect(newStudents[0].school_id).toBe('school-1');
    expect(newStudents[0].id).toMatch(/^stu-/);
  });

  it('updateStudent updates the correct student', () => {
    const existing: Student = {
      id: 'stu-1',
      school_id: 'school-1',
      admission_number: 'STU-001',
      full_name: 'Old Name',
      class_id: 'cls-1',
      gender: 'Male',
      date_of_birth: '2012-01-01',
      guardian_name: 'Guardian',
      guardian_phone: '555-0101',
      attendance_percentage: 95,
      created_at: '2026-01-01T00:00:00Z',
    };
    const setStudents = vi.fn();
    const { result } = renderHook(() =>
      useStudentManagement({
        students: [existing],
        setStudents,
        currentTenant: mockTenant,
      })
    );

    act(() => {
      result.current.updateStudent('stu-1', { full_name: 'New Name' });
    });

    expect(setStudents).toHaveBeenCalledTimes(1);
    const updater = setStudents.mock.calls[0][0];
    const updated = updater([existing]);
    expect(updated[0].full_name).toBe('New Name');
  });

  it('deleteStudent removes the correct student', () => {
    const existing: Student = {
      id: 'stu-1',
      school_id: 'school-1',
      admission_number: 'STU-001',
      full_name: 'To Delete',
      class_id: 'cls-1',
      gender: 'Male',
      date_of_birth: '2012-01-01',
      guardian_name: 'Guardian',
      guardian_phone: '555-0101',
      attendance_percentage: 95,
      created_at: '2026-01-01T00:00:00Z',
    };
    const setStudents = vi.fn();
    const { result } = renderHook(() =>
      useStudentManagement({
        students: [existing],
        setStudents,
        currentTenant: mockTenant,
      })
    );

    act(() => {
      result.current.deleteStudent('stu-1');
    });

    expect(setStudents).toHaveBeenCalledTimes(1);
    const updater = setStudents.mock.calls[0][0];
    const updated = updater([existing]);
    expect(updated).toHaveLength(0);
  });
});
