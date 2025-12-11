
import React from 'react';
import { AppView } from '../types';
import { 
  ArrowLeftRight, MessageCircle, Share2, Activity, Grid, Settings 
} from 'lucide-react';

interface BottomNavProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  unreadMessages: number | null;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, setCurrentView, unreadMessages }) => {
  const navItems = [
    { id: AppView.SWITCHER, icon: ArrowLeftRight, label: 'Switcher' },
    { id: AppView.CHAT, icon: MessageCircle, label: 'Chat' },
    { id: AppView.SHARE, icon: Share2, label: 'Share' },
    { id: AppView.STATS, icon: Activity, label: 'Stats' },
    { id: AppView.APPS, icon: Grid, label: 'Apps' },
    { id: AppView.SETTINGS, icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="bg-white border-t border-slate-200 flex justify-between p-2 pb-3 sticky bottom-0 z-30">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setCurrentView(item.id)}
          className={`
            flex flex-col items-center gap-1 flex-1 p-1 rounded-lg transition-colors relative
            ${currentView === item.id ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}
          `}
        >
          <item.icon size={20} strokeWidth={currentView === item.id ? 2.5 : 2} />
          <span className="text-[10px] font-medium">{item.label}</span>
          
          {/* Unread Badge for Chat */}
          {item.id === AppView.CHAT && unreadMessages !== null && unreadMessages > 0 && (
             <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
          )}
        </button>
      ))}
    </nav>
  );
};
