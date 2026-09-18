import React, { useState } from 'react';
import { AlertTriangle, Trash2, Loader2, Copy, Check, X, ShieldAlert, Database } from 'lucide-react';
import { useTenantAuth } from '../../context/TenantAuthContext';

interface NukeDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SQL_TRUNCATE_SCRIPT = `-- SUPABASE CLEAN SLATE SQL SCRIPT
-- Run this in your Supabase SQL Editor to permanently purge all school records
TRUNCATE TABLE 
  public.student_scores, 
  public.assessment_sheets, 
  public.teacher_allocations, 
  public.students, 
  public.teachers, 
  public.classes, 
  public.subjects, 
  public.audit_logs, 
  public.schools 
CASCADE;

-- Optional: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';`;

export const NukeDatabaseModal: React.FC<NukeDatabaseModalProps> = ({ isOpen, onClose }) => {
  const { nukeDatabase } = useTenantAuth();
  const [confirmationText, setConfirmationText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SQL_TRUNCATE_SCRIPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleNuke = async () => {
    if (confirmationText.trim().toUpperCase() !== 'NUKE') return;
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const result = await nukeDatabase();
      setStatusMessage({ type: 'success', text: result.message || 'Database and cache wiped cleanly!' });
      setTimeout(() => {
        onClose();
        setConfirmationText('');
        setStatusMessage(null);
      }, 1200);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to complete full database wipe. Try running the SQL script in Supabase.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-red-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-rose-50 border-b border-rose-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-rose-950">Nuke Database & Reset All</h2>
              <p className="text-xs text-rose-700 font-medium">Permanent data purge for a clean slate</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-rose-400 hover:text-rose-700 rounded-lg hover:bg-rose-100/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Warning Banner */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed space-y-1">
              <p className="font-semibold">This action cannot be undone.</p>
              <p>
                All schools, students, teachers, classes, subjects, assessment sheets, and scores will be permanently deleted from Supabase and local storage.
              </p>
              <p className="text-amber-800 font-medium">
                ✓ Your Super Admin login will be preserved so you can immediately start fresh.
              </p>
            </div>
          </div>

          {/* Status message */}
          {statusMessage && (
            <div className={`p-3 rounded-lg text-sm font-medium ${
              statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {statusMessage.text}
            </div>
          )}

          {/* One-Click Action */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
              Type <span className="text-rose-600 font-mono font-black">NUKE</span> to confirm action
            </label>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Type NUKE"
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono text-sm tracking-wider text-stone-900 uppercase placeholder:normal-case placeholder:font-sans"
            />

            <button
              type="button"
              onClick={handleNuke}
              disabled={isLoading || confirmationText.trim().toUpperCase() !== 'NUKE'}
              className="w-full py-3 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 text-white font-bold text-sm shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Nuking database & local data...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Wipe Everything & Start Afresh</span>
                </>
              )}
            </button>
          </div>

          {/* Direct SQL section */}
          <div className="pt-2 border-t border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-600 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-stone-500" />
                <span>Or run directly in Supabase SQL Editor:</span>
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="text-xs font-semibold text-[#1a56db] hover:text-[#1e40af] flex items-center gap-1 py-1 px-2 rounded hover:bg-blue-50 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
              </button>
            </div>
            <pre className="bg-stone-900 text-stone-200 text-xs font-mono p-3 rounded-xl overflow-x-auto leading-relaxed border border-stone-800">
              {SQL_TRUNCATE_SCRIPT}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
