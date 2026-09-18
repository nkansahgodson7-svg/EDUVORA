import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Download, 
  Sparkles, 
  Database, 
  Loader2, 
  Check, 
  Edit3, 
  RotateCcw,
  FileCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '../../lib/supabaseClient';
import { useTenantAuth } from '../../context/TenantAuthContext';
import { 
  IngestionEntityType, 
  STUDENT_FIELDS, 
  TEACHER_FIELDS, 
  autoMatchHeaders, 
  processAndValidateRow, 
  revalidateRemediatedRow,
  ProcessedRow, 
  exportErrorLogCsv, 
  downloadSampleTemplate,
} from '../../utils/dataIngestionEngine';

interface SchoolImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  tenantName: string;
  onSuccess?: (counts: { entityType: IngestionEntityType; count: number }) => void;
}

export const SchoolImportWizard: React.FC<SchoolImportWizardProps> = ({
  isOpen,
  onClose,
  tenantId,
  tenantName,
  onSuccess,
}) => {
  const { allTenants, refreshTenants } = useTenantAuth();

  // Wizard Stage (1 to 4)
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);

  // Stage 1: File Ingestion & Sheet Selection
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [entityType, setEntityType] = useState<IngestionEntityType>('students');
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [fileError, setFileError] = useState<string>('');

  // Stage 2: Pre-Parse Sanitization Options
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [normalizeFormats, setNormalizeFormats] = useState(true);
  const [coerceEnums, setCoerceEnums] = useState(true);

  // Stage 3: Column Mapping
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Stage 4: Validation & Interactive Remediation
  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'warning' | 'fatal'>('all');
  const [allowPartialImport, setAllowPartialImport] = useState(true);
  const [importMode, setImportMode] = useState<'replace' | 'upsert' | 'append'>('replace');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; count: number } | null>(null);

  // Cell Inline Editing State
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; fieldKey: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStage(1);
      setFile(null);
      setWorkbook(null);
      setSheetNames([]);
      setSelectedSheet('');
      setRawRows([]);
      setRawHeaders([]);
      setFileError('');
      setColumnMapping({});
      setProcessedRows([]);
      setSubmitResult(null);
      setIsSubmitting(false);
      setEditingCell(null);
    }
  }, [isOpen]);

  // ---------------------------------------------------------------------------
  // Stage 1: File Handling
  // ---------------------------------------------------------------------------

  const handleFileDrop = async (droppedFile: File) => {
    setFile(droppedFile);
    setIsParsing(true);
    setFileError('');

    try {
      const fileName = droppedFile.name.toLowerCase();
      
      if (fileName.endsWith('.csv')) {
        // Parse CSV via PapaParse
        const text = await droppedFile.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        
        if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
          throw new Error('CSV parsing error: ' + parsed.errors[0].message);
        }

        const data = parsed.data as Record<string, any>[];
        const headers = parsed.meta.fields || (data.length > 0 ? Object.keys(data[0]) : []);

        setWorkbook(null);
        setSheetNames(['Default']);
        setSelectedSheet('Default');
        setRawRows(data);
        setRawHeaders(headers);

        // Auto detect entity type by header names
        const hasStaff = headers.some(h => /staff|teacher|employee/i.test(h));
        const detected = hasStaff ? 'teachers' : 'students';
        setEntityType(detected);
        setColumnMapping(autoMatchHeaders(headers, detected));

      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Parse Excel via SheetJS
        const buffer = await droppedFile.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        
        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          throw new Error('No sheets detected inside workbook.');
        }

        setWorkbook(wb);
        setSheetNames(wb.SheetNames);

        // Auto-pick sheet if names contain students/teachers
        const studentSheet = wb.SheetNames.find(n => /student|pupil|learner/i.test(n));
        const teacherSheet = wb.SheetNames.find(n => /teacher|staff|faculty/i.test(n));

        const targetSheet = studentSheet || teacherSheet || wb.SheetNames[0];
        setSelectedSheet(targetSheet);

        const detected: IngestionEntityType = (teacherSheet && targetSheet === teacherSheet) ? 'teachers' : 'students';
        setEntityType(detected);

        loadSheetData(wb, targetSheet, detected);
      } else {
        throw new Error('Unsupported format. Please upload a .xlsx, .xls, or .csv file.');
      }
    } catch (err: any) {
      setFileError(err.message || 'Failed to parse file.');
    } finally {
      setIsParsing(false);
    }
  };

  const loadSheetData = (wb: XLSX.WorkBook, sheetName: string, type: IngestionEntityType) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
    if (json.length === 0) {
      setRawRows([]);
      setRawHeaders([]);
      return;
    }
    const headers = Object.keys(json[0]);
    setRawRows(json);
    setRawHeaders(headers);
    setColumnMapping(autoMatchHeaders(headers, type));
  };

  const handleSheetChange = (newSheet: string) => {
    setSelectedSheet(newSheet);
    if (!workbook) return;
    const detected: IngestionEntityType = /teacher|staff|faculty/i.test(newSheet) ? 'teachers' : entityType;
    setEntityType(detected);
    loadSheetData(workbook, newSheet, detected);
  };

  const handleEntityTypeChange = (type: IngestionEntityType) => {
    setEntityType(type);
    if (rawHeaders.length > 0) {
      setColumnMapping(autoMatchHeaders(rawHeaders, type));
    }
  };

  // ---------------------------------------------------------------------------
  // Stage 3 & 4: Mapping & Live Validation Execution
  // ---------------------------------------------------------------------------

  const executeValidation = () => {
    const validated = rawRows.map((row, idx) => {
      return processAndValidateRow(row, idx + 1, columnMapping, entityType);
    });
    setProcessedRows(validated);
  };

  const handleGoToStage4 = () => {
    executeValidation();
    setStage(4);
  };

  // Inline cell remediation handler
  const handleCellSave = (rowIndex: number, fieldKey: string) => {
    setProcessedRows(prev => {
      const updated = [...prev];
      const targetRow = updated[rowIndex];
      if (!targetRow) return prev;

      const revalidated = revalidateRemediatedRow(
        targetRow.mappedData,
        fieldKey,
        editValue,
        entityType,
        targetRow.rowNumber
      );

      updated[rowIndex] = {
        ...targetRow,
        mappedData: revalidated.mappedData,
        errors: revalidated.errors,
        warnings: revalidated.warnings,
        autoCoercedFields: revalidated.autoCoercedFields,
        status: revalidated.status,
      };

      return updated;
    });

    setEditingCell(null);
    setEditValue('');
  };

  // Computed counts for validation grid
  const validCount = useMemo(() => processedRows.filter(r => r.status === 'valid').length, [processedRows]);
  const warningCount = useMemo(() => processedRows.filter(r => r.status === 'warning').length, [processedRows]);
  const fatalCount = useMemo(() => processedRows.filter(r => r.status === 'fatal').length, [processedRows]);

  const displayedRows = useMemo(() => {
    if (statusFilter === 'all') return processedRows;
    return processedRows.filter(r => r.status === statusFilter);
  }, [processedRows, statusFilter]);

  // ---------------------------------------------------------------------------
  // Phase 4: Scoped Batch Ingestion & Tenant Isolation Injection
  // ---------------------------------------------------------------------------

  const handleBatchIngest = async () => {
    // 1. Filter rows to import based on partial import switch
    const rowsToImport = allowPartialImport
      ? processedRows.filter(r => r.status !== 'fatal')
      : processedRows;

    if (!allowPartialImport && fatalCount > 0) {
      alert(`Cannot import with ${fatalCount} fatal error(s). Please fix the errors in the remediation grid or enable "Partial Import".`);
      return;
    }

    if (rowsToImport.length === 0) {
      alert('No valid rows available to import.');
      return;
    }

    setIsSubmitting(true);
    setSubmitProgress(10);
    setSubmitResult(null);

    try {
      const targetTable = entityType === 'students' ? 'students' : 'teachers';

      // 1. Strict Database Schema Mapping
      const payloads = rowsToImport.map((r) => {
        const d = r.mappedData;
        if (entityType === 'students') {
          return {
            school_id: tenantId, // Enforce strict tenant isolation
            student_code: String(d.student_code || '').trim(),
            first_name: String(d.first_name || '').trim(),
            last_name: String(d.last_name || d.first_name || '').trim(),
            gender: d.gender || 'Prefer not to say',
            grade_level: String(d.grade_level || 'Unassigned').trim(),
            parent_phone: d.parent_phone ? String(d.parent_phone).trim() : null,
          };
        } else {
          return {
            school_id: tenantId, // Enforce strict tenant isolation
            staff_code: String(d.staff_code || '').trim(),
            first_name: String(d.first_name || '').trim(),
            last_name: String(d.last_name || d.first_name || '').trim(),
            email: d.email ? String(d.email).trim().toLowerCase() : null,
            phone: d.phone ? String(d.phone).trim() : null,
          };
        }
      });

      // 2. Ingestion Mode Strategy Execution
      // If 'replace' mode, cleanly purge previous records for this school first to remove blank/stale data
      if (importMode === 'replace') {
        const { error: purgeError } = await supabase
          .from(targetTable)
          .delete()
          .eq('school_id', tenantId);

        if (purgeError) {
          throw new Error(`Failed to clean previous ${entityType} records: ${purgeError.message}`);
        }
      }

      // If 'upsert' mode, look up existing records to map primary keys for conflict resolution
      let codeToIdMap = new Map<string, string>();
      if (importMode === 'upsert') {
        const selectCol = entityType === 'students' ? 'id, student_code' : 'id, staff_code';
        const { data: existingRecords } = await supabase
          .from(targetTable)
          .select(selectCol)
          .eq('school_id', tenantId);

        if (existingRecords) {
          existingRecords.forEach((r: any) => {
            const code = entityType === 'students' ? r.student_code : r.staff_code;
            if (code) codeToIdMap.set(code, r.id);
          });
        }
      }

      // 3. Atomic Batching In Chunks (50 records per chunk)
      const CHUNK_SIZE = 50;
      let totalInserted = 0;
      const totalChunks = Math.ceil(payloads.length / CHUNK_SIZE);

      for (let i = 0; i < totalChunks; i++) {
        let chunk = payloads.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);

        let opResult: any;
        if (importMode === 'replace' || importMode === 'append') {
          opResult = await supabase.from(targetTable).insert(chunk);
        } else {
          // Upsert: map matching IDs so Postgres upserts on primary key 'id'
          const chunkWithIds = chunk.map((item: any) => {
            const code = entityType === 'students' ? item.student_code : item.staff_code;
            const existingId = codeToIdMap.get(code);
            return existingId ? { ...item, id: existingId } : item;
          });
          opResult = await supabase.from(targetTable).upsert(chunkWithIds, { onConflict: 'id' });
        }

        if (opResult.error) {
          throw new Error(`Database error on chunk ${i + 1} of ${totalChunks}: ${opResult.error.message}`);
        }

        totalInserted += chunk.length;
        setSubmitProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      // Sync with Supabase after all chunks inserted
      await refreshTenants();

      setSubmitResult({
        success: true,
        message: `Successfully ${importMode === 'replace' ? 'replaced & ingested' : 'ingested'} ${totalInserted} ${entityType} into "${tenantName}" with complete data normalization!`,
        count: totalInserted,
      });

      onSuccess?.({ entityType, count: totalInserted });

    } catch (err: any) {
      console.error('Batch Ingestion Failure:', err);
      setSubmitResult({
        success: false,
        message: err.message || 'Batch ingestion encountered an unexpected database error.',
        count: 0,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetFields = entityType === 'students' ? STUDENT_FIELDS : TEACHER_FIELDS;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-stone-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1a56db] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-stone-950">Data Ingestion Engine</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-[#1a56db]">
                  {tenantName}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Stage {stage} of 4: {
                  stage === 1 ? 'File Ingestion & Sheet Selection' :
                  stage === 2 ? 'Pre-Parse Sanitization' :
                  stage === 3 ? 'Dynamic Column Mapping' :
                  'Validation & Interactive Remediation Grid'
                }
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-stone-200/80 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Step Navigation Tracker */}
        <div className="px-6 py-3 bg-white border-b border-stone-100 flex items-center justify-between text-xs font-semibold">
          {[
            { num: 1, label: 'File Upload' },
            { num: 2, label: 'Sanitization' },
            { num: 3, label: 'Column Mapping' },
            { num: 4, label: 'Validation & Ingestion' },
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                stage === s.num 
                  ? 'bg-[#1a56db] text-white' 
                  : stage > s.num 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-stone-100 text-stone-400'
              }`}>
                {stage > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
              </div>
              <span className={stage === s.num ? 'text-stone-900 font-bold' : 'text-stone-400'}>
                {s.label}
              </span>
              {idx < 3 && <div className="w-8 h-px bg-stone-200 hidden sm:block mx-1" />}
            </div>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* ================================================================= */}
          {/* STAGE 1: FILE INGESTION & SHEET SELECTION */}
          {/* ================================================================= */}
          {stage === 1 && (
            <div className="space-y-6">
              {/* Entity Selector */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
                <div>
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                    Target Ingestion Entity
                  </label>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Select whether you are importing student records or teaching staff.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-stone-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleEntityTypeChange('students')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      entityType === 'students' 
                        ? 'bg-[#1a56db] text-white shadow-xs' 
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Students
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEntityTypeChange('teachers')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      entityType === 'teachers' 
                        ? 'bg-[#1a56db] text-white shadow-xs' 
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Teachers / Staff
                  </button>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileDrop(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all ${
                  isDragging 
                    ? 'border-[#1a56db] bg-blue-50/50' 
                    : file 
                      ? 'border-emerald-300 bg-emerald-50/30' 
                      : 'border-stone-300 hover:border-stone-400 bg-stone-50/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileDrop(e.target.files[0]);
                    }
                  }}
                />

                <div className="max-w-md mx-auto flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm ${
                    file ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-[#1a56db]'
                  }`}>
                    {isParsing ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : file ? (
                      <CheckCircle2 className="w-8 h-8" />
                    ) : (
                      <Upload className="w-8 h-8" />
                    )}
                  </div>

                  {file ? (
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                        <FileCheck className="w-3.5 h-3.5" />
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </div>
                      <p className="text-xs text-stone-500">
                        {rawRows.length} rows parsed successfully across {rawHeaders.length} columns.
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-[#1a56db] hover:underline font-bold"
                      >
                        Upload a different file
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-base font-bold text-stone-900">
                        Drop your spreadsheet here, or{' '}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[#1a56db] hover:underline"
                        >
                          browse files
                        </button>
                      </h3>
                      <p className="text-xs text-stone-400 mt-1">
                        Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
                      </p>
                    </div>
                  )}

                  {fileError && (
                    <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{fileError}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-Sheet Workbook Detection */}
              {sheetNames.length > 1 && (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                        Multi-Sheet Workbook Detected
                      </span>
                      <span className="text-xs text-amber-700">
                        Found {sheetNames.length} tabs. Select which tab contains {entityType} records.
                      </span>
                    </div>
                  </div>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-900 outline-none shadow-2xs"
                  >
                    {sheetNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sample Templates Downloader */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                <span>Need a ready-made template to test?</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadSampleTemplate('students')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 font-bold text-stone-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Student Template (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadSampleTemplate('teachers')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 font-bold text-stone-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Teacher Template (.csv)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STAGE 2: CLIENT-SIDE PRE-PARSE SANITIZATION */}
          {/* ================================================================= */}
          {stage === 2 && (
            <div className="space-y-6">
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-[#1a56db] font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Automated Data Normalization Pipeline</span>
                </div>
                <p className="text-xs text-blue-900/80 mt-1">
                  Before executing strict database validation, our sanitization engine transforms raw input into clean, canonical data.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Rule 1: Whitespace Trimming */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900">Whitespace Trimming</span>
                    <input
                      type="checkbox"
                      checked={trimWhitespace}
                      onChange={(e) => setTrimWhitespace(e.target.checked)}
                      className="w-4 h-4 text-[#1a56db] rounded"
                    />
                  </div>
                  <p className="text-xs text-stone-500">
                    Strips invisible leading and trailing tabs, spaces, and newline characters from all text cells.
                  </p>
                  <div className="p-2 bg-stone-50 rounded-lg text-[11px] font-mono text-stone-600">
                    " John Smith " → "John Smith"
                  </div>
                </div>

                {/* Rule 2: Format Normalization */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900">Format Normalization</span>
                    <input
                      type="checkbox"
                      checked={normalizeFormats}
                      onChange={(e) => setNormalizeFormats(e.target.checked)}
                      className="w-4 h-4 text-[#1a56db] rounded"
                    />
                  </div>
                  <p className="text-xs text-stone-500">
                    Forces email addresses to lowercase and standardizes telephone numbers into clean international formats.
                  </p>
                  <div className="p-2 bg-stone-50 rounded-lg text-[11px] font-mono text-stone-600">
                    555-0199 → +1 (555) 019-9...
                  </div>
                </div>

                {/* Rule 3: Enum Coercion */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900">Enum Coercion</span>
                    <input
                      type="checkbox"
                      checked={coerceEnums}
                      onChange={(e) => setCoerceEnums(e.target.checked)}
                      className="w-4 h-4 text-[#1a56db] rounded"
                    />
                  </div>
                  <p className="text-xs text-stone-500">
                    Coerces common gender aliases (e.g. "M", "boy", "F", "girl") into canonical Supabase ENUMs: Male, Female, Other.
                  </p>
                  <div className="p-2 bg-stone-50 rounded-lg text-[11px] font-mono text-stone-600">
                    "boy" / "M" → "Male"
                  </div>
                </div>
              </div>

              {/* Sample Raw vs Sanitized Preview */}
              <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-700">
                  Pre-Parse Sample Rows (First 3 Records)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-stone-100/60 border-b border-stone-200">
                        <th className="p-3 font-semibold text-stone-500">#</th>
                        {rawHeaders.slice(0, 5).map(h => (
                          <th key={h} className="p-3 font-semibold text-stone-700">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {rawRows.slice(0, 3).map((row, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/50">
                          <td className="p-3 text-stone-400 font-mono">{idx + 1}</td>
                          {rawHeaders.slice(0, 5).map(h => (
                            <td key={h} className="p-3 text-stone-800">
                              {String(row[h] || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STAGE 3: COLUMN MAPPING & DYNAMIC MAPPING UI */}
          {/* ================================================================= */}
          {stage === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-stone-900">Map File Headers to Supabase DB Fields</h3>
                  <p className="text-xs text-stone-500">
                    Verify auto-linked fields. Target fields marked with * are strictly required.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setColumnMapping(autoMatchHeaders(rawHeaders, entityType))}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-bold text-stone-700 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Auto-Remap</span>
                </button>
              </div>

              {/* Dual Column Mapping Grid */}
              <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="grid grid-cols-12 bg-stone-50 px-4 py-3 border-b border-stone-200 text-xs font-bold text-stone-600 uppercase tracking-wider">
                  <div className="col-span-5">Raw Spreadsheet Header</div>
                  <div className="col-span-1 text-center">→</div>
                  <div className="col-span-6">Target Supabase Field</div>
                </div>

                <div className="divide-y divide-stone-100">
                  {rawHeaders.map((rawHeader) => {
                    const mappedKey = columnMapping[rawHeader] || '';
                    const targetField = targetFields.find(f => f.key === mappedKey);
                    const sampleVal = rawRows[0]?.[rawHeader];

                    return (
                      <div key={rawHeader} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-stone-50/50 transition-colors">
                        {/* Left: Raw Header & Sample */}
                        <div className="col-span-5 pr-2">
                          <div className="font-bold text-stone-900 text-sm">{rawHeader}</div>
                          {sampleVal !== undefined && (
                            <div className="text-[11px] text-stone-400 font-mono truncate mt-0.5">
                              Sample: "{String(sampleVal)}"
                            </div>
                          )}
                        </div>

                        {/* Arrow */}
                        <div className="col-span-1 text-center text-stone-300 font-bold">
                          →
                        </div>

                        {/* Right: Target Field Picker */}
                        <div className="col-span-6">
                          <select
                            value={mappedKey}
                            onChange={(e) => {
                              setColumnMapping({
                                ...columnMapping,
                                [rawHeader]: e.target.value,
                              });
                            }}
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none transition-all ${
                              mappedKey 
                                ? targetField?.required 
                                  ? 'border-blue-300 bg-blue-50/40 text-blue-900' 
                                  : 'border-emerald-300 bg-emerald-50/40 text-emerald-900'
                                : 'border-stone-200 bg-white text-stone-400'
                            }`}
                          >
                            <option value="">-- Do Not Ingest (Ignore Column) --</option>
                            {targetFields.map((f) => (
                              <option key={f.key} value={f.key}>
                                {f.label} {f.required ? '(* Required)' : '(Optional)'}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Target Fields Status Summary */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="text-xs font-bold text-stone-700 uppercase tracking-wider">Required Field Checklist</div>
                <div className="flex flex-wrap gap-2">
                  {targetFields.map((f) => {
                    const isMapped = Object.values(columnMapping).includes(f.key);
                    return (
                      <span
                        key={f.key}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          isMapped 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : f.required 
                              ? 'bg-rose-100 text-rose-800' 
                              : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {isMapped ? <Check className="w-3.5 h-3.5" /> : f.required ? <AlertCircle className="w-3.5 h-3.5" /> : null}
                        {f.label} {f.required && '*'}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STAGE 4: DATA VALIDATION & INTERACTIVE REMEDIATION GRID */}
          {/* ================================================================= */}
          {stage === 4 && (
            <div className="space-y-6">
              {/* Top Metrics & Action Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Filter Tabs */}
                <div className="flex items-center gap-2 p-1 bg-stone-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      statusFilter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
                    }`}
                  >
                    All Rows ({processedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('valid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      statusFilter === 'valid' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Valid ({validCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('warning')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      statusFilter === 'warning' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Warnings ({warningCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('fatal')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      statusFilter === 'fatal' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Fatal ({fatalCount})</span>
                  </button>
                </div>

                {/* Export Errors Action */}
                {fatalCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const failed = processedRows.filter(r => r.status === 'fatal');
                      exportErrorLogCsv(failed, entityType, tenantName);
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Errors (.csv)</span>
                  </button>
                )}
              </div>

              {/* Interactive Remediation Grid Notice */}
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                <span>
                  💡 <strong>Interactive Remediation:</strong> Click directly on any cell to edit data inline and resolve validation errors instantly!
                </span>
                <span className="font-semibold text-blue-700">
                  Target Tenant: <span className="font-mono">{tenantId}</span>
                </span>
              </div>

              {/* Remediation Table */}
              <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs max-h-[420px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-stone-50 border-b border-stone-200 z-10">
                    <tr>
                      <th className="p-3 font-bold text-stone-500 uppercase tracking-wider w-16">Row</th>
                      <th className="p-3 font-bold text-stone-500 uppercase tracking-wider w-24">Status</th>
                      {targetFields.map((f) => (
                        <th key={f.key} className="p-3 font-bold text-stone-700 uppercase tracking-wider">
                          {f.label} {f.required && '*'}
                        </th>
                      ))}
                      <th className="p-3 font-bold text-stone-500 uppercase tracking-wider">Issues & Warnings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={targetFields.length + 3} className="p-8 text-center text-stone-400">
                          No rows match the selected status filter.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((row) => {
                        const originalIndex = processedRows.findIndex(r => r.rowNumber === row.rowNumber);

                        return (
                          <tr
                            key={row.rowNumber}
                            className={`transition-colors ${
                              row.status === 'fatal' 
                                ? 'bg-rose-50/30 hover:bg-rose-50/60' 
                                : row.status === 'warning' 
                                  ? 'bg-amber-50/30 hover:bg-amber-50/60' 
                                  : 'hover:bg-stone-50/50'
                            }`}
                          >
                            <td className="p-3 font-mono font-bold text-stone-400">
                              #{row.rowNumber}
                            </td>

                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                row.status === 'valid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : row.status === 'warning'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                              }`}>
                                {row.status === 'valid' ? 'Valid' : row.status === 'warning' ? 'Warning' : 'Fatal'}
                              </span>
                            </td>

                            {/* Editable Fields */}
                            {targetFields.map((f) => {
                              const val = row.mappedData[f.key] || '';
                              const isEditingThis = editingCell?.rowIndex === originalIndex && editingCell?.fieldKey === f.key;
                              const hasError = f.required && !val;

                              return (
                                <td
                                  key={f.key}
                                  onClick={() => {
                                    if (!isEditingThis) {
                                      setEditingCell({ rowIndex: originalIndex, fieldKey: f.key });
                                      setEditValue(String(val));
                                    }
                                  }}
                                  className={`p-3 font-medium cursor-pointer transition-colors relative group ${
                                    hasError ? 'bg-rose-100/50 text-rose-900 border-b-2 border-rose-400' : 'text-stone-900 hover:bg-blue-50/50'
                                  }`}
                                  title="Click to edit cell inline"
                                >
                                  {isEditingThis ? (
                                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="text"
                                        autoFocus
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleCellSave(originalIndex, f.key);
                                          if (e.key === 'Escape') setEditingCell(null);
                                        }}
                                        className="px-2 py-1 bg-white border border-[#1a56db] rounded text-xs font-semibold outline-none shadow-xs w-full"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleCellSave(originalIndex, f.key)}
                                        className="p-1 rounded bg-[#1a56db] text-white hover:bg-blue-700"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingCell(null)}
                                        className="p-1 rounded bg-stone-200 text-stone-600 hover:bg-stone-300"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <span className={val ? '' : 'text-stone-300 italic'}>
                                        {val || '(empty)'}
                                      </span>
                                      <Edit3 className="w-3 h-3 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                    </div>
                                  )}
                                </td>
                              );
                            })}

                            {/* Issues & Warnings column */}
                            <td className="p-3">
                              {row.errors.length > 0 && (
                                <div className="text-rose-700 font-semibold text-[11px] leading-tight mb-1">
                                  {row.errors.join(' • ')}
                                </div>
                              )}
                              {row.warnings.length > 0 && (
                                <div className="text-amber-700 text-[11px] leading-tight">
                                  {row.warnings.join(' • ')}
                                </div>
                              )}
                              {row.errors.length === 0 && row.warnings.length === 0 && (
                                <span className="text-emerald-600 font-semibold text-[11px]">Ready for batch insert</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Ingestion Strategy Options */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-[#1a56db]" />
                    <span>Database Ingestion Strategy:</span>
                  </span>
                  <span className="text-[11px] font-medium text-stone-500">Atomic chunks of 50 records with tenant isolation</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                    importMode === 'replace' ? 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="text-[#1a56db]"
                        />
                        <span className="text-xs font-bold text-stone-900">Clean Replace</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">Recommended</span>
                    </div>
                    <span className="text-[11px] text-stone-500 pl-5">
                      Purges existing {entityType} for this school first to eliminate previous corrupt/blank records.
                    </span>
                  </label>

                  <label className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                    importMode === 'upsert' ? 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="importMode"
                        value="upsert"
                        checked={importMode === 'upsert'}
                        onChange={() => setImportMode('upsert')}
                        className="text-[#1a56db]"
                      />
                      <span className="text-xs font-bold text-stone-900">Update & Merge</span>
                    </div>
                    <span className="text-[11px] text-stone-500 pl-5">
                      Updates existing records matching {entityType === 'students' ? 'Student Code' : 'Staff Code'}, inserts new ones.
                    </span>
                  </label>

                  <label className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                    importMode === 'append' ? 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="importMode"
                        value="append"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="text-[#1a56db]"
                      />
                      <span className="text-xs font-bold text-stone-900">Append Only</span>
                    </div>
                    <span className="text-[11px] text-stone-500 pl-5">
                      Inserts new records only without modifying any existing records in the database.
                    </span>
                  </label>
                </div>

                {/* Partial Import Switch */}
                <div className="pt-2 border-t border-stone-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="partialImport"
                      checked={allowPartialImport}
                      onChange={(e) => setAllowPartialImport(e.target.checked)}
                      className="w-4 h-4 text-[#1a56db] rounded cursor-pointer"
                    />
                    <label htmlFor="partialImport" className="text-xs font-bold text-stone-800 cursor-pointer">
                      Partial Import Toggle (Import {validCount + warningCount} valid records, skip {fatalCount} fatal rows)
                    </label>
                  </div>
                </div>
              </div>

              {/* Progress & Result feedback */}
              {isSubmitting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-stone-700">
                    <span>Injecting tenant isolation & sending batch payloads...</span>
                    <span>{submitProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full bg-[#1a56db] transition-all duration-300"
                      style={{ width: `${submitProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {submitResult && (
                <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
                  submitResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {submitResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                    <span>{submitResult.message}</span>
                  </div>
                  {submitResult.success && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      Done
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/70 flex items-center justify-between">
          <div>
            {stage > 1 && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStage((stage - 1) as any)}
                className="px-4 py-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 font-bold text-xs transition-colors"
            >
              Cancel
            </button>

            {stage === 1 && (
              <button
                type="button"
                disabled={!file || rawRows.length === 0}
                onClick={() => setStage(2)}
                className="px-5 py-2.5 rounded-xl bg-[#1a56db] hover:bg-[#1e40af] disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                <span>Continue to Sanitization</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {stage === 2 && (
              <button
                type="button"
                onClick={() => setStage(3)}
                className="px-5 py-2.5 rounded-xl bg-[#1a56db] hover:bg-[#1e40af] text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                <span>Continue to Column Mapping</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {stage === 3 && (
              <button
                type="button"
                onClick={handleGoToStage4}
                className="px-5 py-2.5 rounded-xl bg-[#1a56db] hover:bg-[#1e40af] text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                <span>Run Validation Engine</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {stage === 4 && (
              <button
                type="button"
                disabled={isSubmitting || (validCount + warningCount === 0 && allowPartialImport)}
                onClick={handleBatchIngest}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Ingesting Batch...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>
                      Ingest {allowPartialImport ? validCount + warningCount : processedRows.length} Records
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
