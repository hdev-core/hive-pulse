
import React, { useState, useEffect, useRef } from 'react';
import { Channel, AppSettings, Message } from '../../types';
import { getAvatarUrl } from '../../utils/ecencyHelpers';
import { 
  MessageCircle, RefreshCw, User, Send, Activity, ChevronLeft, MessageSquarePlus,
  Pencil, Trash2, X, Check, Smile
} from 'lucide-react';

interface ChatViewProps {
  settings: AppSettings;
  channels: Channel[];
  loadingChat: boolean;
  chatSessionExpired: boolean;
  isLoggingIn: boolean;
  refreshChat: (force?: boolean) => void;
  onRefresh: () => void;
  handleCreateDM: (e: React.FormEvent) => void;
  handleKeychainLogin: () => void;
  dmTarget: string;
  setDmTarget: (val: string) => void;
  creatingDm: boolean;
  onNavigateSettings: () => void;
  activeChannel: Channel | null;
  activeMessages: Message[];
  loadingMessages: boolean;
  onSelectChannel: (channel: Channel | null) => void;
  onSendMessage: (text: string) => void;
  sendingMessage: boolean;
  userMap: Record<string, string>;
  onResolveUsers: (ids: string[]) => void;
  onEditMessage: (id: string, text: string) => void;
  onDeleteMessage: (id: string) => void;
  onToggleReaction: (id: string, emoji: string) => void;
}

const COMMON_EMOJIS = [
    { name: '+1', char: '👍' },
    { name: 'heart', char: '❤️' },
    { name: 'joy', char: '😂' },
    { name: 'tada', char: '🎉' },
    { name: 'open_mouth', char: '😮' },
    { name: 'cry', char: '😢' },
    { name: 'fire', char: '🔥' },
    { name: '-1', char: '👎' }
];

const EMOJI_MAP: Record<string, string> = {};
COMMON_EMOJIS.forEach(e => EMOJI_MAP[e.name] = e.char);

// Resilient Avatar Component to prevent 404s
const Avatar = ({ url, alt, className }: { url: string, alt: string, className?: string }) => {
  const [error, setError] = useState(false);
  
  if (error || !url) {
    return (
      <div className={`${className} flex items-center justify-center bg-slate-200 text-slate-400`}>
        <User size={14} />
      </div>
    );
  }
  
  return (
    <img 
      src={url} 
      alt={alt} 
      className={className}
      onError={() => setError(true)}
    />
  );
};

export const ChatView: React.FC<ChatViewProps> = ({
  settings,
  channels,
  loadingChat,
  chatSessionExpired,
  isLoggingIn,
  refreshChat,
  onRefresh,
  handleCreateDM,
  handleKeychainLogin,
  dmTarget,
  setDmTarget,
  creatingDm,
  onNavigateSettings,
  activeChannel,
  activeMessages,
  loadingMessages,
  onSelectChannel,
  onSendMessage,
  sendingMessage,
  userMap,
  onResolveUsers,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction
}) => {
  const currentUsername = settings.ecencyUsername;
  const currentUserId = settings.ecencyUserId;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Picker State
  const [pickerId, setPickerId] = useState<string | null>(null);
  const [pickerPos, setPickerPos] = useState<{ top: number, left: number } | null>(null);

  // Auto-scroll
  useEffect(() => {
    if (activeChannel && messagesEndRef.current && !editingId) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages, activeChannel, loadingMessages]); 

  const handleSendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const startEditing = (msg: Message) => {
    setEditingId(msg.id);
    setEditText(msg.message);
    setPickerId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEditing = () => {
    if (editingId && editText.trim()) {
        onEditMessage(editingId, editText.trim());
        setEditingId(null);
        setEditText('');
    }
  };

  const togglePicker = (msgId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (pickerId === msgId) {
          setPickerId(null);
          setPickerPos(null);
          return;
      }
      
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const isTopHalf = rect.top < window.innerHeight / 2;
      
      // Calculate Fixed Position
      // If message is in top half, render below button. Else render above.
      // Offset slightly to align nicely
      let top = isTopHalf ? rect.bottom + 5 : rect.top - 180; 
      let left = rect.left - 100;

      // Bounds checking
      if (left < 10) left = 10;
      if (left > window.innerWidth - 270) left = window.innerWidth - 270;
      
      setPickerPos({ top, left });
      setPickerId(msgId);
  };

  // JIT User Resolution logic
  const [attemptedResolutions, setAttemptedResolutions] = useState<Set<string>>(new Set());

  useEffect(() => {
     setAttemptedResolutions(new Set());
     setEditingId(null);
     setPickerId(null);
  }, [activeChannel?.id]);

  const missingUsersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (missingUsersRef.current.size > 0) {
      const idsToFetch = Array.from(missingUsersRef.current);
      setAttemptedResolutions(prev => {
         const next = new Set(prev);
         idsToFetch.forEach(id => next.add(id));
         return next;
      });
      onResolveUsers(idsToFetch);
      missingUsersRef.current.clear();
    }
  });

  const getChannelNameAndAvatar = (channel: Channel) => {
    let avatar = '';
    let name = channel.display_name;
    let isDm = false;

    if (channel.type === 'D') {
      isDm = true;
      if (channel.teammate) {
        name = channel.teammate.username;
        avatar = getAvatarUrl(channel.teammate.username);
      } else if (channel.display_name && !channel.display_name.includes('__')) {
        name = channel.display_name;
        avatar = getAvatarUrl(channel.display_name);
      } else {
          const parts = channel.name.split('__');
          const other = parts.find(p => p !== currentUserId); 
          
          if (other) {
              name = userMap[other] || other;
              avatar = getAvatarUrl(userMap[other] || 'hive-1');
          } else {
              name = channel.display_name;
              avatar = getAvatarUrl(name);
          }
      }
    } else {
      avatar = `https://images.ecency.com/u/${channel.name}/avatar/small`;
    }
    return { name, avatar, isDm };
  };

  if (!settings.ecencyUsername || !settings.ecencyAccessToken) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center p-6 space-y-4 h-full">
         <div className="bg-slate-100 p-4 rounded-full">
            <MessageCircle size={32} className="text-slate-400" />
         </div>
         <h3 className="text-lg font-bold text-slate-800">Ecency Chat</h3>
         <p className="text-sm text-slate-600">
           To see your messages, please login with Hive Keychain in Settings.
         </p>
         <button
           onClick={onNavigateSettings}
           className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
         >
           Go to Settings
         </button>
      </div>
    );
  }

  if (activeChannel) {
    const { name, avatar } = getChannelNameAndAvatar(activeChannel);
    
    return (
      <div className="fixed top-[57px] bottom-[60px] left-0 right-0 z-40 bg-white flex flex-col shadow-xl">
        {/* Chat Header */}
        <div className="flex items-center gap-3 p-3 border-b border-slate-200 bg-white shadow-sm z-10">
          <button 
            onClick={() => onSelectChannel(null)}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600"
          >
            <ChevronLeft size={20} />
          </button>
          <img 
            src={avatar} 
            alt={name}
            className="w-8 h-8 rounded-full bg-slate-200 object-cover"
            onError={(e) => (e.target as HTMLImageElement).src = 'https://images.ecency.com/u/ecency/avatar/small'}
          />
          <div className="flex-1 min-w-0">
             <h3 className="font-bold text-slate-800 text-sm truncate">{name}</h3>
             <p className="text-[10px] text-slate-500 truncate">
                {activeChannel.type === 'D' ? 'Direct Message' : 'Community'}
             </p>
          </div>
          <button 
            onClick={onRefresh} 
            className="text-slate-400 p-2 hover:text-blue-600"
            disabled={loadingMessages}
            title="Refresh Messages"
          >
            <RefreshCw size={16} className={loadingMessages ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {loadingMessages && activeMessages.length === 0 ? (
            <div className="flex justify-center py-10">
              <Activity className="animate-spin text-slate-300" />
            </div>
          ) : activeMessages.length === 0 ? (
            <div className="text-center text-slate-400 text-xs py-10">
              No messages here yet. Say hi!
            </div>
          ) : (
            activeMessages.map((msg, i) => {
              // Handle System Messages
              if (msg.type && msg.type.startsWith('system_')) {
                 return (
                    <div key={msg.id} className="flex justify-center my-1">
                         <span className="text-[10px] text-slate-400 italic bg-slate-100 px-2 py-0.5 rounded-full">
                           {msg.message}
                         </span>
                    </div>
                 );
              }

              const propName = msg.props?.override_username || msg.props?.webhook_display_name || msg.props?.username;
              const directName = msg.username || msg.sender_name;
              
              const resolvedName = propName || userMap[msg.user_id] || directName;
              const isResolved = resolvedName && resolvedName.length < 26 && !resolvedName.includes(' ');
              const displayName = isResolved ? resolvedName : '...';

              if (!isResolved && msg.user_id && msg.user_id.length > 20) {
                 if (!attemptedResolutions.has(msg.user_id)) {
                    missingUsersRef.current.add(msg.user_id);
                 }
              }

              let isMe = false;
              if (currentUserId && msg.user_id === currentUserId) isMe = true;
              else if (displayName === currentUsername) isMe = true;

              // Process Reactions
              const reactions = msg.metadata?.reactions || [];
              const reactionGroups: Record<string, { count: number, hasReacted: boolean }> = {};
              
              reactions.forEach(r => {
                 if (!reactionGroups[r.emoji_name]) {
                    reactionGroups[r.emoji_name] = { count: 0, hasReacted: false };
                 }
                 reactionGroups[r.emoji_name].count++;
                 if (currentUserId && r.user_id === currentUserId) {
                    reactionGroups[r.emoji_name].hasReacted = true;
                 }
              });

              return (
                <div key={msg.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'} group relative`}>
                  
                  {/* Avatar for Others */}
                  {!isMe && (
                    <div className="w-8 h-8 shrink-0 mt-1">
                      {isResolved ? (
                        <Avatar 
                          url={getAvatarUrl(displayName)} 
                          alt={displayName}
                          className="w-8 h-8 rounded-full bg-slate-200 object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
                      )}
                    </div>
                  )}

                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                    
                    {/* Sender Name */}
                    {!isMe && (
                      <span className="text-[10px] text-slate-500 mb-0.5 ml-1 font-medium h-3.5 block">
                        {displayName}
                      </span>
                    )}

                    {/* Bubble or Edit Mode */}
                    {editingId === msg.id ? (
                      <div className="flex flex-col items-end gap-1.5 w-full min-w-[200px]">
                        <textarea 
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full text-sm p-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50/50 resize-none"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex gap-1">
                           <button 
                             onClick={cancelEditing} 
                             className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300"
                             title="Cancel"
                           >
                             <X size={14} />
                           </button>
                           <button 
                             onClick={saveEditing} 
                             className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                             title="Save"
                           >
                             <Check size={14} />
                           </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative group/bubble">
                          {/* Actions Overlay */}
                          <div className={`
                             absolute top-0 hidden group-hover:flex items-center gap-1 bg-white shadow-sm border border-slate-100 rounded px-1.5 py-1 z-10 animate-in fade-in zoom-in duration-100
                             ${isMe ? 'right-full mr-2' : 'left-full ml-2'}
                          `}>
                              {/* Add Reaction Button */}
                              <button 
                                onClick={(e) => togglePicker(msg.id, e)} 
                                className="text-slate-500 hover:text-amber-500 p-0.5"
                                title="Add Reaction"
                              >
                                <Smile size={12} />
                              </button>

                              {isMe && (
                                <>
                                  <div className="w-px h-3 bg-slate-200" />
                                  <button 
                                    onClick={() => startEditing(msg)} 
                                    className="text-slate-500 hover:text-blue-600 p-0.5"
                                    title="Edit"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  <div className="w-px h-3 bg-slate-200" />
                                  <button 
                                    onClick={() => onDeleteMessage(msg.id)}
                                    className="text-slate-500 hover:text-red-500 p-0.5"
                                    title="Delete"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              )}
                          </div>

                          <div className={`
                            px-3 py-2 rounded-2xl text-sm break-words shadow-sm relative
                            ${isMe 
                              ? 'bg-blue-600 text-white rounded-br-none' 
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                            }
                          `}>
                            {msg.message}
                          </div>
                      </div>
                    )}

                    {/* Reactions Bar */}
                    {Object.keys(reactionGroups).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 px-1">
                            {Object.entries(reactionGroups).map(([name, { count, hasReacted }]) => (
                                <button
                                   key={name}
                                   onClick={() => onToggleReaction(msg.id, name)}
                                   className={`
                                     flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border transition-colors
                                     ${hasReacted 
                                        ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100' 
                                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                     }
                                   `}
                                >
                                    <span>{EMOJI_MAP[name] || name}</span>
                                    <span>{count}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Timestamp */}
                    <span className="text-[10px] text-slate-400 mt-0.5 px-1">
                      {msg.create_at && !isNaN(msg.create_at) 
                        ? new Date(msg.create_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Just now'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Global Fixed Position Picker */}
        {pickerId && pickerPos && (
             <>
                <div 
                   className="fixed inset-0 z-50 cursor-default bg-transparent"
                   onClick={() => setPickerId(null)}
                />
                <div 
                   className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 grid grid-cols-4 gap-3 w-64 animate-in fade-in zoom-in-95 duration-100"
                   style={{ top: pickerPos.top, left: pickerPos.left }}
                >
                    {COMMON_EMOJIS.map(emoji => (
                        <button
                            key={emoji.name}
                            onClick={() => {
                                onToggleReaction(pickerId, emoji.name);
                                setPickerId(null);
                            }}
                            className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-lg text-2xl transition-all active:scale-95"
                            title={emoji.name}
                        >
                            {emoji.char}
                        </button>
                    ))}
                </div>
             </>
        )}

        {/* Input Area */}
        <div className="p-3 bg-white border-t border-slate-200">
          <form onSubmit={handleSendSubmit} className="flex gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
              disabled={sendingMessage}
            />
            <button 
              type="submit" 
              disabled={!inputText.trim() || sendingMessage}
              className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
            >
              {sendingMessage ? <Activity size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---------------- CHANNEL LIST VIEW ----------------
  
  const directMessages = channels.filter(c => c.type === 'D');
  const communityChannels = channels.filter(c => c.type !== 'D');

  const renderChannelRow = (channel: Channel) => {
    const { name, avatar } = getChannelNameAndAvatar(channel);

    return (
      <button 
        key={channel.id}
        onClick={() => onSelectChannel(channel)}
        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all group text-left"
      >
        <img 
          src={avatar} 
          onError={(e) => (e.target as HTMLImageElement).src = 'https://images.ecency.com/u/ecency/avatar/small'}
          alt={name}
          className="w-10 h-10 rounded-full bg-slate-200 object-cover border border-slate-100"
        />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
             <span className="font-semibold text-slate-800 text-sm truncate">{name}</span>
             {/* Unread Badge */}
             {(channel.unread_count || 0) > 0 && (
               <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                 {channel.unread_count}
               </span>
             )}
          </div>
          <p className="text-xs text-slate-400 truncate mt-0.5">
             {channel.type === 'D' ? 'Direct Message' : 'Community Chat'}
          </p>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-800">Messages</h2>
          {loadingChat && <Activity size={14} className="text-slate-400 animate-spin" />}
        </div>
        <button 
          onClick={() => refreshChat(true)} 
          className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100 transition-colors"
          title="Force Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* NEW: Logged In User Highlight */}
      <div className="mb-4 flex items-center gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
          <div className="relative">
             <Avatar 
                url={getAvatarUrl(currentUsername)} 
                alt={currentUsername || ''} 
                className="w-10 h-10 rounded-full bg-white shadow-sm object-cover" 
             />
             <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
          </div>
          <div className="flex-1">
             <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-600/80">Logged In As</span>
             <div className="font-bold text-slate-900 text-sm">@{currentUsername}</div>
          </div>
      </div>

      {/* Session Expired Alert */}
      {chatSessionExpired && (
         <div className="mb-4 bg-red-50 border border-red-100 p-3 rounded-lg flex flex-col gap-2">
            <p className="text-xs text-red-600 font-medium">Session expired. Please re-verify.</p>
            <button 
               onClick={handleKeychainLogin}
               disabled={isLoggingIn}
               className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-1.5 rounded text-xs font-bold transition-colors"
            >
               {isLoggingIn ? 'Verifying...' : 'Verify with Keychain'}
            </button>
         </div>
      )}

      {/* Quick DM Launcher */}
      <form onSubmit={handleCreateDM} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
             type="text" 
             placeholder="Username (without @)" 
             value={dmTarget}
             onChange={(e) => setDmTarget(e.target.value)}
             className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
          />
        </div>
        <button 
          type="submit" 
          disabled={creatingDm || !dmTarget}
          className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          title="Start Chat"
        >
          {creatingDm ? <Activity size={18} className="animate-spin" /> : <MessageSquarePlus size={18} />}
        </button>
      </form>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto -mx-4 px-4 pb-4 space-y-5">
        {channels.length === 0 && !loadingChat && !chatSessionExpired ? (
          <div className="text-center py-10 text-slate-400 text-sm">
             <p>No conversations yet.</p>
             <p className="text-xs mt-1">Enter a Hive username above to chat.</p>
          </div>
        ) : (
          <>
            {/* Direct Messages Section */}
            {directMessages.length > 0 && (
              <div className="space-y-1">
                 <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">Direct Messages</h3>
                 {directMessages.map(renderChannelRow)}
              </div>
            )}

            {/* Channels Section */}
            {communityChannels.length > 0 && (
              <div className="space-y-1">
                 <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">Channels</h3>
                 {communityChannels.map(renderChannelRow)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
