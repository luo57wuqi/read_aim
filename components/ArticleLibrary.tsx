
import React, { useState } from 'react';
import { Article } from '../types';
import { BookOpenIcon, PlusIcon, TrashIcon, CheckCircleIcon, PencilIcon } from './Icons';
import { processTextToArticle } from '../utils/textHelpers';

interface ArticleLibraryProps {
  articles: Article[];
  onSelectArticle: (articleId: string) => void;
  onImportArticle: (article: Article) => void;
  onDeleteArticle: (articleId: string) => void;
}

export const ArticleLibrary: React.FC<ArticleLibraryProps> = ({ 
  articles, 
  onSelectArticle, 
  onImportArticle, 
  onDeleteArticle 
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importTitle, setImportTitle] = useState('');

  const handleImport = () => {
    if (!importText.trim()) return;

    const title = importTitle.trim() || importText.split('\n')[0].substring(0, 40) + "...";
    const sentences = processTextToArticle(importText);

    const newArticle: Article = {
      id: Date.now().toString(),
      title,
      sentences,
      createdAt: Date.now(),
      lastReadAt: Date.now()
    };

    onImportArticle(newArticle);
    setImportText('');
    setImportTitle('');
    setIsImporting(false);
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString();

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-4 sm:p-8 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BookOpenIcon className="w-7 h-7 text-indigo-600" />
              Article Library
            </h2>
            <p className="text-slate-500 text-sm">Manage your reading materials and archives.</p>
          </div>
          
          <button 
            onClick={() => setIsImporting(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-sm transition-transform active:scale-95"
          >
            <PlusIcon className="w-5 h-5" />
            Paste / Import Article
          </button>
        </div>

        {/* Import Modal / Form - Expanded for easier input */}
        {isImporting && (
          <div className="mb-8 bg-white p-6 rounded-xl shadow-lg border border-indigo-100 animate-slide-in-right relative">
             <button onClick={() => setIsImporting(false)} className="absolute top-4 right-4 text-slate-300 hover:text-slate-500">✕</button>
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <PencilIcon className="w-5 h-5 text-indigo-500" />
                Add New Content
            </h3>
            <div className="space-y-4">
              <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Title (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Chapter 1: The Beginning"
                    value={importTitle}
                    onChange={(e) => setImportTitle(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
              </div>
              <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Content</label>
                  <textarea
                    placeholder="Paste your English text here..."
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="w-full p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[200px] font-serif text-lg leading-relaxed text-slate-700"
                  />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button 
                  onClick={() => setIsImporting(false)}
                  className="px-5 py-2.5 text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleImport}
                  disabled={!importText.trim()}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  Save to Library
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Article Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.length === 0 ? (
            <div className="col-span-full py-20 text-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
              <BookOpenIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium text-lg">Your library is empty</p>
              <p className="text-slate-400 mb-6">Import an article or paste text to start reading.</p>
              <button 
                onClick={() => setIsImporting(true)}
                className="text-indigo-600 font-bold hover:underline"
              >
                Start Importing Now
              </button>
            </div>
          ) : (
            articles.map(article => (
              <div 
                key={article.id} 
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group relative flex flex-col justify-between"
                onClick={() => onSelectArticle(article.id)}
              >
                 <div>
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                           {article.sentences.length} sentences
                        </span>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if(confirm('Delete this article?')) onDeleteArticle(article.id);
                            }}
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-full"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-2 leading-tight group-hover:text-indigo-700 transition-colors">
                        {article.title}
                    </h3>
                    <p className="text-slate-500 text-sm line-clamp-3 mb-4 font-serif leading-relaxed">
                        {article.sentences.slice(0, 3).map(s => s.text).join(' ')}...
                    </p>
                 </div>
                 
                 <div className="flex items-center gap-2 text-xs text-slate-400 pt-3 border-t border-slate-50">
                    <CheckCircleIcon className="w-3 h-3" />
                    <span>Added {formatDate(article.createdAt)}</span>
                 </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
