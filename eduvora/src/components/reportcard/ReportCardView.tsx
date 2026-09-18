import React from 'react';
import { Printer } from 'lucide-react';
import { Student } from '../../types';
import { useTenantAuth } from '../../context/TenantAuthContext';
import { calculateGrade } from '../../lib/mockData';

interface ReportCardViewProps {
  student: Student;
}

export const ReportCardView: React.FC<ReportCardViewProps> = ({ student }) => {
  const { currentTenant, tenantClasses, tenantSubjects, tenantScores, tenantAssessmentSheets, tenantStudents } = useTenantAuth();

  const studentClass = tenantClasses.find((c) => c.id === student.class_id);

  // Get all scores for this student
  const studentScoresList = tenantScores.filter((s) => s.student_id === student.id);

  // Build subject row data
  const subjectRows = studentScoresList.map((score) => {
    const sheet = tenantAssessmentSheets.find((sh) => sh.id === score.sheet_id);
    const subject = tenantSubjects.find((sub) => sub.id === sheet?.subject_id);
    return {
      subjectName: subject?.name || 'Academic Subject',
      code: subject?.code || 'SUB-101',
      ca1: score.ca1,
      ca2: score.ca2,
      exam: score.exam,
      total: score.total,
      grade: score.grade,
      points: score.points,
      remarks: score.remarks,
    };
  });

  // Calculate Cumulative Performance
  const totalScoreSum = subjectRows.reduce((acc, row) => acc + row.total, 0);
  const averagePercentage = subjectRows.length > 0 ? (totalScoreSum / subjectRows.length).toFixed(1) : '0';
  const totalPoints = subjectRows.reduce((acc, row) => acc + row.points, 0);
  const gpa = subjectRows.length > 0 ? (totalPoints / subjectRows.length).toFixed(2) : '0.00';
  const overallGrade = calculateGrade(Number(averagePercentage)).grade;

  // Calculate class rank
  const classStudents = tenantStudents.filter((s) => s.class_id === student.class_id);
  const classAverages: { studentId: string; avg: number }[] = classStudents.map((s) => {
    const scores = tenantScores.filter((sc) => sc.student_id === s.id);
    const sum = scores.reduce((acc, sc) => acc + (sc.total || 0), 0);
    return { studentId: s.id, avg: scores.length > 0 ? sum / scores.length : 0 };
  });
  classAverages.sort((a, b) => b.avg - a.avg);
  const rankPosition = classAverages.findIndex((a) => a.studentId === student.id) + 1;
  const totalInClass = classStudents.length;
  const rankDisplay = rankPosition > 0 ? `${rankPosition}${rankPosition === 1 ? 'st' : rankPosition === 2 ? 'nd' : rankPosition === 3 ? 'rd' : 'th'} of ${totalInClass}` : 'N/A';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Action Bar (Hidden during print) */}
      <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:px-6 rounded-2xl sm:rounded-full bg-white border border-stone-200 shadow-sm">
        <div className="text-xs font-semibold text-stone-700">
          Terminal Progress Dossier: <strong className="text-stone-950">{student.full_name}</strong> ({student.admission_number})
        </div>
        <button
          onClick={handlePrint}
          className="min-h-[44px] px-5 py-2.5 rounded-full bg-[#111113] hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2.5 shadow-md transition-all"
        >
          <span className="w-5 h-5 rounded-full bg-[#f6c042] flex items-center justify-center text-stone-950 font-bold shrink-0">
            <Printer className="w-3 h-3" />
          </span>
          <span>Print Official Document</span>
        </button>
      </div>

      {/* Official Report Card Printable Document */}
      <div className="print-card bg-white text-stone-950 rounded-[1.8rem] sm:rounded-[2rem] p-4 sm:p-12 shadow-sm border border-stone-200 space-y-6 sm:space-y-8">
        {/* School Header & Crest */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-stone-900 pb-5 sm:pb-6 gap-4">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-stone-100 border border-stone-300 shrink-0">
              <img
                src={currentTenant.logo_url}
                alt={currentTenant.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-stone-950 uppercase">
                {currentTenant.name}
              </h1>
              <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">
                {currentTenant.address} • Tel: {currentTenant.phone}
              </p>
              <div className="text-[11px] sm:text-xs font-bold text-stone-800 mt-1 uppercase tracking-wider">
                Official Terminal Academic Progress Report
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-200">
            <div className="text-[10px] sm:text-[11px] text-stone-400 font-mono uppercase tracking-wider">Session Record</div>
            <div className="text-xs sm:text-sm font-black text-stone-950">{currentTenant.current_session}</div>
            <div className="text-xs font-bold text-stone-700">{currentTenant.current_term}</div>
          </div>
        </div>

        {/* Student Bio Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 py-3 sm:py-4 border-b border-stone-200 text-xs">
          <div>
            <span className="text-stone-400 uppercase tracking-wider text-[10px] font-bold block">
              Student Full Name
            </span>
            <div className="font-black text-stone-950 text-xs sm:text-sm mt-0.5">{student.full_name}</div>
          </div>

          <div>
            <span className="text-stone-400 uppercase tracking-wider text-[10px] font-bold block">
              Admission ID
            </span>
            <div className="font-mono font-bold text-stone-900 text-xs sm:text-sm mt-0.5">{student.admission_number}</div>
          </div>

          <div>
            <span className="text-stone-400 uppercase tracking-wider text-[10px] font-bold block">
              Class Stream
            </span>
            <div className="font-bold text-stone-900 text-xs sm:text-sm mt-0.5">{studentClass?.name || 'Class Stream'}</div>
          </div>

          <div>
            <span className="text-stone-400 uppercase tracking-wider text-[10px] font-bold block">
              Term Attendance
            </span>
            <div className="font-bold text-stone-900 text-xs sm:text-sm mt-0.5">{student.attendance_percentage}% Verified</div>
          </div>
        </div>

        {/* Subject Scores: Mobile Cards (no-print) + Printable/Desktop Table */}
        <div className="block sm:hidden no-print space-y-3">
          <div className="font-bold text-xs uppercase tracking-wider text-stone-500">Subject Breakdown</div>
          {subjectRows.length === 0 ? (
            <div className="p-4 rounded-xl border border-stone-200 text-center text-xs text-stone-400">
              No approved scores recorded for this student in the current term.
            </div>
          ) : (
            subjectRows.map((row, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-stone-950 text-sm">{row.subjectName}</div>
                  <span className="px-2 py-0.5 rounded-full bg-stone-950 text-white font-black text-xs">
                    {row.grade} ({row.total})
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-white p-2 rounded-xl border border-stone-200">
                  <div>
                    <span className="text-[10px] text-stone-400 block font-sans">CA 1</span>
                    <span className="font-bold text-stone-800">{row.ca1}/20</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block font-sans">CA 2</span>
                    <span className="font-bold text-stone-800">{row.ca2}/20</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block font-sans">Exam</span>
                    <span className="font-bold text-stone-800">{row.exam}/60</span>
                  </div>
                </div>
                {row.remarks && (
                  <div className="text-[11px] text-stone-600 italic">
                    &ldquo;{row.remarks}&rdquo;
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Subject Scores Table (Desktop + Print) */}
        <div className="hidden sm:block print:block overflow-x-auto">
          <table className="w-full text-left text-xs border border-stone-200">
            <thead className="bg-stone-50 text-stone-700 uppercase tracking-wider text-[10px] font-bold border-b border-stone-200">
              <tr>
                <th className="py-3 px-3">Subject</th>
                <th className="py-3 px-2 text-center">CA 1 (20)</th>
                <th className="py-3 px-2 text-center">CA 2 (20)</th>
                <th className="py-3 px-2 text-center">Exam (60)</th>
                <th className="py-3 px-2 text-center bg-stone-100 font-bold">Total (100)</th>
                <th className="py-3 px-2 text-center">Grade</th>
                <th className="py-3 px-2 text-center">Points</th>
                <th className="py-3 px-3">Teacher Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {subjectRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-stone-400 text-xs">
                    No approved scores recorded for this student in the current term.
                  </td>
                </tr>
              ) : (
                subjectRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/50">
                    <td className="py-2.5 px-3 font-bold text-stone-950">
                      {row.subjectName}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono">{row.ca1}</td>
                    <td className="py-2.5 px-2 text-center font-mono">{row.ca2}</td>
                    <td className="py-2.5 px-2 text-center font-mono">{row.exam}</td>
                    <td className="py-2.5 px-2 text-center font-mono font-black text-stone-950 bg-stone-50">
                      {row.total}
                    </td>
                    <td className="py-2.5 px-2 text-center font-black">
                      {row.grade}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-stone-600">
                      {row.points.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-stone-600">
                      {row.remarks || 'Satisfactory academic performance.'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Performance Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-stone-50 border border-stone-200 text-center">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Cumulative Average
            </span>
            <div className="text-3xl font-black text-stone-950 mt-1">{averagePercentage}%</div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Overall Grade
            </span>
            <div className="text-3xl font-black text-stone-950 mt-1">{overallGrade}</div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Terminal GPA
            </span>
            <div className="text-3xl font-black text-stone-950 mt-1">{gpa} / 4.0</div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Class Rank
            </span>
            <div className="text-3xl font-black text-stone-950 mt-1">{rankDisplay}</div>
          </div>
        </div>

        {/* Administrative Endorsements */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 border-t border-stone-200">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
              Class Teacher Appraisal
            </span>
            <p className="text-xs text-stone-800 bg-stone-50 p-3 rounded-xl border border-stone-200">
              Satisfactory attendance and academic progress maintained across all enrolled subjects.
            </p>
            <div className="mt-6 pt-2 border-t border-stone-300 flex justify-between text-xs text-stone-600">
              <span>Faculty Signature</span>
              <span className="font-bold text-stone-900">Verified & Recorded</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
              Principal / Head of Institution Endorsement
            </span>
            <p className="text-xs text-stone-800 bg-stone-50 p-3 rounded-xl border border-stone-200">
              Academic register certified under institution guidelines for the terminal session.
            </p>
            <div className="mt-6 pt-2 border-t border-stone-300 flex justify-between text-xs text-stone-600">
              <span>Principal Seal</span>
              <span className="font-bold text-stone-900">{currentTenant.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
