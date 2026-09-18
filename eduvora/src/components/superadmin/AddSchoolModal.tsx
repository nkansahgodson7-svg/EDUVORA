import React, { useState } from 'react';
import { X, Building2, MapPin, Image as ImageIcon, User, Phone, Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useTenantAuth } from '../../context/TenantAuthContext';

interface AddSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddSchoolModal: React.FC<AddSchoolModalProps> = ({ isOpen, onClose }) => {
  const { provisionNewTenant } = useTenantAuth();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Step 1: School Info
  const [schoolName, setSchoolName] = useState('');
  const [location, setLocation] = useState('');
  
  // Step 2: Admin Info
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setSchoolName('');
    setLocation('');
    setAdminName('');
    setAdminPhone('');
    setAdminEmail('');
    onClose();
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (schoolName.trim() && location.trim()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminName.trim() && adminPhone.trim() && adminEmail.trim()) {
      setIsSubmitting(true);
      
      const subdomain = schoolName.toLowerCase().replace(/[^a-z0-9]/g, '');
      try {
        await provisionNewTenant(
          { name: schoolName, subdomain: subdomain || 'school', address: location, headmaster_name: adminName },
          { name: adminName, email: adminEmail, phone: adminPhone },
          'standard'
        );
      } finally {
        setIsSubmitting(false);
        handleClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Provision New School</h2>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              {step === 1 ? 'Step 1 of 2: Institution Details' : 'Step 2 of 2: Administration'}
            </p>
          </div>
          <button 
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-900 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-stone-100">
          <div 
            className="h-full bg-[#1a56db] transition-all duration-300 ease-out" 
            style={{ width: step === 1 ? '50%' : '100%' }} 
          />
        </div>

        {/* Form Content */}
        <div className="p-6">
          {step === 1 ? (
            <form id="school-form" onSubmit={handleNext} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Institution Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Building2 className="h-4 w-4 text-stone-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/20 transition-all font-medium text-stone-900 placeholder:text-stone-400"
                    placeholder="e.g. Lincoln High School"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Location / Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-stone-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/20 transition-all font-medium text-stone-900 placeholder:text-stone-400"
                    placeholder="e.g. 123 Education Ave, NY"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">School Logo (Optional)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-stone-200 border-dashed rounded-xl hover:border-stone-300 hover:bg-stone-50 transition-colors cursor-pointer group">
                  <div className="space-y-2 text-center">
                    <div className="w-10 h-10 mx-auto rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-white transition-colors">
                      <ImageIcon className="h-5 w-5 text-stone-400" />
                    </div>
                    <div className="flex text-sm text-stone-600 justify-center">
                      <span className="relative font-bold text-[#1a56db] hover:text-[#1e40af] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#1a56db]">
                        Upload a file
                      </span>
                      <p className="pl-1 font-medium">or drag and drop</p>
                    </div>
                    <p className="text-xs text-stone-400 font-medium">PNG, JPG, GIF up to 2MB</p>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <form id="admin-form" onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Master Admin Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-stone-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/20 transition-all font-medium text-stone-900 placeholder:text-stone-400"
                    placeholder="e.g. Sarah Jenkins"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Contact Phone</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-stone-400" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/20 transition-all font-medium text-stone-900 placeholder:text-stone-400"
                    placeholder="e.g. +1 (555) 123-4567"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Admin Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-stone-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/20 transition-all font-medium text-stone-900 placeholder:text-stone-400"
                    placeholder="e.g. admin@school.edu"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 text-sm font-bold text-stone-500 hover:text-stone-700 hover:bg-stone-200/50 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                form="school-form"
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#1a56db] hover:bg-[#1e40af] text-white font-bold text-sm shadow-md shadow-blue-600/10 transition-all flex items-center gap-2 active:scale-[0.98]"
              >
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-sm font-bold text-stone-500 hover:text-stone-700 hover:bg-stone-200/50 rounded-xl transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                form="admin-form"
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803d] disabled:bg-stone-300 disabled:text-stone-500 text-white font-bold text-sm shadow-md shadow-green-600/10 transition-all flex items-center gap-2 active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <span>Provisioning...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete & Provision</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
