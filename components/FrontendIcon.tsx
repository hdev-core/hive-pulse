
import React, { useState } from 'react';
import { FrontendId } from '../types';

interface FrontendIconProps {
  id: FrontendId;
  color?: string; // Kept for fallback
  size?: number;
  className?: string;
}

export const FrontendIcon: React.FC<FrontendIconProps> = ({ id, color, size = 24, className = '' }) => {
  const [imgError, setImgError] = useState(false);

  const getLogoName = (fid: FrontendId) => {
    switch (fid) {
      case FrontendId.PEAKD: return 'peakd.png';
      case FrontendId.ECENCY: return 'ecency.png';
      case FrontendId.HIVEBLOG: return 'hiveblog.png';
      case FrontendId.INLEO: return 'inleo.png';
      case FrontendId.ACTIFIT: return 'actifit.png';
      case FrontendId.WAIVIO: return 'waivio.png';
      case FrontendId.LIKETU: return 'liketu.png';
      case FrontendId.HIVESCAN: return 'hivescan.png';
      default: return null;
    }
  };

  const filename = getLogoName(id);

  // If we have a filename and haven't encountered an error loading it, show the image
  if (filename && !imgError) {
    return (
      <img 
        src={`/logos/${filename}`} 
        alt={id}
        style={{ width: size, height: size, objectFit: 'contain' }}
        className={className}
        onError={() => setImgError(true)}
      />
    );
  }

  // FALLBACK: Generic SVG placeholder
  return (
    <svg 
      viewBox="0 0 24 24" 
      style={{ width: size, height: size, color: color }} 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
};
