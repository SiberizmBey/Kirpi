/**
 * Kirpi - Ekip Görev Dağıtım & Takım Sohbeti (100% Real Firebase Integration)
 * Multi-Team Management, Real Avatar Uploads, Invitations, Frameless Titlebar,
 * Desktop Notifications & Real-Time Isolation
 */

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { TaskBoard } from './components/TaskBoard';
import { TeamsView } from './components/TeamsView';
import { TeamChat } from './components/TeamChat';
import { TeamMembers } from './components/TeamMembers';
import { CreateTaskModal } from './components/CreateTaskModal';
import { AuthModal } from './components/AuthModal';
import { ProfileEditModal } from './components/ProfileEditModal';
import { SettingsModal } from './components/SettingsModal';
import { firebaseService } from './services/firebaseService';
import { AppUser, Task, Team, AppTheme } from './types';
import { notificationService } from './utils/notificationService';
import { LogIn, UserPlus, Shield, Sparkles, CheckCircle2, MessageSquare } from 'lucide-react';

import { AuthView } from './components/AuthView';

export default function App() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'chat' | 'teams' | 'team'>('tasks');
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Modals
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // App Theme
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem('kirpi_theme') as AppTheme) || 'DARK';
  });

  // Apply Theme Effect with exact CSS variables and data-theme
  useEffect(() => {
    localStorage.setItem('kirpi_theme', currentTheme);
    const root = document.documentElement;

    root.classList.remove('dark', 'light', 'amoled');

    if (currentTheme === 'LIGHT') {
      root.setAttribute('data-theme', 'light');
      root.classList.add('light');
    } else if (currentTheme === 'DARK') {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
    } else if (currentTheme === 'AMOLED') {
      root.setAttribute('data-theme', 'amoled');
      root.classList.add('amoled');
    } else {
      // SYSTEM
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.setAttribute('data-theme', 'dark');
        root.classList.add('dark');
      } else {
        root.setAttribute('data-theme', 'light');
        root.classList.add('light');
      }
    }
  }, [currentTheme]);

  // 1. Subscribe to Firebase Auth
  useEffect(() => {
    const unsubAuth = firebaseService.onAuthChange((user) => {
      setCurrentUser(user);
      setAuthInitialized(true);
    });
    return () => unsubAuth();
  }, []);

  // 2. Subscribe to Real-time Users
  useEffect(() => {
    const unsubUsers = firebaseService.subscribeUsers((liveUsers) => {
      setUsers(liveUsers);
    });
    return () => unsubUsers();
  }, []);

  // 3. Subscribe to Real-time Teams
  useEffect(() => {
    const unsubTeams = firebaseService.subscribeTeams((liveTeams) => {
      setTeams(liveTeams);
    });
    return () => unsubTeams();
  }, []);

  // 4. Subscribe to Real-time Tasks & Trigger Desktop Notifications for New Assignments
  const prevTasksCountRef = useRef<number>(0);
  useEffect(() => {
    const unsubTasks = firebaseService.subscribeTasks((liveTasks) => {
      if (currentUser && prevTasksCountRef.current > 0 && liveTasks.length > prevTasksCountRef.current) {
        // Check for new task assigned to currentUser
        const newestTask = liveTasks[0];
        if (newestTask && newestTask.assignedTo === currentUser.id && newestTask.assignedBy !== currentUser.id) {
          notificationService.send(`Yeni Görev Atandı: ${newestTask.title}`, {
            body: `${newestTask.assignedByName || 'Yöneticiniz'} size yeni bir görev atadı. Son teslim: ${newestTask.dueDate}`,
          });
        }
      }
      prevTasksCountRef.current = liveTasks.length;
      setTasks(liveTasks);
    });
    return () => unsubTasks();
  }, [currentUser]);

  // Active Team determination
  const myTeams = currentUser
    ? teams.filter(
        (t) =>
          t.memberIds?.includes(currentUser.id) ||
          t.managerIds?.includes(currentUser.id) ||
          t.createdBy === currentUser.id
      )
    : [];

  const activeTeam = myTeams[0] || null;

  return (
    <div className="min-h-screen font-sans flex flex-col transition-colors duration-200 bg-[var(--bg-canvas)] text-[var(--text-primary)] selection:bg-purple-600 selection:text-white">
      {/* Ambient Dot Pattern */}
      <div className="fixed inset-0 vercel-dots opacity-20 pointer-events-none z-0" />

      {/* Top Navigation Bar (Only active when user is authenticated) */}
      {currentUser ? (
        <>
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            currentUser={currentUser}
            onOpenCreateTask={() => setIsCreateTaskOpen(true)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onOpenProfileEdit={() => setIsProfileEditOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            users={users}
            teams={teams}
          />

          {/* Main View Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 relative z-10">
            {activeTab === 'tasks' && (
              <TaskBoard
                currentUser={currentUser}
                tasks={tasks}
                teams={teams}
                users={users}
                onOpenCreateTask={() => setIsCreateTaskOpen(true)}
                onOpenAuth={() => setIsAuthModalOpen(true)}
              />
            )}

            {activeTab === 'teams' && (
              <TeamsView
                currentUser={currentUser}
                teams={teams}
                users={users}
                tasks={tasks}
                onOpenAuth={() => setIsAuthModalOpen(true)}
              />
            )}

            {activeTab === 'chat' && (
              <TeamChat
                currentUser={currentUser}
                users={users}
                teams={teams}
                onOpenAuth={() => setIsAuthModalOpen(true)}
              />
            )}

            {activeTab === 'team' && (
              <TeamMembers
                currentUser={currentUser}
                users={users}
                tasks={tasks}
                teams={teams}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onOpenProfileEdit={() => setIsProfileEditOpen(true)}
                onOpenCreateTeam={() => setActiveTab('teams')}
              />
            )}
          </main>
        </>
      ) : (
        /* 3. Unauthenticated Screen / NexaVerse Exact Layout */
        <AuthView />
      )}

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        currentUser={currentUser}
        users={users}
        teams={teams}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <ProfileEditModal
        isOpen={isProfileEditOpen}
        onClose={() => setIsProfileEditOpen(false)}
        currentUser={currentUser}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
      />
    </div>
  );
}
