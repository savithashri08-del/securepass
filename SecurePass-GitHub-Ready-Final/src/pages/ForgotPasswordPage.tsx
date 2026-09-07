import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, Lock, ShieldAlert, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { PasswordStrengthMeter } from '../components/common/PasswordStrengthMeter';
import { api } from '../services/api';
import { PasswordAnalysis } from '../types';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  // Wizard Steps: 1: Email, 2: Verify OTP/Code, 3: Set New Master Password, 4: Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form States
  const [email, setEmail] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [code, setCode] = useState('');
  const [isRecoveryCode, setIsRecoveryCode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [strength, setStrength] = useState<PasswordAnalysis | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Submit Email
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.forgotPassword(email);
      if (res.recoveryToken) {
        setRecoveryToken(res.recoveryToken);
        setMfaRequired(res.mfaRequired);
        if (res.mfaRequired) {
          setStep(2); // Requires OTP or recovery code
        } else {
          setStep(3); // MFA disabled, can proceed straight to password reset with recovery token
        }
      } else {
        // Safe message without enumeration
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate recovery.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify TOTP or Recovery Code
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await api.verifyRecovery({
        recoveryToken,
        code,
        isRecoveryCode,
      });
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Invalid code or token expired.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Set New Master Password
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (strength && strength.score < 2) {
      setError('Password is too weak. Please meet the security requirements.');
      return;
    }

    setIsLoading(true);

    try {
      await api.resetPassword({
        recoveryToken,
        newPassword,
        confirmPassword,
      });
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (val: string) => {
    setNewPassword(val);
    if (!val) {
      setStrength(null);
      return;
    }
    try {
      const res = await api.checkStrength(val);
      if (res.success) setStrength(res.analysis);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-sm text-left">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800 text-xs font-mono text-slate-400">
          <span>Account Recovery</span>
          <span className="text-emerald-400">Step {step} of 3</span>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          /* Step 1: Email */
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 mb-3">
                <Mail className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Forgot Master Password</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your account email to begin the cryptographic identity recovery protocol.
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <Input
                label="Registered Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Continue to Verification
              </Button>
            </form>
          </div>
        )}

        {step === 2 && (
          /* Step 2: Verification Challenge */
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-500/30 text-cyan-400 mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Identity Challenge</h2>
              <p className="text-xs text-slate-400 mt-1">
                {isRecoveryCode
                  ? 'Enter one of your 10 emergency one-time recovery codes'
                  : 'Enter your 6-digit TOTP code from your authenticator application'}
              </p>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <Input
                label={isRecoveryCode ? 'Recovery Code' : 'Authenticator Code'}
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={isRecoveryCode ? 'XXXX-XXXX-XXXX' : '123456'}
                required
                autoFocus
                className="font-mono text-center tracking-widest text-lg"
                leftIcon={<KeyRound className="w-4 h-4" />}
              />

              <div className="text-xs text-right">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecoveryCode(!isRecoveryCode);
                    setCode('');
                  }}
                  className="text-emerald-400 hover:text-emerald-300 underline"
                >
                  {isRecoveryCode ? 'Use 6-digit Authenticator OTP' : 'Use 10-char Emergency Recovery Code'}
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" size="md" className="w-1/3" onClick={() => setStep(1)}>
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
                  Verify Code
                </Button>
              </div>
            </form>
          </div>
        )}

        {step === 3 && (
          /* Step 3: Set New Master Password */
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-950 border border-purple-500/30 text-purple-400 mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">New Master Password</h2>
              <p className="text-xs text-slate-400 mt-1">
                Create a new high-entropy master password. All existing device sessions will be revoked.
              </p>
            </div>

            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  label="New Master Password"
                  isPassword
                  value={newPassword}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Enter new master password..."
                  required
                  leftIcon={<Lock className="w-4 h-4" />}
                />
                {newPassword && (
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
                label="Confirm New Master Password"
                isPassword
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password..."
                required
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={isLoading}
                icon={<ShieldCheck className="w-4 h-4" />}
              >
                Reset Master Password
              </Button>
            </form>
          </div>
        )}

        {step === 4 && (
          /* Step 4: Success Notification */
          <div className="text-center space-y-4 py-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white">Password Reset Complete</h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
              Your master password has been successfully updated with bcrypt hashing. All other sessions have been
              terminated.
            </p>
            <div className="pt-4">
              <Link to="/login">
                <Button variant="primary" size="lg" className="w-full">
                  Sign In with New Password
                </Button>
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-slate-800 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
};
