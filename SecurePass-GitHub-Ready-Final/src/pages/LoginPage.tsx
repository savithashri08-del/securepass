import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, ShieldAlert, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export const LoginPage: React.FC = () => {
  const { login, verifyMfaLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // In-place MFA Challenge State
  const [mfaChallenge, setMfaChallenge] = useState<{
    tempToken: string;
    code: string;
    isRecoveryCode: boolean;
  } | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await login(email, password);
      if (res.mfaRequired && res.tempToken) {
        setMfaChallenge({
          tempToken: res.tempToken,
          code: '',
          isRecoveryCode: false,
        });
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaChallenge) return;
    setError(null);
    setIsLoading(true);

    try {
      await verifyMfaLogin(
        mfaChallenge.tempToken,
        mfaChallenge.code,
        mfaChallenge.isRecoveryCode
      );
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'MFA verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 mb-3">
            {mfaChallenge ? <KeyRound className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {mfaChallenge ? 'Two-Factor Verification' : 'Unlock Your Vault'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mfaChallenge
              ? mfaChallenge.isRecoveryCode
                ? 'Enter an emergency one-time recovery code'
                : 'Enter the 6-digit code from your authenticator app'
              : 'Sign in with your master credentials to decrypt saved items'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2 text-left">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!mfaChallenge ? (
          /* Step 1: Email + Master Password Form */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div className="space-y-1">
              <Input
                label="Master Password"
                isPassword
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter master password..."
                required
                leftIcon={<Lock className="w-4 h-4" />}
              />
              <div className="flex justify-end pt-1">
                <Link
                  to="/forgot-password"
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                >
                  Forgot Master Password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to SecurePass
            </Button>
          </form>
        ) : (
          /* Step 2: MFA TOTP / Recovery Code Form */
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            <div>
              <Input
                label={mfaChallenge.isRecoveryCode ? 'Emergency Recovery Code' : '6-Digit Authenticator Code'}
                type="text"
                value={mfaChallenge.code}
                onChange={(e) => setMfaChallenge({ ...mfaChallenge, code: e.target.value })}
                placeholder={mfaChallenge.isRecoveryCode ? 'XXXX-XXXX-XXXX' : '123456'}
                required
                autoFocus
                className="font-mono text-center tracking-widest text-lg"
                leftIcon={<KeyRound className="w-4 h-4" />}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <button
                type="button"
                onClick={() =>
                  setMfaChallenge({
                    ...mfaChallenge,
                    isRecoveryCode: !mfaChallenge.isRecoveryCode,
                    code: '',
                  })
                }
                className="text-emerald-400 hover:text-emerald-300 underline"
              >
                {mfaChallenge.isRecoveryCode
                  ? 'Switch back to Authenticator App OTP'
                  : 'Lost phone? Use an emergency recovery code'}
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                className="w-1/3"
                onClick={() => setMfaChallenge(null)}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-2/3"
                isLoading={isLoading}
                icon={<ShieldCheck className="w-4 h-4" />}
              >
                Verify &amp; Enter
              </Button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-400">
          Don't have a SecurePass account?{' '}
          <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold underline">
            Register for free
          </Link>
        </div>
      </div>
    </div>
  );
};
