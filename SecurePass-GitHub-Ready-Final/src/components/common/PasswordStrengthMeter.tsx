import React from 'react';
import { PasswordAnalysis } from '../../types';
import { Check, X, ShieldAlert, ShieldCheck } from 'lucide-react';

interface PasswordStrengthMeterProps {
  analysis: PasswordAnalysis | null;
  showCriteria?: boolean;
  showSuggestions?: boolean;
  compact?: boolean;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  analysis,
  showCriteria = false,
  showSuggestions = false,
  compact = false,
}) => {
  if (!analysis) return null;

  const { score, level, criteria, suggestions } = analysis;

  const scoreColors = [
    'bg-rose-500',    // 0: Very Weak
    'bg-orange-500',  // 1: Weak
    'bg-amber-500',   // 2: Medium
    'bg-emerald-500', // 3: Strong
    'bg-teal-400',    // 4: Very Strong
  ];

  const scoreTextColors = [
    'text-rose-400',
    'text-orange-400',
    'text-amber-400',
    'text-emerald-400',
    'text-teal-400',
  ];

  return (
    <div className="w-full space-y-2 text-left">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">Password Strength:</span>
        <span className={`font-semibold ${scoreTextColors[score]} flex items-center gap-1`}>
          {score >= 3 ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
          {level}
        </span>
      </div>

      {/* 4-segment bar */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
        {[0, 1, 2, 3].map((segmentIndex) => {
          const isFilled = score > segmentIndex;
          return (
            <div
              key={segmentIndex}
              className={`h-full rounded-full transition-all duration-300 ${
                isFilled ? scoreColors[score] : 'bg-slate-800'
              }`}
            />
          );
        })}
      </div>

      {showCriteria && criteria && (
        <div className="pt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            {criteria.length ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span className={criteria.length ? 'text-slate-200' : 'text-slate-500'}>12+ Characters</span>
          </div>
          <div className="flex items-center gap-1.5">
            {criteria.hasUpper ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span className={criteria.hasUpper ? 'text-slate-200' : 'text-slate-500'}>Uppercase (A-Z)</span>
          </div>
          <div className="flex items-center gap-1.5">
            {criteria.hasLower ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span className={criteria.hasLower ? 'text-slate-200' : 'text-slate-500'}>Lowercase (a-z)</span>
          </div>
          <div className="flex items-center gap-1.5">
            {criteria.hasNumber ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span className={criteria.hasNumber ? 'text-slate-200' : 'text-slate-500'}>Numbers (0-9)</span>
          </div>
          <div className="flex items-center gap-1.5">
            {criteria.hasSpecial ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span className={criteria.hasSpecial ? 'text-slate-200' : 'text-slate-500'}>Symbols (!@#$)</span>
          </div>
          <div className="flex items-center gap-1.5">
            {criteria.noSequential && criteria.noRepeated ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span className={criteria.noSequential && criteria.noRepeated ? 'text-slate-200' : 'text-slate-500'}>
              No Easy Patterns
            </span>
          </div>
        </div>
      )}

      {showSuggestions && suggestions && suggestions.length > 0 && (
        <div className="pt-2 text-xs text-amber-300/90 space-y-1">
          {suggestions.slice(0, 2).map((s, idx) => (
            <p key={idx} className="flex items-start gap-1">
              <span className="text-amber-400 font-bold">•</span>
              <span>{s}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
