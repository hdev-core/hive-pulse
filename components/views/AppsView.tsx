
import React from 'react';
import { DAPPS } from '../../constants';

export const AppsView: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Ecosystem DApps</p>
      <div className="grid grid-cols-2 gap-3">
        {DAPPS.map((app) => (
          <a 
            key={app.name}
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center text-center p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-blue-300 transition-all group"
          >
            <div className="mb-3 p-2 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform duration-200">
              <img 
                src={`/logos/${app.logo}`} 
                alt={app.name}
                className="w-8 h-8 object-contain"
                onError={(e) => {
                   // Fallback if image missing
                   (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <span className="text-sm font-bold text-slate-800">{app.name}</span>
            <span className="text-[10px] text-slate-400 mt-1 leading-tight">{app.description}</span>
          </a>
        ))}
      </div>
    </div>
  );
};
