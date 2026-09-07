import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserCircle, ShieldCheck, Mail, Calendar, KeyRound, Smartphone, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-left">
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2">
          <UserCircle className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Account Profile</h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Identity details and cryptographic protection status for this account.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
          <div className="w-14 h-14 rounded-full bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xl">
            {user?.fullName?.slice(0, 1) || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{user?.fullName || 'SecurePass User'}</h2>
            <p className="text-xs text-slate-400 font-mono">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 block mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" /> Primary Email
            </span>
            <span className="font-mono text-slate-200 font-medium">{user?.email}</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 block mb-1 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-slate-500" /> Multi-Factor Authentication
            </span>
            <span
              className={`font-semibold ${user?.mfaEnabled ? 'text-emerald-400' : 'text-amber-400'}`}
            >
              {user?.mfaEnabled ? 'Enabled & Enforced (TOTP)' : 'Disabled'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 block mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" /> Storage Cryptography
            </span>
            <span className="font-mono text-emerald-400 font-medium">AES-256-GCM + Bcrypt (12)</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 block mb-1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-500" /> Emergency Recovery
            </span>
            <span className="text-slate-200 font-medium">SHA-256 Single-Use Hashes</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
          <Link to="/settings">
            <Button variant="primary" size="sm" icon={<ShieldCheck className="w-4 h-4" />}>
              Configure Security Settings
            </Button>
          </Link>
          <Link to="/vault">
            <Button variant="outline" size="sm">
              Open Vault
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
