import React, { useState } from 'react';
import { Layers, Plus, Trash2, X, ChevronLeft, ChevronRight, Film } from 'lucide-react';
import { VideoItem } from '../types';

interface VideoQueueVerticalBarProps {
  videoQueue: VideoItem[];
  activeIndex: number;
  setActiveIndex: (idx: number) => void;
  setVideoQueue: React.Dispatch<React.SetStateAction<VideoItem[]>>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isBatchExporting: boolean;
}

export const VideoQueueVerticalBar: React.FC<VideoQueueVerticalBarProps> = ({
  videoQueue,
  activeIndex,
  setActiveIndex,
  setVideoQueue,
  handleFileUpload,
  isBatchExporting
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (videoQueue.length === 0) return null;

  const removeVideo = (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBatchExporting) return;
    
    setVideoQueue(prev => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      // Revoke the removed object URL
      URL.revokeObjectURL(prev[indexToRemove].url);
      return updated;
    });

    if (activeIndex >= indexToRemove && activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const clearQueue = () => {
    if (isBatchExporting) return;
    videoQueue.forEach(v => URL.revokeObjectURL(v.url));
    setVideoQueue([]);
    setActiveIndex(0);
  };

  return (
    <div 
      className={`absolute left-3 top-16 bottom-20 z-20 transition-all duration-300 flex flex-col bg-[#0A0A0B]/90 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden select-none pointer-events-auto ${
        isCollapsed ? 'w-10 sm:w-11' : 'w-44 sm:w-52'
      }`}
    >
      {/* Top Header */}
      <div className="p-2 sm:p-2.5 border-b border-[#222] flex items-center justify-between bg-[#121215]/80 shrink-0">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          {!isCollapsed && (
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-[9px] uppercase tracking-wider font-mono text-[#aaa]">Queue</span>
              <span className="text-[8px] font-mono px-1 py-0.2 bg-white/10 rounded text-white font-bold">
                {videoQueue.length}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 text-[#666] hover:text-white transition-colors rounded hover:bg-white/5"
          title={isCollapsed ? 'Mở rộng danh sách video' : 'Thu gọn danh sách video'}
        >
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>

      {/* Video List (Scrollable) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
        {videoQueue.map((item, idx) => {
          const isActive = idx === activeIndex;
          return (
            <div
              key={idx}
              onClick={() => {
                if (!isBatchExporting) setActiveIndex(idx);
              }}
              className={`group relative flex items-center rounded-lg cursor-pointer transition-all ${
                isCollapsed ? 'justify-center p-2' : 'px-2.5 py-2 justify-between gap-1.5'
              } ${
                isActive
                  ? 'bg-emerald-500/15 border border-emerald-500/40 text-white shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                  : 'hover:bg-white/5 text-[#888] hover:text-[#ccc] border border-transparent'
              }`}
              title={`${idx + 1}. ${item.name}`}
            >
              {isCollapsed ? (
                <div className="flex flex-col items-center">
                  <span className={`text-[9px] font-mono font-bold ${isActive ? 'text-emerald-400' : 'text-[#777]'}`}>
                    {(idx + 1).toString().padStart(2, '0')}
                  </span>
                  {isActive && <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-0.5 animate-pulse" />}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`text-[9px] font-mono shrink-0 ${isActive ? 'text-emerald-400 font-bold' : 'text-[#666]'}`}>
                      {(idx + 1).toString().padStart(2, '0')}
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <Film className={`w-3 h-3 shrink-0 ${isActive ? 'text-emerald-400' : 'text-[#555]'}`} />
                      <span className="text-[10px] font-mono truncate">{item.name}</span>
                    </div>
                  </div>

                  {videoQueue.length > 1 && (
                    <button
                      onClick={(e) => removeVideo(idx, e)}
                      disabled={isBatchExporting}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-[#666] hover:text-red-400 transition-opacity shrink-0 rounded"
                      title="Xóa video khỏi danh sách"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="p-1.5 border-t border-[#222] bg-[#0E0E10] flex flex-col gap-1 shrink-0">
        <label 
          className={`flex items-center justify-center gap-1 py-1.5 bg-[#18181b] hover:bg-[#242429] border border-white/5 hover:border-white/20 rounded-lg cursor-pointer text-[#aaa] hover:text-white transition-all ${
            isCollapsed ? 'px-1' : 'px-2'
          }`}
          title="Thêm video vào queue"
        >
          <Plus className="w-3 h-3 shrink-0 text-emerald-400" />
          {!isCollapsed && <span className="text-[9px] font-mono uppercase tracking-wider">Thêm Video</span>}
          <input
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
            onChange={handleFileUpload}
          />
        </label>

        {!isCollapsed && videoQueue.length > 1 && (
          <button
            onClick={clearQueue}
            disabled={isBatchExporting}
            className="flex items-center justify-center gap-1 py-1 text-[8px] font-mono uppercase tracking-wider text-[#666] hover:text-red-400 transition-colors"
            title="Xóa toàn bộ hàng đợi"
          >
            <Trash2 className="w-2.5 h-2.5" />
            <span>Xóa tất cả</span>
          </button>
        )}
      </div>
    </div>
  );
};
