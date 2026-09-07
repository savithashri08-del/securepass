import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { PasswordStrengthMeter } from '../components/common/PasswordStrengthMeter';
import { api } from '../services/api';
import { PasswordAnalysis } from '../types';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [strength, setStrength] = useState<PasswordAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordChange = async (val: string) => {
    setPassword(val);
    if (!val) {
      setStrength(null);
      return;
    }
    try {
      const res = await api.checkStrength(val);
      if (res.success) {
        setStrength(res.analysis);
      }
    } catch {
      // ignore
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Master passwords do not match.');
      return;
    }

    if (strength && strength.score < 2) {
      setError('Master password does not meet security requirements. Please create a stronger password.');
      return;
    }

    setIsLoading(true);

    try {
      await register(fullName, email, password, confirmPassword);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-sm text-left">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Create Your Master Vault</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Your master password encrypts all stored credentials. It is never transmitted in plaintext.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ada Lovelace"
            required
            leftIcon={<User className="w-4 h-4" />}
          />

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ada@cybersecurity.org"
            required
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <div className="space-y-2">
            <Input
              label="Master Password"
              isPassword
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="Create strong master password..."
              required
              leftIcon={<Lock className="w-4 h-4" />}
            />
            {password && (
              <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
                <PasswordStrengthMeter
                  analysis={strength}
                  showCriteria={true}
                  showSuggestions={true}
                />
              </div>
            )}
          </div>

          <Input
            label="Confirm Master Password"
            isPassword
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm master password..."
            required
            leftIcon={<Lock className="w-4 h-4" />}
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Create Encrypted Account
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
