import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Globe,
  User,
  FileText,
  Lock,
} from 'lucide-react';
import { api } from '../services/api';
import { VaultItem, PasswordAnalysis } from '../types';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { PasswordStrengthMeter } from '../components/common/PasswordStrengthMeter';

export const VaultPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStrength, setFilterStrength] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'service' | 'updated' | 'strength'>('updated');

  // Copy Feedback state: itemId -> field ("username" | "password")
  const [copiedField, setCopiedField] = useState<{ id: string; field: string } | null>(null);

  // Password visibility state: Set of revealed item IDs
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);

  // Form Fields
  const [formServiceName, setFormServiceName] = useState('');
  const [formWebsiteUrl, setFormWebsiteUrl] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStrength, setFormStrength] = useState<PasswordAnalysis | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation Modal State
  const [deletingItem, setDeletingItem] = useState<VaultItem | null>(null);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await api.getVaultItems();
      if (res.success) {
        setItems(res.items);
      }
    } catch (err) {
      console.error('Failed to load vault items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Handle URL action (e.g. /vault?action=new from dashboard)
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      openAddModal();
      searchParams.delete('action');
      setSearchParams(searchParams);
    }
  }, [searchParams]);

  const handlePasswordInput = async (val: string) => {
    setFormPassword(val);
    if (!val) {
      setFormStrength(null);
      return;
    }
    try {
      const res = await api.checkStrength(val);
      if (res.success) setFormStrength(res.analysis);
    } catch {
      // ignore
    }
  };

  const handleGenerateInModal = async () => {
    try {
      const res = await api.generatePassword({ length: 20 });
      if (res.success) {
        setFormPassword(res.password);
        setFormStrength(res.analysis);
      }
    } catch {
      // ignore
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormServiceName('');
    setFormWebsiteUrl('');
    setFormUsername('');
    setFormPassword('');
    setFormNotes('');
    setFormStrength(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: VaultItem) => {
    setEditingItem(item);
    setFormServiceName(item.serviceName);
    setFormWebsiteUrl(item.websiteUrl || '');
    setFormUsername(item.username);
    setFormPassword(item.password);
    setFormNotes(item.notes || '');
    setFormError(null);
    handlePasswordInput(item.password);
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        serviceName: formServiceName,
        websiteUrl: formWebsiteUrl,
        username: formUsername,
        password: formPassword,
        notes: formNotes,
      };

      if (editingItem) {
        await api.updateVaultItem(editingItem.id, payload);
      } else {
        await api.createVaultItem(payload);
      }

      setIsModalOpen(false);
      await fetchItems();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save credential.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    setIsSubmitting(true);
    try {
      await api.deleteVaultItem(deletingItem.id);
      setDeletingItem(null);
      await fetchItems();
    } catch (err: any) {
      alert(err.message || 'Failed to delete credential.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, id: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField({ id, field });
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const toggleRevealPassword = (id: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Filtered and Sorted list
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesQuery =
          item.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.websiteUrl && item.websiteUrl.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesQuery) return false;

        if (filterStrength === 'weak') {
          return item.strengthScore < 2;
        }
        if (filterStrength === 'strong') {
          return item.strengthScore >= 3;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'service') {
          return a.serviceName.localeCompare(b.serviceName);
        }
        if (sortBy === 'strength') {
          return b.strengthScore - a.strengthScore;
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [items, searchQuery, filterStrength, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-left">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Password Vault</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {items.length} Credentials
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Zero-knowledge encrypted credential repository with real-time entropy analysis.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchItems}
            isLoading={isLoading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={openAddModal} icon={<Plus className="w-3.5 h-3.5" />}>
            Add Credential
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Input
            placeholder="Search credentials by service, username, or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={filterStrength}
            onChange={(e) => setFilterStrength(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Strengths</option>
            <option value="weak">Weak / Compromised Only</option>
            <option value="strong">Strong / High Entropy Only</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="updated">Sort by: Recently Updated</option>
            <option value="service">Sort by: Service Name (A-Z)</option>
            <option value="strength">Sort by: Strength Score</option>
          </select>
        </div>
      </div>

      {/* Vault Items List / Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800/80 text-slate-400">
            <Key className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-200">No credentials found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? 'Try changing your search terms or filter settings.'
              : 'Your vault is currently empty. Add your first encrypted credential.'}
          </p>
          {!searchQuery && (
            <div className="pt-2">
              <Button variant="primary" size="sm" onClick={openAddModal} icon={<Plus className="w-3.5 h-3.5" />}>
                Add First Credential
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isRevealed = Boolean(revealedPasswords[item.id]);
            const isWeak = item.strengthScore < 2;

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-xl p-5 flex flex-col justify-between shadow-sm transition-all"
              >
                <div>
                  {/* Top Item Row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-800/40 flex items-center justify-center text-emerald-400 shrink-0 font-bold text-xs uppercase">
                        {item.serviceName.slice(0, 2)}
                      </div>
                      <div className="truncate">
                        <h4 className="text-sm font-bold text-white truncate">{item.serviceName}</h4>
                        {item.websiteUrl && (
                          <a
                            href={
                              item.websiteUrl.startsWith('http')
                                ? item.websiteUrl
                                : `https://${item.websiteUrl}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 truncate"
                          >
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="truncate">{item.websiteUrl.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${
                        isWeak
                          ? 'bg-rose-950/60 text-rose-300 border-rose-800/40'
                          : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
                      }`}
                    >
                      {item.strengthLevel}
                    </span>
                  </div>

                  {/* Username / Email Row */}
                  <div className="bg-slate-950/70 border border-slate-800/60 rounded-lg p-2.5 mb-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 overflow-hidden pr-2">
                      <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-mono text-slate-200 truncate">{item.username}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(item.username, item.id, 'username')}
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors shrink-0"
                      title="Copy username"
                    >
                      {copiedField?.id === item.id && copiedField.field === 'username' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Password Row */}
                  <div className="bg-slate-950/70 border border-slate-800/60 rounded-lg p-2.5 mb-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 overflow-hidden pr-2">
                      <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-mono text-emerald-300 truncate">
                        {isRevealed ? item.password : '••••••••••••••••'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleRevealPassword(item.id)}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                        title={isRevealed ? 'Hide password' : 'Show password'}
                      >
                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(item.password, item.id, 'password')}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                        title="Copy password"
                      >
                        {copiedField?.id === item.id && copiedField.field === 'password' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Notes Preview if available */}
                  {item.notes && (
                    <div className="mb-3 p-2 rounded bg-slate-950/40 border border-slate-800/40 text-[11px] text-slate-400 italic truncate flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{item.notes}</span>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[10px] font-mono text-slate-500">
                    Updated {new Date(item.updatedAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
                      title="Edit credential"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingItem(item)}
                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                      title="Delete credential"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Credential Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Encrypted Credential' : 'Add New Credential'}
        description="Credentials are encrypted in transit and at rest using AES-256-GCM."
        maxWidth="lg"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSaveItem} className="space-y-4">
          <Input
            label="Service / Application Name"
            type="text"
            value={formServiceName}
            onChange={(e) => setFormServiceName(e.target.value)}
            placeholder="e.g. GitHub, AWS Console, Netflix"
            required
          />

          <Input
            label="Website URL (Optional)"
            type="text"
            value={formWebsiteUrl}
            onChange={(e) => setFormWebsiteUrl(e.target.value)}
            placeholder="https://github.com"
          />

          <Input
            label="Username / Email"
            type="text"
            value={formUsername}
            onChange={(e) => setFormUsername(e.target.value)}
            placeholder="user@example.com"
            required
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">Password</label>
              <button
                type="button"
                onClick={handleGenerateInModal}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" /> Generate Strong
              </button>
            </div>

            <Input
              isPassword
              value={formPassword}
              onChange={(e) => handlePasswordInput(e.target.value)}
              placeholder="Enter or generate password..."
              required
            />

            {formPassword && (
              <div className="pt-2 p-3 bg-slate-950 rounded-lg border border-slate-800">
                <PasswordStrengthMeter analysis={formStrength} compact={false} showCriteria={true} />
              </div>
            )}
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-medium text-slate-300">Notes (Encrypted)</label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Optional recovery hints, security questions, or backup notes..."
              className="w-full rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs p-3 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" size="md" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              {editingItem ? 'Save Changes' : 'Encrypt & Store'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        title="Permanently Delete Credential?"
        maxWidth="sm"
      >
        <p className="text-xs text-slate-300 leading-relaxed mb-6">
          Are you sure you want to permanently delete the credential for{' '}
          <strong className="text-white">{deletingItem?.serviceName}</strong>? This cryptographic payload cannot be
          recovered once purged from the database.
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setDeletingItem(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            isLoading={isSubmitting}
            onClick={handleDeleteItem}
            icon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Delete Permanently
          </Button>
        </div>
      </Modal>
    </div>
  );
};
