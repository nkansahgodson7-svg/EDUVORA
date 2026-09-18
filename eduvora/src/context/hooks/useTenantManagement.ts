import React from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Tenant, UserProfile, AuditLog, Student } from '../../types';
import { generateId } from '../../utils/id';
import { isUUID } from '../../utils/validation';
import { getCurrentSession } from '../../lib/mockData';
import { TenantState } from './types';

interface TenantManagementDeps extends TenantState {
  setCurrentTenantId: React.Dispatch<React.SetStateAction<string>>;
}

export function useTenantManagement(deps: TenantManagementDeps) {
  const {
    allTenants, setAllTenants,
    currentTenantId, setCurrentTenantId,
    users, setUsers,
    classes, setClasses,
    subjects, setSubjects,
    students, setStudents,
    auditLogs, setAuditLogs,
    currentUser,
    refreshTenants,
  } = deps;

  const switchTenant = (tenantId: string) => {
    if (allTenants.some((t) => t.id === tenantId)) {
      setCurrentTenantId(tenantId);
    }
  };

  const registerSchool = (schoolData: Omit<Tenant, 'id' | 'created_at'>) => {
    const newId = generateId('school');
    const updatedTenants = [
      {
        ...schoolData,
        id: newId,
        created_at: new Date().toISOString(),
      },
      ...allTenants,
    ];
    setAllTenants(updatedTenants);

    if (isUUID(newId)) {
      supabase.from('schools').insert({
        id: newId,
        name: schoolData.name,
        code: schoolData.subdomain.toLowerCase(),
        address: schoolData.address,
        contact_email: schoolData.contact_email,
        phone: schoolData.phone,
        headmaster_name: schoolData.headmaster_name,
      }).then(({ error }) => {
        if (error) console.warn('Could not save school to database:', error.message);
      });
    }
  };

  const provisionNewTenant = async (
    tenantData: { name: string; subdomain: string; address: string; headmaster_name?: string },
    adminData: { name: string; email: string; phone: string },
    seedPreset?: 'standard' | 'secondary' | 'minimal'
  ) => {
    const newSchoolId = generateId('school');
    const currentSession = getCurrentSession();

    const newTenant: Tenant = {
      id: newSchoolId,
      name: tenantData.name,
      subdomain: tenantData.subdomain.toLowerCase(),
      logo_url: '',
      status: 'active',
      created_at: new Date().toISOString(),
      address: tenantData.address,
      phone: adminData.phone,
      contact_email: adminData.email,
      headmaster_name: tenantData.headmaster_name || tenantData.name,
      current_session: currentSession,
      current_term: 'Term 1',
      primary_color: '#2563EB',
      subscription_tier: 'starter',
    };

    // Insert school into Supabase
    if (isUUID(newSchoolId)) {
      await supabase.from('schools').insert({
        id: newSchoolId,
        name: tenantData.name,
        code: tenantData.subdomain.toLowerCase(),
        address: tenantData.address,
        contact_email: adminData.email,
        phone: adminData.phone,
        headmaster_name: tenantData.headmaster_name || tenantData.name,
      });
    }

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
          email: adminData.email,
          name: adminData.name,
          role: 'school_admin',
          school_id: newSchoolId,
          redirectTo: `${siteUrl}/`,
        }),
      }
    );

    const edgeResult = await edgeResponse.json();

    const adminUserId = edgeResult.user_id || `admin-${newSchoolId}`;
    const newAdmin: UserProfile = {
      id: adminUserId,
      school_id: newSchoolId,
      email: adminData.email,
      full_name: adminData.name,
      role: 'school_admin',
      status: 'active',
      phone: adminData.phone,
      created_at: new Date().toISOString(),
    };

    // Preliminary seed classes & subjects
    const newClasses: any[] = [];
    const newSubjects: any[] = [];

    if (seedPreset === 'standard' || seedPreset === 'secondary') {
      newClasses.push(
        { id: `cls-${newSchoolId}-1`, school_id: newSchoolId, name: 'Grade 9A', grade_level: 9, academic_year: currentSession, room_number: 'Room 101', capacity: 35 },
        { id: `cls-${newSchoolId}-2`, school_id: newSchoolId, name: 'Grade 9B', grade_level: 9, academic_year: currentSession, room_number: 'Room 102', capacity: 35 },
        { id: `cls-${newSchoolId}-3`, school_id: newSchoolId, name: 'Grade 10A', grade_level: 10, academic_year: currentSession, room_number: 'Room 201', capacity: 30 }
      );
      newSubjects.push(
        { id: `sub-${newSchoolId}-mth`, school_id: newSchoolId, name: 'Mathematics', code: 'MTH-101', category: 'core' },
        { id: `sub-${newSchoolId}-eng`, school_id: newSchoolId, name: 'English Language', code: 'ENG-101', category: 'core' },
        { id: `sub-${newSchoolId}-sci`, school_id: newSchoolId, name: 'Integrated Science', code: 'SCI-101', category: 'core' },
        { id: `sub-${newSchoolId}-csc`, school_id: newSchoolId, name: 'Computer Studies', code: 'CSC-101', category: 'vocational' }
      );
    } else {
      newClasses.push({ id: `cls-${newSchoolId}-1`, school_id: newSchoolId, name: 'Year 1A', grade_level: 1, academic_year: currentSession, capacity: 25 });
      newSubjects.push({ id: `sub-${newSchoolId}-mth`, school_id: newSchoolId, name: 'Basic Mathematics', code: 'MTH-001', category: 'core' });
    }

    // Add seed students
    const sampleStudents: Student[] = [
      {
        id: `stu-${newSchoolId}-01`,
        school_id: newSchoolId,
        admission_number: `${tenantData.subdomain.toUpperCase().slice(0, 3)}-001`,
        full_name: 'Jordan Reed',
        class_id: newClasses[0].id,
        gender: 'Male',
        date_of_birth: '2011-03-12',
        guardian_name: 'Samuel Reed',
        guardian_phone: '+1 (555) 777-8899',
        attendance_percentage: 96.0,
        created_at: new Date().toISOString(),
      },
      {
        id: `stu-${newSchoolId}-02`,
        school_id: newSchoolId,
        admission_number: `${tenantData.subdomain.toUpperCase().slice(0, 3)}-002`,
        full_name: 'Sophia Patel',
        class_id: newClasses[0].id,
        gender: 'Female',
        date_of_birth: '2011-06-25',
        guardian_name: 'Meera Patel',
        guardian_phone: '+1 (555) 777-8890',
        attendance_percentage: 98.0,
        created_at: new Date().toISOString(),
      },
    ];

    const newLog: AuditLog = {
      id: generateId('log'),
      school_id: newSchoolId,
      actor_name: currentUser.full_name,
      actor_role: currentUser.role,
      action: 'TENANT_PROVISIONED',
      details: `Provisioned school "${tenantData.name}" (${tenantData.subdomain}). Invite email sent to ${adminData.email}.`,
      timestamp: new Date().toISOString(),
    };

    setAllTenants((prev) => [newTenant, ...prev]);
    setUsers((prev) => [newAdmin, ...prev]);
    setClasses((prev) => [...prev, ...newClasses]);
    setSubjects((prev) => [...prev, ...newSubjects]);
    setStudents((prev) => [...prev, ...sampleStudents]);
    setAuditLogs((prev) => [newLog, ...prev]);

    // Refresh from database
    refreshTenants();

    return { school: newTenant, admin: newAdmin };
  };

  const updateTenant = (tenantId: string, data: Partial<Tenant>) => {
    setAllTenants((prev) =>
      prev.map((t) => (t.id === tenantId ? { ...t, ...data } : t))
    );
    if (isUUID(tenantId)) {
      const dbUpdates: any = {};
      if (data.name) dbUpdates.name = data.name;
      if (data.subdomain) dbUpdates.code = data.subdomain;
      if (data.status) dbUpdates.status = data.status;
      if (Object.keys(dbUpdates).length > 0) {
        supabase.from('schools').update(dbUpdates).eq('id', tenantId).then(({ error }) => {
          if (error) console.warn('Could not update school in database:', error.message);
        });
      }
    }
  };

  const deleteTenant = (tenantId: string) => {
    setAllTenants((prev) => prev.filter((t) => t.id !== tenantId));
    // Clean up other dependent entities
    setUsers((prev) => prev.filter((u) => u.school_id !== tenantId));
    setClasses((prev) => prev.filter((c) => c.school_id !== tenantId));
    setStudents((prev) => prev.filter((s) => s.school_id !== tenantId));

    if (isUUID(tenantId)) {
      supabase.from('schools').delete().eq('id', tenantId).then(({ error }) => {
        if (error) console.warn('Could not delete school from database:', error.message);
      });
    }
  };

  const updateTenantSettings = (settings: Partial<Tenant>) => {
    setAllTenants((prev) =>
      prev.map((t) => (t.id === currentTenantId ? { ...t, ...settings } : t))
    );

    // Sync to Supabase
    if (isUUID(currentTenantId)) {
      const dbUpdates: any = {};
      if (settings.name) dbUpdates.name = settings.name;
      if (settings.subdomain) dbUpdates.code = settings.subdomain;
      if (settings.status) dbUpdates.status = settings.status;
      if (settings.address !== undefined) dbUpdates.address = settings.address;
      if (settings.phone !== undefined) dbUpdates.phone = settings.phone;
      if (settings.contact_email !== undefined) dbUpdates.contact_email = settings.contact_email;
      if (settings.headmaster_name !== undefined) dbUpdates.headmaster_name = settings.headmaster_name;
      if (settings.primary_color !== undefined) dbUpdates.primary_color = settings.primary_color;
      if (Object.keys(dbUpdates).length > 0) {
        supabase.from('schools').update(dbUpdates).eq('id', currentTenantId).then(({ error }) => {
          if (error) console.warn('Could not update school settings in database:', error.message);
        });
      }
    }

    const log: AuditLog = {
      id: generateId('log'),
      school_id: currentTenantId,
      actor_name: currentUser.full_name,
      actor_role: currentUser.role,
      action: 'SETTINGS_UPDATED',
      details: `Updated school settings: ${Object.keys(settings).join(', ')}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);
  };

  return {
    switchTenant,
    registerSchool,
    provisionNewTenant,
    updateTenant,
    deleteTenant,
    updateTenantSettings,
  };
}
