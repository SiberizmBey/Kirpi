/**
 * Kirpi Task & Team Hub - Team-Scoped Real-time Chat Module (Firestore)
 * Features:
 * 1. Multi-Team support: Users can switch between their teams seamlessly
 * 2. 100% Strict Team Isolation: Channels & messages are strictly scoped per-team
 * 3. Theme Adaptive: Full support for Dark, Light, and Amoled themes using CSS variables
 * 4. Desktop Notifications for incoming team messages
 * 5. Compressed image attachments & lightbox preview
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Hash,
  Send,
  Image as ImageIcon,
  Plus,
  X,
  MessageSquare,
  Users,
  UserPlus,
  Shield,
  User,
  CheckCircle2,
  Circle,
  Loader2,
  ChevronDown,
  Layers,
  Sparkles,
  Mail,
  AlertCircle,
} from 'lucide-react';
import { ChatChannel, ChatMessage, AppUser, Team } from '../types';
import { firebaseService } from '../services/firebaseService';
import { compressImage } from '../utils/imageCompressor';
import { notificationService } from '../utils/notificationService';

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
  // Only teams that the current user belongs to or manages
  const myTeams = currentUser
    ? teams.filter(
        (t) =>
          t.memberIds.includes(currentUser.id) ||
          t.managerIds.includes(currentUser.id) ||
          t.createdBy === currentUser.id
      )
    : [];

  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  useEffect(() => {
    if (myTeams.length > 0) {
      if (!selectedTeamId || !myTeams.some((t) => t.id === selectedTeamId)) {
        setSelectedTeamId(myTeams[0].id);
      }
    }
  }, [myTeams, selectedTeamId]);

  const activeTeam = myTeams.find((t) => t.id === selectedTeamId) || myTeams[0];

  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; url: string; type: 'IMAGE' | 'FILE' } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isAttachingImg, setIsAttachingImg] = useState(false);

  // Members Panel State
  const [isMembersPanelOpen, setIsMembersPanelOpen] = useState(true);

  // Invite Modal from Chat
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSentNotice, setInviteSentNotice] = useState<string | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // New Channel Modal
  const [isNewChannelModalOpen, setIsNewChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');

  // Image Lightbox
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef<number>(0);

  // 1. Subscribe to Channels
  useEffect(() => {
    const unsub = firebaseService.subscribeChannels((chanList) => {
      setChannels(chanList);
    });
    return () => unsub();
  }, []);

  // Filter channels strictly belonging to current active team
  const teamChannels = activeTeam
    ? channels.filter((c) => c.teamId === activeTeam.id)
    : [];

  // Auto-provision default channels if active team has no channels yet
  useEffect(() => {
    if (activeTeam && channels.length > 0) {
      const existing = channels.filter((c) => c.teamId === activeTeam.id);
      if (existing.length === 0) {
        // Create initial channels for this team
        firebaseService.createChannel('genel', `${activeTeam.name} genel sohbet kanalı`, activeTeam.id);
        firebaseService.createChannel('görev-duyuruları', `${activeTeam.name} görev duyuruları`, activeTeam.id);
      }
    }
  }, [activeTeam?.id, channels]);

  // When active team changes or channel list updates, set activeChannelId and reset messages
  useEffect(() => {
    if (teamChannels.length > 0) {
      if (!activeChannelId || !teamChannels.some((c) => c.id === activeChannelId)) {
        setMessages([]);
        setActiveChannelId(teamChannels[0].id);
      }
    } else {
      setActiveChannelId('');
      setMessages([]);
    }
  }, [teamChannels, activeChannelId, selectedTeamId]);

  // 2. Subscribe to Messages of the active channel
  useEffect(() => {
    if (!activeChannelId) {
      setMessages([]);
      return;
    }
    prevMessagesLengthRef.current = 0;
    const unsub = firebaseService.subscribeMessages(activeChannelId, (msgList) => {
      // Trigger desktop notification for new incoming messages from others
      if (prevMessagesLengthRef.current > 0 && msgList.length > prevMessagesLengthRef.current) {
        const newestMsg = msgList[msgList.length - 1];
        if (newestMsg && newestMsg.senderId !== currentUser?.id) {
          notificationService.send(`${newestMsg.senderName} (${activeTeam?.name || 'Ekip'})`, {
            body: newestMsg.text || 'Görsel eki paylaştı',
          });
        }
      }
      prevMessagesLengthRef.current = msgList.length;
      setMessages(msgList);
    });
    return () => unsub();
  }, [activeChannelId, currentUser?.id, activeTeam?.name]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeChannel = teamChannels.find((c) => c.id === activeChannelId) || teamChannels[0];

  // Filter members that strictly belong to active selected team
  const activeTeamMembers = activeTeam
    ? users.filter(
        (u) =>
          activeTeam.memberIds.includes(u.id) ||
          activeTeam.managerIds.includes(u.id) ||
          activeTeam.createdBy === u.id
      )
    : [];

  const isCurrentUserTeamManager = activeTeam && currentUser
    ? activeTeam.managerIds?.includes(currentUser.id) || activeTeam.createdBy === currentUser.id
    : false;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachment) return;
    if (!currentUser || !activeChannelId) {
      if (!currentUser) onOpenAuth();
      return;
    }

    try {
      setIsSending(true);
      await firebaseService.sendMessage(activeChannelId, {
        channelId: activeChannelId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: isCurrentUserTeamManager ? 'MANAGER' : 'MEMBER',
        senderColor: currentUser.avatarColor || '#a855f7',
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
    } catch (err) {
      console.error('Image compression error:', err);
      alert('Görsel işlenirken bir hata oluştu.');
    } finally {
      setIsAttachingImg(false);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !activeTeam) return;

    try {
      const created = await firebaseService.createChannel(
        newChannelName.trim(),
        newChannelDesc.trim(),
        activeTeam.id
      );
      setActiveChannelId(created.id);
      setIsNewChannelModalOpen(false);
      setNewChannelName('');
      setNewChannelDesc('');
    } catch (err) {
      console.error('Create channel error:', err);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeTeam || !currentUser) return;

    const targetEmail = inviteEmail.trim().toLowerCase();
    if (!targetEmail.includes('@') || !targetEmail.includes('.')) {
      setInviteSentNotice('Lütfen geçerli ve tam bir e-posta adresi yazın.');
      return;
    }

    try {
      setIsSendingInvite(true);
      await firebaseService.sendTeamInvitationByEmail({
        teamId: activeTeam.id,
        teamName: activeTeam.name,
        teamColor: activeTeam.color,
        teamLogoUrl: activeTeam.logoUrl,
        invitedEmail: targetEmail,
        sender: currentUser,
      });

      setInviteSentNotice(`"${targetEmail}" adresine davet gönderildi!`);
      setInviteEmail('');
      setTimeout(() => {
        setIsInviteModalOpen(false);
        setInviteSentNotice(null);
      }, 2500);
    } catch (err: any) {
      console.error('Invite error:', err);
      setInviteSentNotice(err.message || 'Davet gönderilirken hata oluştu.');
    } finally {
      setIsSendingInvite(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] text-center space-y-4 max-w-md mx-auto shadow-sm">
        <MessageSquare className="w-12 h-12 text-[var(--accent)] mx-auto" />
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Takım Sohbeti</h3>
        <p className="text-xs text-[var(--text-secondary)]">
          Takım arkadaşlarınızla anlık iletişim kurmak ve görev duyurularını takip etmek için oturum açın.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm"
        >
          Giriş Yap
        </button>
      </div>
    );
  }

  if (myTeams.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] text-center space-y-4 max-w-md mx-auto shadow-sm">
        <Layers className="w-12 h-12 text-[var(--accent)] mx-auto" />
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Henüz Bir Ekibe Dahil Değilsiniz</h3>
        <p className="text-xs text-[var(--text-secondary)]">
          Takım sohbetini kullanabilmek için yeni bir ekip oluşturun veya bir yöneticinin size davet göndermesini bekleyin.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[520px] rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] overflow-hidden shadow-2xl animate-fade-in">
      {/* 1. Left: Channel & Team Sidebar */}
      <div className="w-60 bg-[var(--bg-inner)] border-r border-[var(--border-subtle)] flex flex-col flex-shrink-0">
        {/* Team Selector Header */}
        <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
              AKTİF ÇALIŞMA EKİBİ
            </span>
            <div className="relative">
              <select
                value={selectedTeamId || activeTeam?.id || ''}
                onChange={(e) => {
                  setSelectedTeamId(e.target.value);
                  setMessages([]);
                  setActiveChannelId('');
                }}
                className="w-full pl-2.5 pr-8 py-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] outline-none focus:border-purple-500 appearance-none cursor-pointer truncate"
              >
                {myTeams.map((team) => (
                  <option key={team.id} value={team.id} className="bg-[var(--bg-modal)] text-[var(--text-primary)]">
                    {team.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Channels Section Header */}
        <div className="px-3 pt-3 pb-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Kanallar ({teamChannels.length})
          </span>
          {isCurrentUserTeamManager && (
            <button
              onClick={() => setIsNewChannelModalOpen(true)}
              title="Yeni Kanal Oluştur"
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Channel Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {teamChannels.map((channel) => {
            const isActive = channel.id === activeChannelId;
            return (
              <button
                key={channel.id}
                onClick={() => {
                  if (channel.id !== activeChannelId) {
                    setMessages([]);
                    setActiveChannelId(channel.id);
                  }
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                <Hash className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                <span className="truncate flex-1">{channel.name}</span>
              </button>
            );
          })}

          {teamChannels.length === 0 && (
            <div className="p-4 text-center text-xs text-[var(--text-muted)]">
              Kanal yükleniyor...
            </div>
          )}
        </div>

        {/* Bottom Current User Mini Card */}
        <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover border border-[var(--border-input)]"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase"
                style={{ backgroundColor: currentUser.avatarColor || '#a855f7' }}
              >
                {currentUser.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{currentUser.name}</p>
              <p className="text-[10px] text-[var(--text-secondary)] truncate font-mono-code">
                {isCurrentUserTeamManager ? 'Ekip Yöneticisi' : 'Ekip Üyesi'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Center: Chat Area */}
      <div className="flex-1 flex flex-col bg-[var(--bg-card)] min-w-0">
        {/* Chat Header */}
        <div className="h-12 border-b border-[var(--border-subtle)] px-4 flex items-center justify-between bg-[var(--bg-card)]">
          <div className="flex items-center gap-2 min-w-0">
            <Hash className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <span className="font-semibold text-xs text-[var(--text-primary)] truncate">
              {activeChannel?.name || 'genel'}
            </span>
            {activeChannel?.description && (
              <span className="hidden sm:inline text-[11px] text-[var(--text-muted)] truncate max-w-xs">
                — {activeChannel.description}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isCurrentUserTeamManager && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-[var(--bg-inner)] border border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5 text-purple-500" />
                <span>Üye Davet Et</span>
              </button>
            )}

            <button
              onClick={() => setIsMembersPanelOpen(!isMembersPanelOpen)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isMembersPanelOpen
                  ? 'bg-purple-600/15 text-purple-500 border border-purple-500/30'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inner)]'
              }`}
              title="Ekip Üyeleri Listesi"
            >
              <Users className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--bg-canvas)]">
          {messages.map((msg, index) => {
            const isMe = msg.senderId === currentUser.id;
            const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId;

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 animate-fade-in ${
                  isMe ? 'flex-row-reverse' : ''
                }`}
              >
                {showAvatar ? (
                  msg.senderAvatarUrl ? (
                    <img
                      src={msg.senderAvatarUrl}
                      alt={msg.senderName}
                      className="w-8 h-8 rounded-full object-cover border border-[var(--border-input)] flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0"
                      style={{ backgroundColor: msg.senderColor || '#a855f7' }}
                    >
                      {msg.senderName.charAt(0)}
                    </div>
                  )
                ) : (
                  <div className="w-8 flex-shrink-0" />
                )}

                <div
                  className={`max-w-[75%] space-y-1 ${
                    isMe ? 'items-end text-right' : 'items-start text-left'
                  }`}
                >
                  {showAvatar && (
                    <div
                      className={`flex items-center gap-1.5 text-[11px] ${
                        isMe ? 'justify-end' : ''
                      }`}
                    >
                      <span className="font-semibold text-[var(--text-primary)]">{msg.senderName}</span>
                      {msg.senderRole === 'MANAGER' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-500/15 text-purple-500 border border-purple-500/30">
                          YÖNETİCİ
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--text-muted)] font-mono-code">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}

                  {msg.text && (
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed break-words shadow-xs ${
                        isMe
                          ? 'bg-purple-600 text-white rounded-tr-none'
                          : 'bg-[var(--bg-card)] border border-[var(--border-card)] text-[var(--text-primary)] rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}

                  {msg.attachment && (
                    <div className="pt-1">
                      <img
                        src={msg.attachment.url}
                        alt={msg.attachment.name}
                        onClick={() => setPreviewImage(msg.attachment!.url)}
                        className="max-h-60 rounded-xl border border-[var(--border-card)] cursor-pointer object-cover hover:opacity-90 transition-opacity shadow-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {messages.length === 0 && (
            <div className="p-8 text-center text-xs text-[var(--text-muted)] space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
              <p>"{activeTeam?.name}" ekibinin #{activeChannel?.name || 'genel'} kanalında henüz mesaj yok.</p>
              <p className="text-[11px]">İlk mesajı göndererek sohbete başlayın!</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Bar */}
        <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-card)]">
          {attachment && (
            <div className="mb-2 p-2 rounded-xl bg-[var(--bg-inner)] border border-[var(--border-card)] flex items-center justify-between text-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <img src={attachment.url} alt="Attachment" className="w-9 h-9 rounded-lg object-cover border border-[var(--border-input)]" />
                <span className="text-[var(--text-primary)] font-medium truncate max-w-[200px]">{attachment.name}</span>
              </div>
              <button
                onClick={() => setAttachment(null)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <label className="p-2 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-input)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex-shrink-0">
              {isAttachingImg ? (
                <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
              ) : (
                <ImageIcon className="w-4 h-4" />
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
              placeholder={`#${activeChannel?.name || 'sohbet'} kanalına mesaj yaz...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-purple-500 outline-none transition-all"
            />

            <button
              type="submit"
              disabled={isSending || (!inputText.trim() && !attachment)}
              className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all disabled:opacity-40 cursor-pointer flex-shrink-0 shadow-sm"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </div>

      {/* 3. Right: Active Team Members Panel */}
      {isMembersPanelOpen && (
        <div className="w-60 bg-[var(--bg-inner)] border-l border-[var(--border-subtle)] flex flex-col flex-shrink-0 animate-fade-in">
          <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Ekip Üyeleri ({activeTeamMembers.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {activeTeamMembers.map((member) => {
              const isManager =
                activeTeam.managerIds.includes(member.id) || activeTeam.createdBy === member.id;
              const isMe = member.id === currentUser.id;

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors text-xs"
                >
                  <div className="relative">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-7 h-7 rounded-full object-cover border border-[var(--border-input)]"
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase"
                        style={{ backgroundColor: member.avatarColor || '#a855f7' }}
                      >
                        {member.name.charAt(0)}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-card)]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-[var(--text-primary)] truncate text-[11px]">
                        {member.name}
                      </span>
                      {isMe && <span className="text-[10px] text-[var(--text-muted)]">(Sen)</span>}
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">
                      {isManager ? 'Yönetici' : member.title || 'Üye'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-pointer animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-zinc-700"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/80 text-white hover:text-zinc-300 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* New Channel Modal */}
      {isNewChannelModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in font-sans overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl bg-[var(--bg-modal)] border border-[var(--border-card)] p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Yeni Kanal Oluştur</h3>
              <button
                onClick={() => setIsNewChannelModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] font-medium mb-1">KANAL ADI *</label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Örn: sprint-planlama"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-purple-500 outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] font-medium mb-1">AÇIKLAMA</label>
                <textarea
                  rows={2}
                  placeholder="Kanalın amacı ve kullanım alanı..."
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-purple-500 outline-none text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewChannelModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-[var(--bg-inner)] border border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all shadow-sm cursor-pointer"
                >
                  Kanalı Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && activeTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in font-sans overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl bg-[var(--bg-modal)] border border-[var(--border-card)] p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Ekibe Üye Davet Et</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">"{activeTeam.name}" ekibine katılmaya çağırın.</p>
              </div>
              <button
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setInviteSentNotice(null);
                }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteSentNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{inviteSentNotice}</span>
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] font-medium mb-1">E-POSTA ADRESİ *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="kullanici@sirket.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-purple-500 text-xs font-mono-code"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-[var(--bg-inner)] border border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Kapat
                </button>
                <button
                  type="submit"
                  disabled={isSendingInvite || !inviteEmail.trim()}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all disabled:opacity-50 shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  {isSendingInvite ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>{isSendingInvite ? 'Gönderiliyor...' : 'Davet Gönder'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
