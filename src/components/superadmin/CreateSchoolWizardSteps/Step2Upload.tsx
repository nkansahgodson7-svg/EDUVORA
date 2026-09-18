import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseExcel } from '../../../utils/excelParser';

interface Step2Props {
  onNext: (workbook: XLSX.WorkBook, sheetsInfo: { studentsSheet?: string, teachersSheet?: string }) => void;
  onBack: () => void;
  onSkip: () => void;
}

export function Step2Upload({ onNext, onBack, onSkip }: Step2Props) {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [studentSheet, setStudentSheet] = useState<string>('');
  const [teacherSheet, setTeacherSheet] = useState<string>('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError('');

    try {
      const wb = await parseExcel(file);
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      
      // Auto-detect sheets
      const defaultStudent = wb.SheetNames.find(n => n.toLowerCase().includes('student'));
      const defaultTeacher = wb.SheetNames.find(n => n.toLowerCase().includes('teacher') || n.toLowerCase().includes('staff'));
      
      if (defaultStudent) setStudentSheet(defaultStudent);
      if (defaultTeacher) setTeacherSheet(defaultTeacher);
    } catch (err) {
      setError('Failed to parse Excel file. Please ensure it is a valid .xlsx or .csv format.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (!workbook) return;
    if (!studentSheet && !teacherSheet) {
      setError('Please select at least one sheet to import.');
      return;
    }
    onNext(workbook, { studentsSheet: studentSheet || undefined, teachersSheet: teacherSheet || undefined });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Upload Data Files</h2>
        <p className="text-sm text-gray-500 mt-1">Upload an Excel (.xlsx) or CSV file containing student and staff records.</p>
      </div>

      {!workbook ? (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-indigo-500 transition-colors bg-gray-50">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
            {isLoading ? (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            ) : (
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
            )}
            <span className="text-lg font-medium text-gray-900">
              {isLoading ? 'Parsing file...' : 'Click to upload or drag and drop'}
            </span>
            <span className="text-sm text-gray-500 mt-1">.XLSX, .XLS or .CSV files supported</span>
          </label>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <FileSpreadsheet className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-green-800">File successfully parsed</p>
              <p className="text-xs text-green-600 mt-0.5">{sheetNames.length} sheets found</p>
            </div>
            <button 
              onClick={() => setWorkbook(null)} 
              className="ml-auto text-sm text-indigo-600 font-medium hover:text-indigo-800"
            >
              Change File
            </button>
          </div>

          <div className="bg-white border rounded-lg p-5 space-y-4">
            <h3 className="font-medium text-gray-900">Map Worksheets</h3>
            <p className="text-sm text-gray-500 mb-4">Select which sheets contain your student and teacher data.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Students Sheet</label>
                <select
                  value={studentSheet}
                  onChange={e => setStudentSheet(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                >
                  <option value="">-- Do not import students --</option>
                  {sheetNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teachers Sheet</label>
                <select
                  value={teacherSheet}
                  onChange={e => setTeacherSheet(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                >
                  <option value="">-- Do not import teachers --</option>
                  {sheetNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="pt-4 flex justify-between items-center">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none"
        >
          Back
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="px-5 py-2.5 rounded-lg font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none"
          >
            Skip Data Import
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!workbook || (!studentSheet && !teacherSheet)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Continue to Mapping
          </button>
        </div>
      </div>
    </div>
  );
}
