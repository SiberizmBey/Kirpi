/**
 * Kirpi Task & Team Hub - Create Task Modal
 * Strict Isolation: Only allows selecting teams the user manages/belongs to,
 * and restricts assignees solely to members in that selected team.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Calendar, User, Layers, Shield } from 'lucide-react';
import { AppUser, Team, TaskPriority } from '../types';
import { firebaseService } from '../services/firebaseService';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  users: AppUser[];
  teams: Team[];
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  teams,
}) => {
  // Only teams where currentUser is MANAGER or CREATOR
  const myTeams = currentUser
    ? teams.filter(
        (t) =>
          t.managerIds?.includes(currentUser.id) ||
          t.createdBy === currentUser.id
      )
    : [];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().substring(0, 10)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set initial teamId when modal opens
  useEffect(() => {
    if (isOpen && myTeams.length > 0) {
      if (!teamId || !myTeams.some((t) => t.id === teamId)) {
        setTeamId(myTeams[0].id);
      }
    }
  }, [isOpen, myTeams, teamId]);

  // Determine selectable users based on selected team
  const selectedTeam = myTeams.find((t) => t.id === teamId) || myTeams[0];
  
  const eligibleUsers = selectedTeam
    ? users.filter(
        (u) =>
          selectedTeam.memberIds.includes(u.id) ||
          selectedTeam.managerIds.includes(u.id) ||
          selectedTeam.createdBy === u.id
      )
    : currentUser
    ? [currentUser]
    : [];

  // Update default assignedTo when eligibleUsers change
  useEffect(() => {
    if (eligibleUsers.length > 0) {
      if (!assignedTo || !eligibleUsers.some((u) => u.id === assignedTo)) {
        setAssignedTo(eligibleUsers[0].id);
      }
    }
  }, [eligibleUsers, teamId, assignedTo]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !currentUser) return;

    try {
      setIsSubmitting(true);
      const assignee = users.find((u) => u.id === assignedTo) || currentUser;

      await firebaseService.createTask({
        teamId: selectedTeam?.id || undefined,
        title: title.trim(),
        description: description.trim() || 'Açıklama belirtilmedi.',
        assignedTo: assignee.id,
        assignedToName: assignee.name,
        assignedBy: currentUser.id,
        assignedByName: currentUser.name,
        priority,
        status: 'TODO',
        dueDate,
      });

      onClose();
      setTitle('');
      setDescription('');
    } catch (err) {
      console.error('Create task error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-[var(--modal-backdrop)] backdrop-blur-md font-sans overflow-y-auto">
      <div className="my-auto relative w-full max-w-lg rounded-2xl bg-[var(--bg-modal)] border border-[var(--border-card)] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[var(--bg-modal)] z-20 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Yeni Görev Dağıtımı</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Ekip üyenize yeni bir sorumluluk atayın.
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[var(--text-secondary)] font-medium mb-1">GÖREV BAŞLIĞI *</label>
            <input
              type="text"
              required
              placeholder="Örn: Mobil responsive testleri ve onay süreci"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-purple-500 outline-none text-xs"
            />
          </div>

          <div>
            <label className="block text-[var(--text-secondary)] font-medium mb-1">GÖREV DETAYLARI & AÇIKLAMA</label>
            <textarea
              rows={3}
              placeholder="Görevin kapsamı, beklentiler ve dikkat edilecek noktalar..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-purple-500 outline-none text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myTeams.length > 0 && (
              <div>
                <label className="block text-[var(--text-secondary)] font-medium mb-1">İLİŞKİLİ EKİP</label>
                <select
                  value={teamId || selectedTeam?.id || ''}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] outline-none focus:border-purple-500 text-xs"
                >
                  {myTeams.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[var(--bg-modal)] text-[var(--text-primary)]">
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[var(--text-secondary)] font-medium mb-1">ATANACAK EKİP ÜYESİ</label>
              <select
                value={assignedTo || (eligibleUsers[0]?.id ?? '')}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] outline-none focus:border-purple-500 text-xs"
              >
                {eligibleUsers.map((u) => (
                  <option key={u.id} value={u.id} className="bg-[var(--bg-modal)] text-[var(--text-primary)]">
                    {u.name} ({u.title})
                  </option>
                ))}
                {eligibleUsers.length === 0 && (
                  <option value={currentUser?.id} className="bg-[var(--bg-modal)] text-[var(--text-primary)]">{currentUser?.name} (Kendim)</option>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] font-medium mb-1">ÖNCELİK SEVİYESİ</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full p-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] outline-none focus:border-purple-500 text-xs"
              >
                <option value="LOW" className="bg-[var(--bg-modal)] text-[var(--text-primary)]">Düşük</option>
                <option value="MEDIUM" className="bg-[var(--bg-modal)] text-[var(--text-primary)]">Normal</option>
                <option value="HIGH" className="bg-[var(--bg-modal)] text-[var(--text-primary)]">Yüksek</option>
                <option value="URGENT" className="bg-[var(--bg-modal)] text-[var(--text-primary)]">Kritik / Acil</option>
              </select>
            </div>

            <div>
              <label className="block text-[var(--text-secondary)] font-medium mb-1">SON TESLİM TARİHİ</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] outline-none focus:border-purple-500 text-xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md bg-[var(--bg-inner)] border border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isSubmitting ? 'Atanıyor...' : 'Görevi Ata'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
