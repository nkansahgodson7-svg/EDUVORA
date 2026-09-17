import React, { useState } from 'react';
import { Database, Copy, Check, Server, ShieldCheck, Cloud, ExternalLink, Code } from 'lucide-react';
import { SUPABASE_SQL_SCHEMA } from '../../lib/supabaseClient';

interface DatabaseSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseSchemaModal: React.FC<DatabaseSchemaModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'sql' | 'rls' | 'cloudflare'>('sql');

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-[#111113] border border-stone-800 rounded-2xl sm:rounded-[2.5rem] w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl relative text-white animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-8 border-b border-stone-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-full bg-[#f6c042] flex items-center justify-center text-stone-950 font-bold shrink-0">
              <Database className="w-4 sm:w-5 h-4 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-white tracking-tight leading-snug">
                Supabase Multi-Tenant Database & Cloudflare Schema
              </h2>
              <p className="text-[11px] sm:text-xs text-stone-400">
                Production-grade DDL schema, Row Level Security (RLS), and custom subdomain routing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-stone-900 text-stone-400 hover:text-white text-base font-bold shrink-0 transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Tab Header */}
        <div className="flex border-b border-stone-800 px-4 sm:px-8 gap-2 sm:gap-3 text-xs font-bold pt-3 pb-2.5 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('sql')}
            className={`min-h-[44px] px-4 py-2 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'bg-white text-stone-950 font-bold'
                : 'text-stone-400 hover:text-white bg-stone-900'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>PostgreSQL Schema & RLS</span>
          </button>

          <button
            onClick={() => setActiveTab('rls')}
            className={`min-h-[44px] px-4 py-2 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'rls'
                ? 'bg-white text-stone-950 font-bold'
                : 'text-stone-400 hover:text-white bg-stone-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Row Level Security (RLS) Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('cloudflare')}
            className={`min-h-[44px] px-4 py-2 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'cloudflare'
                ? 'bg-white text-stone-950 font-bold'
                : 'text-stone-400 hover:text-white bg-stone-900'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Cloudflare Edge Routing</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 space-y-6 text-xs text-stone-300">
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-stone-400">
                  Execute this SQL inside your Supabase Project SQL Editor to provision schemas, foreign keys, and indexes.
                </div>
                <button
                  onClick={handleCopy}
                  className="min-h-[44px] px-4 py-2 rounded-full bg-[#f6c042] hover:bg-[#eab308] text-stone-950 font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy SQL Script'}</span>
                </button>
              </div>

              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 font-mono text-[11px] overflow-x-auto text-stone-300 leading-relaxed max-h-[50vh]">
                <pre>{SUPABASE_SQL_SCHEMA}</pre>
              </div>
            </div>
          )}

          {activeTab === 'rls' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#f6c042]" />
                  Multi-Tenant Row-Level Security Matrix
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Every query executed against tables containing a <code className="text-[#f6c042] font-mono">school_id</code> column is automatically checked against the user's JWT metadata. Cross-tenant leakage is blocked at the PostgreSQL engine level.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                  <div className="text-xs font-bold text-white">Super Admin Access</div>
                  <p className="text-[11px] text-stone-400">
                    Bypasses tenant boundaries through the platform operator role. Grants global cross-school analytics and provisioning controls.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                  <div className="text-xs font-bold text-white">School Admin Access</div>
                  <p className="text-[11px] text-stone-400">
                    Constrained strictly to the school UUID assigned in their authenticated profile. Manages teachers, students, classes, and marks approvals.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                  <div className="text-xs font-bold text-white">Teacher Access</div>
                  <p className="text-[11px] text-stone-400">
                    Constrained to assigned classes and subjects within the school tenant. Only write-accessible while the sheet status remains in draft state.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                  <div className="text-xs font-bold text-white">Student & Parent Access</div>
                  <p className="text-[11px] text-stone-400">
                    Read-only access restricted to finalized, approved report card records associated with their admission profile.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cloudflare' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-[#f6c042]" />
                  Wildcard Subdomain Edge Resolution
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Support dynamic custom subdomains (e.g., <code className="text-[#f6c042] font-mono">apex.eduvora.io</code>) using Cloudflare Pages Functions edge middleware.
                </p>
              </div>

              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 font-mono text-[11px] text-stone-300">
                <pre>{`// functions/_middleware.ts
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname; // e.g. "apex.eduvora.io"

  const parts = hostname.split('.');
  if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'app') {
    const subdomain = parts[0];
    // Pass tenant context to headers
    const request = new Request(context.request);
    request.headers.set('X-Tenant-Subdomain', subdomain);
    return context.next(request);
  }

  return context.next();
}`}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 px-8 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-white text-stone-950 font-bold text-xs hover:bg-stone-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
