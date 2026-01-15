import React from 'react';

interface GaugeProps {
  percentage: number;
  isLow: boolean;
  icon: React.ReactNode;
  label?: string;
  subValue?: string;
  type: 'VP' | 'RC';
  size?: number; // width/height in px
  strokeWidth?: number;
  showLabel?: boolean;
}

export const Gauge: React.FC<GaugeProps> = ({ 
  percentage, 
  isLow, 
  icon, 
  label, 
  subValue, 
  type, 
  size = 112, 
  strokeWidth = 8,
  showLabel = true
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  // Color logic
  const color = isLow ? '#ef4444' : (type === 'RC' ? '#a855f7' : '#10b981');

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle 
            cx={size / 2} 
            cy={size / 2} 
            r={radius} 
            stroke="#f1f5f9" 
            strokeWidth={strokeWidth} 
            fill="none" 
          />
          {/* Progress Circle */}
          <circle
            cx={size / 2} 
            cy={size / 2} 
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            style={{
              strokeDasharray: circumference, 
              strokeDashoffset: offset,
              transition: 'stroke-dashoffset 1s ease-in-out'
            }}
          />
        </svg>
        
        {/* Inner Content (Icon + %) */}
        <div className="absolute flex flex-col items-center justify-center">
          {icon}
          <span className={`font-bold text-slate-800 ${size < 60 ? 'text-[10px]' : 'text-xl mt-1'}`}>
            {percentage.toFixed(size < 60 ? 0 : 2)}%
          </span>
        </div>
      </div>
      
      {showLabel && label && (
        <span className="text-sm font-medium text-slate-600 mt-1">{label}</span>
      )}
      {showLabel && subValue && (
        <span className="text-xs text-slate-400">{subValue}</span>
      )}
    </div>
  );
};
