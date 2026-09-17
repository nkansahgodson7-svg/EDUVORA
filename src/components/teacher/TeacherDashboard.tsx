import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  BookOpen,
  Lock,
  Send,
  Save,
  Check,
  Building2,
  Clock,
  ArrowRight,
  Smartphone,
  LayoutGrid,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useTenantAuth } from '../../context/TenantAuthContext';
import { AssessmentSheet, StudentScore } from '../../types';
import { calculateGrade } from '../../lib/mockData';

export const TeacherDashboard: React.FC = () => {
  const {
    currentTenant,
    currentUser,
    tenantClasses,
    tenantSubjects,
    teacherAllocations,
    tenantStudents,
    teacherSheets,
    tenantScores,
    saveScore,
    submitSheetForReview,
    getOrCreateSheet,
  } = useTenantAuth();

  // Active selected allocation (class + subject)
  const [selectedAllocationId, setSelectedAllocationId] = useState<string>(
    teacherAllocations[0]?.id || ''
  );

  // Active Sheet
  const activeAllocation = teacherAllocations.find((a) => a.id === selectedAllocationId) || teacherAllocations[0];
  const activeClass = tenantClasses.find((c) => c.id === activeAllocation?.class_id);
  const activeSubject = tenantSubjects.find((s) => s.id === activeAllocation?.subject_id);

  // Active sheet entity
  const [activeSheet, setActiveSheet] = useState<AssessmentSheet | null>(null);

  // Students in active class
  const classStudents = tenantStudents.filter((s) => s.class_id === activeClass?.id);

  // Mobile / Desktop View Mode: 'cards' (touch-first card stack) or 'table' (dense spreadsheet)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [studentSearch, setStudentSearch] = useState('');

  // Local editing state for fast responsiveness & autosave
  const [scoresState, setScoresState] = useState<Record<string, { ca1: string; ca2: string; exam: string; remarks: string }>>({});
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Input refs for auto-advancing spreadsheet keyboard navigation
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Ensure sheet exists and load scores into local state
  useEffect(() => {
    if (!activeClass || !activeSubject) return;
    const sheet = getOrCreateSheet(activeClass.id, activeSubject.id, currentUser.id);
    setActiveSheet(sheet);

    // Populate initial inputs from tenantScores
    const initialMap: Record<string, { ca1: string; ca2: string; exam: string; remarks: string }> = {};
    classStudents.forEach((st) => {
      const found = tenantScores.find((sc) => sc.sheet_id === sheet.id && sc.student_id === st.id);
      initialMap[st.id] = {
        ca1: found ? String(found.ca1) : '0',
        ca2: found ? String(found.ca2) : '0',
        exam: found ? String(found.exam) : '0',
        remarks: found?.remarks || '',
      };
    });
    setScoresState(initialMap);
  }, [activeAllocation?.id, activeClass?.id, activeSubject?.id, currentUser.id]);

  // Handle cell input change
  const handleScoreChange = (
    studentId: string,
    field: 'ca1' | 'ca2' | 'exam' | 'remarks',
    value: string
  ) => {
    if (!activeSheet || activeSheet.status === 'approved') return;

    setAutosaveStatus('saving');

    setScoresState((prev) => {
      const current = prev[studentId] || { ca1: '0', ca2: '0', exam: '0', remarks: '' };
      const updated = { ...current, [field]: value };

      const numCA1 = field === 'ca1' ? Number(value) || 0 : Number(current.ca1) || 0;
      const numCA2 = field === 'ca2' ? Number(value) || 0 : Number(current.ca2) || 0;
      const numExam = field === 'exam' ? Number(value) || 0 : Number(current.exam) || 0;
      const remarkVal = field === 'remarks' ? value : current.remarks;

      saveScore(activeSheet.id, studentId, numCA1, numCA2, numExam, remarkVal);

      setTimeout(() => setAutosaveStatus('saved'), 350);
      return { ...prev, [studentId]: updated };
    });
  };

  // Quick touch increment/decrement for mobile
  const handleStepScore = (
    studentId: string,
    field: 'ca1' | 'ca2' | 'exam',
    delta: number,
    maxVal: number
  ) => {
    if (!activeSheet || activeSheet.status === 'approved') return;
    const current = scoresState[studentId] || { ca1: '0', ca2: '0', exam: '0', remarks: '' };
    const currVal = Number(current[field]) || 0;
    const nextVal = Math.max(0, Math.min(maxVal, currVal + delta));
    handleScoreChange(studentId, field, String(nextVal));
  };

  // Keyboard navigation: Enter or ArrowDown advances to next student
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentIndex: number,
    field: 'ca1' | 'ca2' | 'exam'
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextStudent = classStudents[studentIndex + 1];
      if (nextStudent) {
        const nextRefKey = `${nextStudent.id}-${field}`;
        inputRefs.current[nextRefKey]?.focus();
        inputRefs.current[nextRefKey]?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevStudent = classStudents[studentIndex - 1];
      if (prevStudent) {
        const prevRefKey = `${prevStudent.id}-${field}`;
        inputRefs.current[prevRefKey]?.focus();
        inputRefs.current[prevRefKey]?.select();
      }
    }
  };

  // Submit assessment sheet for admin review
  const handleSubmitForReview = () => {
    if (!activeSheet) return;
    const confirmed = window.confirm(
      `Submit grade sheet for ${activeClass?.name} - ${activeSubject?.name} to School Admin for final approval? Once submitted, it will be marked as Pending Review.`
    );
    if (confirmed) {
      submitSheetForReview(activeSheet.id);
      setActiveSheet({ ...activeSheet, status: 'pending_approval' });
    }
  };

  if (teacherAllocations.length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center bg-white rounded-[2rem] border border-stone-200">
        <GraduationCap className="w-12 h-12 mx-auto text-stone-400 mb-3" />
        <h2 className="text-lg font-bold text-stone-900">No Classes Assigned</h2>
        <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
          You are not currently allocated to any classes or curriculum subjects. Please contact your School Admin ({currentTenant.name}) to assign your teaching allocations.
        </p>
      </div>
    );
  }

  const isLocked = activeSheet?.status === 'approved';
  const isPending = activeSheet?.status === 'pending_approval';

  // Compute Class Average
  const totalScoresList = classStudents.map((st) => {
    const d = scoresState[st.id] || { ca1: '0', ca2: '0', exam: '0' };
    return (Number(d.ca1) || 0) + (Number(d.ca2) || 0) + (Number(d.exam) || 0);
  });
  const classAvg = totalScoresList.length > 0
    ? (totalScoresList.reduce((a, b) => a + b, 0) / totalScoresList.length).toFixed(1)
    : '0.0';

  // Filter students by search term
  const filteredStudents = classStudents.filter((st) =>
    st.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    st.admission_number.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-10 pb-20 sm:pb-8">
      {/* Signature Split Hero Section (Responsive across all screens) */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center pt-1 sm:pt-2">
        {/* Left Column: Editorial Headline & Primary Controls */}
        <div className="md:col-span-7 space-y-4 sm:space-y-6">
          <div className="space-y-2 sm:space-y-3">
            <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-bold tracking-widest text-stone-500 uppercase">
              <span className="truncate max-w-[200px]">{currentTenant.name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#f6c042]"></span>
              <span>Faculty Register</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black tracking-tight text-stone-950 leading-[1.1]">
              {activeClass?.name || 'Class'} <br />
              <span className="text-stone-800 font-extrabold">{activeSubject?.name || 'Subject'}</span>
            </h1>

            <p className="text-xs sm:text-base text-stone-600 max-w-xl leading-relaxed">
              Record Continuous Assessment (CA1 /20, CA2 /20) and Examination (/60) marks. Touch-optimized card grading for mobile phones, and spreadsheet grid for desktop.
            </p>
          </div>

          {/* Metric + Dark Pill CTA Button with Gold Icon (Touch-Friendly min-h-[44px]) */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-1">
            <div>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-stone-400 block">
                Class Average
              </span>
              <div className="text-2xl sm:text-3xl font-black text-stone-950">
                {classAvg}%
              </div>
            </div>

            {!isLocked && !isPending && (
              <button
                id="submit-sheet-btn"
                onClick={handleSubmitForReview}
                className="min-h-[48px] px-5 sm:px-6 py-3 rounded-full bg-[#111113] hover:bg-black text-white text-xs font-bold flex items-center gap-3 shadow-xl transition-all active:scale-[0.98]"
              >
                <span className="w-7 h-7 rounded-full bg-[#f6c042] flex items-center justify-center text-stone-950 shrink-0">
                  <Send className="w-3.5 h-3.5" strokeWidth={2.5} />
                </span>
                <span className="tracking-wide">Submit to Admin</span>
              </button>
            )}

            {isPending && (
              <div className="min-h-[44px] px-4 sm:px-5 py-2.5 rounded-full bg-[#f6c042] text-stone-950 text-xs font-black flex items-center gap-2 shadow-sm">
                <Clock className="w-4 h-4" />
                <span>Submitted for Admin Review</span>
              </div>
            )}

            {isLocked && (
              <div className="min-h-[44px] px-4 sm:px-5 py-2.5 rounded-full bg-stone-900 text-white text-xs font-black flex items-center gap-2 shadow-sm">
                <Lock className="w-4 h-4 text-[#f6c042]" />
                <span>Register Approved & Locked</span>
              </div>
            )}
          </div>

          {/* Teacher Profile Spotlight Badge */}
          <div className="pt-2 sm:pt-4 flex items-center gap-3">
            <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full p-0.5 bg-[#f6c042] shadow-sm shrink-0">
              <div className="w-full h-full rounded-full overflow-hidden bg-stone-200">
                <img
                  src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120'}
                  alt={currentUser.full_name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                Assigned Educator
              </div>
              <div className="text-xs font-bold text-stone-900 flex flex-wrap items-center gap-1.5">
                <span>{currentUser.full_name}</span>
                <span className="text-stone-400 hidden sm:inline">•</span>
                <span className="text-stone-500 font-mono text-[11px]">{currentUser.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Signature Matte Black Showcase Panel */}
        <div className="md:col-span-5">
          <div className="rounded-[2rem] sm:rounded-[2.5rem] bg-[#111113] text-white p-5 sm:p-8 relative overflow-hidden shadow-2xl border border-stone-800 space-y-4 sm:space-y-6">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f6c042]"></span>
                <span className="text-xs font-bold tracking-wider uppercase text-stone-400">
                  Register Summary
                </span>
              </div>
              <span className="font-mono text-[10px] sm:text-[11px] text-stone-400 px-3 py-1 rounded-full bg-stone-900 border border-stone-800">
                {currentTenant.current_term}
              </span>
            </div>

            {/* Subject Presentation */}
            <div className="flex items-center gap-4 py-1">
              <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-2xl overflow-hidden border-2 border-stone-800 bg-stone-900 p-2.5 sm:p-3 shrink-0 flex items-center justify-center text-[#f6c042]">
                <BookOpen className="w-6 sm:w-8 h-6 sm:h-8" />
              </div>
              <div>
                <h3 className="text-base sm:text-xl font-bold text-white tracking-tight">
                  {activeSubject?.name} ({activeSubject?.code})
                </h3>
                <div className="text-xs font-mono text-[#f6c042] mt-0.5">
                  Stream: {activeClass?.name}
                </div>
                <div className="text-[11px] sm:text-xs text-stone-400 mt-0.5">
                  Weight: 20% CA1 + 20% CA2 + 60% Exam
                </div>
              </div>
            </div>

            {/* Dashed-Border Summary Card */}
            <div className="border border-dashed border-stone-700/80 rounded-2xl p-4 sm:p-5 bg-stone-900/70 backdrop-blur-sm space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-400">Register Enrollment</span>
                <span className="text-stone-300 font-mono text-[11px]">{classStudents.length} Students</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-xs sm:text-sm font-bold text-white">Continuous Assessment</div>
                  <div className="text-[11px] text-stone-400 font-mono">
                    {autosaveStatus === 'saving' ? 'Autosaving...' : 'All scores synchronized'}
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-[#f6c042] text-stone-950 text-[11px] sm:text-xs font-black">
                  {isLocked ? 'Locked' : isPending ? 'Pending' : 'Draft'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Allocation Selector Tabs (Swipeable Class & Subject Switcher on mobile) */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-200 scrollbar-none">
        {teacherAllocations.map((alloc) => {
          const cls = tenantClasses.find((c) => c.id === alloc.class_id);
          const sub = tenantSubjects.find((s) => s.id === alloc.subject_id);
          const isSelected = alloc.id === selectedAllocationId;

          return (
            <button
              key={alloc.id}
              onClick={() => setSelectedAllocationId(alloc.id)}
              className={`min-h-[44px] px-4 sm:px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 shrink-0 ${
                isSelected
                  ? 'bg-stone-950 text-white shadow-sm'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <BookOpen className={`w-3.5 h-3.5 ${isSelected ? 'text-[#f6c042]' : 'text-stone-500'}`} />
              <span>{cls?.name} • {sub?.name}</span>
            </button>
          );
        })}
      </div>

      {/* Modern Gradebook Container */}
      <div className="bg-white border border-stone-200 rounded-[1.8rem] sm:rounded-[2rem] p-4 sm:p-8 shadow-sm space-y-5">
        {/* Header & View Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-stone-100">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-stone-950">
              Grade Entry • {activeClass?.name} ({activeSubject?.name})
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Live score recording with automated summation and grade letter assignment.
            </p>
          </div>

          {/* Controls: Touch Cards vs Spreadsheet Grid toggle */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-full border border-stone-200">
              <button
                onClick={() => setViewMode('cards')}
                className={`min-h-[38px] px-3.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'cards'
                    ? 'bg-stone-950 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-950'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile Cards</span>
              </button>

              <button
                onClick={() => setViewMode('table')}
                className={`min-h-[38px] px-3.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'table'
                    ? 'bg-stone-950 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-950'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Spreadsheet</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-stone-600">
                {autosaveStatus === 'saving' ? 'Saving...' : 'Synced'}
              </span>
            </div>
          </div>
        </div>

        {/* Lock Notice if locked */}
        {isLocked && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-700 flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-stone-900 shrink-0" />
            <span>
              This continuous assessment register has been approved and locked by the School Admin. Scores cannot be edited.
            </span>
          </div>
        )}

        {/* Search Input for Students */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search student by name or admission no..."
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-full bg-stone-50 border border-stone-200 text-base sm:text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-stone-900 transition-colors"
          />
        </div>

        {/* VIEW 1: RESPONSIVE TOUCH CARDS MODE (1 col on mobile, 2 on tablet, 3 on laptop, 4 on 2xl) */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredStudents.length === 0 ? (
              <div className="col-span-full p-8 text-center text-stone-500 text-xs">
                No students found matching "{studentSearch}"
              </div>
            ) : (
              filteredStudents.map((student, idx) => {
                const currentData = scoresState[student.id] || { ca1: '0', ca2: '0', exam: '0', remarks: '' };
                const ca1Val = Number(currentData.ca1) || 0;
                const ca2Val = Number(currentData.ca2) || 0;
                const examVal = Number(currentData.exam) || 0;
                const total = Math.min(100, ca1Val + ca2Val + examVal);
                const { grade } = calculateGrade(total);

                return (
                  <div
                    key={student.id}
                    className="p-3.5 sm:p-5 rounded-2xl border border-stone-200 bg-white hover:border-stone-400 transition-all shadow-xs space-y-3.5 flex flex-col justify-between"
                  >
                    <div>
                      {/* Student Card Header: Name + Live Total & Grade Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-stone-800 text-xs shrink-0">
                            {student.full_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-stone-950 text-xs sm:text-sm truncate">{student.full_name}</div>
                            <div className="font-mono text-[10px] sm:text-[11px] text-stone-400 truncate">{student.admission_number}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <div className="font-mono font-black text-xs sm:text-sm text-stone-950">{total} / 100</div>
                            <div className="text-[9px] sm:text-[10px] text-stone-400 font-semibold uppercase">Total</div>
                          </div>
                          <span className="w-7 sm:w-8 h-7 sm:h-8 rounded-full bg-stone-950 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                            {grade}
                          </span>
                        </div>
                      </div>

                      {/* Touch Score Steppers Row (Fit tightly and cleanly on all phone screens down to 280px) */}
                      <div className="grid grid-cols-3 gap-1 sm:gap-2 pt-3">
                        {/* CA 1 (/20) */}
                        <div className="p-1.5 sm:p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-1 min-w-0">
                          <div className="text-[9px] sm:text-[10px] font-bold text-stone-500 uppercase tracking-wider truncate">
                            CA 1 <span className="text-stone-400 font-normal">/20</span>
                          </div>
                          <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                            <button
                              type="button"
                              disabled={isLocked || isPending || ca1Val <= 0}
                              onClick={() => handleStepScore(student.id, 'ca1', -1, 20)}
                              className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-30 flex items-center justify-center text-stone-700 active:scale-95 shrink-0"
                            >
                              <Minus className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              disabled={isLocked || isPending}
                              value={currentData.ca1}
                              onChange={(e) => handleScoreChange(student.id, 'ca1', e.target.value)}
                              className="w-9 sm:w-11 h-7 sm:h-8 text-center font-mono font-black text-xs sm:text-sm bg-white rounded-lg border border-stone-200 text-stone-900 focus:border-stone-900 focus:outline-none shrink-0"
                            />
                            <button
                              type="button"
                              disabled={isLocked || isPending || ca1Val >= 20}
                              onClick={() => handleStepScore(student.id, 'ca1', 1, 20)}
                              className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-30 flex items-center justify-center text-stone-700 active:scale-95 shrink-0"
                            >
                              <Plus className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* CA 2 (/20) */}
                        <div className="p-1.5 sm:p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-1 min-w-0">
                          <div className="text-[9px] sm:text-[10px] font-bold text-stone-500 uppercase tracking-wider truncate">
                            CA 2 <span className="text-stone-400 font-normal">/20</span>
                          </div>
                          <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                            <button
                              type="button"
                              disabled={isLocked || isPending || ca2Val <= 0}
                              onClick={() => handleStepScore(student.id, 'ca2', -1, 20)}
                              className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-30 flex items-center justify-center text-stone-700 active:scale-95 shrink-0"
                            >
                              <Minus className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              disabled={isLocked || isPending}
                              value={currentData.ca2}
                              onChange={(e) => handleScoreChange(student.id, 'ca2', e.target.value)}
                              className="w-9 sm:w-11 h-7 sm:h-8 text-center font-mono font-black text-xs sm:text-sm bg-white rounded-lg border border-stone-200 text-stone-900 focus:border-stone-900 focus:outline-none shrink-0"
                            />
                            <button
                              type="button"
                              disabled={isLocked || isPending || ca2Val >= 20}
                              onClick={() => handleStepScore(student.id, 'ca2', 1, 20)}
                              className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-30 flex items-center justify-center text-stone-700 active:scale-95 shrink-0"
                            >
                              <Plus className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Exam (/60) */}
                        <div className="p-1.5 sm:p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-1 min-w-0">
                          <div className="text-[9px] sm:text-[10px] font-bold text-stone-500 uppercase tracking-wider truncate">
                            Exam <span className="text-stone-400 font-normal">/60</span>
                          </div>
                          <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                            <button
                              type="button"
                              disabled={isLocked || isPending || examVal <= 0}
                              onClick={() => handleStepScore(student.id, 'exam', -5, 60)}
                              className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-30 flex items-center justify-center text-stone-700 active:scale-95 text-[10px] font-bold shrink-0"
                            >
                              -5
                            </button>
                            <input
                              type="number"
                              min="0"
                              max="60"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              disabled={isLocked || isPending}
                              value={currentData.exam}
                              onChange={(e) => handleScoreChange(student.id, 'exam', e.target.value)}
                              className="w-9 sm:w-11 h-7 sm:h-8 text-center font-mono font-black text-xs sm:text-sm bg-white rounded-lg border border-stone-200 text-stone-900 focus:border-stone-900 focus:outline-none shrink-0"
                            />
                            <button
                              type="button"
                              disabled={isLocked || isPending || examVal >= 60}
                              onClick={() => handleStepScore(student.id, 'exam', 5, 60)}
                              className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-30 flex items-center justify-center text-stone-700 active:scale-95 text-[10px] font-bold shrink-0"
                            >
                              +5
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Teacher Appraisal Remark Input with Quick Suggestion Chips */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                        <span className="font-semibold text-stone-500">Teacher Appraisal Remark</span>
                      </div>

                      {/* Quick Chips */}
                      {!isLocked && !isPending && (
                        <div className="flex flex-wrap gap-1">
                          {['Excellent analytical work', 'Consistent performance', 'Satisfactory progress', 'Needs more focus'].map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => handleScoreChange(student.id, 'remarks', chip)}
                              className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[10px] font-medium text-stone-700 transition-colors"
                            >
                              + {chip}
                            </button>
                          ))}
                        </div>
                      )}

                      <input
                        type="text"
                        disabled={isLocked || isPending}
                        placeholder="Enter assessment remarks..."
                        value={currentData.remarks}
                        onChange={(e) => handleScoreChange(student.id, 'remarks', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-base sm:text-xs border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:border-stone-900 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* VIEW 2: FULL SPREADSHEET TABLE (Horizontal Scroll with Mobile Touch Support) */}
        {viewMode === 'table' && (
          <div className="space-y-2">
            <div className="text-[11px] text-stone-400 font-medium block sm:hidden">
              Swipe table horizontally to navigate all columns →
            </div>
            <div className="overflow-x-auto border border-stone-200 rounded-2xl">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[11px] border-b border-stone-200">
                <tr>
                  <th className="py-3.5 px-4 font-bold min-w-[180px]">Student Name & ID</th>
                  <th className="py-3.5 px-3 text-center font-bold min-w-[95px]">
                    CA 1 <span className="block text-[10px] text-stone-400 font-normal">/20</span>
                  </th>
                  <th className="py-3.5 px-3 text-center font-bold min-w-[95px]">
                    CA 2 <span className="block text-[10px] text-stone-400 font-normal">/20</span>
                  </th>
                  <th className="py-3.5 px-3 text-center font-bold min-w-[105px]">
                    Exam <span className="block text-[10px] text-stone-400 font-normal">/60</span>
                  </th>
                  <th className="py-3.5 px-3 text-center font-bold min-w-[85px] bg-stone-100">
                    Total <span className="block text-[10px] text-stone-600 font-bold">/100</span>
                  </th>
                  <th className="py-3.5 px-3 text-center font-bold min-w-[80px]">Grade</th>
                  <th className="py-3.5 px-4 font-bold min-w-[220px]">Teacher Appraisal Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredStudents.map((student, idx) => {
                  const currentData = scoresState[student.id] || { ca1: '0', ca2: '0', exam: '0', remarks: '' };
                  const ca1Val = Number(currentData.ca1) || 0;
                  const ca2Val = Number(currentData.ca2) || 0;
                  const examVal = Number(currentData.exam) || 0;
                  const total = Math.min(100, ca1Val + ca2Val + examVal);
                  const { grade } = calculateGrade(total);

                  return (
                    <tr key={student.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-stone-950">
                        <div>{student.full_name}</div>
                        <div className="text-[11px] font-mono text-stone-400">
                          {student.admission_number}
                        </div>
                      </td>

                      {/* CA 1 */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          ref={(el) => { inputRefs.current[`${student.id}-ca1`] = el; }}
                          type="number"
                          min="0"
                          max="20"
                          step="1"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          disabled={isLocked || isPending}
                          value={currentData.ca1}
                          onChange={(e) => handleScoreChange(student.id, 'ca1', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx, 'ca1')}
                          className={`w-18 mx-auto text-center font-mono py-2 px-2 rounded-xl text-base sm:text-xs font-bold border transition-all ${
                            isLocked || isPending
                              ? 'bg-stone-100 text-stone-400 cursor-not-allowed border-stone-200'
                              : 'bg-stone-50 text-stone-900 border-stone-200 focus:bg-white focus:border-stone-900 focus:outline-none'
                          }`}
                        />
                      </td>

                      {/* CA 2 */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          ref={(el) => { inputRefs.current[`${student.id}-ca2`] = el; }}
                          type="number"
                          min="0"
                          max="20"
                          step="1"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          disabled={isLocked || isPending}
                          value={currentData.ca2}
                          onChange={(e) => handleScoreChange(student.id, 'ca2', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx, 'ca2')}
                          className={`w-18 mx-auto text-center font-mono py-2 px-2 rounded-xl text-base sm:text-xs font-bold border transition-all ${
                            isLocked || isPending
                              ? 'bg-stone-100 text-stone-400 cursor-not-allowed border-stone-200'
                              : 'bg-stone-50 text-stone-900 border-stone-200 focus:bg-white focus:border-stone-900 focus:outline-none'
                          }`}
                        />
                      </td>

                      {/* Exam */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          ref={(el) => { inputRefs.current[`${student.id}-exam`] = el; }}
                          type="number"
                          min="0"
                          max="60"
                          step="1"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          disabled={isLocked || isPending}
                          value={currentData.exam}
                          onChange={(e) => handleScoreChange(student.id, 'exam', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx, 'exam')}
                          className={`w-18 mx-auto text-center font-mono py-2 px-2 rounded-xl text-base sm:text-xs font-bold border transition-all ${
                            isLocked || isPending
                              ? 'bg-stone-100 text-stone-400 cursor-not-allowed border-stone-200'
                              : 'bg-stone-50 text-stone-900 border-stone-200 focus:bg-white focus:border-stone-900 focus:outline-none'
                          }`}
                        />
                      </td>

                      {/* Total */}
                      <td className="py-2.5 px-3 text-center bg-stone-50">
                        <span className="font-mono font-black text-sm text-stone-950">
                          {total}
                        </span>
                      </td>

                      {/* Grade */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-black text-[11px] bg-stone-950 text-white">
                          {grade}
                        </span>
                      </td>

                      {/* Remarks */}
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          disabled={isLocked || isPending}
                          placeholder="Appraisal remark..."
                          value={currentData.remarks}
                          onChange={(e) => handleScoreChange(student.id, 'remarks', e.target.value)}
                          className={`w-full py-2 px-3 rounded-xl text-base sm:text-xs border transition-all ${
                            isLocked || isPending
                              ? 'bg-stone-100 text-stone-400 cursor-not-allowed border-stone-200'
                              : 'bg-stone-50 text-stone-900 border-stone-200 focus:bg-white focus:border-stone-900 focus:outline-none'
                          }`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Mobile Action Bar (Always accessible to thumb without scrolling) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200 p-3 px-4 shadow-xl flex items-center justify-between">
        <div>
          <div className="text-[10px] text-stone-400 uppercase tracking-wider font-bold">Class Average</div>
          <div className="font-mono font-black text-base text-stone-950">{classAvg}%</div>
        </div>

        {!isLocked && !isPending && (
          <button
            onClick={handleSubmitForReview}
            className="min-h-[44px] px-5 py-2 rounded-full bg-stone-950 text-white text-xs font-bold flex items-center gap-2 shadow-md active:scale-95"
          >
            <Send className="w-3.5 h-3.5 text-[#f6c042]" />
            <span>Submit Sheet</span>
          </button>
        )}

        {isPending && (
          <span className="px-3.5 py-2 rounded-full bg-[#f6c042] text-stone-950 font-bold text-xs flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
          </span>
        )}

        {isLocked && (
          <span className="px-3.5 py-2 rounded-full bg-stone-900 text-white font-bold text-xs flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#f6c042]" />
            <span>Locked</span>
          </span>
        )}
      </div>
    </div>
  );
};
