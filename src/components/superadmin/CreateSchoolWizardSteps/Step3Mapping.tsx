import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { extractSheetData, autoMapColumns } from '../../../utils/excelParser';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';

interface Step3Props {
  workbook: XLSX.WorkBook;
  sheetsInfo: { studentsSheet?: string; teachersSheet?: string };
  onNext: (payload: { validStudents: any[]; validTeachers: any[] }) => void;
  onBack: () => void;
}

const STUDENT_SCHEMA = [
  { key: 'student_code', label: 'Student Code', required: true },
  { key: 'first_name', label: 'First Name', required: true },
  { key: 'last_name', label: 'Last Name', required: true },
  { key: 'gender', label: 'Gender', required: false },
  { key: 'grade_level', label: 'Grade Level', required: false },
  { key: 'parent_phone', label: 'Parent Phone', required: false },
];

const TEACHER_SCHEMA = [
  { key: 'staff_code', label: 'Staff Code', required: true },
  { key: 'first_name', label: 'First Name', required: true },
  { key: 'last_name', label: 'Last Name', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'phone', label: 'Phone', required: false },
];

export function Step3Mapping({ workbook, sheetsInfo, onNext, onBack }: Step3Props) {
  const [activeTab, setActiveTab] = useState<'students' | 'teachers'>(sheetsInfo.studentsSheet ? 'students' : 'teachers');
  
  const [studentHeaders, setStudentHeaders] = useState<string[]>([]);
  const [studentData, setStudentData] = useState<any[]>([]);
  const [studentMap, setStudentMap] = useState<Record<string, string>>({});
  
  const [teacherHeaders, setTeacherHeaders] = useState<string[]>([]);
  const [teacherData, setTeacherData] = useState<any[]>([]);
  const [teacherMap, setTeacherMap] = useState<Record<string, string>>({});

  // Parse sheets on mount
  useEffect(() => {
    if (sheetsInfo.studentsSheet) {
      const data = extractSheetData(workbook, sheetsInfo.studentsSheet);
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        setStudentHeaders(headers);
        setStudentMap(autoMapColumns(headers, 'student'));
        setStudentData(data);
      }
    }
    
    if (sheetsInfo.teachersSheet) {
      const data = extractSheetData(workbook, sheetsInfo.teachersSheet);
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        setTeacherHeaders(headers);
        setTeacherMap(autoMapColumns(headers, 'teacher'));
        setTeacherData(data);
      }
    }
  }, [workbook, sheetsInfo]);

  // Validation logic
  const { validatedStudents, validatedTeachers, summary } = useMemo(() => {
    const processData = (raw: any[], mapping: Record<string, string>, schema: any[]) => {
      let validCount = 0;
      let invalidCount = 0;
      
      // Inverse map: schemaKey -> excelHeader
      const schemaToHeader: Record<string, string> = {};
      Object.entries(mapping).forEach(([header, schemaKey]) => {
        schemaToHeader[schemaKey] = header;
      });

      const processed = raw.map((row, index) => {
        const mappedRow: any = {};
        const errors: string[] = [];

        schema.forEach(field => {
          const excelHeader = schemaToHeader[field.key];
          const val = excelHeader ? row[excelHeader] : undefined;
          
          if (field.required && (!val || String(val).trim() === '')) {
            errors.push(`${field.label} is required.`);
          }
          
          // Basic format validations
          if (val && field.key.includes('email') && !/^\S+@\S+\.\S+$/.test(String(val))) {
            errors.push(`Invalid email format.`);
          }
          
          mappedRow[field.key] = val ? String(val).trim() : null;
        });

        const isValid = errors.length === 0;
        if (isValid) validCount++; else invalidCount++;

        return { ...mappedRow, _isValid: isValid, _errors: errors, _originalIndex: index };
      });

      // Deduplicate codes
      const codes = new Set();
      processed.forEach(r => {
        const codeKey = schema[0].key; // student_code or staff_code
        const code = r[codeKey];
        if (code) {
          if (codes.has(code)) {
            r._isValid = false;
            r._errors.push(`Duplicate code: ${code}`);
            validCount--;
            invalidCount++;
          } else {
            codes.add(code);
          }
        }
      });

      return { processed, validCount, invalidCount };
    };

    const sResult = processData(studentData, studentMap, STUDENT_SCHEMA);
    const tResult = processData(teacherData, teacherMap, TEACHER_SCHEMA);

    return {
      validatedStudents: sResult.processed,
      validatedTeachers: tResult.processed,
      summary: {
        students: { valid: sResult.validCount, invalid: sResult.invalidCount, total: studentData.length },
        teachers: { valid: tResult.validCount, invalid: tResult.invalidCount, total: teacherData.length }
      }
    };
  }, [studentData, studentMap, teacherData, teacherMap]);

  const handleContinue = () => {
    onNext({
      validStudents: validatedStudents.filter(s => s._isValid).map(({ _isValid, _errors, _originalIndex, ...rest }) => rest),
      validTeachers: validatedTeachers.filter(t => t._isValid).map(({ _isValid, _errors, _originalIndex, ...rest }) => rest)
    });
  };

  const renderMappingForm = (
    type: 'students' | 'teachers', 
    headers: string[], 
    map: Record<string, string>, 
    setMap: any,
    schema: any[]
  ) => {
    // We render a dropdown for each schema field to select which excel header it maps from
    return (
      <div className="bg-white border rounded-lg p-5 mb-6">
        <h3 className="font-medium text-gray-900 mb-4">Map Columns</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {schema.map(field => {
            const currentHeaderMappedToThis = Object.keys(map).find(h => map[h] === field.key) || '';
            
            return (
              <div key={field.key} className="bg-gray-50 p-3 rounded border border-gray-200">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={currentHeaderMappedToThis}
                  onChange={(e) => {
                    const newHeader = e.target.value;
                    const newMap = { ...map };
                    // Remove existing mapping for this key
                    Object.keys(newMap).forEach(k => { if (newMap[k] === field.key) delete newMap[k]; });
                    // Set new mapping
                    if (newHeader) newMap[newHeader] = field.key;
                    setMap(newMap);
                  }}
                  className="w-full text-sm border-gray-300 rounded shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-1.5 border"
                >
                  <option value="">-- Ignore --</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPreviewTable = (type: 'students' | 'teachers', validatedData: any[], schema: any[]) => {
    return (
      <div className="bg-white border rounded-lg overflow-hidden flex flex-col h-[400px]">
        <div className="overflow-y-auto flex-1">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">Status</th>
                {schema.map(field => (
                  <th key={field.key} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {field.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {validatedData.map((row, i) => (
                <tr key={i} className={clsx("hover:bg-gray-50", row._isValid ? "bg-green-50/30" : "bg-red-50/50")}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {row._isValid ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <div className="group relative inline-block cursor-help">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <div className="hidden group-hover:block absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs p-2 rounded w-48 z-20">
                          <ul className="list-disc pl-3">
                            {row._errors.map((err: string, idx: number) => <li key={idx}>{err}</li>)}
                          </ul>
                        </div>
                      </div>
                    )}
                  </td>
                  {schema.map(field => (
                    <td key={field.key} className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                      {row[field.key] || <span className="text-gray-400 italic">Empty</span>}
                    </td>
                  ))}
                </tr>
              ))}
              {validatedData.length === 0 && (
                <tr>
                  <td colSpan={schema.length + 1} className="px-4 py-8 text-center text-gray-500 text-sm">
                    No data to preview.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Map & Validate Data</h2>
        <p className="text-sm text-gray-500 mt-1">Ensure your spreadsheet columns match the system requirements.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {sheetsInfo.studentsSheet && (
            <button
              onClick={() => setActiveTab('students')}
              className={clsx(
                activeTab === 'students' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2'
              )}
            >
              Students 
              <span className={clsx("px-2 py-0.5 rounded-full text-xs", summary.students.invalid > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                {summary.students.valid} Valid / {summary.students.invalid} Invalid
              </span>
            </button>
          )}
          {sheetsInfo.teachersSheet && (
            <button
              onClick={() => setActiveTab('teachers')}
              className={clsx(
                activeTab === 'teachers' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2'
              )}
            >
              Teachers
              <span className={clsx("px-2 py-0.5 rounded-full text-xs", summary.teachers.invalid > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                {summary.teachers.valid} Valid / {summary.teachers.invalid} Invalid
              </span>
            </button>
          )}
        </nav>
      </div>

      {/* Content */}
      <div className="pt-2">
        {activeTab === 'students' && sheetsInfo.studentsSheet && (
          <>
            {renderMappingForm('students', studentHeaders, studentMap, setStudentMap, STUDENT_SCHEMA)}
            {renderPreviewTable('students', validatedStudents, STUDENT_SCHEMA)}
          </>
        )}
        
        {activeTab === 'teachers' && sheetsInfo.teachersSheet && (
          <>
            {renderMappingForm('teachers', teacherHeaders, teacherMap, setTeacherMap, TEACHER_SCHEMA)}
            {renderPreviewTable('teachers', validatedTeachers, TEACHER_SCHEMA)}
          </>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start gap-3 mt-4">
        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-blue-800">Note on Invalid Records</h4>
          <p className="text-xs text-blue-600 mt-1">Only rows marked as valid (green checkmark) will be imported in the next step. Rows with errors will be skipped.</p>
        </div>
      </div>

      <div className="pt-4 flex justify-between border-t border-gray-200 mt-6">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2"
        >
          Proceed to Ingestion <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
