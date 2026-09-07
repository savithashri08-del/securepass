import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-4 shadow-xl">
        <ShieldAlert className="w-8 h-8 text-amber-400" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">404 - Page Not Found</h1>
      <p className="text-sm text-slate-400 max-w-sm mb-6">
        The requested security path does not exist or has been relocated within the vault.
      </p>
      <Link to="/">
        <Button variant="primary" size="md" icon={<ArrowLeft className="w-4 h-4" />}>
          Return to Safety
        </Button>
      </Link>
    </div>
  );
};
