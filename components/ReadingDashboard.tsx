
import React, { useEffect, useState } from 'react';
import { ClockIcon, ChartBarIcon, SparklesIcon, BookOpenIcon, ArrowLeftIcon } from './Icons';
import { ReadingSession } from '../types';

interface ReadingDashboardProps {
    wordCount: number;
    progress: number; // 0-100
    isActive: boolean; // Is the user currently reading (tab active)
    themeAccent: string; // CSS class for accent color text
    sessions: ReadingSession[]; // History of sessions for this article
}

export const ReadingDashboard: React.FC<ReadingDashboardProps> = ({ 
    wordCount, 
    progress, 
    isActive,
    themeAccent,
    sessions
}) => {
    const [seconds, setSeconds] = useState(0);
    const [qualityScore, setQualityScore] = useState(85);
    const [showHistory, setShowHistory] = useState(false);
    // On mobile, start collapsed (minimized)
    const [isMinimized, setIsMinimized] = useState(false);

    // Auto-minimize on mobile on mount
    useEffect(() => {
        if (window.innerWidth < 1024) {
            setIsMinimized(true);
        }
    }, []);

    // Timer Logic
    useEffect(() => {
        let interval: any = null;
        if (isActive) {
            interval = setInterval(() => {
                setSeconds(s => s + 1);
            }, 1000);
        } else if (!isActive && seconds !== 0) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isActive]);

    // Simple "Quality" simulation
    useEffect(() => {
        if (progress > 95) setQualityScore(98);
        else {
            const random = Math.random() > 0.5 ? 1 : -1;
            setQualityScore(prev => Math.min(100, Math.max(70, prev + (isActive ? 0 : random * 0.5))));
        }
    }, [seconds, progress, isActive]);

    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        return mins > 0 ? `${mins} m` : `${totalSeconds} s`;
    };

    const formatDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    const totalHistorySeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);

    // Minimized View (Mobile friendly pill)
    if (isMinimized) {
        return (
            <div 
                className="fixed right-4 top-20 z-30 animate-fade-in cursor-pointer group"
                onClick={() => setIsMinimized(false)}
            >
                <div className="bg-white/90 backdrop-blur-md border border-slate-200 shadow-lg rounded-full px-3 py-1.5 flex items-center gap-3 hover:scale-105 transition-transform">
                    <div className="flex items-center gap-1.5">
                        <ClockIcon className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-xs font-mono font-bold text-slate-700">
                            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
                        </span>
                    </div>
                    <div className="w-px h-3 bg-slate-200"></div>
                    <span className="text-xs font-bold text-emerald-600">{progress.toFixed(0)}%</span>
                </div>
            </div>
        );
    }

    // Expanded View
    return (
        <div className="fixed right-4 top-20 z-30 flex flex-col gap-4 animate-fade-in transition-all items-end">
            {/* Main Dashboard */}
            <div className="bg-white/90 backdrop-blur-md border border-slate-200 p-5 rounded-2xl shadow-xl w-56 text-slate-800 transition-all hover:shadow-2xl hover:bg-white/95 group relative">
                
                {/* Close/Minimize Button */}
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
                    className="absolute top-2 right-2 p-1 text-slate-300 hover:text-slate-500 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                </button>

                {/* Header */}
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">当前会话</span>
                    </div>
                </div>

                {/* Real-time Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <div className="text-[10px] text-slate-400 mb-0.5 flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" /> 时间
                        </div>
                        <div className="text-xl font-mono font-bold text-slate-700 tracking-tight">
                            {Math.floor(seconds / 60)}<span className="text-xs text-slate-400 font-normal">m</span> {seconds % 60}<span className="text-xs text-slate-400 font-normal">s</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-400 mb-0.5 flex items-center gap-1">
                            <ChartBarIcon className="w-3 h-3" /> 进度
                        </div>
                        <div className="text-xl font-mono font-bold text-indigo-600 tracking-tight">
                            {progress.toFixed(0)}<span className="text-sm">%</span>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
                    <div 
                        className={`h-full transition-all duration-300 ${isActive ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-slate-400'}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Footer / Toggle History */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <SparklesIcon className="w-3 h-3 text-amber-400" />
                        <span>Quality: {Math.round(qualityScore)}</span>
                    </div>
                    <button 
                        onClick={() => setShowHistory(!showHistory)}
                        className="text-[10px] font-bold text-indigo-500 hover:bg-indigo-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                    >
                        {showHistory ? '收起记录' : '历史足迹'}
                        <ArrowLeftIcon className={`w-3 h-3 transition-transform ${showHistory ? '-rotate-90' : 'rotate-180'}`} />
                    </button>
                </div>
            </div>

            {/* History Card (Collapsible) */}
            {showHistory && (
                <div className="bg-white/90 backdrop-blur-md border border-slate-200 p-0 rounded-2xl shadow-xl w-56 overflow-hidden animate-slide-in-right">
                    <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">历史会话 ({sessions.length})</span>
                        <span className="text-[10px] text-slate-400">Total: {formatTime(totalHistorySeconds)}</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                        {sessions.length === 0 ? (
                            <div className="text-center py-4 text-xs text-slate-400">暂无历史记录</div>
                        ) : (
                            sessions.slice(0, 5).map((session) => (
                                <div key={session.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg transition-colors group">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-600">{formatDate(session.startTime)}</span>
                                        <span className="text-[9px] text-slate-400">{new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-mono font-bold text-indigo-600">{formatTime(session.durationSeconds)}</div>
                                        <div className="text-[9px] text-slate-400">至 {session.maxProgress}%</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
