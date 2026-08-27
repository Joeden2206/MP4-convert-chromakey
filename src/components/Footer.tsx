import React from 'react';
import { formatTime } from '../utils/formatUtils';

interface FooterProps {
  hasVideo: boolean;
  isExporting: boolean;
  isPlaying: boolean;
  currentTime: number;
}

export const Footer: React.FC<FooterProps> = ({
  hasVideo,
  isExporting,
  isPlaying,
  currentTime
}) => {
  return (
    <footer className="h-10 sm:h-12 border-t border-[#222] flex items-center px-4 sm:px-8 justify-between bg-[#050505] shrink-0">
      <div className="flex gap-4 sm:gap-8">
        <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[#444] hidden xs:inline">Alpha_Extract</span>
        {hasVideo && (
          <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[#666] font-mono">
            {isExporting ? 'Exporting' : isPlaying ? 'Playing' : 'Ready'} | {formatTime(currentTime)}
          </span>
        )}
      </div>
      <div className="flex gap-3 sm:gap-4 items-center">
        <div className="w-16 sm:w-24 h-1 bg-[#222] overflow-hidden">
          <div className="h-full bg-[#10B981] w-[45%]"></div>
        </div>
        <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[#444]">GPU: Active</span>
      </div>
    </footer>
  );
};
