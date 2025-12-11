
import React from 'react';
import { DAPPS } from '../../constants';
import { 
  Sword, Coins, ShoppingCart, Video, Gamepad2, Vote,
  MessageCircle, MonitorPlay, Plane, Activity, Palette, Music, ExternalLink 
} from 'lucide-react';

export const AppsView: React.FC = () => {
  const renderDAppIcon = (name: string) => {
    const props = { size: 20, className: "text-slate-600" };
    switch(name) {
      case 'Sword': return <Sword {...props} />;
      case 'Coins': return <Coins {...props} />;
      case 'ShoppingCart': return <ShoppingCart {...props} />;
      case 'Video': return <Video {...props} />;
      case 'Gamepad2': return <Gamepad2 {...props} />;
      case 'Vote': return <Vote {...props} />;
      case 'MessageCircle': return <MessageCircle {...props} />;
      case 'MonitorPlay': return <MonitorPlay {...props} />;
      case 'Plane': return <Plane {...props} />;
      case 'Activity': return <Activity {...props} />;
      case 'Palette': return <Palette {...props} />;
      case 'Music': return <Music {...props} />;
      default: return <ExternalLink {...props} />;
    }
  };

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
            <div className="mb-3 p-3 bg-slate-50 rounded-full group-hover:scale-110 transition-transform duration-200">
              {renderDAppIcon(app.icon)}
            </div>
            <span className="text-sm font-bold text-slate-800">{app.name}</span>
            <span className="text-[10px] text-slate-400 mt-1 leading-tight">{app.description}</span>
          </a>
        ))}
      </div>
    </div>
  );
};
