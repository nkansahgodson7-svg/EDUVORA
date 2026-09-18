import { AssessmentSheet, StudentScore, AuditLog } from '../../types';
import { calculateGrade, getCurrentSession } from '../../lib/mockData';
import { generateId } from '../../utils/id';
import { GradebookState } from './types';

export function useGradebook(state: GradebookState) {
  const {
    assessmentSheets, setAssessmentSheets,
    studentScores, setStudentScores,
    allocations, setAllocations,
    students, currentTenant, currentUser,
    isOffline, setIsOffline,
    isSyncing, setIsSyncing,
    offlineQueue, setOfflineQueue,
    auditLogs, setAuditLogs,
  } = state;

  // Allocations Matrix
  const allocateTeacher = (teacherId: string, classId: string, subjectId: string, term: string) => {
    const exists = allocations.some(
      (a) =>
        a.school_id === (currentTenant?.id || '') &&
        a.teacher_id === teacherId &&
        a.class_id === classId &&
        a.subject_id === subjectId &&
        a.academic_term === term
    );
    if (exists) return;

    const newAlloc = {
      id: generateId('alloc'),
      school_id: currentTenant?.id || '',
      teacher_id: teacherId,
      class_id: classId,
      subject_id: subjectId,
      academic_term: term,
    };
    setAllocations((prev) => [newAlloc, ...prev]);

    // Ensure corresponding assessment sheet exists
    getOrCreateSheet(classId, subjectId, teacherId);
  };

  const deallocateTeacher = (allocationId: string) => {
    setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
  };

  // Grade Entry & Sheets
  const getOrCreateSheet = (classId: string, subjectId: string, teacherId: string): AssessmentSheet => {
    const existing = assessmentSheets.find(
      (s) =>
        s.school_id === (currentTenant?.id || '') &&
        s.class_id === classId &&
        s.subject_id === subjectId &&
        s.term === (currentTenant?.current_term || 'Term 1')
    );
    if (existing) return existing;

    const newSheet: AssessmentSheet = {
      id: generateId('sheet'),
      school_id: currentTenant?.id || '',
      class_id: classId,
      subject_id: subjectId,
      teacher_id: teacherId,
      term: currentTenant?.current_term || 'Term 1',
      academic_year: currentTenant?.current_session || getCurrentSession(),
      max_ca1: 20,
      max_ca2: 20,
      max_exam: 60,
      status: 'draft',
      updated_at: new Date().toISOString(),
    };

    setAssessmentSheets((prev) => [newSheet, ...prev]);
    return newSheet;
  };

  const saveScore = (
    sheetId: string,
    studentId: string,
    ca1: number,
    ca2: number,
    exam: number,
    remarks?: string
  ) => {
    const sheet = assessmentSheets.find((s) => s.id === sheetId);
    const maxCA1 = sheet?.max_ca1 || 20;
    const maxCA2 = sheet?.max_ca2 || 20;
    const maxExam = sheet?.max_exam || 60;

    // Validate boundaries
    const safeCA1 = Math.min(Math.max(0, Number(ca1) || 0), maxCA1);
    const safeCA2 = Math.min(Math.max(0, Number(ca2) || 0), maxCA2);
    const safeExam = Math.min(Math.max(0, Number(exam) || 0), maxExam);
    const total = safeCA1 + safeCA2 + safeExam;

    const { grade, points, remark: autoRemark } = calculateGrade(total);
    const finalRemark = remarks !== undefined && remarks.trim() !== '' ? remarks : autoRemark;

    const scorePayload: Partial<StudentScore> = {
      ca1: safeCA1,
      ca2: safeCA2,
      exam: safeExam,
      total,
      grade,
      points,
      remarks: finalRemark,
      updated_at: new Date().toISOString(),
      is_synced: !isOffline,
    };

    if (isOffline) {
      // Buffer in offline queue
      setOfflineQueue((prev) => [
        ...prev.filter((item) => !(item.type === 'SAVE_SCORE' && item.payload.sheetId === sheetId && item.payload.studentId === studentId)),
        {
          id: generateId('queue'),
          type: 'SAVE_SCORE',
          payload: { sheetId, studentId, ...scorePayload },
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    setStudentScores((prev) => {
      const idx = prev.findIndex((s) => s.sheet_id === sheetId && s.student_id === studentId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          ...scorePayload,
        } as StudentScore;
        return updated;
      } else {
        const newScore: StudentScore = {
          id: generateId('score'),
          school_id: currentTenant?.id || '',
          sheet_id: sheetId,
          student_id: studentId,
          ca1: safeCA1,
          ca2: safeCA2,
          exam: safeExam,
          total,
          grade,
          points,
          remarks: finalRemark,
          updated_at: new Date().toISOString(),
          is_synced: !isOffline,
        };
        return [newScore, ...prev];
      }
    });

    // Touch sheet updated_at
    setAssessmentSheets((prev) =>
      prev.map((s) => (s.id === sheetId ? { ...s, updated_at: new Date().toISOString() } : s))
    );
  };

  const submitSheetForReview = (sheetId: string) => {
    if (isOffline) {
      setOfflineQueue((prev) => [
        ...prev,
        {
          id: generateId('queue-submit'),
          type: 'SUBMIT_SHEET',
          payload: { sheetId },
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    setAssessmentSheets((prev) =>
      prev.map((s) =>
        s.id === sheetId
          ? {
              ...s,
              status: 'pending_approval',
              submitted_at: new Date().toISOString(),
              admin_remarks: 'Submitted by teacher for administrative review and lock-in.',
            }
          : s
      )
    );

    const log: AuditLog = {
      id: generateId('log'),
      school_id: currentTenant?.id || '',
      actor_name: currentUser.full_name,
      actor_role: currentUser.role,
      action: 'GRADE_SHEET_SUBMITTED',
      details: `Teacher ${currentUser.full_name} submitted assessment sheet ${sheetId} for Master Admin review.`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);
  };

  const reviewAssessmentSheet = (sheetId: string, action: 'approved' | 'rejected', adminRemarks?: string) => {
    setAssessmentSheets((prev) =>
      prev.map((s) =>
        s.id === sheetId
          ? {
              ...s,
              status: action,
              approved_at: action === 'approved' ? new Date().toISOString() : undefined,
              admin_remarks: adminRemarks || (action === 'approved' ? 'Approved and locked by School Administrator.' : 'Revision requested.'),
            }
          : s
      )
    );

    const log: AuditLog = {
      id: generateId('log'),
      school_id: currentTenant?.id || '',
      actor_name: currentUser.full_name,
      actor_role: currentUser.role,
      action: action === 'approved' ? 'GRADE_SHEET_APPROVED' : 'GRADE_SHEET_REJECTED',
      details: `${action.toUpperCase()}: Grade register ${sheetId} reviewed. ${adminRemarks || ''}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);
  };

  // Offline Simulator Toggle
  const toggleOffline = () => {
    if (isOffline) {
      // Going Online: auto-sync
      setIsOffline(false);
      syncOfflineQueue();
    } else {
      setIsOffline(true);
    }
  };

  const syncOfflineQueue = () => {
    if (offlineQueue.length === 0) return;
    setIsSyncing(true);

    setTimeout(() => {
      // Mark all scores as synced
      setStudentScores((prev) => prev.map((s) => ({ ...s, is_synced: true })));
      setOfflineQueue([]);
      setIsSyncing(false);

      const log: AuditLog = {
        id: generateId('log'),
        school_id: currentTenant?.id || '',
        actor_name: currentUser.full_name,
        actor_role: currentUser.role,
        action: 'OFFLINE_SYNC_COMPLETED',
        details: `Successfully flushed and reconciled offline changes to central database.`,
        timestamp: new Date().toISOString(),
      };
      setAuditLogs((prev) => [log, ...prev]);
    }, 800);
  };

  const resetAllData = () => {
    localStorage.clear();
    // State is managed by the provider via setters passed in. Caller handles reset state.
    setOfflineQueue([]);
    setIsOffline(false);
    // Re-fetch from Supabase so state reflects database truth
    // Caller should call refreshTenants() externally since we don't have it here
  };

  return {
    allocateTeacher,
    deallocateTeacher,
    getOrCreateSheet,
    saveScore,
    submitSheetForReview,
    reviewAssessmentSheet,
    toggleOffline,
    syncOfflineQueue,
    resetAllData,
  };
}
