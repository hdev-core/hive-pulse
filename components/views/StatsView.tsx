import React from 'react';
import { AppSettings } from '../../types';
import { NotificationList } from '../NotificationList';
import { Bell } from 'lucide-react';

interface NotificationsViewProps {
  settings: AppSettings;
  allFrontends: any[];
}

export const StatsView: React.FC<NotificationsViewProps> = ({ settings, allFrontends }) => {
  const username = settings.rcUser;

  if (!username) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
        <Bell size={32} className="opacity-25" />
        <p className="text-sm text-center px-6">No monitored user set. Log in or enter a username in Settings.</p>
      </div>
    );
  }

  return (
    <NotificationList
      username={username}
      settings={settings}
      allFrontends={allFrontends}
    />
  );
};
