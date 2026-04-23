
import React, { useState } from 'react';
import { CurrentTabState, ActionMode, FrontendId, FrontendConfig, AppSettings } from '../../types';
import { FrontendCard } from '../FrontendCard';
import { Link as LinkIcon, Wallet, PenLine, ChevronDown, Grid } from 'lucide-react';
import { DAPPS } from '../../constants';
import { DAppConfig } from '../../types';
import UserSearch from '../../UserSearch';

interface SwitcherViewProps {
  tabState: CurrentTabState;
  onSwitch: (id: FrontendId | string, mode: ActionMode, usernameOverride?: string) => void; // Updated id type
  allFrontends: FrontendConfig[]; // Changed from frontendsList
  updateSettings: (s: Partial<AppSettings>) => void;
  settings: AppSettings; // Added settings prop
}

export const SwitcherView: React.FC<SwitcherViewProps> = ({ tabState, onSwitch, allFrontends, updateSettings, settings }) => {
  const [actionMode, setActionMode] = useState<ActionMode>(ActionMode.SAME_PAGE);
  const [searchedUser, setSearchedUser] = useState<string | null>(null);
  const [appsOpen, setAppsOpen] = useState(false);

  // Ensure displayFrontends are ordered according to activeFrontendIds from settings
  const displayFrontends = settings.activeFrontendIds
    .map(id => allFrontends.find(f => f.id === id))
    .filter(Boolean) as FrontendConfig[];

  const detectedFrontend = displayFrontends.find(f => f.id === tabState.detectedFrontendId);
  const detectedName = detectedFrontend ? detectedFrontend.name : 'Unknown';

  const MODES = [
    { 
      mode: ActionMode.SAME_PAGE, 
      icon: LinkIcon, 
      label: 'Link', 
      desc: 'Opens the exact same profile or post on the target.' 
    },
    { 
      mode: ActionMode.WALLET, 
      icon: Wallet, 
      label: 'Wallet', 
      desc: 'Goes directly to the wallet or transfers page.' 
    },
    { 
      mode: ActionMode.COMPOSE, 
      icon: PenLine, 
      label: 'Post', 
      desc: 'Opens the post editor to start writing.' 
    }
  ];

  const activeDesc = MODES.find(m => m.mode === actionMode)?.desc;

  return (
    <div className="flex flex-col gap-4">
      <div className={`
        text-sm px-3 py-2 rounded-lg border flex items-center justify-between shadow-sm
        ${tabState.isHiveUrl 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
          : 'bg-white border-slate-200 text-slate-600'
        }
      `}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${tabState.isHiveUrl ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          <span className="text-xs font-semibold">
            {tabState.isHiveUrl ? `On ${detectedName}` : 'No Hive frontend detected'}
          </span>
        </div>
        {tabState.username && (
          <span className="text-xs font-mono bg-white/50 px-1.5 py-0.5 rounded text-emerald-800 border border-emerald-100">
            @{tabState.username}
          </span>
        )}
      </div>

      <UserSearch onUserSelect={(u) => setSearchedUser(u)} />

      <div className="flex flex-col gap-2">
        <div className="bg-slate-200/60 p-1 rounded-lg flex gap-1">
          {MODES.map((item) => (
            <button
              key={item.mode}
              onClick={() => setActionMode(item.mode)}
              className={`
                flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all
                ${actionMode === item.mode 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }
              `}
            >
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </div>
        <div className="text-center px-2">
           <p className="text-[10px] text-slate-400 font-medium">
             {activeDesc}
           </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {displayFrontends.map((frontend) => (
          <FrontendCard 
            key={frontend.id}
            config={frontend}
            isActive={!searchedUser && tabState.detectedFrontendId === frontend.id && actionMode === ActionMode.SAME_PAGE}
            onSwitch={(id) => onSwitch(id, actionMode, searchedUser || undefined)}
          />
        ))}
      </div>

      {/* dApps quick links */}
      <div className="mt-2">
        <button
          onClick={() => setAppsOpen(!appsOpen)}
          className="w-full flex items-center justify-between px-1 py-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Grid size={14} />
            <span className="font-semibold uppercase tracking-widest">dApps & Tools</span>
          </div>
          <ChevronDown size={14} className={`transition-transform ${appsOpen ? 'rotate-180' : ''}`} />
        </button>
        {appsOpen && (
          <div className="grid grid-cols-3 gap-2 mt-1">
            {DAPPS.slice(0, 6).map((app) => (
              <a
                key={app.name}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center text-center p-2 bg-white border border-slate-200 rounded-lg hover:shadow-sm hover:border-blue-300 transition-all"
              >
                <div className="mb-1 p-1 bg-slate-50 rounded">
                  <img
                    src={app.logo.startsWith('http') ? app.logo : `/logos/${app.logo}`}
                    alt={app.name}
                    className="w-5 h-5 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-700 line-clamp-1">{app.name}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
