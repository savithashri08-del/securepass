import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Sliders,
  CheckSquare,
  Square,
  Zap,
} from 'lucide-react';
import { api } from '../services/api';
import { PasswordAnalysis } from '../types';
import { Button } from '../components/common/Button';
import { PasswordStrengthMeter } from '../components/common/PasswordStrengthMeter';

export const PasswordGeneratorPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [analysis, setAnalysis] = useState<PasswordAnalysis | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Configuration options
  const [length, setLength] = useState(20);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);

  const generatePassword = async () => {
    setIsGenerating(true);
    try {
      const res = await api.generatePassword({
        length,
        includeUppercase,
        includeLowercase,
        includeNumbers,
        includeSymbols,
        excludeAmbiguous,
      });

      if (res.success) {
        setPassword(res.password);
        setAnalysis(res.analysis);
      }
    } catch (err) {
      console.error('Failed to generate password:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    generatePassword();
  }, [length, includeUppercase, includeLowercase, includeNumbers, includeSymbols, excludeAmbiguous]);

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Presets
  const applyPreset = (presetName: 'maximum' | 'balanced' | 'pin') => {
    if (presetName === 'maximum') {
      setLength(32);
      setIncludeUppercase(true);
      setIncludeLowercase(true);
      setIncludeNumbers(true);
      setIncludeSymbols(true);
      setExcludeAmbiguous(false);
    } else if (presetName === 'balanced') {
      setLength(18);
      setIncludeUppercase(true);
      setIncludeLowercase(true);
      setIncludeNumbers(true);
      setIncludeSymbols(true);
      setExcludeAmbiguous(true);
    } else if (presetName === 'pin') {
      setLength(6);
      setIncludeUppercase(false);
      setIncludeLowercase(false);
      setIncludeNumbers(true);
      setIncludeSymbols(false);
      setExcludeAmbiguous(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      {/* Title */}
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Cryptographic Password Generator
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Hardware-entropy pseudorandom generation resistant to rainbow tables and brute-force attacks.
        </p>
      </div>

      {/* Generator Output Display Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Generated Secret ({length} characters)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => applyPreset('maximum')}
              className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Max Security (32c)
            </button>
            <button
              onClick={() => applyPreset('balanced')}
              className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Balanced (18c)
            </button>
            <button
              onClick={() => applyPreset('pin')}
              className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              PIN (6d)
            </button>
          </div>
        </div>

        {/* Display Container */}
        <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
          <span className="text-lg sm:text-xl font-mono text-emerald-400 break-all select-all font-semibold tracking-wide">
            {password || '••••••••••••••••••••'}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generatePassword}
              isLoading={isGenerating}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Regenerate
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleCopy}
              icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <PasswordStrengthMeter analysis={analysis} showCriteria={false} showSuggestions={false} />
      </div>

      {/* Customization Options Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Parameters &amp; Character Sets</h3>
        </div>

        {/* Length Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Password Length</span>
            <span className="font-mono text-emerald-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {length} characters
            </span>
          </div>
          <input
            type="range"
            min={8}
            max={64}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>8 chars</span>
            <span>24 chars (Recommended)</span>
            <span>64 chars</span>
          </div>
        </div>

        {/* Checkbox Sets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors text-xs text-slate-200">
            <input
              type="checkbox"
              checked={includeUppercase}
              onChange={(e) => setIncludeUppercase(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
            />
            <span>Include Uppercase Letters (A-Z)</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors text-xs text-slate-200">
            <input
              type="checkbox"
              checked={includeLowercase}
              onChange={(e) => setIncludeLowercase(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
            />
            <span>Include Lowercase Letters (a-z)</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors text-xs text-slate-200">
            <input
              type="checkbox"
              checked={includeNumbers}
              onChange={(e) => setIncludeNumbers(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
            />
            <span>Include Numbers (0-9)</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors text-xs text-slate-200">
            <input
              type="checkbox"
              checked={includeSymbols}
              onChange={(e) => setIncludeSymbols(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
            />
            <span>Include Symbols (!@#$%^&amp;*)</span>
          </label>

          <label className="sm:col-span-2 flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors text-xs text-slate-200">
            <input
              type="checkbox"
              checked={excludeAmbiguous}
              onChange={(e) => setExcludeAmbiguous(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
            />
            <div>
              <span>Exclude Ambiguous Characters</span>
              <p className="text-[11px] text-slate-400">Omit confusing characters like I, l, 1, 0, and O</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};
