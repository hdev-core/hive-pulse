
import React from 'react';
import { FrontendId } from '../types';

interface FrontendIconProps {
  id: FrontendId;
  color?: string;
  size?: number;
  className?: string;
}

export const FrontendIcon: React.FC<FrontendIconProps> = ({ id, color, size = 24, className = '' }) => {
  const style = { width: size, height: size, color: color };

  switch (id) {
    case FrontendId.PEAKD:
      // Official PeakD Logo (Two peaks)
      return (
        <svg viewBox="0 0 512 512" style={style} className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M256 0L0 512h512L256 0zm0 148.2l181.9 363.8H74.1L256 148.2z" opacity="0.4" />
          <path d="M256 220L112 512h288L256 220z" />
        </svg>
      );
    case FrontendId.ECENCY:
      // Official Ecency Logo Shape (The "Spark/Flame")
      return (
        <svg viewBox="0 0 585 585" style={style} className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M585 292.5c0 161.5-131 292.5-292.5 292.5S0 454 0 292.5 131 0 292.5 0 585 131 585 292.5zM388.5 267.4c-6.8-19.6-26.8-31.9-46.7-28.7-20 3.2-35.8 18.5-39.6 38.3-4.1 21.2 6.6 42.6 25.5 50.9 6.4 2.8 13.5 3.8 20.4 2.8 1.9-0.3 3.6 1.4 3 3.2-6.5 20.5-25.7 34.3-47.2 34.1-34.6-0.4-60.6-32.9-52.5-67 5.8-24.6 27.6-42.2 52.8-42.6 7.4-0.1 14.6 1.5 21.3 4.5 1.7 0.8 3.7-0.5 3.6-2.4-0.7-33-28-59.3-61.2-58.8-38.3 0.5-70.1 31.9-70.6 70.2-0.5 37.8 29.7 69.4 67.5 70.6 24.5 0.8 46.9-12.2 59.8-32.5 1-1.6-0.3-3.6-2.2-3.4-6.8 0.7-13.8-0.9-19.8-4.7-17.7-11.2-22.1-34.8-10.2-51.7 8.2-11.7 23.6-16.1 36.7-10.5 4.5 1.9 8.4 4.9 11.5 8.7 1.2 1.5 3.5 1.3 4.2-0.5 4.7-12 19.3-17.2 31.3-11 11.7 6 16.5 20.2 10.7 31.8l-1.6 3.2c-0.8 1.7 0.9 3.5 2.6 2.7 11.7-5.1 16.6-19.3 10.9-31.1-2.9-6.1-8-10.6-14.3-12.7 1.9-0.9 3-2.9 2.5-4.8z"/>
        </svg>
      );
    case FrontendId.HIVEBLOG:
      // Official Hive Blockchain Logo
      return (
        <svg viewBox="0 0 100 100" style={style} className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M68.6 34.2L50 23.5L31.4 34.2V55.8L50 66.5L68.6 55.8V34.2ZM29.4 60.8L15.3 52.7V27.3L37.3 14.6L48.1 20.8L29.4 31.6V60.8ZM70.6 60.8V31.6L51.9 20.8L62.7 14.6L84.7 27.3V52.7L70.6 60.8ZM51.9 69.2L70.6 80L84.7 71.9V60L65.3 71.2L51.9 78.9V69.2ZM48.1 69.2V78.9L34.7 71.2L15.3 60V71.9L29.4 80L48.1 69.2Z" />
        </svg>
      );
    case FrontendId.INLEO:
      // Official InLeo / LeoFinance Lion Logo
      return (
        <svg viewBox="0 0 500 500" style={style} className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M250 445c-23.7 0-43-19.3-43-43V268.6c0-10.7 8.7-19.4 19.4-19.4h47.2c10.7 0 19.4 8.7 19.4 19.4V402c0 23.7-19.3 43-43 43z"/>
          <path d="M250 55C142.3 55 55 142.3 55 250s87.3 195 195 195c10.7 0 19.4-8.7 19.4-19.4V268.6c0-10.7-8.7-19.4-19.4-19.4h-47.2c-10.7 0-19.4 8.7-19.4 19.4v106.8c-71.1-15.6-124.6-78.5-124.6-154.2 0-87.1 70.9-158 158-158s158 70.9 158 158c0 10.7 8.7 19.4 19.4 19.4S414.2 231.9 414.2 221.2C414.2 130.5 340.7 55 250 55z"/>
          <circle cx="363.3" cy="336.1" r="28.9"/>
        </svg>
      );
    case FrontendId.ACTIFIT:
      // Official Actifit Logo Shape
      return (
        <svg viewBox="0 0 200 200" style={style} className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
           <path d="M100 0C44.8 0 0 44.8 0 100s44.8 100 100 100 100-44.8 100-100S155.2 0 100 0zm0 180c-44.1 0-80-35.9-80-80s35.9-80 80-80 80 35.9 80 80-35.9 80-80 80z"/>
           <path d="M125 60h-15l-35 80h18l10-25h34l10 25h18l-35-80zm-15 40l10-25 10 25h-20z"/>
           <circle cx="65" cy="85" r="8"/>
           <circle cx="155" cy="95" r="8"/>
        </svg>
      );
    case FrontendId.WAIVIO:
      // Official Waivio 'W' Logo
      return (
        <svg viewBox="0 0 480 480" style={style} className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M109.4 80L50 299.7h72.8l24.4-118.6 37.1 118.6h63.2l37.1-118.6 24.4 118.6H382L322.6 80h-68.9l-37.7 131.9L178.3 80h-68.9z"/>
        </svg>
      );
    case FrontendId.LIKETU:
      // Official Liketu Logo (Heart with Aperture)
      return (
        <svg viewBox="0 0 24 24" style={style} className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
           <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
           <circle cx="16.5" cy="8.5" r="2.5" fill="white" opacity="0.9"/>
        </svg>
      );
    case FrontendId.HIVESCAN:
      // Block Explorer / Search Icon
      return (
        <svg viewBox="0 0 24 24" style={style} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
           <circle cx="11" cy="11" r="8"></circle>
           <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" style={style} className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v12M6 12h12" />
        </svg>
      );
  }
};
