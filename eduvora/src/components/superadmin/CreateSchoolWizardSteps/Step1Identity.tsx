import React, { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Building2, Mail, Hash } from 'lucide-react';
import { useTenantAuth } from '../../../context/TenantAuthContext';

interface Step1Props {
  onNext: (schoolData: { id: string; name: string; code: string; adminEmail: string }) => void;
}

export function Step1Identity({ onNext }: Step1Props) {
  const { registerSchool } = useTenantAuth();
  const [formData, setFormData] = useState({ name: '', code: '', adminEmail: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Create the school in Supabase
      const { data, error: dbError } = await supabase
        .from('schools')
        .insert([{ 
          name: formData.name, 
          code: formData.code, 
          status: 'onboarding' 
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      // Instantly register into tenant state so the school appears on the dashboard
      registerSchool({
        id: data.id,
        name: formData.name,
        code: formData.code,
        adminEmail: formData.adminEmail
      });

      onNext({
        id: data.id,
        name: formData.name,
        code: formData.code,
        adminEmail: formData.adminEmail
      });
    } catch (err: any) {
      if (err?.code !== 'PGRST125') {
        console.error(err);
      }
      
      if (err?.code === 'PGRST125') {
        setError('Database tables not found or schema cache not refreshed. Please run the SQL schema located in supabase_schema.sql in your Supabase SQL Editor, paying special attention to the "NOTIFY pgrst" command at the bottom.');
      } else if (err?.code === '23505') {
        setError('A school with this code (slug) already exists. Please choose a different, unique code.');
      } else {
        setError(err.message || 'Failed to create school');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Create New School</h2>
        <p className="text-sm text-gray-500 mt-1">Set up the initial identity for the new tenant.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              className="pl-10 w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 border"
              placeholder="e.g. Springfield Elementary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">School Code (Slug)</label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              required
              type="text"
              value={formData.code}
              onChange={(e) => setFormData(p => ({ ...p, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
              className="pl-10 w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 border"
              placeholder="e.g. springfield-ele"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Primary Admin Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              required
              type="email"
              value={formData.adminEmail}
              onChange={(e) => setFormData(p => ({ ...p, adminEmail: e.target.value }))}
              className="pl-10 w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 border"
              placeholder="admin@school.edu"
            />
          </div>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Provisioning...' : 'Create School & Continue'}
        </button>
      </div>
    </form>
  );
}
