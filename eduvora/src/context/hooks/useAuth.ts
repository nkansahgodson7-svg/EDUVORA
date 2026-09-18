import { useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { UserProfile, UserRole } from '../../types';
import { AuthState } from './types';

export function useAuth(state: AuthState) {
  const {
    users, setUsers,
    currentUserId, setCurrentUserId,
    setIsAuthenticated,
    currentTenant, allTenants,
  } = state;

  // Supabase Auth: Listen for session changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const authUser = session.user;

          let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (profileError || !profile) {
            const role = (authUser.user_metadata?.role as UserRole) || 'school_admin';
            const schoolId = authUser.user_metadata?.school_id || null;

            const newProfile = {
              id: authUser.id,
              school_id: schoolId,
              email: authUser.email || '',
              full_name: authUser.user_metadata?.full_name || authUser.email || 'User',
              role,
              status: 'active' as const,
              phone: authUser.user_metadata?.phone || '',
              created_at: new Date().toISOString(),
            };

            const { error: insertError } = await supabase
              .from('profiles')
              .insert(newProfile);

            if (!insertError) {
              profile = newProfile;
            } else {
              console.warn('Failed to create profile:', insertError.message);
            }
          }

          if (profile) {
            setUsers((prev) => {
              const exists = prev.some((u) => u.id === profile.id);
              if (exists) {
                return prev.map((u) => (u.id === profile.id ? { ...u, ...profile } : u));
              }
              return [profile as UserProfile, ...prev];
            });
            setCurrentUserId(profile.id);
            setIsAuthenticated(true);
          }
        } else {
          setIsAuthenticated(false);
          setCurrentUserId('');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentUser = useMemo(() => {
    const user = users.find((u) => u.id === currentUserId);
    if (user) return user;
    if (currentTenant) {
      const admin = users.find((u) => u.school_id === currentTenant.id && u.role === 'school_admin');
      if (admin) return admin;
    }
    return users[0];
  }, [users, currentUserId, currentTenant]);

  const loginWithEmailPassword = async (email: string, password?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, message: 'Please provide a valid email address and password.' };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { success: false, message: 'Invalid credentials. Please enter a valid email and password.' };
      }
      return { success: false, message: error.message || 'Authentication failed. Please verify your credentials.' };
    }

    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const loginAsRole = (role: UserRole, specificUserId?: string, targetSchoolId?: string) => {
    if (currentUser?.role !== 'super_admin') return;

    const schoolToUse = targetSchoolId || currentTenant?.id || '';
    setIsAuthenticated(true);
    if (specificUserId) {
      const targetUser = users.find((u) => u.id === specificUserId);
      if (targetUser) {
        setCurrentUserId(targetUser.id);
        return;
      }
    }

    if (role === 'super_admin') {
      const superUser = users.find((u) => u.role === 'super_admin');
      if (superUser) setCurrentUserId(superUser.id);
    } else if (role === 'school_admin') {
      let schoolAdmin = users.find((u) => u.school_id === schoolToUse && u.role === 'school_admin');
      if (!schoolAdmin) {
        const tenant = allTenants.find((t) => t.id === schoolToUse);
        const newAdmin: UserProfile = {
          id: `admin-${schoolToUse}`,
          school_id: schoolToUse,
          email: tenant?.contact_email || `admin@${tenant?.subdomain || 'school'}.edu`,
          full_name: tenant?.headmaster_name || `${tenant?.name || 'School'} Administrator`,
          role: 'school_admin',
          status: 'active',
          created_at: new Date().toISOString(),
        };
        setUsers((prev) => [newAdmin, ...prev]);
        schoolAdmin = newAdmin;
      }
      setCurrentUserId(schoolAdmin.id);
    } else if (role === 'teacher') {
      const teacher = users.find((u) => u.school_id === schoolToUse && u.role === 'teacher');
      if (teacher) {
        setCurrentUserId(teacher.id);
      }
    }
  };

  return {
    currentUser,
    loginWithEmailPassword,
    logout,
    loginAsRole,
  };
}
