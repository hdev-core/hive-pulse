
import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, FrontendId, FrontendConfig } from '../../types';
import { FrontendIcon } from '../FrontendIcon';
import { 
  ShieldCheck, User, Activity, KeyRound, LogOut, Check, Bell, GripVertical, Grid 
} from 'lucide-react'; // Added GripVertical for drag handle

interface SettingsViewProps {
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  loginError: string | null;
  allFrontends: FrontendConfig[]; // New prop
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings, updateSettings, onLogin, onLogout, isLoggingIn, loginError, allFrontends
}) => {
  const [orderedFrontends, setOrderedFrontends] = useState<FrontendConfig[]>([]);
  const dragItem = useRef<FrontendId | null>(null);
  const dragOverItem = useRef<FrontendId | null>(null);

  // Initialize orderedFrontends based on activeFrontendIds and allFrontends
  useEffect(() => {
    const activeMap = new Map(allFrontends.map(f => [f.id, f]));
    const newOrdered: FrontendConfig[] = [];

    // Add active frontends in their saved order
    settings.activeFrontendIds.forEach(id => {
      const frontend = activeMap.get(id);
      if (frontend) {
        newOrdered.push({ ...frontend, active: true });
        activeMap.delete(id); // Remove from map
      }
    });

    // Add inactive frontends (those not in activeFrontendIds) at the end
    // Preserve original order for inactive ones
    allFrontends.forEach(f => {
      if (activeMap.has(f.id)) {
        newOrdered.push({ ...f, active: false });
      }
    });

    setOrderedFrontends(newOrdered);
  }, [allFrontends, settings.activeFrontendIds]);

  const isFrontendActive = (id: FrontendId) => settings.activeFrontendIds.includes(id);

  const handleToggleActive = (id: FrontendId) => {
    let newActiveFrontendIds: FrontendId[];
    if (isFrontendActive(id)) {
      newActiveFrontendIds = settings.activeFrontendIds.filter(fId => fId !== id);
    } else {
      // Add to the end of the active list when activating
      newActiveFrontendIds = [...settings.activeFrontendIds, id];
    }
    updateSettings({ activeFrontendIds: newActiveFrontendIds });
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: FrontendId) => {
    dragItem.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: FrontendId) => {
    e.preventDefault();
    dragOverItem.current = id;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropId: FrontendId) => {
    e.preventDefault();
    const draggedId = dragItem.current;
    
    if (draggedId === null || draggedId === dropId) return;

    const newOrderedIds = [...settings.activeFrontendIds];
    const draggedIndex = newOrderedIds.indexOf(draggedId);
    const droppedIndex = newOrderedIds.indexOf(dropId);

    // Only reorder if both are currently active
    if (draggedIndex !== -1 && droppedIndex !== -1) {
      const [removed] = newOrderedIds.splice(draggedIndex, 1);
      newOrderedIds.splice(droppedIndex, 0, removed);
      updateSettings({ activeFrontendIds: newOrderedIds });
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
  };
  return (
    <div className="flex flex-col gap-6">
      
      {/* Ecency Chat Config */}
      <section className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm ring-1 ring-blue-50">
         <div className="flex items-center gap-2 mb-4 border-b border-blue-100 pb-2">
            <ShieldCheck size={18} className="text-blue-600" />
            <span className="font-semibold text-sm text-slate-800">Ecency Chat</span>
         </div>
         
         {!settings.ecencyAccessToken ? (
           <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                  <User size={12} /> Hive Username
                </label>
                <input 
                  type="text" 
                  placeholder="username (no @)"
                  value={settings.ecencyUsername || ''}
                  onChange={(e) => updateSettings({ ecencyUsername: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {loginError && (
                <div className="p-2 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                  {loginError}
                </div>
              )}

              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                 {isLoggingIn ? <Activity size={16} className="animate-spin" /> : <KeyRound size={16} />}
                 {isLoggingIn ? 'Verifying...' : 'Login with Keychain'}
              </button>
              
              <p className="text-[10px] text-center text-slate-400">
                 Securely signs a message. Keys never leave Keychain.
              </p>
           </div>
         ) : (
           <div className="space-y-3">
              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                   <span className="text-sm font-medium text-blue-900">Logged in as @{settings.ecencyUsername}</span>
                 </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 py-2 rounded-lg font-medium text-xs transition-colors"
              >
                 <LogOut size={14} /> Disconnect
              </button>
           </div>
         )}
      </section>

      {/* Notifications Section */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
            <Bell size={18} className="text-slate-500" />
            <span className="font-semibold text-sm text-slate-800">Background Chat Monitoring</span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-600">Enable Notifications</span>
          <button 
            onClick={() => updateSettings({ notificationsEnabled: !settings.notificationsEnabled })}
            className={`
              w-11 h-6 rounded-full transition-colors relative
              ${settings.notificationsEnabled ? 'bg-emerald-500' : 'bg-slate-200'}
            `}
          >
            <div className={`
              w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm
              ${settings.notificationsEnabled ? 'left-6' : 'left-1'}
            `} />
          </button>
        </div>

        {settings.notificationsEnabled && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
             <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Chat Check Frequency</label>
             <select 
               value={settings.notificationInterval || 1}
               onChange={(e) => updateSettings({ notificationInterval: Number(e.target.value) })}
               className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
             >
                <option value={1}>Every 1 minute</option>
                <option value={3}>Every 3 minutes</option>
                <option value={5}>Every 5 minutes</option>
                <option value={10}>Every 10 minutes</option>
                <option value={15}>Every 15 minutes</option>
             </select>
             <p className="text-[10px] text-slate-400 mt-1">
               Controls how frequently the extension checks for new chat messages in the background.
             </p>
          </div>
        )}
      </section>

      {/* Auto Redirect Section */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-slate-800">Auto-Redirect</span>
            <span className="text-xs text-slate-500">Always open Hive links in...</span>
          </div>
          <button 
            onClick={() => updateSettings({ autoRedirect: !settings.autoRedirect })}
            className={`
              w-11 h-6 rounded-full transition-colors relative
              ${settings.autoRedirect ? 'bg-emerald-500' : 'bg-slate-200'}
            `}
          >
            <div className={`
              w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm
              ${settings.autoRedirect ? 'left-6' : 'left-1'}
            `} />
          </button>
        </div>

        {settings.autoRedirect && (
           <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
             <label className="text-xs font-medium text-slate-500 uppercase">Preferred Frontend</label>
             <div className="grid grid-cols-1 gap-2">
               {FRONTENDS.map(f => (
                 <button
                   key={f.id}
                   onClick={() => updateSettings({ preferredFrontendId: f.id })}
                   className={`
                     flex items-center gap-3 p-2 rounded-lg border text-left transition-all
                     ${settings.preferredFrontendId === f.id 
                       ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' 
                       : 'bg-white border-slate-200 hover:bg-slate-50'}
                   `}
                 >
                    <FrontendIcon id={f.id} color={f.color} size={18} />
                    <span className="text-sm font-medium">{f.name}</span>
                    {settings.preferredFrontendId === f.id && <Check size={16} className="ml-auto text-emerald-600" />}
                 </button>
               ))}
             </div>
           </div>
        )}
      </section>

      {/* Frontend Display Order Section */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
            <Grid size={18} className="text-slate-500" />
            <span className="font-semibold text-sm text-slate-800">Frontend Display Order</span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Drag and drop to reorder active frontends. Toggle to activate/deactivate.
        </p>

        <div className="flex flex-col gap-2">
          {orderedFrontends.map((frontend, index) => (
            <div
              key={frontend.id}
              draggable
              onDragStart={(e) => handleDragStart(e, frontend.id)}
              onDragOver={(e) => handleDragOver(e, frontend.id)}
              onDrop={(e) => handleDrop(e, frontend.id)}
              onDragEnd={handleDragEnd}
              className={`
                flex items-center justify-between p-2 rounded-lg border transition-all
                ${isFrontendActive(frontend.id) ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 opacity-60'}
              `}
            >
              <div className="flex items-center gap-3">
                <button className="cursor-grab text-slate-400 hover:text-slate-600">
                  <GripVertical size={16} />
                </button>
                <FrontendIcon id={frontend.id} color={frontend.color} size={18} />
                <span className="text-sm font-medium">{frontend.name}</span>
              </div>

              <button
                onClick={() => handleToggleActive(frontend.id)}
                className={`
                  w-11 h-6 rounded-full transition-colors relative
                  ${isFrontendActive(frontend.id) ? 'bg-emerald-500' : 'bg-slate-200'}
                `}
              >
                <div className={`
                  w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm
                  ${isFrontendActive(frontend.id) ? 'left-6' : 'left-1'}
                `} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* General Behavior */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <span className="font-semibold text-sm text-slate-800 block mb-3">General Behavior</span>
                <label className="flex items-center justify-between cursor-pointer mb-3">
                  <span className="text-sm text-slate-600">Open links in new tab</span>
                  <input
                    type="checkbox"
                    checked={settings.openInNewTab}
                    onChange={(e) => updateSettings({ openInNewTab: e.target.checked })}
                    className="accent-emerald-500 w-4 h-4"
                  />
                </label>
                
                <label className="flex items-center justify-between cursor-pointer mb-3">
                  <span className="text-sm text-slate-600">Prioritize unread message badge</span>
                  <input 
                    type="checkbox" 
                    checked={settings.overrideBadgeWithUnreadMessages} 
                    onChange={(e) => updateSettings({ overrideBadgeWithUnreadMessages: e.target.checked })}
                    className="accent-emerald-500 w-4 h-4"
                  />
                </label>
                
                {/* Show saved RC user in settings */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                   <span className="text-sm text-slate-600">Monitored User (Stats)</span>
                   <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                     {settings.rcUser || 'None'}
                   </span>
                </div>      </section>

    </div>
  );
};
