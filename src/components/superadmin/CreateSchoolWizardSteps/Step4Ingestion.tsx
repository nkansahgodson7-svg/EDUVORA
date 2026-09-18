import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { CheckCircle2, AlertTriangle, Loader2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Step4Props {
  schoolId: string;
  data: { validStudents: any[]; validTeachers: any[] };
  onComplete: () => void;
}

export function Step4Ingestion({ schoolId, data, onComplete }: Step4Props) {
  const [status, setStatus] = useState<'idle' | 'ingesting' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({
    studentsAdded: 0,
    studentsFailed: 0,
    teachersAdded: 0,
    teachersFailed: 0,
  });
  const [errorLog, setErrorLog] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    const ingestData = async () => {
      setStatus('ingesting');
      const newResults = { studentsAdded: 0, studentsFailed: 0, teachersAdded: 0, teachersFailed: 0 };
      const newErrorLog: any[] = [];
      const totalRecords = data.validStudents.length + data.validTeachers.length;
      let completedRecords = 0;

      if (totalRecords === 0) {
        try {
          await supabase.from('schools').update({ status: 'active' }).eq('id', schoolId);
        } catch (e) {
          console.warn('Could not update school status to active:', e);
        }
        if (isMounted) {
          setProgress(100);
          setResults(newResults);
          setStatus('complete');
        }
        return;
      }

      const updateProgress = (add: number) => {
        completedRecords += add;
        setProgress(Math.round((completedRecords / Math.max(totalRecords, 1)) * 100));
      };

      try {
        // Prepare arrays with school_id
        const students = data.validStudents.map(s => ({ ...s, school_id: schoolId }));
        const teachers = data.validTeachers.map(t => ({ ...t, school_id: schoolId }));

        const getDetailedErrorMessage = (error: any) => {
          if (!error) return 'Unknown error';
          if (error.code === 'PGRST125') return 'Database table missing. Please run supabase_schema.sql in Supabase SQL Editor.';
          if (error.code === '42501' || (error.message && error.message.toLowerCase().includes('row-level security'))) {
            return 'Permission Denied: Row-Level Security (RLS) policy blocked this insertion. Please update your Supabase RLS policies to allow access.';
          }
          if (error.message === 'Failed to fetch' || (error.message && error.message.toLowerCase().includes('network'))) {
            return 'Network error: Failed to connect to the database. Please check your connection.';
          }
          return error.message || 'An unexpected database error occurred.';
        };

        const insertWithRetry = async (table: string, chunk: any[], maxRetries = 3) => {
          let lastError = null;
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const { error } = await supabase.from(table).insert(chunk);
              if (!error) return { success: true, error: null };
              
              lastError = error;
              
              // Do not retry for guaranteed terminal errors (Missing Table or RLS Violation)
              if (error.code === 'PGRST125' || error.code === '42501' || error.message?.toLowerCase().includes('row-level security')) {
                break;
              }
              
              // Exponential backoff for possible transient network errors
              await new Promise(res => setTimeout(res, 1000 * attempt));
            } catch (err: any) {
              lastError = err;
              if (err?.message === 'Failed to fetch' || !navigator.onLine) {
                 await new Promise(res => setTimeout(res, 1000 * attempt));
              } else {
                 break;
              }
            }
          }
          return { success: false, error: lastError };
        };

        // Process Students in chunks (Supabase limit is usually large, but chunking is safer)
        const chunkSize = 500;
        for (let i = 0; i < students.length; i += chunkSize) {
          const chunk = students.slice(i, i + chunkSize);
          const { success, error } = await insertWithRetry('students', chunk);
          
          if (!success) {
            newResults.studentsFailed += chunk.length;
            newErrorLog.push({ type: 'Students', error: getDetailedErrorMessage(error), chunkIndex: i });
          } else {
            newResults.studentsAdded += chunk.length;
          }
          if (isMounted) updateProgress(chunk.length);
        }

        // Process Teachers in chunks
        for (let i = 0; i < teachers.length; i += chunkSize) {
          const chunk = teachers.slice(i, i + chunkSize);
          const { success, error } = await insertWithRetry('teachers', chunk);
          
          if (!success) {
            newResults.teachersFailed += chunk.length;
            newErrorLog.push({ type: 'Teachers', error: getDetailedErrorMessage(error), chunkIndex: i });
          } else {
            newResults.teachersAdded += chunk.length;
          }
          if (isMounted) updateProgress(chunk.length);
        }

        try {
          await supabase.from('schools').update({ status: 'active' }).eq('id', schoolId);
        } catch (e) {
          console.warn('Could not update school status to active:', e);
        }

        if (isMounted) {
          setResults(newResults);
          setErrorLog(newErrorLog);
          setStatus(newErrorLog.length === 0 ? 'complete' : 'error');
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus('error');
          if (err?.code === 'PGRST125' || newErrorLog.some(e => e.error.includes('PGRST125'))) {
             setErrorLog([...newErrorLog, { type: 'System', error: 'Tables missing. Please run supabase_schema.sql in Supabase SQL Editor.' }]);
          } else {
             setErrorLog([...newErrorLog, { type: 'System', error: err.message || 'Unknown error' }]);
          }
        }
      }
    };

    if (status === 'idle') {
      ingestData();
    }

    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadErrorLog = () => {
    const ws = XLSX.utils.json_to_sheet(errorLog);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Error Log");
    XLSX.writeFile(wb, "Ingestion_Error_Log.xlsx");
  };

  return (
    <div className="space-y-6 text-center py-6">
      {status === 'ingesting' && (
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-16 w-16 text-indigo-600 animate-spin" />
          <h2 className="text-2xl font-semibold text-gray-900">Ingesting Data...</h2>
          <p className="text-sm text-gray-500">Please do not close this window.</p>
          
          <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 mt-6">
            <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-xs font-medium text-gray-700 mt-2">{progress}% Complete</p>
        </div>
      )}

      {status === 'complete' && (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-2">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">School Provisioned Successfully</h2>
          
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 w-full max-w-md text-left">
            <h4 className="font-medium text-gray-900 border-b pb-2 mb-3">Data Ingestion Summary</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex justify-between">
                <span>Students Added:</span>
                <span className="font-semibold text-gray-900">{results.studentsAdded}</span>
              </li>
              <li className="flex justify-between">
                <span>Teachers Added:</span>
                <span className="font-semibold text-gray-900">{results.teachersAdded}</span>
              </li>
            </ul>
          </div>

          <button
            onClick={onComplete}
            className="mt-6 bg-indigo-600 text-white px-8 py-2.5 rounded-lg font-medium hover:bg-indigo-700"
          >
            Go to Dashboard
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="h-20 w-20 bg-orange-100 rounded-full flex items-center justify-center mb-2">
            <AlertTriangle className="h-10 w-10 text-orange-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">Ingestion Completed with Errors</h2>
          <p className="text-sm text-gray-500 max-w-md text-center">
            The school was created, but some records failed to insert into the database.
          </p>
          
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 w-full max-w-md text-left">
            <h4 className="font-medium text-gray-900 border-b pb-2 mb-3">Data Ingestion Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="bg-green-50 p-3 rounded">
                <span className="block text-xs text-gray-500 uppercase">Success</span>
                <span className="font-semibold text-green-700 block mt-1">{results.studentsAdded + results.teachersAdded} Records</span>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <span className="block text-xs text-gray-500 uppercase">Failed</span>
                <span className="font-semibold text-red-700 block mt-1">{results.studentsFailed + results.teachersFailed} Records</span>
              </div>
            </div>
            
            {errorLog.length > 0 && (
              <button 
                onClick={downloadErrorLog}
                className="mt-4 w-full flex items-center justify-center gap-2 text-sm bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                <Download className="h-4 w-4" /> Download Error Log
              </button>
            )}
          </div>

          <button
            onClick={onComplete}
            className="mt-6 bg-indigo-600 text-white px-8 py-2.5 rounded-lg font-medium hover:bg-indigo-700"
          >
            Continue Anyway
          </button>
        </div>
      )}
    </div>
  );
}
