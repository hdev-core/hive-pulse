import React, { useState, useEffect, useRef } from 'react';
import { Channel, AppSettings, Message } from '../../types';
import { getAvatarUrl } from '../../utils/ecencyHelpers';
import { 
  MessageCircle, RefreshCw, User, Send, Activity, ChevronLeft, MessageSquarePlus
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
  onResolveUsers: (ids: string[]) => void; // New Callback
}

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
  onResolveUsers
}) => {
  const currentUsername = settings.ecencyUsername;
  const currentUserId = settings.ecencyUserId;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');

  // Auto-scroll
  useEffect(() => {
    if (activeChannel && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages, activeChannel, loadingMessages]);

  const handleSendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  // JIT User Resolution logic
  // We track IDs that we tried to resolve to avoid infinite loops
  const [attemptedResolutions, setAttemptedResolutions] = useState<Set<string>>(new Set());

  useEffect(() => {
     // Reset attempts when switching channels
     setAttemptedResolutions(new Set());
  }, [activeChannel?.id]);

  // Collect missing users during this render
  const missingUsersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (missingUsersRef.current.size > 0) {
      const idsToFetch = Array.from(missingUsersRef.current);
      // Mark as attempted
      setAttemptedResolutions(prev => {
         const next = new Set(prev);
         idsToFetch.forEach(id => next.add(id));
         return next;
      });
      // Trigger resolution
      onResolveUsers(idsToFetch);
      // Clear for next pass
      missingUsersRef.current.clear();
    }
  }); // Run on every render (commit phase)

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
          const other = parts.find(p => p !== currentUsername);
          name = other || channel.display_name;
          avatar = getAvatarUrl(name);
      }
    } else {
      avatar = `https://images.ecency.com/u/${channel.name}/avatar/small`;
    }
    return { name, avatar, isDm };
  };

  // ---------------- NOT LOGGED IN ----------------
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

  // ---------------- CONVERSATION VIEW ----------------
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
            onError={(e) => (e.target as HTMLImageElement).src = 'https://images.ecency.com/u/hive-1/avatar/small'}
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
              // 1. Determine Sender Name
              // Priority: Message Props (Bridge/Webhook) > UserMap (Cache) > Raw ID > Message Fields
              const propName = msg.props?.override_username || msg.props?.webhook_display_name || msg.props?.username;
              const directName = msg.username || msg.sender_name;
              
              const resolvedName = propName || userMap[msg.user_id] || directName;
              
              // Validation: Is it really resolved?
              // Standard Ecency ID is 26 chars. Usernames are usually shorter.
              // If it's 26 chars, treat as unresolved ID.
              const isResolved = resolvedName && resolvedName.length < 26 && !resolvedName.includes(' ');
              
              const displayName = isResolved ? resolvedName : '...';

              // JIT Collection: If we don't have a name, and haven't tried fetching this ID yet
              if (!isResolved && msg.user_id && msg.user_id.length > 20) {
                 if (!attemptedResolutions.has(msg.user_id)) {
                    missingUsersRef.current.add(msg.user_id);
                 }
              }

              // 2. Is it me?
              let isMe = false;
              if (currentUserId && msg.user_id === currentUserId) isMe = true;
              else if (displayName === currentUsername) isMe = true;

              return (
                <div key={msg.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  
                  {/* Avatar for Others */}
                  {!isMe && (
                    <div className="w-8 h-8 shrink-0 mt-1">
                      {isResolved ? (
                        <img 
                          src={getAvatarUrl(displayName)} 
                          alt={displayName}
                          className="w-8 h-8 rounded-full bg-slate-200 object-cover"
                          onError={(e) => (e.target as HTMLImageElement).src = 'https://images.ecency.com/u/hive-1/avatar/small'}
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

                    {/* Bubble */}
                    <div className={`
                      px-3 py-2 rounded-2xl text-sm break-words shadow-sm
                      ${isMe 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                      }
                    `}>
                      {msg.message}
                    </div>

                    {/* Timestamp */}
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
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
             placeholder="Username (e.g. mcfarhat)" 
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
      <div className="flex-1 overflow-y-auto -mx-4 px-4 space-y-1">
        {channels.length === 0 && !loadingChat && !chatSessionExpired ? (
          <div className="text-center py-10 text-slate-400 text-sm">
             <p>No conversations yet.</p>
             <p className="text-xs mt-1">Enter a Hive username above to chat.</p>
          </div>
        ) : (
          channels.map(channel => {
             const { name, avatar } = getChannelNameAndAvatar(channel);

             return (
               <button 
                 key={channel.id}
                 onClick={() => onSelectChannel(channel)}
                 className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all group text-left"
               >
                 <img 
                   src={avatar} 
                   onError={(e) => (e.target as HTMLImageElement).src = 'https://images.ecency.com/u/hive-1/avatar/small'}
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
          })
        )}
      </div>
    </div>
  );
};