/**
 * Kirpi - Ekip Görev Dağıtım & Takım Sohbeti (100% Real Firebase Integration)
 * Multi-Team Management, Real Avatar Uploads, Invitations, Chat Member List & Update Checker
 */

import React, { useState, useEffect } from 'react';
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

export default function App() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'chat' | 'teams' | 'team'>('tasks');
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
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

  // Apply Theme Effect
  useEffect(() => {
    localStorage.setItem('kirpi_theme', currentTheme);
    const root = document.documentElement;

    if (currentTheme === 'LIGHT') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else if (currentTheme === 'DARK') {
      root.classList.remove('light');
      root.classList.add('dark');
    } else {
      // SYSTEM
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    }
  }, [currentTheme]);

  // 1. Subscribe to Firebase Auth
  useEffect(() => {
    const unsubAuth = firebaseService.onAuthChange((user) => {
      setCurrentUser(user);
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

  // 4. Subscribe to Real-time Tasks
  useEffect(() => {
    const unsubTasks = firebaseService.subscribeTasks((liveTasks) => {
      setTasks(liveTasks);
    });
    return () => unsubTasks();
  }, []);

  return (
    <div className={`min-h-screen font-sans flex flex-col transition-colors duration-200 selection:bg-zinc-800 selection:text-white ${
      currentTheme === 'LIGHT' ? 'bg-zinc-100 text-zinc-900' : 'bg-black text-zinc-100'
    }`}>
      {/* Ambient Dot Pattern */}
      <div className="fixed inset-0 vercel-dots opacity-20 pointer-events-none z-0" />

      {/* Top Navbar */}
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
