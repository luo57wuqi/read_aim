
import React from 'react';
import { SavedItem } from '../types';
import { BookmarkIcon, TrashIcon, CardIcon, BookOpenIcon } from './Icons';

interface SidebarProps {
  savedItems: SavedItem[];
  onRemoveItem: (id: string) => void;
  onSelectSavedItem: (item: SavedItem) => void;
  onViewCard: (item: SavedItem) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ savedItems, onRemoveItem, onSelectSavedItem, onViewCard }) => {
  return (
    <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl">
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
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
            className="bg-slate-50 rounded-lg border border-slate-200 p-3 hover:shadow-md transition-shadow cursor-pointer group relative"
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
            
            <h3 className="font-semibold text-slate-800 mb-1 line-clamp-2">
              {item.original}
            </h3>
            
            {item.type === 'word' && item.cardData && (
               <div className="text-xs text-slate-500 font-mono mb-2 flex items-center gap-1">
                 <span>/{item.cardData.phonetic}/</span>
               </div>
            )}

            <p className="text-sm text-slate-600 line-clamp-3">
              {item.translation}
            </p>
            
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] text-slate-400">
                <BookOpenIcon className="w-3 h-3" />
                <span className="truncate">{item.sourceArticleTitle}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
