import React from 'react';
import { Sliders } from 'lucide-react';
import { MobileTab } from '../types';

interface HeaderProps {
  hasVideo: boolean;
  isPlaying: boolean;
  mobileTab: MobileTab;
  setMobileTab: (tab: MobileTab) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

export const Header: React.FC<HeaderProps> = ({
  hasVideo,
  isPlaying,
  mobileTab,
  setMobileTab,
  isSidebarOpen,
  setIsSidebarOpen
}) => {
  return (
    <header className="h-14 sm:h-16 border-b border-[#222] flex items-center justify-between px-4 sm:px-8 shrink-0 bg-[#0A0A0B] z-30">
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="font-serif italic text-lg sm:text-xl tracking-tight text-white">Chroma.</span>
        <div className="h-3.5 w-[1px] bg-[#333]"></div>
        <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-[#888] font-bold">Studio</span>
      </div>

      {/* Mobile Navigation Tabs */}
      <div className="flex sm:hidden items-center bg-[#141416] p-1 rounded-lg border border-[#26262a]">
        <button
          onClick={() => setMobileTab('view')}
          className={`px-3 py-1 text-[10px] font-mono rounded transition-all ${
            mobileTab === 'view' ? 'bg-white text-black font-bold shadow' : 'text-[#888]'
          }`}
        >
          Video
        </button>
        <button
          onClick={() => setMobileTab('tune')}
          className={`px-3 py-1 text-[10px] font-mono rounded transition-all ${
            mobileTab === 'tune' ? 'bg-emerald-400 text-black font-bold shadow' : 'text-[#888]'
          }`}
        >
          Tuning
        </button>
        <button
          onClick={() => setMobileTab('export')}
          className={`px-3 py-1 text-[10px] font-mono rounded transition-all ${
            mobileTab === 'export' ? 'bg-white text-black font-bold shadow' : 'text-[#888]'
          }`}
        >
          Export
        </button>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        {hasVideo && (
          <span className="text-[10px] sm:text-[11px] uppercase tracking-widest text-[#666] font-mono">
            {isPlaying ? 'PLAY' : 'PAUSE'}
          </span>
        )}
        {/* Desktop Toggle Sidebar button */}
        <button
          onClick={() => setIsSidebarOpen(prev => !prev)}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-wider font-mono bg-[#141416] hover:bg-[#202024] border border-[#28282e] rounded text-[#aaa] hover:text-white transition-all"
          title={isSidebarOpen ? 'Thu gọn thanh điều khiển để mở rộng view' : 'Mở thanh điều khiển'}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{isSidebarOpen ? 'Max View' : 'Panel'}</span>
        </button>
      </div>
    </header>
  );
};
