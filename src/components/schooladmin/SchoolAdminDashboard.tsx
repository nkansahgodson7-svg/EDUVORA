import React, { useState } from 'react';
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  FileText,
  Settings,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  KeyRound,
  Trash2,
  Lock,
  Eye,
  Copy,
  Check,
  Building2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useTenantAuth } from '../../context/TenantAuthContext';
import { UserProfile, Student, AssessmentSheet } from '../../types';
import { DEFAULT_GRADING_RULES } from '../../lib/mockData';
import { ReportCardView } from '../reportcard/ReportCardView';

export const SchoolAdminDashboard: React.FC = () => {
  const {
    currentTenant,
    currentUser,
    tenantClasses,
    tenantSubjects,
    tenantAllocations,
    tenantStudents,
    tenantAssessmentSheets,
    tenantScores,
    availableTeachers,
    addTeacher,
    generateInviteKey,
    toggleTeacherStatus,
    addStudent,
    deleteStudent,
    allocateTeacher,
    deallocateTeacher,
    reviewAssessmentSheet,
    updateTenantSettings,
  } = useTenantAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'allocations' | 'approvals' | 'report_cards' | 'settings'>('overview');

  // Modal / Form states
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [newTeacherForm, setNewTeacherForm] = useState({ name: '', email: '', phone: '' });
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    full_name: '',
    admission_number: '',
    class_id: tenantClasses[0]?.id || '',
    gender: 'Male' as 'Male' | 'Female',
    guardian_name: '',
    guardian_phone: '',
  });

  // Allocation matrix states
  const [allocTeacherId, setAllocTeacherId] = useState(availableTeachers[0]?.id || '');
  const [allocClassId, setAllocClassId] = useState(tenantClasses[0]?.id || '');
  const [allocSubjectId, setAllocSubjectId] = useState(tenantSubjects[0]?.id || '');

  // Grade review sheet inspector modal
  const [inspectingSheet, setInspectingSheet] = useState<AssessmentSheet | null>(null);
  const [adminRemarkInput, setAdminRemarkInput] = useState('');

  // Report Card selection
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(tenantStudents[0] || null);

  // Search queries
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Derived metrics
  const pendingSheets = tenantAssessmentSheets.filter((s) => s.status === 'pending_approval');
  const approvedSheets = tenantAssessmentSheets.filter((s) => s.status === 'approved');

  const handleCopyInvite = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherForm.name || !newTeacherForm.email) return;
    addTeacher(newTeacherForm.name, newTeacherForm.email, newTeacherForm.phone);
    setNewTeacherForm({ name: '', email: '', phone: '' });
    setIsAddTeacherOpen(false);
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentForm.full_name || !newStudentForm.admission_number || !newStudentForm.class_id) return;
    addStudent({
      admission_number: newStudentForm.admission_number,
      full_name: newStudentForm.full_name,
      class_id: newStudentForm.class_id,
      gender: newStudentForm.gender,
      date_of_birth: '2011-01-01',
      guardian_name: newStudentForm.guardian_name || 'Guardian',
      guardian_phone: newStudentForm.guardian_phone || '',
      attendance_percentage: 96.0,
    });
    setNewStudentForm({
      full_name: '',
      admission_number: '',
      class_id: tenantClasses[0]?.id || '',
      gender: 'Male',
      guardian_name: '',
      guardian_phone: '',
    });
    setIsAddStudentOpen(false);
  };

  const handleAddAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocTeacherId || !allocClassId || !allocSubjectId) return;
    allocateTeacher(allocTeacherId, allocClassId, allocSubjectId, currentTenant.current_term);
  };

  return (
    <div className="space-y-10">
      {/* Signature Split Hero Section (Matches screenshot aesthetic) */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center pt-1 sm:pt-2">
        {/* Left Column: Editorial Headline & Primary Controls */}
        <div className="md:col-span-7 space-y-4 sm:space-y-6">
          <div className="space-y-2 sm:space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-stone-500 uppercase">
              <span>{currentTenant.subdomain}.eduvora.io</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#f6c042]"></span>
              <span>{currentTenant.subscription_tier} tier</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black tracking-tight text-stone-950 leading-[1.08]">
              {currentTenant.name} <br />
              <span className="text-stone-800 font-extrabold">{currentTenant.current_session} Session</span>
            </h1>

            <p className="text-xs sm:text-base text-stone-600 max-w-xl leading-relaxed">
              Academic administration portal. Coordinate faculty allocations, enforce terminal grade review locks, and generate certified progress report cards.
            </p>
          </div>

          {/* Counts & Action Pill Buttons */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-1 sm:pt-2">
            <div>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-stone-400 block">
                Enrollment
              </span>
              <div className="text-2xl sm:text-3xl font-black text-stone-950">
                {tenantStudents.length} <span className="text-sm sm:text-base font-semibold text-stone-500">Students</span>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveTab('users');
                setIsAddStudentOpen(true);
              }}
              className="min-h-[48px] px-5 sm:px-6 py-3 rounded-full bg-[#111113] hover:bg-black text-white text-xs font-bold flex items-center gap-3 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="w-7 h-7 rounded-full bg-[#f6c042] flex items-center justify-center text-stone-950 shrink-0">
                <Plus className="w-4 h-4" strokeWidth={2.5} />
              </span>
              <span className="tracking-wide">Add Student</span>
            </button>

            {pendingSheets.length > 0 && (
              <button
                onClick={() => setActiveTab('approvals')}
                className="min-h-[48px] px-4 sm:px-5 py-3 rounded-full bg-[#f6c042] hover:bg-[#eab308] text-stone-950 text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all"
              >
                <Clock className="w-4 h-4" />
                <span>Review {pendingSheets.length} Sheets</span>
              </button>
            )}
          </div>

          {/* Principal Spotlight Badge */}
          <div className="pt-2 sm:pt-4 flex items-center gap-3.5">
            <div className="relative">
              <div className="w-11 sm:w-12 h-11 sm:h-12 rounded-full p-0.5 bg-[#f6c042] shadow-sm shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden bg-stone-200">
                  <img
                    src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'}
                    alt={currentUser.full_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                Head of Institution
              </div>
              <div className="text-xs font-bold text-stone-900 flex flex-wrap items-center gap-1.5">
                <span>{currentUser.full_name}</span>
                <span className="text-stone-400 hidden sm:inline">•</span>
                <span className="text-stone-500 font-mono text-[11px]">Principal / Admin</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Signature Matte Black Curved Showcase Panel */}
        <div className="md:col-span-5">
          <div className="rounded-[2.5rem] bg-[#111113] text-white p-7 sm:p-9 relative overflow-hidden shadow-2xl border border-stone-800 space-y-6">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f6c042]"></span>
                <span className="text-xs font-bold tracking-wider uppercase text-stone-400">
                  Academic Status
                </span>
              </div>
              <span className="font-mono text-[11px] text-stone-400 px-3 py-1 rounded-full bg-stone-900 border border-stone-800">
                {currentTenant.current_term}
              </span>
            </div>

            {/* School Crest Presentation */}
            <div className="flex flex-col sm:flex-row items-center gap-5 py-2">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-stone-800 bg-stone-900 p-1 shrink-0">
                <img
                  src={currentTenant.logo_url}
                  alt={currentTenant.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {currentTenant.name}
                </h3>
                <div className="text-xs font-mono text-[#f6c042] mt-0.5">
                  {tenantClasses.length} Classes • {tenantSubjects.length} Registered Subjects
                </div>
                <div className="text-xs text-stone-400 mt-1">
                  {currentTenant.address}
                </div>
              </div>
            </div>

            {/* Dashed-Border Card Inside (Exact replica of screenshot dashed coupon box) */}
            <div className="border border-dashed border-stone-700/80 rounded-2xl p-5 bg-stone-900/70 backdrop-blur-sm space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-400">Continuous Assessment Register</span>
                <span className="text-stone-300 font-mono text-[11px]">{currentTenant.current_session}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-sm font-bold text-white">
                    {approvedSheets.length} Registers Approved
                  </div>
                  <div className="text-xs text-stone-400">
                    {pendingSheets.length} awaiting administrative sign-off
                  </div>
                </div>

                <span className="px-3.5 py-1 rounded-full bg-[#f6c042] text-stone-950 text-xs font-black">
                  Active Term
                </span>
              </div>
            </div>

            {/* Quick Action button */}
            <button
              onClick={() => setActiveTab('approvals')}
              className="w-full py-3 rounded-full bg-white hover:bg-stone-100 text-stone-950 text-xs font-black flex items-center justify-center gap-2 transition-all"
            >
              <span>Inspect Grade Approvals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Modern Minimalist Navigation Tabs (Mobile Scrollable) */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-200 scrollbar-none">
        {[
          { id: 'overview', label: 'Overview', icon: Building2 },
          { id: 'users', label: `Staff & Students (${availableTeachers.length + tenantStudents.length})`, icon: Users },
          { id: 'allocations', label: `Curriculum Matrix (${tenantAllocations.length})`, icon: BookOpen },
          { id: 'approvals', label: `Grade Approvals (${pendingSheets.length})`, icon: ClipboardCheck },
          { id: 'report_cards', label: 'Terminal Reports', icon: FileText },
          { id: 'settings', label: 'School Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`min-h-[44px] px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 shrink-0 ${
                isActive
                  ? 'bg-stone-950 text-white shadow-sm'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#f6c042]' : 'text-stone-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Enrolled Students</span>
              <div className="text-3xl font-black text-stone-950 mt-1">{tenantStudents.length}</div>
              <span className="text-xs text-stone-500 mt-1 block">
                Across {tenantClasses.length} registered classes
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Teaching Faculty</span>
              <div className="text-3xl font-black text-stone-950 mt-1">{availableTeachers.length}</div>
              <span className="text-xs text-stone-500 mt-1 block">
                {availableTeachers.filter((t) => t.status === 'active').length} Active • {availableTeachers.filter((t) => t.status === 'invited').length} Invited
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Pending Grade Reviews</span>
              <div className="text-3xl font-black text-stone-950 mt-1">{pendingSheets.length}</div>
              <span className="text-xs text-stone-500 mt-1 block">
                Requires admin verification
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Locked Registers</span>
              <div className="text-3xl font-black text-stone-950 mt-1">{approvedSheets.length}</div>
              <span className="text-xs text-stone-500 mt-1 block">
                Ready for certified reports
              </span>
            </div>
          </div>

          {/* Pending Reviews Feed & Staff Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-stone-200 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <h3 className="font-bold text-stone-950 text-base">Teacher Grade Submissions</h3>
                <span className="text-xs font-semibold text-stone-500">{pendingSheets.length} pending review</span>
              </div>

              {pendingSheets.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-100">
                  <CheckCircle className="w-8 h-8 text-stone-900 mx-auto mb-2 opacity-80" />
                  <div className="text-sm font-bold text-stone-900">All Grade Registers Verified</div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    No teacher marks are currently awaiting administrative review.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingSheets.map((sheet) => {
                    const cls = tenantClasses.find((c) => c.id === sheet.class_id);
                    const sub = tenantSubjects.find((s) => s.id === sheet.subject_id);
                    const teacher = availableTeachers.find((t) => t.id === sheet.teacher_id);
                    const sheetScores = tenantScores.filter((s) => s.sheet_id === sheet.id);

                    return (
                      <div
                        key={sheet.id}
                        className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-stone-400 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-950 text-sm">
                              {cls?.name} • {sub?.name}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f6c042] text-stone-950">
                              Pending Review
                            </span>
                          </div>
                          <div className="text-xs text-stone-500 mt-1">
                            Teacher: <strong className="text-stone-900">{teacher?.full_name || 'Staff'}</strong> • Scores recorded for {sheetScores.length} students
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setInspectingSheet(sheet);
                            setActiveTab('approvals');
                          }}
                          className="px-4 py-2 rounded-full bg-stone-950 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm self-end sm:self-center"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review & Lock-in</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Faculty Quick List */}
            <div className="bg-white border border-stone-200 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <h3 className="font-bold text-stone-950 text-base">Faculty Directory</h3>
                <button
                  onClick={() => setActiveTab('users')}
                  className="text-xs font-bold text-stone-900 hover:underline"
                >
                  Manage All
                </button>
              </div>

              <div className="space-y-2.5">
                {availableTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-stone-200 overflow-hidden shrink-0">
                        <img
                          src={teacher.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={teacher.full_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-stone-950 text-xs">{teacher.full_name}</div>
                        <div className="text-[11px] text-stone-500">{teacher.email}</div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        teacher.status === 'active'
                          ? 'bg-stone-900 text-white'
                          : 'bg-[#f6c042] text-stone-950'
                      }`}
                    >
                      {teacher.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF & STUDENTS */}
      {activeTab === 'users' && (
        <div className="space-y-8">
          {/* Action Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-stone-950 tracking-tight">Staff & Student Directory</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Manage teacher accounts, admission rosters, and onboarding access tokens.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => setIsAddTeacherOpen(true)}
                className="flex-1 sm:flex-none min-h-[44px] px-5 py-2.5 rounded-full border border-stone-300 hover:border-stone-900 text-stone-900 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <span>Add Teacher</span>
              </button>
              <button
                onClick={() => setIsAddStudentOpen(true)}
                className="flex-1 sm:flex-none min-h-[44px] px-5 py-2.5 rounded-full bg-stone-950 hover:bg-black text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span>Enrol Student</span>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by name, email, or admission no..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-full bg-white border border-stone-200 text-base sm:text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900"
            />
          </div>

          {/* Faculty Section: Mobile Cards + Desktop Table */}
          <div className="bg-white border border-stone-200 rounded-[1.8rem] sm:rounded-[2rem] p-4 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-stone-950">Teaching Faculty</h3>
              <span className="text-xs font-mono text-stone-400">{availableTeachers.length} educators</span>
            </div>

            {/* Mobile Card Stack for Teachers */}
            <div className="block sm:hidden space-y-3">
              {availableTeachers
                .filter((t) => t.full_name.toLowerCase().includes(userSearchQuery.toLowerCase()))
                .map((teacher) => (
                  <div key={teacher.id} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-stone-950 text-sm">{teacher.full_name}</div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          teacher.status === 'active'
                            ? 'bg-stone-900 text-white'
                            : 'bg-[#f6c042] text-stone-950'
                        }`}
                      >
                        {teacher.status}
                      </span>
                    </div>

                    <div className="text-xs text-stone-600 font-mono">
                      {teacher.email}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {teacher.status === 'invited' && teacher.invite_token && (
                        <button
                          onClick={() => handleCopyInvite(teacher.invite_token!)}
                          className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 text-xs font-bold"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-[#f6c042]" />
                          <span>{copiedToken === teacher.invite_token ? 'Copied' : 'Copy Key'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => toggleTeacherStatus(teacher.id)}
                        className="min-h-[44px] flex-1 text-xs font-bold rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-800 flex items-center justify-center"
                      >
                        {teacher.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Desktop Table for Teachers */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[11px] border-y border-stone-200">
                  <tr>
                    <th className="py-3 px-4 font-bold">Faculty Member</th>
                    <th className="py-3 px-4 font-bold">Role</th>
                    <th className="py-3 px-4 font-bold">Contact</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold">Access Token</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {availableTeachers
                    .filter((t) => t.full_name.toLowerCase().includes(userSearchQuery.toLowerCase()))
                    .map((teacher) => (
                      <tr key={teacher.id} className="hover:bg-stone-50/70">
                        <td className="py-3.5 px-4 font-bold text-stone-950">
                          {teacher.full_name}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-stone-600">
                          Teacher
                        </td>
                        <td className="py-3.5 px-4 font-mono text-stone-600">
                          {teacher.email}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                              teacher.status === 'active'
                                ? 'bg-stone-900 text-white'
                                : 'bg-[#f6c042] text-stone-950'
                            }`}
                          >
                            {teacher.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {teacher.status === 'invited' && teacher.invite_token ? (
                            <button
                              onClick={() => handleCopyInvite(teacher.invite_token!)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-800 font-bold"
                            >
                              <KeyRound className="w-3 h-3 text-[#f6c042]" />
                              <span>{copiedToken === teacher.invite_token ? 'Copied' : 'Copy Key'}</span>
                            </button>
                          ) : (
                            <span className="text-stone-400">Account Active</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => toggleTeacherStatus(teacher.id)}
                            className="text-xs font-bold text-stone-700 hover:text-stone-950"
                          >
                            {teacher.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Students Roster: Mobile Cards + Desktop Table */}
          <div className="bg-white border border-stone-200 rounded-[1.8rem] sm:rounded-[2rem] p-4 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-stone-950">Enrolled Student Body</h3>
              <span className="text-xs font-mono text-stone-400">{tenantStudents.length} students</span>
            </div>

            {/* Mobile Card Stack for Students */}
            <div className="block sm:hidden space-y-3">
              {tenantStudents
                .filter((s) => s.full_name.toLowerCase().includes(userSearchQuery.toLowerCase()) || s.admission_number.toLowerCase().includes(userSearchQuery.toLowerCase()))
                .map((student) => {
                  const cls = tenantClasses.find((c) => c.id === student.class_id);
                  return (
                    <div key={student.id} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-stone-950 text-sm">{student.full_name}</div>
                          <div className="font-mono text-xs text-stone-500">{student.admission_number}</div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-800 text-[10px] font-bold">
                          {cls?.name || 'Class'}
                        </span>
                      </div>

                      <div className="text-xs text-stone-600 flex flex-col gap-0.5">
                        <div><span className="text-stone-400 font-semibold">Guardian:</span> {student.guardian_name}</div>
                        <div className="font-mono text-[11px] text-stone-500">{student.guardian_phone}</div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-stone-200/60">
                        <button
                          onClick={() => {
                            setSelectedStudentForReport(student);
                            setActiveTab('report_cards');
                          }}
                          className="min-h-[44px] flex-1 px-3 py-2 rounded-xl bg-stone-950 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#f6c042]" />
                          <span>View Report</span>
                        </button>
                        <button
                          onClick={() => deleteStudent(student.id)}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-stone-400 hover:text-rose-600 text-xs font-bold flex items-center justify-center"
                          title="Delete Student Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Desktop Table for Students */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[11px] border-y border-stone-200">
                  <tr>
                    <th className="py-3 px-4 font-bold">Student Name</th>
                    <th className="py-3 px-4 font-bold">Admission No</th>
                    <th className="py-3 px-4 font-bold">Class Stream</th>
                    <th className="py-3 px-4 font-bold">Gender</th>
                    <th className="py-3 px-4 font-bold">Guardian</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {tenantStudents
                    .filter((s) => s.full_name.toLowerCase().includes(userSearchQuery.toLowerCase()) || s.admission_number.toLowerCase().includes(userSearchQuery.toLowerCase()))
                    .map((student) => {
                      const cls = tenantClasses.find((c) => c.id === student.class_id);
                      return (
                        <tr key={student.id} className="hover:bg-stone-50/70">
                          <td className="py-3.5 px-4 font-bold text-stone-950">
                            {student.full_name}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-stone-700">
                            {student.admission_number}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-stone-800">
                            {cls?.name || 'Class'}
                          </td>
                          <td className="py-3.5 px-4 text-stone-600">
                            {student.gender}
                          </td>
                          <td className="py-3.5 px-4 text-stone-600">
                            {student.guardian_name} ({student.guardian_phone})
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedStudentForReport(student);
                                  setActiveTab('report_cards');
                                }}
                                className="px-3 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold inline-flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3 text-[#f6c042]" />
                                <span>Report</span>
                              </button>
                              <button
                                onClick={() => deleteStudent(student.id)}
                                className="text-stone-400 hover:text-rose-600 transition-colors p-1"
                                title="Delete Student Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CURRICULUM ALLOCATIONS */}
      {activeTab === 'allocations' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-stone-950 tracking-tight">Class & Subject Allocation Matrix</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Assign teachers to class subjects. Teachers only gain gradebook access to allocated subjects.
              </p>
            </div>
          </div>

          {/* Allocation Form */}
          <div className="bg-white border border-stone-200 rounded-[1.8rem] sm:rounded-[2rem] p-4 sm:p-8 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-stone-950">Assign Teacher to Subject</h3>
            <form onSubmit={handleAddAllocation} className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Teacher</label>
                <select
                  value={allocTeacherId}
                  onChange={(e) => setAllocTeacherId(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-base sm:text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                >
                  {availableTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Class</label>
                <select
                  value={allocClassId}
                  onChange={(e) => setAllocClassId(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-base sm:text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                >
                  {tenantClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Subject</label>
                <select
                  value={allocSubjectId}
                  onChange={(e) => setAllocSubjectId(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-base sm:text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                >
                  {tenantSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="min-h-[44px] w-full py-2.5 px-6 rounded-xl bg-stone-950 hover:bg-black text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span>Create Allocation</span>
              </button>
            </form>
          </div>

          {/* Active Allocations List: Mobile Cards + Desktop Table */}
          <div className="bg-white border border-stone-200 rounded-[1.8rem] sm:rounded-[2rem] p-4 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-stone-950">Active Subject Allocations</h3>
              <span className="text-xs font-mono text-stone-400">{tenantAllocations.length} allocated</span>
            </div>

            {/* Mobile Card Stack for Allocations */}
            <div className="block sm:hidden space-y-3">
              {tenantAllocations.map((alloc) => {
                const teacher = availableTeachers.find((t) => t.id === alloc.teacher_id);
                const cls = tenantClasses.find((c) => c.id === alloc.class_id);
                const sub = tenantSubjects.find((s) => s.id === alloc.subject_id);

                return (
                  <div key={alloc.id} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-stone-950 text-sm">{sub?.name}</div>
                        <div className="text-xs font-semibold text-stone-600">{cls?.name}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-800 text-[10px] font-mono">
                        {alloc.academic_term}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 text-xs">
                      <div>
                        <span className="text-stone-400 font-semibold">Teacher: </span>
                        <span className="font-bold text-stone-900">{teacher?.full_name}</span>
                      </div>
                      <button
                        onClick={() => deallocateTeacher(alloc.id)}
                        className="min-h-[40px] px-3 rounded-lg border border-stone-200 bg-white text-stone-500 hover:text-rose-600 text-xs font-bold flex items-center gap-1"
                        title="Remove Allocation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table for Allocations */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[11px] border-y border-stone-200">
                  <tr>
                    <th className="py-3 px-4 font-bold">Class</th>
                    <th className="py-3 px-4 font-bold">Subject</th>
                    <th className="py-3 px-4 font-bold">Assigned Teacher</th>
                    <th className="py-3 px-4 font-bold">Academic Term</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {tenantAllocations.map((alloc) => {
                    const teacher = availableTeachers.find((t) => t.id === alloc.teacher_id);
                    const cls = tenantClasses.find((c) => c.id === alloc.class_id);
                    const sub = tenantSubjects.find((s) => s.id === alloc.subject_id);

                    return (
                      <tr key={alloc.id} className="hover:bg-stone-50/70">
                        <td className="py-3.5 px-4 font-bold text-stone-950">{cls?.name}</td>
                        <td className="py-3.5 px-4 font-semibold text-stone-800">{sub?.name}</td>
                        <td className="py-3.5 px-4 font-bold text-stone-900">{teacher?.full_name}</td>
                        <td className="py-3.5 px-4 text-stone-500">{alloc.academic_term}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => deallocateTeacher(alloc.id)}
                            className="text-stone-400 hover:text-rose-600 transition-colors p-1"
                            title="Remove Allocation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GRADE APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-black text-stone-950 tracking-tight">Grade Review & Approval Pipeline</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Review continuous assessment registers submitted by faculty. Once approved, registers are locked against further modification.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sheet Selector */}
            <div className="lg:col-span-1 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-stone-500">
                Continuous Assessment Sheets ({tenantAssessmentSheets.length})
              </h3>

              {tenantAssessmentSheets.map((sheet) => {
                const cls = tenantClasses.find((c) => c.id === sheet.class_id);
                const sub = tenantSubjects.find((s) => s.id === sheet.subject_id);
                const teacher = availableTeachers.find((t) => t.id === sheet.teacher_id);
                const isSelected = inspectingSheet?.id === sheet.id;

                return (
                  <button
                    key={sheet.id}
                    onClick={() => {
                      setInspectingSheet(sheet);
                      setAdminRemarkInput(sheet.admin_remarks || '');
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-stone-950 text-white border-stone-950 shadow-md'
                        : 'bg-white text-stone-900 border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{cls?.name}</span>
                      {sheet.status === 'pending_approval' ? (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isSelected ? 'bg-[#f6c042] text-stone-950' : 'bg-[#f6c042] text-stone-950'}`}>
                          Pending Review
                        </span>
                      ) : sheet.status === 'approved' ? (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isSelected ? 'bg-stone-800 text-stone-200' : 'bg-stone-900 text-white'}`}>
                          Locked
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600">
                          Draft
                        </span>
                      )}
                    </div>

                    <div className={`text-xs font-semibold mt-1 ${isSelected ? 'text-[#f6c042]' : 'text-stone-700'}`}>
                      {sub?.name}
                    </div>
                    <div className={`text-[11px] mt-1 ${isSelected ? 'text-stone-400' : 'text-stone-500'}`}>
                      Teacher: {teacher?.full_name}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Inspector */}
            <div className="lg:col-span-2">
              {inspectingSheet ? (
                <div className="bg-white border border-stone-200 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                    <div>
                      <h3 className="text-lg font-bold text-stone-950">
                        {tenantClasses.find((c) => c.id === inspectingSheet.class_id)?.name} — {tenantSubjects.find((s) => s.id === inspectingSheet.subject_id)?.name}
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Academic Term: {inspectingSheet.term} • Session {inspectingSheet.academic_year}
                      </p>
                    </div>

                    <span
                      className={`px-3.5 py-1 rounded-full text-xs font-bold ${
                        inspectingSheet.status === 'approved'
                          ? 'bg-stone-900 text-white'
                          : inspectingSheet.status === 'pending_approval'
                          ? 'bg-[#f6c042] text-stone-950'
                          : 'bg-stone-200 text-stone-800'
                      }`}
                    >
                      {inspectingSheet.status === 'approved' ? 'Approved & Locked' : 'Pending Verification'}
                    </span>
                  </div>

                  {/* Student Scores */}
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-left text-xs text-stone-700">
                      <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[10px] sticky top-0 border-y border-stone-200">
                        <tr>
                          <th className="py-2.5 px-3 font-bold">Student</th>
                          <th className="py-2.5 px-3 text-center font-bold">CA 1 (/20)</th>
                          <th className="py-2.5 px-3 text-center font-bold">CA 2 (/20)</th>
                          <th className="py-2.5 px-3 text-center font-bold">Exam (/60)</th>
                          <th className="py-2.5 px-3 text-center font-bold">Total (/100)</th>
                          <th className="py-2.5 px-3 text-center font-bold">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {tenantScores
                          .filter((s) => s.sheet_id === inspectingSheet.id)
                          .map((score) => {
                            const student = tenantStudents.find((st) => st.id === score.student_id);
                            return (
                              <tr key={score.id} className="hover:bg-stone-50">
                                <td className="py-2.5 px-3 font-bold text-stone-950">
                                  {student?.full_name}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono">{score.ca1}</td>
                                <td className="py-2.5 px-3 text-center font-mono">{score.ca2}</td>
                                <td className="py-2.5 px-3 text-center font-mono">{score.exam}</td>
                                <td className="py-2.5 px-3 text-center font-mono font-black text-stone-950">
                                  {score.total}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="px-2.5 py-0.5 rounded-full font-black text-[10px] bg-stone-900 text-white">
                                    {score.grade}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* Remarks & Approval Actions */}
                  <div className="pt-4 border-t border-stone-100 space-y-3">
                    <label className="block text-xs font-bold text-stone-700">
                      Administrative Endorsement Remarks:
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Verified and approved for official terminal report cards."
                      value={adminRemarkInput}
                      onChange={(e) => setAdminRemarkInput(e.target.value)}
                      className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-base sm:text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                    />

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
                      <button
                        onClick={() => {
                          reviewAssessmentSheet(inspectingSheet.id, 'rejected', adminRemarkInput || 'Revisions requested by school admin.');
                          setInspectingSheet({ ...inspectingSheet, status: 'rejected' });
                        }}
                        className="min-h-[44px] px-5 py-2.5 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-bold flex items-center justify-center"
                      >
                        Request Revisions
                      </button>

                      <button
                        onClick={() => {
                          reviewAssessmentSheet(inspectingSheet.id, 'approved', adminRemarkInput || 'Approved by Principal.');
                          setInspectingSheet({ ...inspectingSheet, status: 'approved' });
                        }}
                        className="min-h-[44px] px-6 py-2.5 rounded-full bg-stone-950 hover:bg-black text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Lock className="w-3.5 h-3.5 text-[#f6c042]" />
                        <span>Approve & Lock Register</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-stone-200 rounded-[1.8rem] sm:rounded-[2rem] p-8 sm:p-12 text-center text-stone-400">
                  <ClipboardCheck className="w-10 h-10 mx-auto mb-2 text-stone-300" />
                  <div className="text-sm font-bold text-stone-800">Select a Grade Register</div>
                  <p className="text-xs text-stone-500 mt-1">
                    Tap any continuous assessment sheet to inspect student marks.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REPORT CARDS */}
      {activeTab === 'report_cards' && (
        <div className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-[1.8rem] sm:rounded-[2rem] p-4 sm:p-8 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-stone-950">Select Student for Official Report Card</h3>
                <p className="text-xs text-stone-500">
                  Generates terminal academic dossier with cumulative GPA, rankings, and administrative signatures.
                </p>
              </div>

              <select
                value={selectedStudentForReport?.id || ''}
                onChange={(e) => {
                  const s = tenantStudents.find((st) => st.id === e.target.value);
                  setSelectedStudentForReport(s || null);
                }}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-full bg-stone-50 border border-stone-200 text-base sm:text-xs text-stone-900 font-bold focus:outline-none focus:border-stone-900"
              >
                {tenantStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.admission_number})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedStudentForReport && <ReportCardView student={selectedStudentForReport} />}
        </div>
      )}

      {/* TAB 6: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-stone-200 rounded-[1.8rem] sm:rounded-[2rem] p-4 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-stone-950">Institution Configuration</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Configure active academic sessions, grading scales, and school branding.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Active Academic Session</label>
              <input
                type="text"
                defaultValue={currentTenant.current_session}
                onChange={(e) => updateTenantSettings({ current_session: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-base sm:text-xs text-stone-900 focus:outline-none focus:border-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Current Academic Term</label>
              <select
                defaultValue={currentTenant.current_term}
                onChange={(e) => updateTenantSettings({ current_term: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-base sm:text-xs text-stone-900 focus:outline-none focus:border-stone-900"
              >
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Add Teacher Modal */}
      {isAddTeacherOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-[2rem] w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-8 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-stone-950 text-base">Invite Teaching Staff</h3>
              <button onClick={() => setIsAddTeacherOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-black font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateTeacher} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marcus Vance"
                  value={newTeacherForm.name}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, name: e.target.value })}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-base sm:text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="teacher@academy.edu"
                  value={newTeacherForm.email}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, email: e.target.value })}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-base sm:text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddTeacherOpen(false)}
                  className="min-h-[44px] px-5 py-2 rounded-full border border-stone-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-6 py-2 rounded-full bg-stone-950 hover:bg-black text-white text-xs font-bold"
                >
                  Send Invite Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-[2rem] w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-8 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-stone-950 text-base">Enrol New Student</h3>
              <button onClick={() => setIsAddStudentOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-black font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Mitchell"
                  value={newStudentForm.full_name}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, full_name: e.target.value })}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-base sm:text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Admission Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. APX-2026-088"
                  value={newStudentForm.admission_number}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, admission_number: e.target.value })}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-base sm:text-xs font-mono text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Class</label>
                <select
                  value={newStudentForm.class_id}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, class_id: e.target.value })}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-base sm:text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                >
                  {tenantClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="min-h-[44px] px-5 py-2 rounded-full border border-stone-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-6 py-2 rounded-full bg-stone-950 hover:bg-black text-white text-xs font-bold"
                >
                  Enrol Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
