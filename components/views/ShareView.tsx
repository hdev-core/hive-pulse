
import React, { useState } from 'react';
import { CurrentTabState, ActionMode, FrontendId } from '../../types';
import { FRONTENDS } from '../../constants';
import { getTargetUrl } from '../../utils/urlHelpers';
import { FrontendIcon } from '../FrontendIcon';
import { Link as LinkIcon, Info, Copy, Check } from 'lucide-react';

interface ShareViewProps {
  tabState: CurrentTabState;
}

export const ShareView: React.FC<ShareViewProps> = ({ tabState }) => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 1500);
  };

  if (!tabState.isHiveUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
        <div className="bg-slate-100 p-4 rounded-full mb-3">
          <LinkIcon size={24} className="opacity-50" />
        </div>
        <p className="text-sm font-medium text-slate-700">No Hive Context Detected</p>
        <p className="text-xs mt-1 max-w-[200px]">
          Navigate to a Hive frontend (like PeakD or Ecency) to generate shareable links for the current page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800 flex gap-2">
        <Info size={16} className="shrink-0" />
        <p>Generate links for this page on other frontends to share with friends.</p>
      </div>

      <div className="flex flex-col gap-2">
        {FRONTENDS.map((frontend) => {
           const url = getTargetUrl(frontend.id, tabState.path, ActionMode.SAME_PAGE, tabState.username);
           const isCopied = copiedLink === frontend.id;
           return (
            <div key={frontend.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded">
                 <FrontendIcon id={frontend.id} color={frontend.color} size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700 truncate">{frontend.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{url}</p>
              </div>
              <button 
                onClick={() => handleCopy(url, frontend.id)}
                className={`
                  p-2 rounded-md transition-all
                  ${isCopied ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                `}
              >
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
           );
        })}
      </div>
    </div>
  );
};
