import { supabase } from '../../lib/supabaseClient';
import { UserProfile, AuditLog } from '../../types';
import { generateId } from '../../utils/id';
import { TeacherState } from './types';

export function useTeacherManagement(state: TeacherState) {
  const {
    users, setUsers,
    currentTenant, currentUser,
    setCurrentUserId, setCurrentTenantId,
    auditLogs, setAuditLogs,
  } = state;

  // Teacher Management — sends invite email via edge function
  const addTeacher = async (name: string, email: string, phone?: string): Promise<UserProfile> => {
    const newTeacherId = generateId('teacher');

    // Send invite email via edge function (creates auth user + profile server-side)
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    const siteUrl = window.location.origin;

    const edgeResponse = await fetch(
      `${supabaseUrl}/functions/v1/invite-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({
          email,
          name,
          role: 'teacher',
          school_id: currentTenant?.id || '',
          redirectTo: `${siteUrl}/`,
        }),
      }
    );

    const edgeResult = await edgeResponse.json();
    const teacherAuthId = edgeResult.user_id || newTeacherId;

    const newTeacher: UserProfile = {
      id: teacherAuthId,
      school_id: currentTenant?.id || '',
      email,
      full_name: name,
      role: 'teacher',
      phone: phone || '',
      status: 'active',
      created_at: new Date().toISOString(),
    };

    setUsers((prev) => [newTeacher, ...prev]);

    const log: AuditLog = {
      id: generateId('log'),
      school_id: currentTenant?.id || '',
      actor_name: currentUser.full_name,
      actor_role: currentUser.role,
      action: 'TEACHER_INVITED',
      details: `Created teacher profile for ${name} (${email}). Invite email sent.`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    return newTeacher;
  };

  const generateInviteKey = (teacherId: string) => {
    const token = `INV-${currentTenant?.subdomain.toUpperCase().slice(0, 4) || 'TCH'}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    setUsers((prev) =>
      prev.map((u) =>
        u.id === teacherId
          ? { ...u, invite_token: token, invite_expires_at: expiresAt, status: 'invited' }
          : u
      )
    );
    return { token, expiresAt };
  };

  const redeemInvite = async (token: string, _password?: string) => {
    const trimmed = token.trim().toUpperCase();
    const teacher = users.find(
      (u) => u.invite_token?.toUpperCase() === trimmed && u.status === 'invited'
    );
    if (!teacher) {
      return { success: false, message: 'Invalid or expired invitation token. Please check with your School Administrator.' };
    }

    const updatedUser: UserProfile = {
      ...teacher,
      status: 'active',
      invite_token: undefined,
    };

    setUsers((prev) => prev.map((u) => (u.id === teacher.id ? updatedUser : u)));
    setCurrentUserId(teacher.id);
    if (teacher.school_id) setCurrentTenantId(teacher.school_id);

    const log: AuditLog = {
      id: generateId('log'),
      school_id: teacher.school_id || currentTenant?.id || '',
      actor_name: teacher.full_name,
      actor_role: 'teacher',
      action: 'INVITE_REDEEMED',
      details: `Teacher ${teacher.full_name} completed onboarding and activated their account.`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    return { success: true, user: updatedUser, message: 'Invitation verified successfully! Welcome to your Teacher Grade Entry portal.' };
  };

  const toggleTeacherStatus = (teacherId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== teacherId) return u;
        const newStatus = u.status === 'active' ? 'deactivated' : 'active';
        return { ...u, status: newStatus };
      })
    );
  };

  return {
    addTeacher,
    generateInviteKey,
    redeemInvite,
    toggleTeacherStatus,
  };
}
