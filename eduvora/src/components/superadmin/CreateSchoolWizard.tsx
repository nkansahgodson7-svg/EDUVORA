import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Step1Identity } from './CreateSchoolWizardSteps/Step1Identity';
import { Step2Upload } from './CreateSchoolWizardSteps/Step2Upload';
import { Step3Mapping } from './CreateSchoolWizardSteps/Step3Mapping';
import { Step4Ingestion } from './CreateSchoolWizardSteps/Step4Ingestion';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { useTenantAuth } from '../../context/TenantAuthContext';

interface CreateSchoolWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateSchoolWizard({ isOpen, onClose }: CreateSchoolWizardProps) {
  const { refreshTenants } = useTenantAuth();
  const [step, setStep] = useState(1);
  const [schoolData, setSchoolData] = useState<{ id: string; name: string; code: string; adminEmail: string } | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetsInfo, setSheetsInfo] = useState<{ studentsSheet?: string; teachersSheet?: string }>({});
  const [validatedData, setValidatedData] = useState<{ validStudents: any[]; validTeachers: any[] }>({ validStudents: [], validTeachers: [] });

  const handleFinish = () => {
    refreshTenants?.();
    onClose();
  };

  // Reset state when closed
  React.useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(1);
        setSchoolData(null);
        setWorkbook(null);
        setSheetsInfo({});
        setValidatedData({ validStudents: [], validTeachers: [] });
      }, 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const steps = [
    { number: 1, title: 'School Identity' },
    { number: 2, title: 'Upload Data' },
    { number: 3, title: 'Map & Validate' },
    { number: 4, title: 'Ingestion' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <h1 className="text-xl font-semibold text-gray-800">New Tenant Onboarding</h1>
          {step !== 4 && (
            <button onClick={handleFinish} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full -z-10"></div>
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 rounded-full -z-10 transition-all duration-300"
              style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
            ></div>
            
            {steps.map((s) => (
              <div key={s.number} className="flex flex-col items-center bg-white px-2">
                <div className={clsx(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                  step > s.number ? "bg-indigo-600 border-indigo-600 text-white" :
                  step === s.number ? "bg-white border-indigo-600 text-indigo-600" :
                  "bg-white border-gray-300 text-gray-400"
                )}>
                  {s.number}
                </div>
                <span className={clsx(
                  "text-xs mt-1.5 font-medium hidden sm:block",
                  step >= s.number ? "text-gray-900" : "text-gray-400"
                )}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {step === 1 && (
            <Step1Identity 
              onNext={(data) => {
                setSchoolData(data);
                setStep(2);
              }} 
            />
          )}
          {step === 2 && (
            <Step2Upload 
              onBack={() => setStep(1)}
              onNext={(wb, sheets) => {
                setWorkbook(wb);
                setSheetsInfo(sheets);
                setStep(3);
              }}
              onSkip={() => {
                setValidatedData({ validStudents: [], validTeachers: [] });
                setStep(4);
              }}
            />
          )}
          {step === 3 && workbook && (
            <Step3Mapping 
              workbook={workbook}
              sheetsInfo={sheetsInfo}
              onBack={() => setStep(2)}
              onNext={(data) => {
                setValidatedData(data);
                setStep(4);
              }}
            />
          )}
          {step === 4 && schoolData && (
            <Step4Ingestion 
              schoolId={schoolData.id}
              data={validatedData}
              onComplete={handleFinish}
            />
          )}
        </div>
        
      </div>
    </div>
  );
}
