import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  RefreshCw,
  Database,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Server,
  Zap,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { PasswordStrengthMeter } from '../components/common/PasswordStrengthMeter';
import { api } from '../services/api';
import { PasswordAnalysis } from '../types';

export const LandingPage: React.FC = () => {
  const [demoPassword, setDemoPassword] = useState('Tr0ub4dor&3#2026');
  const [demoAnalysis, setDemoAnalysis] = useState<PasswordAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleTestPassword = async (value: string) => {
    setDemoPassword(value);
    try {
      const res = await api.checkStrength(value);
      if (res.success) {
        setDemoAnalysis(res.analysis);
      }
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    handleTestPassword(demoPassword);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headlines & Call to Action */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-medium tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              AES-256-GCM Authenticated Encryption &bull; TOTP MFA
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Password Security,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                Guaranteed by Math.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Eliminate weak, reused credentials. SecurePass encrypts every secret with AES-256-GCM
              before writing to PostgreSQL, backed by Redis rate limiting and emergency one-time recovery codes.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link to="/register">
                <Button size="lg" variant="primary" icon={<ArrowRight className="w-4 h-4" />}>
                  Create Free Vault
                </Button>
              </Link>
              <Link to="/analyzer">
                <Button size="lg" variant="outline" icon={<Zap className="w-4 h-4" />}>
                  Try Password Analyzer
                </Button>
              </Link>
            </div>

            {/* Badges Checklist */}
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero Plaintext Storage</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>RFC 6238 TOTP MFA</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>10 Emergency Codes</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Analyzer Demo */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs font-mono text-slate-400 ml-2">Live Analyzer Engine</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  client-server verified
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 text-left">
                    Test any password candidate:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={demoPassword}
                      onChange={(e) => handleTestPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      placeholder="Type a password to test..."
                    />
                  </div>
                </div>

                <PasswordStrengthMeter
                  analysis={demoAnalysis}
                  showCriteria={true}
                  showSuggestions={true}
                />

                {demoAnalysis && (
                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-center">
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">Entropy</span>
                      <span className="text-base font-bold text-slate-100 font-mono">
                        {demoAnalysis.entropy} bits
                      </span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">Crack Time</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">
                        {demoAnalysis.estimatedCrackTime}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="mt-24 pt-12 border-t border-slate-900">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Defend Against Identity Theft &amp; Replay Attacks
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-2">
              Engineered with modern cryptographic separation between authentication, hashing, and storage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-800/50 flex items-center justify-center text-emerald-400 mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-100 mb-2">AES-256-GCM Encryption</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Passwords and sensitive notes are encrypted with unique random 96-bit IVs and verified with 128-bit
                authentication tags. Plaintexts never touch disk.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-800/50 flex items-center justify-center text-cyan-400 mb-4">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-100 mb-2">TOTP &amp; Recovery Codes</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Scan with Google Authenticator or Authy for RFC 6238 two-factor protection, paired with 10 cryptographically
                hashed emergency recovery keys.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-lg bg-purple-950 border border-purple-800/50 flex items-center justify-center text-purple-400 mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-100 mb-2">PostgreSQL &amp; Redis</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Relational schema with foreign keys and migrations, alongside Redis-powered token management and rate limiting
                against brute-force intrusion.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400 font-medium">SecurePass Cryptographic Architecture</span>
          </div>
          <p className="text-slate-400 font-mono">
            Compliant with NIST SP 800-63B &bull; OWASP Password Storage Guidelines
          </p>
        </div>
      </footer>
    </div>
  );
};
