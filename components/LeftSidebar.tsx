
import React from 'react';
import { Article, Theme } from '../types';
import { BookOpenIcon, CheckCircleIcon } from './Icons';

interface LeftSidebarProps {
  articles: Article[]; // Articles in the current group
  currentArticleId: string | null;
  groupTitle?: string;
  onSelectArticle: (id: string) => void;
  onCloseMobile?: () => void;
  theme?: Theme;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
  articles, 
  currentArticleId, 
  groupTitle,
  onSelectArticle,
  onCloseMobile,
  theme = 'light' 
}) => {
  
  // Theme styling match
  const isDark = theme === 'dark' || theme === 'forest' || theme === 'amethyst';
  const bgColor = isDark ? 'bg-slate-900/95 border-white/10' : (theme === 'sepia' ? 'bg-[#f4ecd8] border-[#e8dfcc]' : 'bg-white border-slate-200');
  const textColor = isDark ? 'text-slate-200' : 'text-slate-800';
  const mutedText = isDark ? 'text-slate-500' : 'text-slate-400';
  const activeBg = isDark ? 'bg-indigo-500/20 text-indigo-300' : (theme === 'sepia' ? 'bg-[#b08d55]/20 text-[#5f4b32]' : 'bg-indigo-50 text-indigo-700');
  const hoverBg = isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50';

  return (
    <div className={`w-72 h-full flex flex-col border-r shadow-xl transition-colors ${bgColor}`}>
      {/* Header */}
      <div className={`p-5 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
        <div className="flex items-center gap-2 mb-1">
            <BookOpenIcon className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>Table of Contents</span>
        </div>
        <h2 className={`font-bold text-lg leading-tight line-clamp-2 ${textColor}`}>
            {groupTitle || "Current Collection"}
        </h2>
        <p className={`text-xs mt-1 ${mutedText}`}>
            {articles.length} Chapters
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {articles.map((article, idx) => {
                const isActive = article.id === currentArticleId;
                return (
                    <button
                        key={article.id}
                        onClick={() => {
                            onSelectArticle(article.id);
                            if (onCloseMobile) onCloseMobile();
                        }}
                        className={`w-full text-left px-3 py-3 rounded-lg text-sm transition-all flex items-start gap-3 group ${isActive ? activeBg : `${textColor} ${hoverBg}`}`}
                    >
                        <span className={`font-mono text-xs mt-0.5 opacity-50 ${isActive ? 'font-bold' : ''}`}>
                            {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="flex-1">
                            <span className={`font-medium line-clamp-2 ${isActive ? 'font-bold' : ''}`}>
                                {article.title}
                            </span>
                            {isActive && (
                                <span className="text-[10px] opacity-70 mt-1 block font-normal">
                                    Currently Reading
                                </span>
                            )}
                        </div>
                        {isActive && <CheckCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />}
                    </button>
                );
            })}
          </div>
      </div>
    </div>
  );
};
