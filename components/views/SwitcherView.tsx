
import React, { useState } from 'react';
import { CurrentTabState, ActionMode, FrontendId, FrontendConfig, AppSettings } from '../../types';
import { FrontendCard } from '../FrontendCard';
import { Link as LinkIcon, Wallet, PenLine } from 'lucide-react';

interface SwitcherViewProps {
  tabState: CurrentTabState;
  onSwitch: (id: FrontendId | string, mode: ActionMode) => void; // Updated id type
  allFrontends: FrontendConfig[]; // Changed from frontendsList
  updateSettings: (s: Partial<AppSettings>) => void;
  settings: AppSettings; // Added settings prop
}

export const SwitcherView: React.FC<SwitcherViewProps> = ({ tabState, onSwitch, allFrontends, updateSettings, settings }) => {
  const [actionMode, setActionMode] = useState<ActionMode>(ActionMode.SAME_PAGE);

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
            isActive={tabState.detectedFrontendId === frontend.id && actionMode === ActionMode.SAME_PAGE}
            onSwitch={(id) => onSwitch(id, actionMode)}
          />
        ))}
      </div>
    </div>
  );
};
