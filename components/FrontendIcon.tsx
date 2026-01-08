
import React, { useState } from 'react';
import { FrontendId } from '../types';

interface FrontendIconProps {
  id: FrontendId | string;
  logoUrl?: string;
  color?: string;
  size?: number;
  className?: string;
}

export const FrontendIcon: React.FC<FrontendIconProps> = ({ id, logoUrl, color, size = 24, className = '' }) => {
  const [imgError, setImgError] = useState(false);

  const getBuiltInLogoName = (fid: FrontendId) => {
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

  let imgSrc: string | null = null;

  if (logoUrl) {
    imgSrc = logoUrl;
  } else if (Object.values(FrontendId).includes(id as FrontendId)) {
    const filename = getBuiltInLogoName(id as FrontendId);
    if (filename) {
      imgSrc = `/logos/${filename}`;
    }
  }

  // If we have an image source and haven't encountered an error loading it, show the image
  if (imgSrc && !imgError) {
    return (
      <img
        src={imgSrc}
        alt={typeof id === 'string' ? id : FrontendId[id]}
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
