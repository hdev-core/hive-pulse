
import React from 'react';
import { DAPPS } from '../../constants';
import { DAppConfig } from '../../types';

export const AppsView: React.FC = () => {
  const categories = ['Social', 'Game', 'DeFi', 'Video', 'Tool'] as const;

  const groupedDapps = categories.reduce((acc, category) => {
    acc[category] = DAPPS.filter(app => app.category === category);
    return acc;
  }, {} as Record<string, DAppConfig[]>);

  const getLogoSrc = (logo: string) => {
    if (logo.startsWith('http')) {
      return logo;
    }
    return `/logos/${logo}`;
  };

  return (
    <div className="flex flex-col gap-6 pb-4">
      {categories.map((category) => (
        <div key={category} className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{category}</h2>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {groupedDapps[category].map((app) => (
              <a 
                key={app.name}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center text-center p-3 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-blue-300 transition-all group"
              >
                <div className="mb-2 p-1.5 bg-slate-50 rounded-lg group-hover:scale-110 transition-transform duration-200">
                  <img 
                    src={getLogoSrc(app.logo)} 
                    alt={app.name}
                    className="w-7 h-7 object-contain"
                    onError={(e) => {
                       // Fallback if image missing
                       const target = e.target as HTMLImageElement;
                       target.src = 'https://images.ecency.com/u/hive-131131/avatar/small';
                    }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-800 line-clamp-1">{app.name}</span>
                <span className="text-[9px] text-slate-400 mt-0.5 leading-tight line-clamp-2">{app.description}</span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
