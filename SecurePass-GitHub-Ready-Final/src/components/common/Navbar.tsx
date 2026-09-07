import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, KeyRound, Lock, Menu, X, LogOut, UserCircle, Cpu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from './Button';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-400 transition-all shadow-inner">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                SecurePass
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                  AES-256
                </span>
              </span>
              <span className="text-[10px] text-slate-400 tracking-wider">Vault &amp; Recovery</span>
            </div>
          </Link>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/"
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isActive('/') ? 'text-emerald-400 bg-slate-900' : 'text-slate-300 hover:text-white hover:bg-slate-900/50'
                  }`}
                >
                  Overview
                </Link>
                <Link
                  to="/analyzer"
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isActive('/analyzer') ? 'text-emerald-400 bg-slate-900' : 'text-slate-300 hover:text-white hover:bg-slate-900/50'
                  }`}
                >
                  Password Analyzer
                </Link>
                <Link
                  to="/generator"
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isActive('/generator') ? 'text-emerald-400 bg-slate-900' : 'text-slate-300 hover:text-white hover:bg-slate-900/50'
                  }`}
                >
                  Generator
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isActive('/dashboard') ? 'text-emerald-400 bg-slate-900' : 'text-slate-300 hover:text-white hover:bg-slate-900/50'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/vault"
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isActive('/vault') ? 'text-emerald-400 bg-slate-900' : 'text-slate-300 hover:text-white hover:bg-slate-900/50'
                  }`}
                >
                  Vault
                </Link>
                <Link
                  to="/analyzer"
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isActive('/analyzer') ? 'text-emerald-400 bg-slate-900' : 'text-slate-300 hover:text-white hover:bg-slate-900/50'
                  }`}
                >
                  Analyzer
                </Link>
                <Link
                  to="/generator"
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isActive('/generator') ? 'text-emerald-400 bg-slate-900' : 'text-slate-300 hover:text-white hover:bg-slate-900/50'
                  }`}
                >
                  Generator
                </Link>
                <Link
                  to="/settings"
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isActive('/settings') ? 'text-emerald-400 bg-slate-900' : 'text-slate-300 hover:text-white hover:bg-slate-900/50'
                  }`}
                >
                  Security Settings
                </Link>
              </>
            )}
          </nav>

          {/* User Controls / Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors"
                >
                  <UserCircle className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono text-slate-200">{user.email}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout} icon={<LogOut className="w-3.5 h-3.5" />}>
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm" icon={<Lock className="w-3.5 h-3.5" />}>
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950 px-4 pt-2 pb-4 space-y-2">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900"
              >
                Dashboard
              </Link>
              <Link
                to="/vault"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900"
              >
                Password Vault
              </Link>
              <Link
                to="/analyzer"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900"
              >
                Password Analyzer
              </Link>
              <Link
                to="/generator"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900"
              >
                Password Generator
              </Link>
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900"
              >
                Security Settings
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900"
              >
                Profile ({user?.email})
              </Link>
              <div className="pt-2 border-t border-slate-800">
                <Button variant="danger" size="sm" className="w-full" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900"
              >
                Home
              </Link>
              <Link
                to="/analyzer"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900"
              >
                Password Analyzer
              </Link>
              <Link
                to="/generator"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900"
              >
                Password Generator
              </Link>
              <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    Register
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
};
