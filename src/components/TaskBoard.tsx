/**
 * Kirpi Task & Team Hub - Task Board Component
 * Features:
 * 1. Strict Assignee Completion: Only the assigned user (not managers) can complete and submit proofs
 * 2. Time Extension Requests: Assignees can request due date extensions with reason notes
 * 3. Extension Approval/Rejection: Managers can review and approve/reject extension requests with 1-click
 * 4. Task Cancellation: Managers can cancel tasks with reasons
 * 5. Kanban & List views with rich filters and compression-backed screenshots
 * 6. Fully Theme-Adaptive (Dark, Light, Amoled)
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  MessageSquare,
  Search,
  LayoutGrid,
  List,
  X,
  User,
  Trash2,
  Check,
  LogIn,
  Hourglass,
  XCircle,
  Ban,
  CalendarPlus,
  ShieldCheck,
} from 'lucide-react';
import { Task, Team, AppUser, TaskStatus, TaskPriority } from '../types';
import { firebaseService } from '../services/firebaseService';
import { compressImage } from '../utils/imageCompressor';

interface TaskBoardProps {
  tasks: Task[];
  teams: Team[];
  users: AppUser[];
  currentUser: AppUser | null;
  onOpenCreateTask: () => void;
  onOpenAuth: () => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  teams,
  users,
  currentUser,
  onOpenCreateTask,
  onOpenAuth,
}) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [extendingTask, setExtendingTask] = useState<Task | null>(null);
  const [cancellingTask, setCancellingTask] = useState<Task | null>(null);

  // Form states
  const [completionNotes, setCompletionNotes] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<{ name: string; url: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extension request states
  const [extensionDate, setExtensionDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');

  // Cancellation states
  const [cancelReason, setCancelReason] = useState('');

  // Comment state
  const [newComment, setNewComment] = useState('');

  // View & Filters
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusTab, setStatusTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Filter teams to ONLY those the current user belongs to
  const myTeams = currentUser
    ? teams.filter(
        (t) =>
          t.managerIds?.includes(currentUser.id) ||
          t.memberIds?.includes(currentUser.id) ||
          currentUser.teamIds?.includes(t.id)
      )
    : [];

  const myTeamIds = myTeams.map((t) => t.id);

  const isManagerInAnyTeam = currentUser
    ? myTeams.some(
        (t) => t.managerIds?.includes(currentUser.id) || t.createdBy === currentUser.id
      )
    : false;

  const visibleTasks = currentUser && myTeamIds.length > 0
    ? tasks.filter((task) => {
        if (task.teamId) {
          return myTeamIds.includes(task.teamId);
        }
        return task.assignedTo === currentUser.id || task.assignedBy === currentUser.id;
      })
    : [];

  const filteredTasks = visibleTasks.filter((task) => {
    if (statusTab === 'ACTIVE' && (task.status === 'COMPLETED' || task.status === 'CANCELLED')) return false;
    if (statusTab === 'COMPLETED' && task.status !== 'COMPLETED') return false;
    if (statusTab === 'CANCELLED' && task.status !== 'CANCELLED') return false;

    if (teamFilter !== 'ALL' && task.teamId !== teamFilter) return false;
    if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description.toLowerCase().includes(q);
      const matchAssignee = task.assignedToName?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchAssignee;
    }
    return true;
  });

  // Handle image upload with auto compression
  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
        cropToSquare: false,
      });

      setScreenshotPreview({
        name: file.name,
        url: compressedDataUrl,
      });
    } catch (err: any) {
      alert(err.message || 'Ekran görüntüsü yüklenirken bir sorun oluştu.');
    }
  };

  // Submit completion (assignee only)
  const handleSubmitCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTask || !currentUser) return;

    if (currentUser.id !== completingTask.assignedTo) {
      alert('Yalnızca görevin atandığı kişi görevi bitirebilir.');
      return;
    }

    try {
      setIsSubmitting(true);
      await firebaseService.completeTask(completingTask.id, {
        completionNotes: completionNotes.trim(),
        screenshot: screenshotPreview ? screenshotPreview : undefined,
        completedByName: currentUser.name,
        completedById: currentUser.id,
      });

      setCompletingTask(null);
      setCompletionNotes('');
      setScreenshotPreview(null);
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Görev tamamlanırken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit extension request
  const handleSubmitExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendingTask || !currentUser) return;
    if (!extensionDate || !extensionReason.trim()) {
      alert('Lütfen talep edilen yeni tarihi ve gerekçenizi belirtin.');
      return;
    }

    try {
      setIsSubmitting(true);
      await firebaseService.requestTaskExtension(extendingTask.id, {
        requestedDate: extensionDate,
        reason: extensionReason.trim(),
        requestedById: currentUser.id,
        requestedByName: currentUser.name,
      });

      setExtendingTask(null);
      setExtensionDate('');
      setExtensionReason('');
      alert('Ek süre talebiniz yöneticinize iletildi.');
    } catch (error) {
      console.error('Error requesting extension:', error);
      alert('Ek süre talep edilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit task cancellation
  const handleSubmitCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingTask || !currentUser) return;

    try {
      setIsSubmitting(true);
      await firebaseService.cancelTask(
        cancellingTask.id,
        currentUser.id,
        currentUser.name,
        cancelReason.trim() || 'Yönetici tarafından iptal edildi.'
      );

      setCancellingTask(null);
      setCancelReason('');
    } catch (error) {
      console.error('Error cancelling task:', error);
      alert('Görev iptal edilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manager reviews extension
  const handleReviewExtension = async (taskId: string, approved: boolean) => {
    if (!currentUser) return;
    try {
      await firebaseService.reviewTaskExtension(taskId, approved, currentUser.id, currentUser.name);
    } catch (error) {
      console.error('Error reviewing extension:', error);
      alert('İşlem gerçekleştirilemedi.');
    }
  };

  // Add comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newComment.trim() || !currentUser) return;

    try {
      await firebaseService.addTaskComment(selectedTask.id, {
        userId: currentUser.id,
        userName: currentUser.name,
        text: newComment.trim(),
      });
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-500 border border-red-500/30 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Acil
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-500 border border-amber-500/30">
            Yüksek
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-500 border border-blue-500/30">
            Orta
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-input)]">
            Düşük
          </span>
        );
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Tamamlandı
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/15 text-red-500 border border-red-500/30 flex items-center gap-1">
            <Ban className="w-3 h-3" /> İptal Edildi
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Devam Ediyor
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-500 border border-blue-500/30">
            İncelemede
          </span>
        );
      case 'TODO':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-input)]">
            Yapılacak
          </span>
        );
    }
  };

  const myPendingTasksCount = currentUser
    ? tasks.filter(
        (t) => t.assignedTo === currentUser.id && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
      ).length
    : 0;

  const currentSelectedTask = selectedTask
    ? tasks.find((t) => t.id === selectedTask.id) || selectedTask
    : null;

  if (!currentUser) {
    return (
      <div className="p-12 text-center rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] max-w-md mx-auto space-y-4 my-8 font-sans animate-fade-in shadow-lg">
        <LogIn className="w-10 h-10 text-[var(--text-muted)] mx-auto" />
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Giriş Yapılması Gerekiyor</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Ekip görev panosuna erişebilmek için lütfen oturum açın.
          </p>
        </div>
        <button
          onClick={onOpenAuth}
          className="px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold text-xs hover:bg-purple-500 transition-all cursor-pointer shadow-sm"
        >
          Giriş Yap
        </button>
      </div>
    );
  }

  if (myTeams.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] max-w-lg mx-auto space-y-4 my-8 font-sans animate-fade-in shadow-lg">
        <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
          <Calendar className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Henüz Bir Ekipte Değilsiniz</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
            Görev dağıtımı ekipler üzerinden yönetilmektedir. Görevleri görüntülemek veya ekip üyelerinize görev atamak için bir ekip oluşturun veya bir ekibe katılın.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="kirpi-task-board" className="space-y-6 animate-fade-in font-sans">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-xs transition-colors">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <span>Ekip Görev Dağıtımı</span>
            {myPendingTasksCount > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 font-medium">
                {myPendingTasksCount} bekleyen göreviniz var
              </span>
            )}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Yöneticiler görevleri atar ve yönetir; yalnızca görevin atandığı kişi görevi bitirebilir veya ek süre talep edebilir.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isManagerInAnyTeam ? (
            <button
              onClick={onOpenCreateTask}
              className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Yeni Görev Ata</span>
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-secondary)] text-xs font-medium">
              Ekip Üyesi (Görev Atama Yetkisi Yok)
            </span>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border-card)]">
        {/* Left Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              statusTab === 'ALL'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-card)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            Tüm Görevler ({visibleTasks.length})
          </button>
          <button
            onClick={() => setStatusTab('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              statusTab === 'ACTIVE'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-card)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            Aktif (
            {visibleTasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length}
            )
          </button>
          <button
            onClick={() => setStatusTab('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              statusTab === 'COMPLETED'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-card)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            Tamamlananlar ({visibleTasks.filter((t) => t.status === 'COMPLETED').length})
          </button>
          <button
            onClick={() => setStatusTab('CANCELLED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              statusTab === 'CANCELLED'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-card)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            İptal Edilenler ({visibleTasks.filter((t) => t.status === 'CANCELLED').length})
          </button>
        </div>

        {/* Right Search & Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Görev ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-purple-500 outline-none"
            />
          </div>

          {myTeams.length > 0 && (
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] focus:border-purple-500 outline-none max-w-[130px] truncate"
            >
              <option value="ALL">Tüm Ekiplerim</option>
              {myTeams.map((tm) => (
                <option key={tm.id} value={tm.id}>
                  {tm.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] focus:border-purple-500 outline-none"
          >
            <option value="ALL">Öncelik: Tümü</option>
            <option value="URGENT">Acil</option>
            <option value="HIGH">Yüksek</option>
            <option value="MEDIUM">Orta</option>
            <option value="LOW">Düşük</option>
          </select>

          <div className="hidden sm:flex items-center bg-[var(--bg-input)] border border-[var(--border-input)] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs cursor-pointer ${
                viewMode === 'kanban' ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Kanban Görünümü"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs cursor-pointer ${
                viewMode === 'list' ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Liste Görünümü"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Task Display: Kanban vs List */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Column 1: Yapılacak */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-card)] text-xs font-semibold text-[var(--text-primary)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-400" />
                YAPILACAK
              </span>
              <span className="text-[var(--text-muted)] font-mono-code">
                {filteredTasks.filter((t) => t.status === 'TODO').length}
              </span>
            </div>

            <div className="space-y-3 min-h-[200px]">
              {filteredTasks
                .filter((t) => t.status === 'TODO')
                .map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    teams={teams}
                    users={users}
                    currentUser={currentUser}
                    onOpenDetail={() => setSelectedTask(task)}
                    onOpenComplete={() => setCompletingTask(task)}
                    onOpenExtend={() => {
                      setExtendingTask(task);
                      setExtensionDate(task.dueDate);
                    }}
                    onOpenCancel={() => setCancellingTask(task)}
                    onReviewExtension={handleReviewExtension}
                  />
                ))}
              {filteredTasks.filter((t) => t.status === 'TODO').length === 0 && (
                <div className="p-6 rounded-xl border border-dashed border-[var(--border-card)] text-center text-xs text-[var(--text-muted)] bg-[var(--bg-card)]/30">
                  Bu kolonda görev yok
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Devam Ediyor / İncelemede */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-card)] text-xs font-semibold text-amber-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                SÜRÜYOR / İNCELEMEDE
              </span>
              <span className="text-[var(--text-muted)] font-mono-code">
                {
                  filteredTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW')
                    .length
                }
              </span>
            </div>

            <div className="space-y-3 min-h-[200px]">
              {filteredTasks
                .filter((t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW')
                .map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    teams={teams}
                    users={users}
                    currentUser={currentUser}
                    onOpenDetail={() => setSelectedTask(task)}
                    onOpenComplete={() => setCompletingTask(task)}
                    onOpenExtend={() => {
                      setExtendingTask(task);
                      setExtensionDate(task.dueDate);
                    }}
                    onOpenCancel={() => setCancellingTask(task)}
                    onReviewExtension={handleReviewExtension}
                  />
                ))}
              {filteredTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW')
                .length === 0 && (
                <div className="p-6 rounded-xl border border-dashed border-[var(--border-card)] text-center text-xs text-[var(--text-muted)] bg-[var(--bg-card)]/30">
                  Bu kolonda görev yok
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Tamamlandı & İptal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-card)] text-xs font-semibold text-emerald-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                TAMAMLANDI & İPTAL
              </span>
              <span className="text-[var(--text-muted)] font-mono-code">
                {
                  filteredTasks.filter((t) => t.status === 'COMPLETED' || t.status === 'CANCELLED')
                    .length
                }
              </span>
            </div>

            <div className="space-y-3 min-h-[200px]">
              {filteredTasks
                .filter((t) => t.status === 'COMPLETED' || t.status === 'CANCELLED')
                .map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    teams={teams}
                    users={users}
                    currentUser={currentUser}
                    onOpenDetail={() => setSelectedTask(task)}
                    onOpenComplete={() => setCompletingTask(task)}
                    onOpenExtend={() => {
                      setExtendingTask(task);
                      setExtensionDate(task.dueDate);
                    }}
                    onOpenCancel={() => setCancellingTask(task)}
                    onReviewExtension={handleReviewExtension}
                  />
                ))}
              {filteredTasks.filter(
                (t) => t.status === 'COMPLETED' || t.status === 'CANCELLED'
              ).length === 0 && (
                <div className="p-6 rounded-xl border border-dashed border-[var(--border-card)] text-center text-xs text-[var(--text-muted)] bg-[var(--bg-card)]/30">
                  Kapanmış görev yok
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border-subtle)] shadow-xs">
          {filteredTasks.map((task) => {
            const taskTeam = teams.find((tm) => tm.id === task.teamId);
            const isAssignee = currentUser?.id === task.assignedTo;
            const isManagerOrCreator =
              currentUser?.role === 'MANAGER' ||
              currentUser?.id === task.assignedBy ||
              (taskTeam && taskTeam.managerIds?.includes(currentUser?.id || ''));

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="p-4 hover:bg-[var(--bg-card-hover)] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5">{getStatusBadge(task.status)}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-medium text-[var(--text-primary)] hover:text-purple-500 transition-colors truncate">
                        {task.title}
                      </h4>
                      {taskTeam && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-secondary)] font-medium">
                          {taskTeam.name}
                        </span>
                      )}
                      {task.extensionRequest?.status === 'PENDING' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1 font-medium">
                          <Hourglass className="w-3 h-3" /> Ek Süre İstendi ({task.extensionRequest.requestedDate})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-1 mt-0.5">{task.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] flex-shrink-0 flex-wrap sm:flex-nowrap">
                  {getPriorityBadge(task.priority)}

                  <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
                    <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span>{task.assignedToName}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[var(--text-muted)] font-mono-code text-[11px]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{task.dueDate}</span>
                  </div>

                  {task.screenshots && task.screenshots.length > 0 && (
                    <span className="flex items-center gap-1 text-emerald-500 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[10px] font-medium">
                      <ImageIcon className="w-3 h-3" />
                      {task.screenshots.length}
                    </span>
                  )}

                  {/* Actions */}
                  {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {/* ONLY assignee can complete */}
                      {isAssignee && (
                        <button
                          onClick={() => setCompletingTask(task)}
                          className="px-3 py-1 rounded-lg bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 transition-all cursor-pointer shadow-sm"
                        >
                          Bitirdim
                        </button>
                      )}

                      {/* Assignee can request extension */}
                      {isAssignee && (
                        <button
                          onClick={() => {
                            setExtendingTask(task);
                            setExtensionDate(task.dueDate);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-amber-500 border border-[var(--border-input)] text-xs font-medium transition-all cursor-pointer"
                          title="Ek Süre Talep Et"
                        >
                          <CalendarPlus className="w-3.5 h-3.5 inline mr-1" />
                          Süre İste
                        </button>
                      )}

                      {/* Managers can review pending extension */}
                      {isManagerOrCreator && task.extensionRequest?.status === 'PENDING' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleReviewExtension(task.id, true)}
                            className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition-all shadow-xs"
                            title="Süreyi Onayla"
                          >
                            ✓ Onayla
                          </button>
                          <button
                            onClick={() => handleReviewExtension(task.id, false)}
                            className="px-2 py-1 rounded-md bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-input)] text-[var(--text-secondary)] text-[11px] font-medium transition-all"
                            title="Reddet"
                          >
                            ✕ Reddet
                          </button>
                        </div>
                      )}

                      {/* Manager can cancel */}
                      {isManagerOrCreator && (
                        <button
                          onClick={() => setCancellingTask(task)}
                          className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                          title="Görevi İptal Et"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filteredTasks.length === 0 && (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">Kriterlere uygun görev bulunamadı.</div>
          )}
        </div>
      )}

      {/* Completion Modal - STRICTLY ASSIGNEE ONLY */}
      {completingTask && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-[var(--modal-backdrop)] backdrop-blur-md font-sans overflow-y-auto">
          <div className="my-auto relative w-full max-w-lg rounded-2xl bg-[var(--bg-modal)] border border-[var(--border-card)] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[var(--bg-modal)] z-20 flex items-start justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div>
                <span className="text-[10px] font-mono-code uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-medium">
                  Görevi Tamamla & Kanıt Ekle
                </span>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mt-1.5">
                  {completingTask.title}
                </h3>
              </div>
              <button
                onClick={() => {
                  setCompletingTask(null);
                  setScreenshotPreview(null);
                }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCompletion} className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--text-primary)] font-medium mb-1">
                  Tamamlama Notları & Yapılan İş Detayları *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Görev kapsamında neler yapıldı? (Örn: Arayüz revize edildi, responsive kontroller tamamlandı...)"
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-purple-500 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-[var(--text-primary)] font-medium mb-1">
                  Ekran Görüntüsü Kanıtı (İsteğe Bağlı)
                </label>
                <div className="p-4 rounded-xl border border-dashed border-[var(--border-input)] bg-[var(--bg-inner)] text-center space-y-2">
                  {screenshotPreview ? (
                    <div className="relative rounded-lg overflow-hidden border border-[var(--border-input)] max-h-48 flex items-center justify-center bg-black">
                      <img
                        src={screenshotPreview.url}
                        alt="Preview"
                        className="object-contain max-h-48 w-full"
                      />
                      <button
                        type="button"
                        onClick={() => setScreenshotPreview(null)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/80 text-white hover:text-red-400 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-1" />
                      <p className="text-xs text-[var(--text-secondary)]">
                        Ekran görüntüsü yüklemek için dosya seçin
                      </p>
                      <label className="mt-2 inline-block px-3 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-card)] text-[var(--text-primary)] cursor-pointer font-medium text-xs transition-colors shadow-xs">
                        Dosya Seç
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setCompletingTask(null);
                    setScreenshotPreview(null);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-input)] cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isSubmitting ? 'Kaydediliyor...' : 'Bitirdim Olarak İşaretle'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Extension Request Modal */}
      {extendingTask && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-[var(--modal-backdrop)] backdrop-blur-md font-sans overflow-y-auto">
          <div className="my-auto relative w-full max-w-md rounded-2xl bg-[var(--bg-modal)] border border-[var(--border-card)] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[var(--bg-modal)] z-20 flex items-start justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <CalendarPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">Ek Süre Talep Et</h3>
                  <p className="text-xs text-[var(--text-secondary)] truncate max-w-[260px]">{extendingTask.title}</p>
                </div>
              </div>
              <button
                onClick={() => setExtendingTask(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitExtension} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[var(--text-primary)] font-medium mb-1">
                  Mevcut Teslim Tarihi
                </label>
                <div className="p-2.5 rounded-xl bg-[var(--bg-inner)] border border-[var(--border-input)] text-[var(--text-secondary)] font-mono-code">
                  {extendingTask.dueDate}
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-primary)] font-medium mb-1">
                  Talep Edilen Yeni Teslim Tarihi *
                </label>
                <input
                  type="date"
                  required
                  value={extensionDate}
                  onChange={(e) => setExtensionDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] outline-none focus:border-amber-500 font-mono-code text-xs"
                />
              </div>

              <div>
                <label className="block text-[var(--text-primary)] font-medium mb-1">
                  Gerekçe / Ek Süre Talebi Sebebi *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Neden ek süreye ihtiyaç duyduğunuzu yöneticiye açıklayın..."
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExtendingTask(null)}
                  className="px-3.5 py-2 rounded-lg bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-input)] cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-black text-xs font-semibold hover:bg-amber-400 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Hourglass className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Gönderiliyor...' : 'Talebi İlet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Task Cancellation Modal */}
      {cancellingTask && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-[var(--modal-backdrop)] backdrop-blur-md font-sans overflow-y-auto">
          <div className="my-auto relative w-full max-w-md rounded-2xl bg-[var(--bg-modal)] border border-red-500/40 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[var(--bg-modal)] z-20 flex items-start justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500">
                  <Ban className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">Görevi İptal Et</h3>
                  <p className="text-xs text-[var(--text-secondary)] truncate max-w-[260px]">{cancellingTask.title}</p>
                </div>
              </div>
              <button
                onClick={() => setCancellingTask(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Bu görevi iptal etmek istediğinize emin misiniz? Görev geçmişi arşivlenecek ve ekip üyelerine bildirilecektir.
            </p>

            <form onSubmit={handleSubmitCancellation} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[var(--text-primary)] font-medium mb-1">
                  İptal Gerekçesi (İsteğe Bağlı)
                </label>
                <textarea
                  rows={2}
                  placeholder="Görevin neden iptal edildiğini belirtebilirsiniz..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-red-500 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancellingTask(null)}
                  className="px-3.5 py-2 rounded-lg bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-input)] cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-500 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'İptal Ediliyor...' : 'Görevi Kesin İptal Et'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Task Details Modal */}
      {currentSelectedTask && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-[var(--modal-backdrop)] backdrop-blur-md font-sans overflow-y-auto">
          <div className="my-auto relative w-full max-w-2xl rounded-2xl bg-[var(--bg-modal)] border border-[var(--border-card)] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[var(--bg-modal)] z-20 flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-3 pt-0.5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(currentSelectedTask.status)}
                  {getPriorityBadge(currentSelectedTask.priority)}
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{currentSelectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Açıklama
              </span>
              <p className="text-xs text-[var(--text-primary)] bg-[var(--bg-inner)] p-3.5 rounded-xl border border-[var(--border-card)] leading-relaxed whitespace-pre-wrap">
                {currentSelectedTask.description}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-[var(--bg-inner)] p-3.5 rounded-xl border border-[var(--border-card)]">
              <div>
                <span className="text-[var(--text-muted)] block text-[10px]">ATANAN KİŞİ</span>
                <span className="text-[var(--text-primary)] font-medium">{currentSelectedTask.assignedToName}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[10px]">ATAYAN YÖNETİCİ</span>
                <span className="text-[var(--text-primary)] font-medium">{currentSelectedTask.assignedByName}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[10px]">TESLİM TARİHİ</span>
                <span className="text-[var(--text-secondary)] font-mono-code">{currentSelectedTask.dueDate}</span>
              </div>
            </div>

            {/* Extension Request Banner in Detail */}
            {currentSelectedTask.extensionRequest && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                  currentSelectedTask.extensionRequest.status === 'PENDING'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                    : currentSelectedTask.extensionRequest.status === 'APPROVED'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                    : 'bg-[var(--bg-inner)] border-[var(--border-card)] text-[var(--text-muted)]'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Hourglass className="w-3.5 h-3.5" />
                    Ek Süre Durumu:{' '}
                    {currentSelectedTask.extensionRequest.status === 'PENDING'
                      ? 'Yönetici Onayı Bekliyor'
                      : currentSelectedTask.extensionRequest.status === 'APPROVED'
                      ? 'Onaylandı (Tarih Güncellendi)'
                      : 'Reddedildi'}
                  </span>
                  <span className="font-mono-code text-[11px]">
                    Talep: {currentSelectedTask.extensionRequest.requestedDate}
                  </span>
                </div>
                <p className="text-[11px] bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                  <strong className="text-[var(--text-primary)]">Gerekçe:</strong> {currentSelectedTask.extensionRequest.reason}
                </p>

                {/* Manager actions on extension in detail modal */}
                {currentSelectedTask.extensionRequest.status === 'PENDING' &&
                  currentUser &&
                  (() => {
                    const taskTeam = teams.find((t) => t.id === currentSelectedTask.teamId);
                    const isManager = taskTeam
                      ? taskTeam.managerIds?.includes(currentUser.id) || taskTeam.createdBy === currentUser.id
                      : currentUser.id === currentSelectedTask.assignedBy;
                    return isManager ? (
                      <div className="pt-1 flex justify-end gap-2">
                        <button
                          onClick={() => handleReviewExtension(currentSelectedTask.id, false)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-input)] text-xs font-medium cursor-pointer"
                        >
                          Talebi Reddet
                        </button>
                        <button
                          onClick={() => handleReviewExtension(currentSelectedTask.id, true)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-semibold cursor-pointer shadow-xs"
                        >
                          Süreyi Onayla ({currentSelectedTask.extensionRequest.requestedDate})
                        </button>
                      </div>
                    ) : null;
                  })()}
              </div>
            )}

            {/* Cancelled Banner */}
            {currentSelectedTask.status === 'CANCELLED' && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs space-y-1 text-red-500">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Ban className="w-4 h-4" /> Görev İptal Edildi
                </div>
                <p className="text-[var(--text-secondary)]">
                  {currentSelectedTask.cancellationReason || 'Yönetici tarafından iptal edildi.'}
                </p>
              </div>
            )}

            {/* Completed Banner */}
            {currentSelectedTask.status === 'COMPLETED' && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-500 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tamamlama Notu:</span>
                </div>
                <p className="text-[var(--text-primary)]">{currentSelectedTask.completionNotes || 'Not eklenmedi.'}</p>
              </div>
            )}

            {/* Screenshots */}
            {currentSelectedTask.screenshots && currentSelectedTask.screenshots.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                  Eklenen Ekran Görüntüleri ({currentSelectedTask.screenshots.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {currentSelectedTask.screenshots.map((ss) => (
                    <div
                      key={ss.id}
                      onClick={() => setLightboxImage(ss.url)}
                      className="group relative rounded-xl overflow-hidden border border-[var(--border-card)] bg-black aspect-video cursor-pointer hover:border-purple-500 transition-all shadow-xs"
                    >
                      <img src={ss.url} alt={ss.name} className="object-cover w-full h-full" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs text-white">
                        Büyüt
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Task Discussion Stream */}
            <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
              <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                Görev Yorumları ({currentSelectedTask.comments?.length || 0})
              </span>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {currentSelectedTask.comments?.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-[var(--bg-inner)] border border-[var(--border-card)] text-xs">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-semibold text-[var(--text-primary)]">{c.userName}</span>
                      <span className="text-[var(--text-muted)] font-mono-code text-[10px]">
                        {new Date(c.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[var(--text-secondary)]">{c.text}</p>
                  </div>
                ))}
                {(!currentSelectedTask.comments || currentSelectedTask.comments.length === 0) && (
                  <p className="text-xs text-[var(--text-muted)] italic">Henüz yorum yapılmadı.</p>
                )}
              </div>

              {currentUser && (
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Göreve ilişkin soru veya not yaz..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-purple-500 outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                  >
                    Gönder
                  </button>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-[var(--border-subtle)] text-xs">
              <div className="flex items-center gap-2">
                {/* Delete Task Button - available to team managers or task creator */}
                {currentUser && (() => {
                  const taskTeam = teams.find((t) => t.id === currentSelectedTask.teamId);
                  const isTeamManager = taskTeam
                    ? taskTeam.managerIds?.includes(currentUser.id) || taskTeam.createdBy === currentUser.id
                    : false;
                  const isTaskCreator = currentSelectedTask.assignedBy === currentUser.id;
                  const canDelete = isTeamManager || isTaskCreator || (myTeams.length > 0 && myTeams.some(t => t.managerIds?.includes(currentUser.id)));

                  return canDelete ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Bu görevi veritabanından kalıcı olarak silmek istediğinize emin misiniz?')) {
                          try {
                            await firebaseService.deleteTask(currentSelectedTask.id);
                            setSelectedTask(null);
                          } catch (err) {
                            console.error('Delete task error:', err);
                            alert('Görev silinirken bir hata oluştu.');
                          }
                        }
                      }}
                      className="text-red-500 hover:text-red-400 flex items-center gap-1 cursor-pointer py-1.5 px-2.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Görevi Sil</span>
                    </button>
                  ) : null;
                })()}

                {/* Cancel Task button for manager/creator */}
                {currentSelectedTask.status !== 'COMPLETED' &&
                  currentSelectedTask.status !== 'CANCELLED' &&
                  currentUser &&
                  (() => {
                    const taskTeam = teams.find((t) => t.id === currentSelectedTask.teamId);
                    const isManager = taskTeam
                      ? taskTeam.managerIds?.includes(currentUser.id) || taskTeam.createdBy === currentUser.id
                      : currentUser.id === currentSelectedTask.assignedBy;
                    return isManager ? (
                      <button
                        onClick={() => {
                          const t = currentSelectedTask;
                          setCancellingTask(t);
                        }}
                        className="text-amber-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer py-1.5 px-2.5 rounded-lg hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all ml-1 font-medium"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Görevi İptal Et</span>
                      </button>
                    ) : null;
                  })()}
              </div>

              <div className="flex gap-2 ml-auto">
                {/* ONLY Assignee can see "Görevi Bitirdim" button */}
                {currentSelectedTask.status !== 'COMPLETED' &&
                  currentSelectedTask.status !== 'CANCELLED' &&
                  currentUser?.id === currentSelectedTask.assignedTo && (
                    <button
                      onClick={() => {
                        const t = currentSelectedTask;
                        setSelectedTask(null);
                        setCompletingTask(t);
                      }}
                      className="px-3.5 py-2 rounded-lg bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition-colors cursor-pointer shadow-xs"
                    >
                      Görevi Bitirdim
                    </button>
                  )}

                {/* Assignee can request extension from detail */}
                {currentSelectedTask.status !== 'COMPLETED' &&
                  currentSelectedTask.status !== 'CANCELLED' &&
                  currentUser?.id === currentSelectedTask.assignedTo && (
                    <button
                      onClick={() => {
                        const t = currentSelectedTask;
                        setSelectedTask(null);
                        setExtendingTask(t);
                        setExtensionDate(t.dueDate);
                      }}
                      className="px-3.5 py-2 rounded-lg bg-[var(--bg-input)] text-amber-500 font-medium hover:bg-[var(--bg-card-hover)] border border-[var(--border-input)] transition-colors cursor-pointer"
                    >
                      Ek Süre İste
                    </button>
                  )}

                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-3.5 py-2 rounded-lg bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-input)] cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Lightbox for Full-Size Screenshot */}
      {lightboxImage && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="Enlarged screenshot"
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl border border-[var(--border-card)]"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/80 text-white hover:text-zinc-300 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// Subcomponent: TaskCard
interface TaskCardProps {
  task: Task;
  teams: Team[];
  users: AppUser[];
  currentUser: AppUser | null;
  onOpenDetail: () => void;
  onOpenComplete: () => void;
  onOpenExtend: () => void;
  onOpenCancel: () => void;
  onReviewExtension: (taskId: string, approved: boolean) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  teams,
  users,
  currentUser,
  onOpenDetail,
  onOpenComplete,
  onOpenExtend,
  onOpenCancel,
  onReviewExtension,
}) => {
  const isCompleted = task.status === 'COMPLETED';
  const isCancelled = task.status === 'CANCELLED';
  const isAssignee = currentUser?.id === task.assignedTo;
  const taskTeam = teams.find((tm) => tm.id === task.teamId);
  const assigneeUser = users.find((u) => u.id === task.assignedTo);
  const isManagerOrCreator =
    currentUser && (
      taskTeam?.managerIds?.includes(currentUser.id) ||
      taskTeam?.createdBy === currentUser.id ||
      task.assignedBy === currentUser.id
    );

  return (
    <div
      onClick={onOpenDetail}
      className={`vercel-card p-4 rounded-xl space-y-3 cursor-pointer relative group transition-all shadow-xs ${
        isCompleted
          ? 'opacity-85'
          : isCancelled
          ? 'opacity-75 border-red-500/30 bg-red-500/5'
          : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
              task.priority === 'URGENT'
                ? 'bg-red-500/15 text-red-500 border border-red-500/30'
                : task.priority === 'HIGH'
                ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                : task.priority === 'MEDIUM'
                ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-input)]'
            }`}
          >
            {task.priority === 'URGENT'
              ? 'Acil'
              : task.priority === 'HIGH'
              ? 'Yüksek'
              : task.priority === 'MEDIUM'
              ? 'Orta'
              : 'Düşük'}
          </span>

          {taskTeam && (
            <span
              className="text-[9px] px-2 py-0.5 rounded-full font-medium border truncate max-w-[100px]"
              style={{
                borderColor: `${taskTeam.color}40`,
                backgroundColor: `${taskTeam.color}15`,
                color: taskTeam.color,
              }}
            >
              {taskTeam.name}
            </span>
          )}
        </div>

        <span className="text-[11px] font-mono-code text-[var(--text-muted)] flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {task.dueDate}
        </span>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-purple-500 transition-colors leading-snug">
          {task.title}
        </h4>
        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-1 leading-relaxed">
          {task.description}
        </p>
      </div>

      {/* Extension request pending banner on card */}
      {task.extensionRequest?.status === 'PENDING' && (
        <div
          className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-500 space-y-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1">
              <Hourglass className="w-3 h-3" /> Ek Süre Talebi
            </span>
            <span className="font-mono-code">{task.extensionRequest.requestedDate}</span>
          </div>
          <p className="text-[var(--text-secondary)] line-clamp-1 italic">"{task.extensionRequest.reason}"</p>

          {/* Manager approval buttons on card */}
          {isManagerOrCreator && (
            <div className="pt-1 flex justify-end gap-1.5">
              <button
                onClick={() => onReviewExtension(task.id, false)}
                className="px-2 py-0.5 rounded-md bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-input)] text-[var(--text-secondary)] text-[10px]"
              >
                Reddet
              </button>
              <button
                onClick={() => onReviewExtension(task.id, true)}
                className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[10px] shadow-xs"
              >
                ✓ Onayla
              </button>
            </div>
          )}
        </div>
      )}

      {task.screenshots && task.screenshots.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 w-fit">
          <ImageIcon className="w-3 h-3" />
          <span>{task.screenshots.length} Ekran Görüntüsü</span>
        </div>
      )}

      <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          {assigneeUser?.avatarUrl ? (
            <img
              src={assigneeUser.avatarUrl}
              alt={task.assignedToName}
              className="w-4 h-4 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold text-white shadow-xs"
              style={{ backgroundColor: assigneeUser?.avatarColor || '#9333ea' }}
            >
              {task.assignedToName?.charAt(0) || 'U'}
            </div>
          )}
          <span className="text-[11px] text-[var(--text-secondary)] truncate max-w-[110px]">
            {task.assignedToName}
          </span>
        </div>

        {/* Action button: ONLY assignee can complete */}
        {!isCompleted && !isCancelled ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {isAssignee && (
              <button
                onClick={onOpenComplete}
                className="px-2 py-0.5 rounded-md bg-[var(--bg-input)] hover:bg-emerald-500 hover:text-black border border-[var(--border-input)] text-[var(--text-primary)] text-[11px] font-medium transition-all cursor-pointer shadow-xs"
              >
                Bitirdim
              </button>
            )}

            {isAssignee && (
              <button
                onClick={onOpenExtend}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                title="Ek Süre Talep Et"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
              </button>
            )}

            {isManagerOrCreator && (
              <button
                onClick={onOpenCancel}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                title="Görevi İptal Et"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : isCancelled ? (
          <span className="text-[10px] text-red-500 flex items-center gap-1 font-medium">
            <Ban className="w-3.5 h-3.5" /> İptal Edildi
          </span>
        ) : (
          <span className="text-[10px] text-emerald-500 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Tamamlandı
          </span>
        )}
      </div>
    </div>
  );
};
