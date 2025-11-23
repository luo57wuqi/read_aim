
import React from 'react';
import { SavedItem, Theme } from '../types';
import { BookmarkIcon, TrashIcon, CardIcon, BookOpenIcon } from './Icons';

interface SidebarProps {
  savedItems: SavedItem[];
  onRemoveItem: (id: string) => void;
  onSelectSavedItem: (item: SavedItem) => void;
  onViewCard: (item: SavedItem) => void;
  theme?: Theme;
}

export const Sidebar: React.FC<SidebarProps> = ({ savedItems, onRemoveItem, onSelectSavedItem, onViewCard, theme = 'light' }) => {
  
  // Theme-based style overrides
  const isDark = theme === 'dark' || theme === 'forest' || theme === 'amethyst';
  const bgColor = isDark ? 'bg-slate-900/95' : (theme === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-white');
  const textColor = isDark ? 'text-slate-200' : 'text-slate-800';
  const itemBg = isDark ? 'bg-white/5 border-white/10' : (theme === 'sepia' ? 'bg-[#fdf6e3] border-[#eee8d5]' : 'bg-slate-50 border-slate-200');
  
  return (
    <div className={`w-80 border-l border-transparent h-full flex flex-col shadow-xl transition-colors ${bgColor}`}>
      <div className={`p-4 border-b ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50/50'}`}>
        <h2 className={`font-semibold flex items-center gap-2 ${textColor}`}>
          <BookmarkIcon className="w-5 h-5 text-indigo-600" solid={true} />
          Saved Collection
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {savedItems.length === 0 && (
          <div className="text-center text-slate-400 mt-10">
            <p>No items saved yet.</p>
            <p className="text-sm">Select text to translate and save.</p>
          </div>
        )}

        {savedItems.map((item) => (
          <div 
            key={item.id} 
            className={`${itemBg} rounded-lg border p-3 hover:shadow-md transition-shadow cursor-pointer group relative`}
            onClick={() => onSelectSavedItem(item)}
          >
            <div className="flex justify-between items-start mb-1">
              <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${item.type === 'word' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {item.type}
              </span>
              <div className="flex gap-2">
                  {/* View Card Button */}
                  {item.type === 'word' && item.cardData && (
                      <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewCard(item);
                        }}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                        title="View Word Card"
                      >
                          <CardIcon className="w-4 h-4" />
                      </button>
                  )}
                  {/* Delete Button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(item.id);
                    }}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
              </div>
            </div>
            
            <h3 className={`font-semibold mb-1 line-clamp-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {item.original}
            </h3>
            
            {item.type === 'word' && item.cardData && (
               <div className="text-xs text-slate-500 font-mono mb-2 flex items-center gap-1">
                 <span>/{item.cardData.phonetic}/</span>
               </div>
            )}

            <p className={`text-sm line-clamp-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {item.translation}
            </p>
            
            <div className={`mt-2 pt-2 border-t flex items-center gap-1 text-[10px] text-slate-400 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                <BookOpenIcon className="w-3 h-3" />
                <span className="truncate">{item.sourceArticleTitle}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
