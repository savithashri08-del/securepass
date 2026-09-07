import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Info,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Sparkles,
  Lock,
} from 'lucide-react';
import { api } from '../services/api';
import { PasswordAnalysis } from '../types';
import { Button } from '../components/common/Button';
import { PasswordStrengthMeter } from '../components/common/PasswordStrengthMeter';

export const PasswordAnalyzerPage: React.FC = () => {
  const [password, setPassword] = useState('K9#mQ2$vL8!zW5*pT');
  const [analysis, setAnalysis] = useState<PasswordAnalysis | null>(null);
  const [copied, setCopied] = useState(false);

  const analyzePassword = async (val: string) => {
    setPassword(val);
    try {
      const res = await api.checkStrength(val);
      if (res.success) {
        setAnalysis(res.analysis);
      }
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    analyzePassword(password);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const samplePresets = [
    { label: 'Weak PIN', val: '123456' },
    { label: 'Common Word', val: 'password2024' },
    { label: 'Moderate', val: 'DragonFly#99' },
    { label: 'Military-Grade', val: 'X9$mQ2!vL8#zW5*pT1?kY' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      {/* Title */}
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Cryptographic Password Strength Analyzer
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Evaluate entropy, brute-force resistance, dictionary susceptibility, and character distribution.
        </p>
      </div>

      {/* Input Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Candidate Password String
          </label>
          <div className="flex items-center gap-2">
            {samplePresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => analyzePassword(preset.val)}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            value={password}
            onChange={(e) => analyzePassword(e.target.value)}
            placeholder="Type any password to analyze..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          {password && (
            <button
              onClick={handleCopy}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
        </div>

        <PasswordStrengthMeter analysis={analysis} showCriteria={false} showSuggestions={false} />
      </div>

      {/* Deep Analytics Grid */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
            <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">Shannon Entropy</span>
            <span className="text-3xl font-extrabold text-white font-mono">{analysis.entropy}</span>
            <span className="text-xs text-slate-400 ml-1">bits</span>
            <p className="text-[11px] text-slate-500 mt-2">
              {analysis.entropy >= 60
                ? 'Excellent cryptographic randomness'
                : 'Insufficient entropy for critical services'}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
            <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">Est. Brute-Force Time</span>
            <span className="text-2xl font-bold text-emerald-400 font-mono block mt-1">
              {analysis.estimatedCrackTime}
            </span>
            <p className="text-[11px] text-slate-500 mt-2">At 10 billion SHA-256 guesses/sec</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
            <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">Security Rating</span>
            <span
              className={`text-2xl font-bold font-mono block mt-1 ${
                analysis.score >= 3 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {analysis.level}
            </span>
            <p className="text-[11px] text-slate-500 mt-2">Score {analysis.score} of 4</p>
          </div>
        </div>
      )}

      {/* Criteria Breakdown */}
      {analysis && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
            NIST &amp; OWASP Criteria Verification
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
              {analysis.criteria.length ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className={analysis.criteria.length ? 'text-slate-200' : 'text-slate-500'}>
                Minimum Length (12+ characters)
              </span>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
              {analysis.criteria.hasUpper ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className={analysis.criteria.hasUpper ? 'text-slate-200' : 'text-slate-500'}>
                Contains Uppercase Letters (A-Z)
              </span>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
              {analysis.criteria.hasLower ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className={analysis.criteria.hasLower ? 'text-slate-200' : 'text-slate-500'}>
                Contains Lowercase Letters (a-z)
              </span>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
              {analysis.criteria.hasNumber ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className={analysis.criteria.hasNumber ? 'text-slate-200' : 'text-slate-500'}>
                Contains Numbers (0-9)
              </span>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
              {analysis.criteria.hasSpecial ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className={analysis.criteria.hasSpecial ? 'text-slate-200' : 'text-slate-500'}>
                Contains Special Characters (!@#$%^&amp;*)
              </span>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
              {analysis.criteria.noRepeated && analysis.criteria.noSequential ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span
                className={
                  analysis.criteria.noRepeated && analysis.criteria.noSequential
                    ? 'text-slate-200'
                    : 'text-slate-500'
                }
              >
                No Trivial Repeating or Sequential Sequences
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions and Recommendations */}
      {analysis && analysis.suggestions.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-2xl p-6 text-xs text-amber-200">
          <h4 className="font-semibold text-amber-300 text-sm mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Hardening Recommendations
          </h4>
          <ul className="space-y-1.5 list-disc list-inside">
            {analysis.suggestions.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
