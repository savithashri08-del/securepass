import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  AlertTriangle,
  Plus,
  RefreshCw,
  Clock,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api';
import { SecurityAnalysis, SecurityEvent, VaultItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common/Button';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState<SecurityAnalysis | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [analysisRes, eventsRes, vaultRes] = await Promise.all([
        api.getVaultAnalysis(),
        api.getSecurityEvents(),
        api.getVaultItems(),
      ]);

      if (analysisRes.success) setAnalysis(analysisRes.analysis);
      if (eventsRes.success) setEvents(eventsRes.events.slice(0, 5));
      if (vaultRes.success) setItems(vaultRes.items);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500';
    if (score >= 60) return 'text-amber-400 border-amber-500';
    return 'text-rose-400 border-rose-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40';
    if (score >= 60) return 'bg-amber-950/40 text-amber-300 border-amber-800/40';
    return 'bg-rose-950/40 text-rose-300 border-rose-800/40';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Security Operations Center
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800/40 text-emerald-400">
              Vault Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Authenticated as <span className="text-slate-200 font-mono">{user?.email}</span> &bull; All credentials
            encrypted with AES-256-GCM.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            isLoading={isLoading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Sync
          </Button>
          <Link to="/vault?action=new">
            <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
              Add Credential
            </Button>
          </Link>
        </div>
      </div>

      {/* Security Health Score & Key Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Overall Security Score Card */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Overall Vault Health</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${getScoreBg(
                analysis?.securityScore || 0
              )} font-semibold`}
            >
              {(analysis?.securityScore || 0) >= 80
                ? 'Optimal'
                : (analysis?.securityScore || 0) >= 60
                ? 'Moderate'
                : 'At Risk'}
            </span>
          </div>

          <div className="my-6 flex items-center gap-6">
            {/* Circular representation */}
            <div
              className={`w-24 h-24 rounded-full border-4 flex items-center justify-center flex-col shadow-inner ${getScoreColor(
                analysis?.securityScore || 0
              )}`}
            >
              <span className="text-3xl font-black tracking-tight">{analysis?.securityScore ?? '--'}</span>
              <span className="text-[10px] uppercase font-mono text-slate-400">/ 100</span>
            </div>

            <div className="space-y-1 text-xs text-slate-300">
              <p className="font-medium text-white">Hygiene Analysis</p>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Calculated across password entropy, uniqueness, age, and multi-factor authentication enforcement.
              </p>
            </div>
          </div>

          <Link
            to="/vault"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
          >
            Inspect vault credentials <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 4 Stat Cards */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs">Total Items</span>
              <Lock className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white">{analysis?.totalCredentials ?? 0}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Encrypted records</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-400 mb-2">
              <span className="text-xs text-slate-400">Strong</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="text-2xl font-bold text-emerald-400">{analysis?.strongCount ?? 0}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">High entropy</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-400 mb-2">
              <span className="text-xs text-slate-400">Weak</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <span className="text-2xl font-bold text-rose-400">{analysis?.weakCount ?? 0}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Action required</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-400 mb-2">
              <span className="text-xs text-slate-400">Reused</span>
              <KeyRound className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <span className="text-2xl font-bold text-amber-400">{analysis?.reusedCount ?? 0}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Credential collisions</p>
            </div>
          </div>

          {/* MFA Status Strip */}
          <div className="col-span-2 sm:col-span-4 bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  user?.mfaEnabled ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                }`}
              >
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Multi-Factor Authentication (TOTP):{' '}
                  <span className={user?.mfaEnabled ? 'text-emerald-400' : 'text-amber-400'}>
                    {user?.mfaEnabled ? 'Enabled & Enforced' : 'Not Configured'}
                  </span>
                </p>
                <p className="text-xs text-slate-400">
                  {user?.mfaEnabled
                    ? 'Account is shielded by RFC 6238 time-based one-time authentication.'
                    : 'Activate 2FA now to prevent unauthorized account access.'}
                </p>
              </div>
            </div>

            {!user?.mfaEnabled && (
              <Link to="/settings">
                <Button variant="primary" size="sm">
                  Enable MFA
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Security Recommendations & Action Center */}
      {analysis?.recommendations && analysis.recommendations.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Security Recommendations
            </h2>
            <span className="text-xs text-slate-400">
              {analysis.recommendations.length} recommendations available
            </span>
          </div>

          <div className="space-y-3">
            {analysis.recommendations.map((rec) => (
              <div
                key={rec.id}
                className="flex items-center justify-between p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <div>
                    <p className="text-xs font-medium text-slate-200">{rec.message}</p>
                    {rec.serviceName && (
                      <p className="text-[11px] text-slate-400 font-mono">Service: {rec.serviceName}</p>
                    )}
                  </div>
                </div>
                <Link to={rec.type === 'mfa' ? '/settings' : '/vault'}>
                  <Button variant="outline" size="sm">
                    Improve Security
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Security Activity Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Recent Security Audit Trail</h2>
          </div>
          <Link to="/settings#events" className="text-xs text-slate-400 hover:text-white">
            View full log
          </Link>
        </div>

        {events.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No security events logged yet.</p>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between py-2.5 border-b border-slate-800/60 last:border-0 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <div>
                    <span className="font-mono text-slate-200 font-semibold uppercase tracking-wider">
                      {ev.eventType}
                    </span>
                    <span className="text-slate-500 ml-2 font-mono">IP: {ev.ipAddress || 'internal'}</span>
                  </div>
                </div>
                <span className="text-slate-400 text-[11px] font-mono">
                  {new Date(ev.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
