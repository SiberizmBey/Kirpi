/**
 * Kirpi Task & Team Hub - Team Chat Module (100% Realtime Firestore)
 * Features:
 * 1. Channels management
 * 2. Real-time message streaming with real avatars & role badges
 * 3. Channel & Team Members side panel (see all teammates & roles)
 * 4. Invite/Add members directly from Team Chat interface
 * 5. Compressed image attachments & lightbox
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Hash,
  Send,
  Image as ImageIcon,
  Paperclip,
  Plus,
  X,
  MessageSquare,
  LogIn,
  Users,
  UserPlus,
  Shield,
  User,
  CheckCircle2,
  Circle,
  Loader2,
} from 'lucide-react';
import { ChatChannel, ChatMessage, AppUser, Team } from '../types';
import { firebaseService } from '../services/firebaseService';
import { compressImage } from '../utils/imageCompressor';

interface TeamChatProps {
  currentUser: AppUser | null;
  users: AppUser[];
  teams: Team[];
  onOpenAuth: () => void;
}

export const TeamChat: React.FC<TeamChatProps> = ({
  currentUser,
  users,
  teams,
  onOpenAuth,
}) => {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('chan-genel');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; url: string; type: 'IMAGE' | 'FILE' } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isAttachingImg, setIsAttachingImg] = useState(false);

  // Members Panel State
  const [isMembersPanelOpen, setIsMembersPanelOpen] = useState(true);

  // Invite Modal from Chat
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedInviteTeamId, setSelectedInviteTeamId] = useState('');
  const [selectedInviteUserId, setSelectedInviteUserId] = useState('');
  const [inviteSentNotice, setInviteSentNotice] = useState<string | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // New Channel Modal
  const [isNewChannelModalOpen, setIsNewChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');

  // Image Lightbox
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Subscribe to Channels
  useEffect(() => {
    const unsub = firebaseService.subscribeChannels((chanList) => {
      setChannels(chanList);
      if (chanList.length > 0 && !chanList.some((c) => c.id === activeChannelId)) {
        setActiveChannelId(chanList[0].id);
      }
    });
    return () => unsub();
  }, []);

  // 2. Subscribe to Messages
  useEffect(() => {
    if (!activeChannelId) return;
    const unsub = firebaseService.subscribeMessages(activeChannelId, (msgList) => {
      setMessages(msgList);
    });
    return () => unsub();
  }, [activeChannelId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];

  // User's accessible teams
  const myTeams = currentUser
    ? teams.filter(
        (t) =>
          t.memberIds.includes(currentUser.id) ||
          t.managerIds.includes(currentUser.id) ||
          t.createdBy === currentUser.id
      )
    : [];

  // Filter members that belong to currentUser's teams (isolated roster)
  const visibleTeammates = users.filter((u) => {
    if (u.id === currentUser?.id) return true;
    return myTeams.some((t) => t.memberIds.includes(u.id) || t.managerIds.includes(u.id));
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachment) return;
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    try {
      setIsSending(true);
      await firebaseService.sendMessage(activeChannelId, {
        channelId: activeChannelId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        senderColor: currentUser.avatarColor || '#0070f3',
        senderAvatarUrl: currentUser.avatarUrl,
        text: inputText.trim(),
        attachment: attachment || undefined,
      });

      setInputText('');
      setAttachment(null);
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAttachingImg(true);
      const compressedDataUrl = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.82,
        cropToSquare: false,
      });

      setAttachment({
        name: file.name,
        url: compressedDataUrl,
        type: 'IMAGE',
      });
    } catch (err: any) {
      alert(err.message || 'Görsel yüklenemedi.');
    } finally {
      setIsAttachingImg(false);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    try {
      const created = await firebaseService.createChannel(
        newChannelName.trim(),
        newChannelDesc.trim() || 'Ekip sohbet kanalı'
      );
      setActiveChannelId(created.id);
      setIsNewChannelModalOpen(false);
      setNewChannelName('');
      setNewChannelDesc('');
    } catch (err) {
      console.error('Create channel error:', err);
    }
  };

  const handleSendInviteFromChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInviteTeamId || !selectedInviteUserId.trim() || !currentUser) return;

    const targetTeam = teams.find((t) => t.id === selectedInviteTeamId);
    if (!targetTeam) return;

    const cleanEmail = selectedInviteUserId.trim().toLowerCase();

    try {
      setIsSendingInvite(true);
      await firebaseService.sendTeamInvitationByEmail({
        teamId: targetTeam.id,
        teamName: targetTeam.name,
        teamColor: targetTeam.color,
        teamLogoUrl: targetTeam.logoUrl,
        invitedEmail: cleanEmail,
        sender: currentUser,
      });

      setInviteSentNotice(`"${cleanEmail}" adresine davet başarıyla iletildi!`);
      setTimeout(() => {
        setIsInviteModalOpen(false);
        setInviteSentNotice(null);
        setSelectedInviteUserId('');
      }, 2000);
    } catch (err: any) {
      console.error('Chat invite error:', err);
      alert(err.message || 'Davet gönderilirken hata oluştu.');
    } finally {
      setIsSendingInvite(false);
    }
  };

  return (
    <div id="kirpi-team-chat" className="h-[calc(100vh-8.5rem)] flex rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden animate-fade-in font-sans">
      {/* 1. Channels Left Sidebar */}
      <aside className="w-52 sm:w-60 border-r border-zinc-900 bg-black/40 flex flex-col justify-between flex-shrink-0">
        <div>
          <div className="p-3.5 border-b border-zinc-900 flex items-center justify-between">
            <span className="text-xs font-semibold text-white tracking-tight flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
              <span>Kanallar ({channels.length})</span>
            </span>
            <button
              onClick={() => (currentUser ? setIsNewChannelModalOpen(true) : onOpenAuth())}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
              title="Yeni Kanal Oluştur"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-14rem)]">
            {channels.map((chan) => (
              <button
                key={chan.id}
                onClick={() => setActiveChannelId(chan.id)}
                className={`w-full text-left px-2.5 py-2 rounded-md text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                  activeChannelId === chan.id
                    ? 'bg-zinc-900 text-white font-medium border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                }`}
              >
                <Hash className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                <span className="truncate">{chan.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Current User Card */}
        {currentUser ? (
          <div className="p-3 border-t border-zinc-900 bg-zinc-950/80 flex items-center gap-2.5">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover shadow-sm border border-zinc-800"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm"
                style={{ backgroundColor: currentUser.avatarColor || '#0070f3' }}
              >
                {currentUser.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-zinc-500 truncate">{currentUser.title}</p>
            </div>
          </div>
        ) : (
          <div className="p-3 border-t border-zinc-900">
            <button
              onClick={onOpenAuth}
              className="w-full py-1.5 rounded-md bg-zinc-900 text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sohbet için Giriş Yap</span>
            </button>
          </div>
        )}
      </aside>

      {/* 2. Main Chat Feed */}
      <section className="flex-1 flex flex-col justify-between bg-zinc-950 min-w-0">
        {/* Chat Top Bar */}
        <div className="p-3.5 border-b border-zinc-900 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-2 truncate">
            <Hash className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            <h3 className="text-xs font-semibold text-white tracking-tight">
              {activeChannel?.name || 'genel'}
            </h3>
            <span className="text-[11px] text-zinc-500 hidden md:inline truncate">
              — {activeChannel?.description}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMembersPanelOpen(!isMembersPanelOpen)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                isMembersPanelOpen
                  ? 'bg-zinc-850 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-white bg-zinc-900/50'
              }`}
              title="Üyeleri Göster / Gizle"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Üyeler ({visibleTeammates.length})</span>
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-3 group">
              {msg.senderAvatarUrl ? (
                <img
                  src={msg.senderAvatarUrl}
                  alt={msg.senderName}
                  className="w-8 h-8 rounded-full object-cover shadow-sm flex-shrink-0 border border-zinc-800"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm flex-shrink-0"
                  style={{ backgroundColor: msg.senderColor || '#0070f3' }}
                >
                  {msg.senderName?.charAt(0) || 'U'}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-white">{msg.senderName}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono-code ${
                      msg.senderRole === 'MANAGER'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                        : 'bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    {msg.senderRole === 'MANAGER' ? 'YÖNETİCİ' : 'ÜYE'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono-code">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {msg.text && (
                  <p className="text-xs text-zinc-200 leading-relaxed break-words">
                    {msg.text}
                  </p>
                )}

                {msg.attachment && (
                  <div className="mt-2 max-w-sm">
                    <div
                      onClick={() => setPreviewImage(msg.attachment!.url)}
                      className="rounded-lg overflow-hidden border border-zinc-800 bg-black cursor-pointer hover:border-zinc-600 transition-all max-h-56"
                    >
                      <img
                        src={msg.attachment.url}
                        alt={msg.attachment.name}
                        className="object-cover w-full max-h-56"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-1 block truncate">
                      📎 {msg.attachment.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {messages.length === 0 && (
            <div className="p-8 text-center text-xs text-zinc-600">
              Bu kanalda henüz mesaj yok. İlk mesajı siz yazın!
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-zinc-900 bg-black/40 space-y-2">
          {attachment && (
            <div className="flex items-center gap-2 p-1.5 px-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 w-fit">
              <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate max-w-xs">{attachment.name}</span>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <label
              className={`p-2 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer transition-colors ${
                isAttachingImg ? 'opacity-50' : ''
              }`}
              title="Fotoğraf / Ekran Görüntüsü Ekle"
            >
              {isAttachingImg ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileAttach}
                disabled={isAttachingImg}
                className="hidden"
              />
            </label>

            <input
              type="text"
              placeholder={
                currentUser
                  ? `#${activeChannel?.name || 'genel'} kanalına mesaj yaz...`
                  : 'Mesaj yazabilmek için oturum açın...'
              }
              value={inputText}
              disabled={!currentUser}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 p-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-700 outline-none text-xs"
            />

            <button
              type="submit"
              disabled={(!inputText.trim() && !attachment) || isSending || !currentUser}
              className="p-2.5 rounded-md bg-white text-black hover:bg-zinc-200 text-xs font-semibold disabled:opacity-30 transition-all cursor-pointer shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      {/* 3. Team & Channel Members Right Side Panel */}
      {isMembersPanelOpen && (
        <aside className="w-60 sm:w-64 border-l border-zinc-900 bg-black/40 flex flex-col justify-between flex-shrink-0 animate-fade-in">
          <div className="flex-1 overflow-y-auto">
            <div className="p-3.5 border-b border-zinc-900 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-xs font-semibold text-white">Ekip Üyeleri</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 font-mono-code">
                  {visibleTeammates.length}
                </span>
              </div>

              {currentUser?.role === 'MANAGER' && (
                <button
                  onClick={() => {
                    setIsInviteModalOpen(true);
                    setSelectedInviteTeamId(myTeams[0]?.id || '');
                    setInviteSentNotice(null);
                  }}
                  className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
                  title="Ekibe Üye Davet Et"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Members grouped */}
            <div className="p-2.5 space-y-3">
              {/* Managers */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono-code text-zinc-500 uppercase tracking-wider flex items-center gap-1 px-1">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span>Yöneticiler</span>
                </div>
                {visibleTeammates
                  .filter((u) => u.role === 'MANAGER')
                  .map((mem) => (
                    <div
                      key={mem.id}
                      className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-850 flex items-center gap-2 text-xs"
                    >
                      <div className="relative">
                        {mem.avatarUrl ? (
                          <img
                            src={mem.avatarUrl}
                            alt={mem.name}
                            className="w-7 h-7 rounded-full object-cover border border-zinc-700"
                          />
                        ) : (
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase"
                            style={{ backgroundColor: mem.avatarColor || '#10b981' }}
                          >
                            {mem.name.charAt(0)}
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="font-semibold text-white truncate text-xs">{mem.name}</p>
                          {mem.id === currentUser?.id && (
                            <span className="text-[9px] text-zinc-500">(Siz)</span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">{mem.title}</p>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Members */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono-code text-zinc-500 uppercase tracking-wider flex items-center gap-1 px-1">
                  <User className="w-3 h-3 text-blue-400" />
                  <span>Üyeler</span>
                </div>
                {visibleTeammates
                  .filter((u) => u.role !== 'MANAGER')
                  .map((mem) => (
                    <div
                      key={mem.id}
                      className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-850 flex items-center gap-2 text-xs"
                    >
                      <div className="relative">
                        {mem.avatarUrl ? (
                          <img
                            src={mem.avatarUrl}
                            alt={mem.name}
                            className="w-7 h-7 rounded-full object-cover border border-zinc-700"
                          />
                        ) : (
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase"
                            style={{ backgroundColor: mem.avatarColor || '#0070f3' }}
                          >
                            {mem.name.charAt(0)}
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-zinc-950" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="font-semibold text-white truncate text-xs">{mem.name}</p>
                          {mem.id === currentUser?.id && (
                            <span className="text-[9px] text-zinc-500">(Siz)</span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">{mem.title}</p>
                      </div>
                    </div>
                  ))}
                {visibleTeammates.filter((u) => u.role !== 'MANAGER').length === 0 && (
                  <p className="text-[11px] text-zinc-600 italic px-1">Henüz üye eklenmedi.</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Invite Button at bottom of sidebar */}
          {currentUser?.role === 'MANAGER' && (
            <div className="p-3 border-t border-zinc-900">
              <button
                onClick={() => {
                  setIsInviteModalOpen(true);
                  setSelectedInviteTeamId(myTeams[0]?.id || '');
                  setInviteSentNotice(null);
                }}
                className="w-full py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Ekibe Davet Et</span>
              </button>
            </div>
          )}
        </aside>
      )}

      {/* NEW CHANNEL MODAL */}
      {isNewChannelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
          <div className="w-full max-w-sm rounded-xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="text-base font-semibold text-white">Yeni Sohbet Kanalı</h3>
              <button onClick={() => setIsNewChannelModalOpen(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">KANAL ADI</label>
                <div className="flex items-center rounded-md bg-zinc-900 border border-zinc-800 px-3">
                  <Hash className="w-3.5 h-3.5 text-zinc-500 mr-2" />
                  <input
                    type="text"
                    required
                    placeholder="mobil-uygulama"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="w-full py-2 bg-transparent text-white outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">AÇIKLAMA</label>
                <input
                  type="text"
                  placeholder="Kanalın amacı..."
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  className="w-full p-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-white outline-none text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewChannelModalOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-zinc-900 text-zinc-300 hover:text-white cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-md bg-white text-black font-semibold hover:bg-zinc-200 cursor-pointer shadow-sm"
                >
                  Kanalı Aç
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVITE MODAL FROM CHAT */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-sans overflow-y-auto">
          <div className="my-auto relative w-full max-w-md rounded-xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-950 z-20 flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">Sohbetten Ekibe Davet Et</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Kullanıcının tam e-posta adresini girerek davet edin.</p>
              </div>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteSentNotice ? (
              <div className="p-4 rounded-lg bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{inviteSentNotice}</span>
              </div>
            ) : (
              <form onSubmit={handleSendInviteFromChat} className="space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">HEDEF ÇALIŞMA EKİBİ</label>
                  <select
                    required
                    value={selectedInviteTeamId}
                    onChange={(e) => setSelectedInviteTeamId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-zinc-600 text-xs"
                  >
                    {myTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">DAVET EDİLECEK E-POSTA ADRESİ *</label>
                  <input
                    type="email"
                    required
                    placeholder="kullanici@sirket.com"
                    value={selectedInviteUserId}
                    onChange={(e) => setSelectedInviteUserId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-mono-code outline-none focus:border-zinc-600 text-xs placeholder-zinc-500"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Tam e-posta adresi yazılmalıdır.</p>
                </div>

                <div className="pt-3 border-t border-zinc-900 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-md bg-zinc-900 text-zinc-300 hover:text-white cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedInviteUserId.trim() || isSendingInvite}
                    className="px-4 py-1.5 rounded-md bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isSendingInvite ? 'Gönderiliyor...' : 'Daveti Gönder'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer animate-fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-lg object-contain border border-zinc-800 shadow-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-zinc-400 hover:text-white flex items-center gap-1 text-xs"
            >
              <X className="w-4 h-4" /> Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
