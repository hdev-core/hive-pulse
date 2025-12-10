import React from 'react';
import { FrontendConfig, FrontendId } from '../types';
import { FrontendIcon } from './FrontendIcon';

interface FrontendCardProps {
  config: FrontendConfig;
  isActive: boolean;
  onSwitch: (id: FrontendId) => void;
}

export const FrontendCard: React.FC<FrontendCardProps> = ({ config, isActive, onSwitch }) => {
  return (
    <button
      onClick={() => onSwitch(config.id)}
      disabled={isActive}
      className={`
        relative flex flex-col items-start w-full p-3 rounded-lg border transition-all duration-200
        ${isActive 
          ? 'bg-gray-100 border-gray-200 cursor-default opacity-60' 
          : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer active:scale-[0.98]'
        }
      `}
    >
      <div className="flex items-center justify-between w-full mb-1">
        <div className="flex items-center gap-2">
          {/* Icon Container */}
          <div className={`
             w-7 h-7 rounded flex items-center justify-center
             ${isActive ? 'grayscale opacity-70' : ''}
          `}>
             <FrontendIcon id={config.id} color={config.color} size={24} />
          </div>
          
          <span className={`font-semibold text-sm ${isActive ? 'text-gray-500' : 'text-gray-800'}`}>
            {config.name}
          </span>
        </div>
        {isActive && (
          <span className="text-xs font-medium text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
            Current
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 text-left leading-tight pl-9">
        {config.description}
      </p>
    </button>
  );
};