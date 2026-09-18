import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  GraduationCap,
  BookOpen,
  Award,
  Database,
  Users,
} from 'lucide-react';
import { useTenantAuth } from '../../context/TenantAuthContext';
import { EduvoraLogo } from '../common/EduvoraLogo';

export const LoginPage: React.FC = () => {
  const { loginWithEmailPassword } = useTenantAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim()) {
      setErrorMsg('Please enter your institutional email address.');
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Please enter your account password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginWithEmailPassword(email, password);
      if (!result.success) {
        setErrorMsg(result.message || 'Authentication failed. Please verify your credentials.');
      }
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col lg:flex-row selection:bg-blue-600 selection:text-white">
      {/* LEFT COLUMN: Production Login Card */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-20 bg-white">
        {/* Top Header / Brand Logo */}
        <div className="flex items-center justify-between">
          <EduvoraLogo size="md" showText priority />

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-[11px] font-bold text-blue-700">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Academic Portal</span>
          </div>
        </div>

        {/* Center Form Content */}
        <div className="max-w-[420px] w-full mx-auto my-auto py-8 sm:py-12">
          {/* Visual Login Icon Badge with subtle grid pattern */}
          <div className="relative flex justify-center mb-6">
            <div className="absolute inset-0 flex items-center justify-center -top-6 -bottom-6">
              <div
                className="w-48 h-28 opacity-40"
                style={{
                  backgroundImage:
                    'radial-gradient(#93c5fd 1.2px, transparent 1.2px)',
                  backgroundSize: '14px 14px',
                }}
              />
            </div>

            <div className="relative z-10 p-1.5 rounded-2xl bg-white shadow-xl shadow-sky-500/15 border border-sky-100">
              <EduvoraLogo size="xl" priority />
            </div>
          </div>

          {/* Headline & Description */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-950 tracking-tight">
              Login to your account!
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-2 font-normal">
              Enter your registered email address and password to login!
            </p>
          </div>

          {/* Error Message Box */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Email & Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-bold text-stone-700 mb-1.5"
              >
                Institutional Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="eg. faculty@school.edu"
                  className="w-full min-h-[48px] pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-[#1a56db] focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-bold text-stone-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="••••••••••••"
                  className="w-full min-h-[48px] pl-10 pr-11 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-[#1a56db] focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-700 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[48px] mt-2 py-3 px-6 rounded-xl bg-[#1a56db] hover:bg-[#1e40af] active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Sign In to Workspace</span>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: Production Academic Platform Showcase */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#ebf5ff] via-[#dbeafe] to-[#e0e7ff] relative overflow-hidden flex-col justify-between p-12 xl:p-16">
        {/* Top Headline */}
        <div className="relative z-10 pt-4 text-center">
          <h2 className="text-3xl xl:text-4xl font-extrabold text-stone-900 tracking-tight">
            Manage Academics <span className="text-[#1a56db]">Everywhere</span>
          </h2>
          <p className="text-sm text-stone-600 mt-2 max-w-md mx-auto">
            Continuous assessments, certified grade registers, and automated terminal report cards for modern institutions.
          </p>
        </div>

        {/* Central Orbital System Visual: Academic Architecture */}
        <div className="relative z-10 my-auto flex items-center justify-center py-10">
          <div className="relative w-[380px] h-[380px] xl:w-[440px] xl:h-[440px] flex items-center justify-center">
            {/* Outer Orbital Ring 3 */}
            <div className="absolute inset-0 rounded-full border border-blue-200/90 shadow-sm" />

            {/* Middle Orbital Ring 2 */}
            <div className="absolute inset-14 rounded-full border border-blue-200/80" />

            {/* Inner Orbital Ring 1 */}
            <div className="absolute inset-28 rounded-full border border-blue-300/70" />

            {/* Center Core Glowing Badge */}
            <div className="relative z-20 w-24 h-24 rounded-3xl bg-white p-2 shadow-2xl shadow-sky-600/30 flex items-center justify-center border border-sky-100/80">
              <EduvoraLogo size={76} priority />
            </div>

            {/* Academic Platform Capability Nodes placed along orbits */}
            {/* 1. Gradebook Engine */}
            <div
              className="absolute top-6 right-28 w-11 h-11 rounded-full bg-white p-2 shadow-lg shadow-blue-400/20 flex items-center justify-center border border-white hover:scale-110 transition-transform group"
              title="Continuous Assessment Engine"
            >
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>

            {/* 2. Official Report Cards */}
            <div
              className="absolute bottom-16 left-12 w-11 h-11 rounded-full bg-white p-2 shadow-lg shadow-blue-400/20 flex items-center justify-center border border-white hover:scale-110 transition-transform"
              title="Certified Terminal Dossiers"
            >
              <Award className="w-5 h-5 text-amber-500" />
            </div>

            {/* 3. Subject Allocations */}
            <div
              className="absolute top-24 right-44 w-10 h-10 rounded-full bg-[#1a56db] p-2 shadow-lg shadow-blue-400/20 flex items-center justify-center border-2 border-white hover:scale-110 transition-transform text-white"
              title="Faculty Subject Matrix"
            >
              <Users className="w-5 h-5 text-white" />
            </div>

            {/* 4. Student Information System */}
            <div
              className="absolute top-44 right-10 w-9 h-9 rounded-full bg-[#2563eb] p-1.5 shadow-lg shadow-blue-400/20 flex items-center justify-center border-2 border-white hover:scale-110 transition-transform text-white"
              title="Student Enrollment & Profiles"
            >
              <GraduationCap className="w-5 h-5 text-white" />
            </div>

            {/* 5. PostgreSQL RLS Security */}
            <div
              className="absolute bottom-28 right-4 w-10 h-10 rounded-full bg-stone-900 p-2 shadow-lg shadow-blue-400/20 flex items-center justify-center border border-white hover:scale-110 transition-transform text-white"
              title="PostgreSQL Row-Level Security"
            >
              <Database className="w-5 h-5 text-yellow-400" />
            </div>

            {/* 6. Cryptographic Audit Log */}
            <div
              className="absolute bottom-6 right-28 w-11 h-11 rounded-full bg-[#1e40af] p-2 shadow-lg shadow-blue-400/20 flex items-center justify-center border border-white hover:scale-110 transition-transform text-white"
              title="Audit Trails & Version Control"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>

            {/* 7. Class Schedules & Terms */}
            <div
              className="absolute bottom-20 left-36 w-9 h-9 rounded-full bg-indigo-600 p-1.5 shadow-lg shadow-blue-400/20 flex items-center justify-center border border-white hover:scale-110 transition-transform text-white"
              title="Academic Calendars & Terms"
            >
              <BookOpen className="w-4 h-4 text-white" />
            </div>

            {/* 8. Institutional Multi-Tenant Partitioning */}
            <div
              className="absolute top-24 left-14 w-10 h-10 rounded-full bg-white p-2 shadow-lg shadow-blue-400/20 flex items-center justify-center border border-white hover:scale-110 transition-transform"
              title="Multi-Tenant Domain Partitioning"
            >
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Bottom Platform Text */}
        <div className="relative z-10 text-center text-xs text-stone-600 font-medium">
          Multi-tenant isolation with PostgreSQL Row-Level Security, automated grading workflows, and PDF dossiers.
        </div>
      </div>

    </div>
  );
};
