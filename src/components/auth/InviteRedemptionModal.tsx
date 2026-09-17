import React, { useState } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useTenantAuth } from '../../context/TenantAuthContext';

interface InviteRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteRedemptionModal: React.FC<InviteRedemptionModalProps> = ({ isOpen, onClose }) => {
  const { redeemInvite } = useTenantAuth();

  const [tokenInput, setTokenInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!tokenInput.trim()) {
      setErrorMsg('Please enter your staff invitation key or token.');
      return;
    }

    if (password && password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (password && password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const result = redeemInvite(tokenInput, password);
    if (result.success) {
      setSuccessMsg(result.message);
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-2xl sm:rounded-[2rem] w-full max-w-md p-5 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 space-y-4 sm:space-y-5 my-auto">
        <button
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center absolute right-3 top-3 sm:right-5 sm:top-5 text-stone-400 hover:text-stone-950 font-bold text-base rounded-full"
          aria-label="Close modal"
        >
          ✕
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#f6c042] flex items-center justify-center text-stone-950 font-bold shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-950">Activate Staff Account</h3>
            <p className="text-xs text-stone-500">
              Redeem temporary token issued by your School Admin.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-stone-100 border border-stone-300 text-stone-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-stone-900 text-white text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#f6c042] shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Invitation Access Token *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. INV-APEX-8842"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 font-mono text-base sm:text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-950"
            />
            <span className="text-[11px] text-stone-500 mt-1 block">
              Invited staff key for demo: <code className="text-stone-900 font-bold font-mono">INV-APEX-8842</code>
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Set Account Password *
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-base sm:text-xs text-stone-900 focus:outline-none focus:border-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-base sm:text-xs text-stone-900 focus:outline-none focus:border-stone-950"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full min-h-[44px] py-3 rounded-full bg-[#111113] hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <span>Activate Faculty Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
