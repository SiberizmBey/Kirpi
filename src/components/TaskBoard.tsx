/**
 * Kirpi Task & Team Hub - Task Board Component
 * Features:
 * 1. Strict Assignee Completion: Only the assigned user (not managers) can complete and submit proofs
 * 2. Time Extension Requests: Assignees can request due date extensions with reason notes
 * 3. Extension Approval/Rejection: Managers can review and approve/reject extension requests with 1-click
 * 4. Task Cancellation: Managers can cancel tasks with reasons
 * 5. Kanban & List views with rich filters and compression-backed screenshots
 */

import React, { useState } from 'react';
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

  // Filter tasks based on user team membership
  const myTeams = currentUser
    ? teams.filter(
        (t) =>
          t.managerIds?.includes(currentUser.id) ||
          t.memberIds?.includes(currentUser.id) ||
          currentUser.teamIds?.includes(t.id)
      )
    : teams;

  const myTeamIds = myTeams.map((t) => t.id);

  const visibleTasks = tasks.filter((task) => {
    if (!currentUser) return true;
    if (task.teamId && myTeamIds.length > 0) {
      return myTeamIds.includes(task.teamId);
    }
    return task.assignedTo === currentUser.id || task.assignedBy === currentUser.id;
  });

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
        cancelReason.trim() || undefined
      );

      setCancellingTask(null);
      setCancelReason('');
      if (selectedTask?.id === cancellingTask.id) {
        setSelectedTask(null);
      }
    } catch (error) {
      console.error('Error cancelling task:', error);
      alert('Görev iptal edilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Review extension request
  const handleReviewExtension = async (taskId: string, approved: boolean) => {
    if (!currentUser) return;
    try {
      await firebaseService.reviewTaskExtension(taskId, approved, currentUser.id, currentUser.name);
    } catch (error) {
      console.error('Error reviewing extension:', error);
      alert('Talep değerlendirilirken hata oluştu.');
    }
  };

  // Add comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newComment.trim() || !currentUser) return;

    try {
      await firebaseService.addCommentToTask(selectedTask.id, {
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
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950/80 text-red-400 border border-red-800/60 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Acil
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-950/60 text-amber-400 border border-amber-800/40">
            Yüksek
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-950/60 text-blue-400 border border-blue-800/40">
            Orta
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
            Düşük
          </span>
        );
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Tamamlandı
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-950/60 text-red-400 border border-red-800/40 flex items-center gap-1">
            <Ban className="w-3 h-3" /> İptal Edildi
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-950/60 text-amber-400 border border-amber-800/40 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Devam Ediyor
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-950/60 text-blue-400 border border-blue-800/40">
            İncelemede
          </span>
        );
      case 'TODO':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-900 text-zinc-300 border border-zinc-800">
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

  return (
    <div id="kirpi-task-board" className="space-y-6 animate-fade-in font-sans">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-zinc-950 border border-zinc-800">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2.5">
            <span>Ekip Görev Dağıtımı</span>
            {myPendingTasksCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
                {myPendingTasksCount} bekleyen göreviniz var
              </span>
            )}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Yöneticiler görevleri atar ve yönetir; yalnızca görevin atandığı kişi görevi bitirebilir veya ek süre talep edebilir.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {currentUser ? (
            <button
              onClick={onOpenCreateTask}
              className="px-3.5 py-1.5 rounded-md bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Yeni Görev Ata</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 rounded-md bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Giriş Yaparak Görev Ata</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-850">
        {/* Left Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusTab('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              statusTab === 'ALL'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            Tüm Görevler ({visibleTasks.length})
          </button>
          <button
            onClick={() => setStatusTab('ACTIVE')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              statusTab === 'ACTIVE'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            Aktif (
            {visibleTasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length}
            )
          </button>
          <button
            onClick={() => setStatusTab('COMPLETED')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              statusTab === 'COMPLETED'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            Tamamlananlar ({visibleTasks.filter((t) => t.status === 'COMPLETED').length})
          </button>
          <button
            onClick={() => setStatusTab('CANCELLED')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              statusTab === 'CANCELLED'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            İptal Edilenler ({visibleTasks.filter((t) => t.status === 'CANCELLED').length})
          </button>
        </div>

        {/* Right Search & Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Görev ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs rounded-md bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 outline-none"
            />
          </div>

          {myTeams.length > 0 && (
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-md bg-zinc-950 border border-zinc-800 text-zinc-300 focus:border-zinc-600 outline-none max-w-[120px] truncate"
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
            className="px-2.5 py-1 text-xs rounded-md bg-zinc-950 border border-zinc-800 text-zinc-300 focus:border-zinc-600 outline-none"
          >
            <option value="ALL">Öncelik: Tümü</option>
            <option value="URGENT">Acil</option>
            <option value="HIGH">Yüksek</option>
            <option value="MEDIUM">Orta</option>
            <option value="LOW">Düşük</option>
          </select>

          <div className="hidden sm:flex items-center bg-zinc-950 border border-zinc-800 rounded-md p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1 rounded text-xs cursor-pointer ${
                viewMode === 'kanban' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Kanban Görünümü"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded text-xs cursor-pointer ${
                viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
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
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs font-semibold text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-500" />
                YAPILACAK
              </span>
              <span className="text-zinc-500 font-mono-code">
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
                <div className="p-6 rounded-lg border border-dashed border-zinc-900 text-center text-xs text-zinc-600">
                  Bu kolonda görev yok
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Devam Ediyor / İncelemede */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs font-semibold text-amber-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                SÜRÜYOR / İNCELEMEDE
              </span>
              <span className="text-zinc-500 font-mono-code">
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
              {filteredTasks.filter(
                (t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW'
              ).length === 0 && (
                <div className="p-6 rounded-lg border border-dashed border-zinc-900 text-center text-xs text-zinc-600">
                  Devam eden görev yok
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Tamamlandı / İptal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs font-semibold text-emerald-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                TAMAMLANDI / KAPANDI
              </span>
              <span className="text-zinc-500 font-mono-code">
                {
                  filteredTasks.filter(
                    (t) => t.status === 'COMPLETED' || t.status === 'CANCELLED'
                  ).length
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
                <div className="p-6 rounded-lg border border-dashed border-zinc-900 text-center text-xs text-zinc-600">
                  Kapanmış görev yok
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden divide-y divide-zinc-900">
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
                className="p-3.5 hover:bg-zinc-900/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5">{getStatusBadge(task.status)}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-medium text-white hover:text-zinc-200 truncate">
                        {task.title}
                      </h4>
                      {taskTeam && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                          {taskTeam.name}
                        </span>
                      )}
                      {task.extensionRequest?.status === 'PENDING' && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80 flex items-center gap-1">
                          <Hourglass className="w-3 h-3" /> Ek Süre İstendi ({task.extensionRequest.requestedDate})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{task.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-400 flex-shrink-0 flex-wrap sm:flex-nowrap">
                  {getPriorityBadge(task.priority)}

                  <div className="flex items-center gap-1 text-zinc-300">
                    <User className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{task.assignedToName}</span>
                  </div>

                  <div className="flex items-center gap-1 text-zinc-500 font-mono-code text-[11px]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{task.dueDate}</span>
                  </div>

                  {task.screenshots && task.screenshots.length > 0 && (
                    <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded text-[10px]">
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
                          className="px-2.5 py-1 rounded bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 transition-all cursor-pointer shadow-sm"
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
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-medium transition-all cursor-pointer"
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
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition-all"
                            title="Süreyi Onayla"
                          >
                            ✓ Onayla
                          </button>
                          <button
                            onClick={() => handleReviewExtension(task.id, false)}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition-all"
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
                          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-all cursor-pointer"
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
            <div className="p-8 text-center text-xs text-zinc-500">Kriterlere uygun görev bulunamadı.</div>
          )}
        </div>
      )}

      {/* Completion Modal - STRICTLY ASSIGNEE ONLY */}
      {completingTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-sans overflow-y-auto">
          <div className="my-auto relative w-full max-w-lg rounded-xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-950 z-20 flex items-start justify-between pb-2 border-b border-zinc-900">
              <div>
                <span className="text-[10px] font-mono-code uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Görevi Tamamla & Kanıt Ekle
                </span>
                <h3 className="text-base font-semibold text-white mt-1.5">
                  {completingTask.title}
                </h3>
              </div>
              <button
                onClick={() => {
                  setCompletingTask(null);
                  setScreenshotPreview(null);
                }}
                className="text-zinc-500 hover:text-white cursor-pointer p-1 rounded-md hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCompletion} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Tamamlama Notları & Yapılan İş Detayları *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Görev kapsamında neler yapıldı? (Örn: Arayüz revize edildi, responsive kontroller tamamlandı...)"
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Ekran Görüntüsü Kanıtı (İsteğe Bağlı)
                </label>
                <div className="p-4 rounded-lg border border-dashed border-zinc-800 bg-zinc-900/50 text-center space-y-2">
                  {screenshotPreview ? (
                    <div className="relative rounded-lg overflow-hidden border border-zinc-700 max-h-48 flex items-center justify-center bg-black">
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
                      <Upload className="w-6 h-6 text-zinc-500 mx-auto mb-1" />
                      <p className="text-xs text-zinc-400">
                        Ekran görüntüsü yüklemek için dosya seçin
                      </p>
                      <label className="mt-2 inline-block px-3 py-1.5 rounded-md bg-zinc-800 text-white hover:bg-zinc-700 cursor-pointer font-medium text-xs transition-colors">
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
                  className="px-3.5 py-1.5 rounded-md bg-zinc-900 text-zinc-300 hover:text-white cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-md bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isSubmitting ? 'Kaydediliyor...' : 'Bitirdim Olarak İşaretle'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extension Request Modal */}
      {extendingTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-sans overflow-y-auto">
          <div className="my-auto relative w-full max-w-md rounded-xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-950 z-20 flex items-start justify-between pb-2 border-b border-zinc-900">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800/80 flex items-center justify-center text-amber-400">
                  <CalendarPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Ek Süre Talep Et</h3>
                  <p className="text-xs text-zinc-400 truncate max-w-[260px]">{extendingTask.title}</p>
                </div>
              </div>
              <button
                onClick={() => setExtendingTask(null)}
                className="text-zinc-500 hover:text-white cursor-pointer p-1 rounded-md hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitExtension} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Mevcut Teslim Tarihi
                </label>
                <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono-code">
                  {extendingTask.dueDate}
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Talep Edilen Yeni Teslim Tarihi *
                </label>
                <input
                  type="date"
                  required
                  value={extensionDate}
                  onChange={(e) => setExtensionDate(e.target.value)}
                  className="w-full p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-amber-500 font-mono-code text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Gerekçe / Ek Süre Talebi Sebebi *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Neden ek süreye ihtiyaç duyduğunuzu yöneticiye açıklayın..."
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExtendingTask(null)}
                  className="px-3 py-1.5 rounded-md bg-zinc-900 text-zinc-300 hover:text-white cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-md bg-amber-500 text-black text-xs font-semibold hover:bg-amber-400 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Hourglass className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Gönderiliyor...' : 'Talebi İlet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Cancellation Modal */}
      {cancellingTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-sans overflow-y-auto">
          <div className="my-auto relative w-full max-w-md rounded-xl bg-zinc-950 border border-red-900/60 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-950 z-20 flex items-start justify-between pb-2 border-b border-zinc-900">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-950/80 border border-red-800/80 flex items-center justify-center text-red-400">
                  <Ban className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Görevi İptal Et</h3>
                  <p className="text-xs text-zinc-400 truncate max-w-[260px]">{cancellingTask.title}</p>
                </div>
              </div>
              <button
                onClick={() => setCancellingTask(null)}
                className="text-zinc-500 hover:text-white cursor-pointer p-1 rounded-md hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Bu görevi iptal etmek istediğinize emin misiniz? Görev geçmişi arşivlenecek ve ekip üyelerine bildirilecektir.
            </p>

            <form onSubmit={handleSubmitCancellation} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  İptal Gerekçesi (İsteğe Bağlı)
                </label>
                <textarea
                  rows={2}
                  placeholder="Görevin neden iptal edildiğini belirtebilirsiniz..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 outline-none focus:border-red-500 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancellingTask(null)}
                  className="px-3 py-1.5 rounded-md bg-zinc-900 text-zinc-300 hover:text-white cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-500 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'İptal Ediliyor...' : 'Görevi Kesin İptal Et'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {currentSelectedTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-sans overflow-y-auto">
          <div className="my-auto relative w-full max-w-2xl rounded-xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-950 z-20 flex items-start justify-between gap-4 border-b border-zinc-900 pb-3 pt-0.5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(currentSelectedTask.status)}
                  {getPriorityBadge(currentSelectedTask.priority)}
                </div>
                <h3 className="text-lg font-semibold text-white">{currentSelectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-zinc-500 hover:text-white cursor-pointer p-1 rounded-md hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                Açıklama
              </span>
              <p className="text-xs text-zinc-200 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80 leading-relaxed whitespace-pre-wrap">
                {currentSelectedTask.description}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-zinc-900/40 p-3 rounded-lg border border-zinc-900">
              <div>
                <span className="text-zinc-500 block text-[10px]">ATANAN KİŞİ</span>
                <span className="text-white font-medium">{currentSelectedTask.assignedToName}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">ATAYAN YÖNETİCİ</span>
                <span className="text-white font-medium">{currentSelectedTask.assignedByName}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">TESLİM TARİHİ</span>
                <span className="text-zinc-200 font-mono-code">{currentSelectedTask.dueDate}</span>
              </div>
            </div>

            {/* Extension Request Banner in Detail */}
            {currentSelectedTask.extensionRequest && (
              <div
                className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                  currentSelectedTask.extensionRequest.status === 'PENDING'
                    ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                    : currentSelectedTask.extensionRequest.status === 'APPROVED'
                    ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1.5">
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
                <p className="text-[11px] bg-black/40 p-2 rounded border border-zinc-800/60">
                  <strong className="text-zinc-300">Gerekçe:</strong> {currentSelectedTask.extensionRequest.reason}
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
                          className="px-3 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs font-medium cursor-pointer"
                        >
                          Talebi Reddet
                        </button>
                        <button
                          onClick={() => handleReviewExtension(currentSelectedTask.id, true)}
                          className="px-3 py-1 rounded bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-semibold cursor-pointer"
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
              <div className="p-3.5 rounded-lg bg-red-950/30 border border-red-900/50 text-xs space-y-1 text-red-300">
                <div className="flex items-center gap-1.5 font-semibold text-red-400">
                  <Ban className="w-4 h-4" /> Görev İptal Edildi
                </div>
                <p className="text-zinc-300">
                  {currentSelectedTask.cancellationReason || 'Yönetici tarafından iptal edildi.'}
                </p>
              </div>
            )}

            {/* Completed Banner */}
            {currentSelectedTask.status === 'COMPLETED' && (
              <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/40 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tamamlama Notu:</span>
                </div>
                <p className="text-zinc-200">{currentSelectedTask.completionNotes || 'Not eklenmedi.'}</p>
              </div>
            )}

            {/* Screenshots */}
            {currentSelectedTask.screenshots && currentSelectedTask.screenshots.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                  Eklenen Ekran Görüntüleri ({currentSelectedTask.screenshots.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {currentSelectedTask.screenshots.map((ss) => (
                    <div
                      key={ss.id}
                      onClick={() => setLightboxImage(ss.url)}
                      className="group relative rounded-lg overflow-hidden border border-zinc-800 bg-black aspect-video cursor-pointer hover:border-zinc-500 transition-all"
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
            <div className="space-y-3 pt-2 border-t border-zinc-900">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                Görev Yorumları ({currentSelectedTask.comments?.length || 0})
              </span>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {currentSelectedTask.comments?.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-semibold text-white">{c.userName}</span>
                      <span className="text-zinc-500 font-mono-code text-[10px]">
                        {new Date(c.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-zinc-300">{c.text}</p>
                  </div>
                ))}
                {(!currentSelectedTask.comments || currentSelectedTask.comments.length === 0) && (
                  <p className="text-xs text-zinc-500 italic">Henüz yorum yapılmadı.</p>
                )}
              </div>

              {currentUser && (
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Göreve ilişkin soru veya not yaz..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-md bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-md bg-zinc-800 text-white text-xs font-medium hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    Gönder
                  </button>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-zinc-900 text-xs">
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
                      className="text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer py-1.5 px-2.5 rounded-md hover:bg-red-950/40 border border-transparent hover:border-red-900/60 transition-all font-medium"
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
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer py-1.5 px-2.5 rounded-md hover:bg-amber-950/40 border border-transparent hover:border-amber-900/60 transition-all ml-1"
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
                      className="px-3.5 py-1.5 rounded-md bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition-colors cursor-pointer"
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
                      className="px-3.5 py-1.5 rounded-md bg-zinc-800 text-amber-300 font-medium hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      Ek Süre İste
                    </button>
                  )}

                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for Full-Size Screenshot */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="Enlarged screenshot"
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl border border-zinc-800"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-white hover:text-zinc-300 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
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
      className={`vercel-card p-4 rounded-xl space-y-3 cursor-pointer relative group ${
        isCompleted
          ? 'opacity-85 border-zinc-900'
          : isCancelled
          ? 'opacity-70 border-red-950 bg-red-950/10'
          : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
              task.priority === 'URGENT'
                ? 'bg-red-950 text-red-400 border border-red-800/40'
                : task.priority === 'HIGH'
                ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                : task.priority === 'MEDIUM'
                ? 'bg-blue-950 text-blue-400 border border-blue-800/40'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
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
              className="text-[9px] px-1.5 py-0.5 rounded font-medium border truncate max-w-[100px]"
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

        <span className="text-[11px] font-mono-code text-zinc-500 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {task.dueDate}
        </span>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-white group-hover:text-zinc-200 transition-colors leading-snug">
          {task.title}
        </h4>
        <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
          {task.description}
        </p>
      </div>

      {/* Extension request pending banner on card */}
      {task.extensionRequest?.status === 'PENDING' && (
        <div
          className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/60 text-[10px] text-amber-200 space-y-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1">
              <Hourglass className="w-3 h-3 text-amber-400" /> Ek Süre Talebi
            </span>
            <span className="font-mono-code">{task.extensionRequest.requestedDate}</span>
          </div>
          <p className="text-zinc-400 line-clamp-1 italic">"{task.extensionRequest.reason}"</p>

          {/* Manager approval buttons on card */}
          {isManagerOrCreator && (
            <div className="pt-1 flex justify-end gap-1.5">
              <button
                onClick={() => onReviewExtension(task.id, false)}
                className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-[10px]"
              >
                Reddet
              </button>
              <button
                onClick={() => onReviewExtension(task.id, true)}
                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[10px]"
              >
                ✓ Onayla
              </button>
            </div>
          )}
        </div>
      )}

      {task.screenshots && task.screenshots.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-800/30 w-fit">
          <ImageIcon className="w-3 h-3" />
          <span>{task.screenshots.length} Ekran Görüntüsü</span>
        </div>
      )}

      <div className="pt-2 border-t border-zinc-900 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          {assigneeUser?.avatarUrl ? (
            <img
              src={assigneeUser.avatarUrl}
              alt={task.assignedToName}
              className="w-4 h-4 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold text-white"
              style={{ backgroundColor: assigneeUser?.avatarColor || '#0070f3' }}
            >
              {task.assignedToName?.charAt(0) || 'U'}
            </div>
          )}
          <span className="text-[11px] text-zinc-400 truncate max-w-[110px]">
            {task.assignedToName}
          </span>
        </div>

        {/* Action button: ONLY assignee can complete */}
        {!isCompleted && !isCancelled ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {isAssignee && (
              <button
                onClick={onOpenComplete}
                className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-emerald-500 hover:text-black text-zinc-200 text-[11px] font-medium transition-all cursor-pointer"
              >
                Bitirdim
              </button>
            )}

            {isAssignee && (
              <button
                onClick={onOpenExtend}
                className="p-1 rounded text-zinc-500 hover:text-amber-300 transition-colors"
                title="Ek Süre Talep Et"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
              </button>
            )}

            {isManagerOrCreator && (
              <button
                onClick={onOpenCancel}
                className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                title="Görevi İptal Et"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : isCancelled ? (
          <span className="text-[10px] text-red-400 flex items-center gap-1 font-medium">
            <Ban className="w-3.5 h-3.5" /> İptal Edildi
          </span>
        ) : (
          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Tamamlandı
          </span>
        )}
      </div>
    </div>
  );
};
