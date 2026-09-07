import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Lock,
  Smartphone,
  Copy,
  Check,
  Download,
  Trash2,
  LogOut,
  RefreshCw,
  AlertTriangle,
  History,
  Monitor,
  CheckCircle2,
  XCircle,
  Sparkles,
  Clock,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { PasswordStrengthMeter } from '../components/common/PasswordStrengthMeter';
import { PasswordAnalysis, SecurityEvent, ActiveSession } from '../types';

export const SecuritySettingsPage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'mfa' | 'password' | 'sessions' | 'events' | 'danger'>('mfa');

  // MFA Setup Modal State
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaCurrentSampleToken, setMfaCurrentSampleToken] = useState<string | null>(null);
  const [mfaVerificationCode, setMfaVerificationCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [isMfaLoading, setIsMfaLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showSimulatorHelper, setShowSimulatorHelper] = useState(false);
  const [totpSecondsRemaining, setTotpSecondsRemaining] = useState(30);

  // Newly generated recovery codes modal state
  const [recoveryCodesModal, setRecoveryCodesModal] = useState<string[] | null>(null);
  const [recoveryCodesCopied, setRecoveryCodesCopied] = useState(false);
  const [hasConfirmedSavedCodes, setHasConfirmedSavedCodes] = useState(false);

  // Recovery Codes Count & Status Details
  const [recoveryCodesCount, setRecoveryCodesCount] = useState<{
    remaining: number;
    total: number;
    statusList?: Array<{ index: number; id: string; used: boolean; usedAt: string | null; createdAt: string }>;
  } | null>(null);

  // Regenerate Recovery Codes Dialog
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [regeneratePassword, setRegeneratePassword] = useState('');

  // Disable MFA Dialog
  const [isDisableMfaModalOpen, setIsDisableMfaModalOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  // MFA & Recovery Code Live Verification Tester State
  const [testCode, setTestCode] = useState('');
  const [isTestRecovery, setIsTestRecovery] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    valid: boolean;
    message: string;
    method?: string;
  } | null>(null);
  const [isTestingCode, setIsTestingCode] = useState(false);

  // Master Password Change Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwStrength, setPwStrength] = useState<PasswordAnalysis | null>(null);
  const [pwSuccessMsg, setPwSuccessMsg] = useState<string | null>(null);
  const [pwErrorMsg, setPwErrorMsg] = useState<string | null>(null);
  const [isChangingPw, setIsChangingPw] = useState(false);

  // Sessions and Audit Logs
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);

  // Account Deletion
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Countdown timer for 30s TOTP period
  useEffect(() => {
    const updateCountdown = () => {
      const epoch = Math.floor(Date.now() / 1000);
      const remaining = 30 - (epoch % 30);
      setTotpSecondsRemaining(remaining);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [codesRes, sessionsRes, eventsRes] = await Promise.all([
        api.getRecoveryCodesCount(),
        api.getActiveSessions(),
        api.getSecurityEvents(),
      ]);

      if (codesRes.success) {
        setRecoveryCodesCount({
          remaining: codesRes.activeCount ?? 0,
          total: codesRes.totalCount ?? 10,
          statusList: codesRes.statusList ?? [],
        });
      }
      if (sessionsRes.success) setSessions(sessionsRes.sessions);
      if (eventsRes.success) setEvents(eventsRes.events);
    } catch (err) {
      console.error('Failed to load security settings data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // MFA Flow
  const startMfaSetup = async () => {
    setMfaError(null);
    setIsMfaLoading(true);
    setCopiedSecret(false);
    setShowSimulatorHelper(false);
    try {
      const res = await api.setupMfa();
      if (res.success) {
        setMfaQrCode(res.qrCodeDataUrl);
        setMfaSecret(res.secret);
        setMfaCurrentSampleToken(res.currentSampleToken || null);
        setMfaVerificationCode('');
        setIsMfaModalOpen(true);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initialize MFA.');
    } finally {
      setIsMfaLoading(false);
    }
  };

  const copySecretKey = () => {
    if (!mfaSecret) return;
    navigator.clipboard.writeText(mfaSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const verifyAndActivateMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);
    setIsMfaLoading(true);

    try {
      const res = await api.verifyAndEnableMfa(mfaVerificationCode);
      if (res.success) {
        setIsMfaModalOpen(false);
        setHasConfirmedSavedCodes(false);
        await refreshUser();
        await loadData();
        if (res.recoveryCodes) {
          setRecoveryCodesModal(res.recoveryCodes);
        }
      }
    } catch (err: any) {
      setMfaError(err.message || 'Invalid verification token. Please check the 6 digits.');
    } finally {
      setIsMfaLoading(false);
    }
  };

  const handleTestMfaCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testCode.trim()) return;
    setIsTestingCode(true);
    setTestResult(null);
    try {
      const res = await api.testMfa(testCode.trim(), isTestRecovery);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        valid: false,
        message: err.message || 'Verification test failed.',
      });
    } finally {
      setIsTestingCode(false);
    }
  };

  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMfaLoading(true);
    try {
      await api.disableMfa(disablePassword);
      setIsDisableMfaModalOpen(false);
      setDisablePassword('');
      setTestResult(null);
      setTestCode('');
      await refreshUser();
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to disable MFA.');
    } finally {
      setIsMfaLoading(false);
    }
  };

  const handleRegenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.regenerateRecoveryCodes(regeneratePassword);
      if (res.success && res.recoveryCodes) {
        setIsRegenerateModalOpen(false);
        setRegeneratePassword('');
        setHasConfirmedSavedCodes(false);
        setRecoveryCodesModal(res.recoveryCodes);
        await loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate recovery codes.');
    }
  };

  // Password Change
  const handlePasswordInput = async (val: string) => {
    setNewPassword(val);
    if (!val) {
      setPwStrength(null);
      return;
    }
    try {
      const res = await api.checkStrength(val);
      if (res.success) setPwStrength(res.analysis);
    } catch {
      // ignore
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSuccessMsg(null);
    setPwErrorMsg(null);

    if (newPassword !== confirmPassword) {
      setPwErrorMsg('New passwords do not match.');
      return;
    }

    if (pwStrength && pwStrength.score < 2) {
      setPwErrorMsg('New password does not meet security requirements.');
      return;
    }

    setIsChangingPw(true);
    try {
      const res = await api.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        setPwSuccessMsg('Master password successfully changed.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPwStrength(null);
        await loadData();
      }
    } catch (err: any) {
      setPwErrorMsg(err.message || 'Failed to change master password.');
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm('Log out of all devices? You will be redirected to login.')) return;
    try {
      await api.logoutAllDevices();
      logout();
    } catch (err: any) {
      alert(err.message || 'Failed to log out all sessions.');
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    setIsDeleting(true);

    try {
      await api.deleteAccount(deletePassword);
      logout();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account.');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyAllRecoveryCodes = () => {
    if (!recoveryCodesModal) return;
    navigator.clipboard.writeText(recoveryCodesModal.join('\n'));
    setRecoveryCodesCopied(true);
    setTimeout(() => setRecoveryCodesCopied(false), 2000);
  };

  const downloadRecoveryCodes = () => {
    if (!recoveryCodesModal) return;
    const text = `SECUREPASS EMERGENCY RECOVERY CODES\nAccount: ${user?.email}\nGenerated: ${new Date().toISOString()}\n\nEach code can only be used once.\n\n${recoveryCodesModal.join(
      '\n'
    )}\n`;
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `securepass-recovery-codes-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Security &amp; Account Settings</h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage cryptographic multi-factor authentication, master credentials, active sessions, and audit logs.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('mfa')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'mfa' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Two-Factor &amp; Recovery Codes
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'password' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Master Password
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'sessions' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Active Sessions ({sessions.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'events' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Security Audit Log
        </button>
        <button
          onClick={() => setActiveTab('danger')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'danger' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-rose-400 hover:text-rose-300'
          }`}
        >
          Danger Zone
        </button>
      </div>

      {/* TAB 1: MFA & Recovery Codes */}
      {activeTab === 'mfa' && (
        <div className="space-y-6">
          {/* MFA Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    user?.mfaEnabled
                      ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400'
                      : 'bg-amber-950/80 border border-amber-500/40 text-amber-400'
                  }`}
                >
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Multi-Factor Authentication (TOTP)</h3>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
                        user?.mfaEnabled
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800/50'
                          : 'bg-amber-950 text-amber-400 border-amber-800/50'
                      }`}
                    >
                      {user?.mfaEnabled ? 'ACTIVE & ENFORCED' : 'DISABLED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                    Protects your vault with an RFC 6238 time-based one-time password generated on your smartphone (Google
                    Authenticator, Microsoft Authenticator, 1Password, Authy).
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500">
                    <span>Algorithm: <strong className="text-slate-400 font-mono">HMAC-SHA1 (RFC 6238)</strong></span>
                    <span>Time-step: <strong className="text-slate-400 font-mono">30 seconds</strong></span>
                    <span>Secret Storage: <strong className="text-slate-400 font-mono">AES-256-GCM Encrypted</strong></span>
                  </div>
                </div>
              </div>

              <div>
                {user?.mfaEnabled ? (
                  <Button variant="danger" size="sm" onClick={() => setIsDisableMfaModalOpen(true)}>
                    Disable MFA
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={startMfaSetup}
                    isLoading={isMfaLoading}
                    icon={<Smartphone className="w-3.5 h-3.5" />}
                  >
                    Set Up MFA
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Recovery Codes Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div className="space-y-3 max-w-xl">
                  <div>
                    <h3 className="text-base font-bold text-white">Emergency Recovery Codes</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Single-use cryptographic recovery codes that allow account access if you lose your phone or authenticator app.
                      Each code is hashed with SHA-256 before storage and can only be consumed once.
                    </p>
                  </div>

                  {user?.mfaEnabled ? (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-400 font-medium">Available Unused Codes:</span>
                        <span className="font-mono font-bold text-cyan-400">
                          {recoveryCodesCount?.remaining ?? 0} / {recoveryCodesCount?.total ?? 10} remaining
                        </span>
                      </div>
                      
                      {/* Visual progress bar */}
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            (recoveryCodesCount?.remaining ?? 0) <= 2
                              ? 'bg-rose-500'
                              : (recoveryCodesCount?.remaining ?? 0) <= 5
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, (((recoveryCodesCount?.remaining ?? 0) / (recoveryCodesCount?.total || 10)) * 100))
                            )}%`,
                          }}
                        />
                      </div>

                      {(recoveryCodesCount?.remaining ?? 0) <= 3 && (
                        <div className="mt-2.5 p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Low recovery codes remaining. We recommend regenerating a fresh set.</span>
                        </div>
                      )}

                      {/* Detailed slot breakdown */}
                      {recoveryCodesCount?.statusList && recoveryCodesCount.statusList.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[11px] font-semibold text-slate-400 block mb-2">Code Status Breakdown:</span>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 font-mono text-[11px]">
                            {recoveryCodesCount.statusList.map((st) => (
                              <div
                                key={st.id}
                                className={`p-1.5 rounded border flex flex-col items-center justify-center text-center transition-colors ${
                                  st.used
                                    ? 'bg-slate-950/60 border-slate-800 text-slate-500 line-through'
                                    : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
                                }`}
                                title={st.used ? `Used on ${new Date(st.usedAt || '').toLocaleDateString()}` : 'Unused & Ready'}
                              >
                                <span>Code #{st.index}</span>
                                <span className="text-[9px] uppercase tracking-wider font-sans font-medium mt-0.5">
                                  {st.used ? 'Used' : 'Ready'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400">
                      Enable Multi-Factor Authentication above to generate your emergency recovery codes.
                    </div>
                  )}
                </div>
              </div>

              {user?.mfaEnabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRegenerateModalOpen(true)}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Regenerate Codes
                </Button>
              )}
            </div>
          </div>

          {/* Live MFA & Recovery Code Tester (Playground) */}
          {user?.mfaEnabled && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-950/80 border border-violet-500/40 text-violet-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Live Verification Tester</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Test your authenticator app time sync or verify a recovery code without logging out or consuming active tokens.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsTestRecovery(false);
                    setTestCode('');
                    setTestResult(null);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    !isTestRecovery
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Test 6-Digit Authenticator Code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsTestRecovery(true);
                    setTestCode('');
                    setTestResult(null);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    isTestRecovery
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Test Emergency Recovery Code
                </button>
              </div>

              <form onSubmit={handleTestMfaCode} className="flex flex-col sm:flex-row items-center gap-3">
                <div className="w-full sm:w-80">
                  <Input
                    type="text"
                    value={testCode}
                    onChange={(e) => setTestCode(e.target.value)}
                    placeholder={isTestRecovery ? 'XXXX-XXXX-XXXX' : '123456'}
                    required
                    className="font-mono text-center tracking-widest text-sm"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isTestingCode}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Run Test Check
                </Button>
              </form>

              {testResult && (
                <div
                  className={`mt-4 p-3 rounded-xl border flex items-center gap-3 text-xs ${
                    testResult.valid
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {testResult.valid ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold block">
                      {testResult.valid ? 'Verification Check Passed' : 'Verification Check Failed'}
                    </span>
                    <span className="text-[11px] text-slate-300">{testResult.message}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Master Password Change */}
      {activeTab === 'password' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl">
          <h3 className="text-base font-bold text-white mb-2">Change Master Password</h3>
          <p className="text-xs text-slate-400 mb-6">
            Changing your master password will re-hash your credentials with bcrypt (12 rounds) and revoke all active
            tokens across other browsers.
          </p>

          {pwSuccessMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{pwSuccessMsg}</span>
            </div>
          )}

          {pwErrorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{pwErrorMsg}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Master Password"
              isPassword
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="Enter current master password..."
            />

            <div className="space-y-2">
              <Input
                label="New Master Password"
                isPassword
                value={newPassword}
                onChange={(e) => handlePasswordInput(e.target.value)}
                required
                placeholder="Enter new strong master password..."
              />
              {newPassword && (
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <PasswordStrengthMeter analysis={pwStrength} showCriteria={true} />
                </div>
              )}
            </div>

            <Input
              label="Confirm New Master Password"
              isPassword
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm new master password..."
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isChangingPw}
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              Update Master Password
            </Button>
          </form>
        </div>
      )}

      {/* TAB 3: Active Sessions */}
      {activeTab === 'sessions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Active Cryptographic Sessions</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Revoke tokens and terminate unauthorized sessions across devices.
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={handleLogoutAll} icon={<LogOut className="w-3.5 h-3.5" />}>
              Logout All Devices
            </Button>
          </div>

          <div className="divide-y divide-slate-800">
            {sessions.map((sess) => (
              <div key={sess.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <Monitor className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-mono text-slate-200">IP: {sess.ipAddress || 'Internal'}</span>
                    <p className="text-[11px] text-slate-500 font-mono truncate max-w-md">
                      {sess.userAgent || 'Web Browser'}
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono text-[11px] text-slate-400">
                  <span>Logged in {new Date(sess.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Security Audit Log */}
      {activeTab === 'events' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-base font-bold text-white mb-1">Security Audit Log</h3>
          <p className="text-xs text-slate-400 mb-6">
            Tamper-evident audit trail of authentication events, credential modifications, and recovery access.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase font-mono text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5">Timestamp</th>
                  <th className="py-2.5">Event Type</th>
                  <th className="py-2.5">IP Address</th>
                  <th className="py-2.5">Client Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-950/40">
                    <td className="py-2.5 text-slate-400">{new Date(ev.createdAt).toLocaleString()}</td>
                    <td className="py-2.5 font-bold text-emerald-400 uppercase">{ev.eventType}</td>
                    <td className="py-2.5 text-slate-300">{ev.ipAddress || 'internal'}</td>
                    <td className="py-2.5 text-slate-500 truncate max-w-xs">{ev.userAgent || 'API'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Danger Zone */}
      {activeTab === 'danger' && (
        <div className="bg-rose-950/20 border border-rose-800/40 rounded-2xl p-6 max-w-2xl">
          <div className="flex items-center gap-2 text-rose-400 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-base font-bold">Permanently Delete Account</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-6">
            Deleting your account is irreversible. All encrypted passwords, notes, recovery codes, and security logs will
            be permanently destroyed from the database.
          </p>
          <Button variant="danger" size="md" onClick={() => setIsDeleteModalOpen(true)} icon={<Trash2 className="w-4 h-4" />}>
            Delete Account &amp; Vault
          </Button>
        </div>
      )}

      {/* MODAL: MFA Setup with QR Code */}
      <Modal
        isOpen={isMfaModalOpen}
        onClose={() => setIsMfaModalOpen(false)}
        title="Set Up Multi-Factor Authentication"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Scan this QR code using your authenticator application (Google Authenticator, Microsoft Authenticator,
            1Password, Bitwarden, Authy).
          </p>

          {mfaQrCode && (
            <div className="flex justify-center p-3.5 bg-white rounded-xl max-w-[200px] mx-auto shadow-lg">
              <img src={mfaQrCode} alt="TOTP QR Code" className="w-full h-auto" />
            </div>
          )}

          {mfaSecret && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
              <div className="overflow-hidden text-left">
                <span className="text-[10px] text-slate-400 block font-mono uppercase tracking-wider">Manual Secret Key:</span>
                <span className="font-mono text-emerald-400 font-bold text-xs select-all truncate block">
                  {mfaSecret}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copySecretKey}
                icon={copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copiedSecret ? 'Copied' : 'Copy'}
              </Button>
            </div>
          )}

          {/* Quick Testing Simulator Utility */}
          <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Testing without a physical device?
              </span>
              <button
                type="button"
                onClick={() => setShowSimulatorHelper(!showSimulatorHelper)}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium"
              >
                {showSimulatorHelper ? 'Hide Simulator' : 'Show Simulator'}
              </button>
            </div>

            {showSimulatorHelper && (
              <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-left">
                <p className="text-[11px] text-slate-400">
                  This preview simulator generates the real-time TOTP token calculated from this secret key:
                </p>
                <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="font-mono text-sm font-bold text-emerald-400 tracking-widest">
                      {mfaCurrentSampleToken || 'Generating...'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      {totpSecondsRemaining}s
                    </span>
                    {mfaCurrentSampleToken && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setMfaVerificationCode(mfaCurrentSampleToken)}
                      >
                        Auto-Fill
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {mfaError && (
            <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
              {mfaError}
            </div>
          )}

          <form onSubmit={verifyAndActivateMfa} className="space-y-3 pt-1">
            <Input
              label="Enter 6-digit Code from Authenticator"
              type="text"
              value={mfaVerificationCode}
              onChange={(e) => setMfaVerificationCode(e.target.value)}
              placeholder="123456"
              required
              autoFocus
              maxLength={6}
              className="text-center font-mono text-lg tracking-widest"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsMfaModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isMfaLoading}>
                Activate MFA
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* MODAL: Newly Generated Recovery Codes */}
      <Modal
        isOpen={Boolean(recoveryCodesModal)}
        onClose={() => {
          if (hasConfirmedSavedCodes || recoveryCodesCopied) {
            setRecoveryCodesModal(null);
          }
        }}
        title="Save Your Emergency Recovery Codes"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs text-left">
          <div className="text-amber-300 bg-amber-950/50 p-3 rounded-xl border border-amber-500/40 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-semibold">Crucial Security Step: Save these codes now</strong>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                These 10 codes are shown <strong>only once</strong>. If you ever lose access to your phone or authenticator
                app, each code can be used exactly once to bypass TOTP and regain account access.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-center text-xs">
            {recoveryCodesModal?.map((code, idx) => (
              <div
                key={idx}
                className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between px-3"
              >
                <span className="text-slate-500 text-[10px] font-semibold">{String(idx + 1).padStart(2, '0')}.</span>
                <span className="text-emerald-400 font-bold select-all tracking-wider">{code}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyAllRecoveryCodes}
                icon={recoveryCodesCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {recoveryCodesCopied ? 'Copied All' : 'Copy All'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadRecoveryCodes}
                icon={<Download className="w-3.5 h-3.5" />}
              >
                Download (.txt)
              </Button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={hasConfirmedSavedCodes}
                onChange={(e) => setHasConfirmedSavedCodes(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 w-4 h-4"
              />
              <span>I have stored these safely</span>
            </label>
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-end">
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!hasConfirmedSavedCodes && !recoveryCodesCopied}
              onClick={() => setRecoveryCodesModal(null)}
            >
              Finish &amp; Return to Settings
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Disable MFA Confirm */}
      <Modal
        isOpen={isDisableMfaModalOpen}
        onClose={() => setIsDisableMfaModalOpen(false)}
        title="Confirm MFA Deactivation"
        maxWidth="sm"
      >
        <form onSubmit={handleDisableMfa} className="space-y-4">
          <p className="text-xs text-slate-300">
            Enter your master password to disable Multi-Factor Authentication.
          </p>
          <Input
            label="Master Password"
            isPassword
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDisableMfaModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="sm" isLoading={isMfaLoading}>
              Disable MFA
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Regenerate Recovery Codes Confirm */}
      <Modal
        isOpen={isRegenerateModalOpen}
        onClose={() => setIsRegenerateModalOpen(false)}
        title="Regenerate Recovery Codes"
        maxWidth="sm"
      >
        <form onSubmit={handleRegenerateCodes} className="space-y-4">
          <p className="text-xs text-slate-300">
            Enter your master password to invalidate all existing recovery codes and generate 10 new emergency codes.
          </p>
          <Input
            label="Master Password"
            isPassword
            value={regeneratePassword}
            onChange={(e) => setRegeneratePassword(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsRegenerateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Regenerate 10 Codes
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Account Deletion */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Account Purge"
        maxWidth="sm"
      >
        <form onSubmit={handleDeleteAccount} className="space-y-4">
          <p className="text-xs text-rose-300">
            Enter your master password to confirm permanent deletion of your account and all encrypted vault records.
          </p>
          {deleteError && (
            <div className="p-2.5 rounded bg-rose-950 border border-rose-500/40 text-rose-300 text-xs">
              {deleteError}
            </div>
          )}
          <Input
            label="Master Password"
            isPassword
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="sm" isLoading={isDeleting}>
              Permanently Purge
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
