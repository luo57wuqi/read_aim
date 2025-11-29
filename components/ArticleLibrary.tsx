
import React, { useState, useMemo } from 'react';
import { Article } from '../types';
import { BookOpenIcon, PlusIcon, TrashIcon, CheckCircleIcon, PencilIcon, GlobeAltIcon, LinkIcon, ArrowLeftIcon, ListBulletIcon, SparklesIcon } from './Icons';
import { processTextToArticle, extractContentFromUrl, splitContentIntoChapters } from '../utils/textHelpers';

interface ArticleLibraryProps {
  articles: Article[];
  onSelectArticle: (articleId: string) => void;
  onImportArticle: (article: Article, autoTranslate?: boolean) => void;
  onDeleteArticle: (articleId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
}

export const ArticleLibrary: React.FC<ArticleLibraryProps> = ({ 
  articles, 
  onSelectArticle, 
  onImportArticle, 
  onDeleteArticle,
  onDeleteGroup
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importType, setImportType] = useState<'text' | 'url'>('text');
  
  const [importText, setImportText] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importTitle, setImportTitle] = useState('');
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Group Navigation State
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // Derive Groups
  const groupedArticles = useMemo(() => {
      const groups: Record<string, Article[]> = {};
      const singles: Article[] = [];

      articles.forEach(article => {
          if (article.groupId) {
              if (!groups[article.groupId]) {
                  groups[article.groupId] = [];
              }
              groups[article.groupId].push(article);
          } else {
              singles.push(article);
          }
      });

      // Sort chapters within groups by createdAt (usually insertion order)
      Object.keys(groups).forEach(gid => {
          groups[gid].sort((a, b) => a.createdAt - b.createdAt);
      });

      return { groups, singles };
  }, [articles]);

  const handleImport = async () => {
    let textToProcess = '';
    let baseTitle = importTitle.trim();

    // 1. Fetch Text
    if (importType === 'url') {
        if (!importUrl.trim()) return;
        setIsLoadingUrl(true);
        try {
            textToProcess = await extractContentFromUrl(importUrl);
            if (!baseTitle) {
                // Try to infer title from first line
                baseTitle = textToProcess.split('\n')[0].substring(0, 50).trim() || "Untitled Article";
            }
        } catch (e) {
            alert("Failed to import URL. Please check the link or copy text manually.");
            setIsLoadingUrl(false);
            return;
        } finally {
            setIsLoadingUrl(false);
        }
    } else {
        textToProcess = importText;
    }

    if (!textToProcess.trim()) return;

    if (!baseTitle) {
        baseTitle = textToProcess.split('\n')[0].substring(0, 40) + "...";
    }

    // 2. Split into Chapters if necessary (approx 2500 words)
    const chapters = splitContentIntoChapters(textToProcess, 2500);
    
    // Generate a Group ID if multiple chapters
    const newGroupId = chapters.length > 1 ? Date.now().toString() : undefined;

    // 3. Process each chapter
    chapters.forEach((chapterText, index) => {
        const sentences = processTextToArticle(chapterText);
        
        // If multiple chapters, append Part X
        const title = chapters.length > 1 ? `Chapter ${index + 1}` : baseTitle;

        const newArticle: Article = {
            id: Date.now().toString() + Math.random().toString().slice(2,5) + index, // Ensure unique IDs
            title: title,
            sentences,
            createdAt: Date.now() + index, // Ensure slightly different timestamps for sorting
            lastReadAt: Date.now(),
            groupId: newGroupId,
            groupTitle: baseTitle
        };
        // Pass autoTranslate flag only for the first chapter or all? 
        // Logic: if we want to translate the whole book, we should trigger it for all.
        // But App.tsx handles one at a time via state change. 
        // For simplicity, we trigger it for every chapter. The App component should queue or handle it.
        onImportArticle(newArticle, autoTranslate);
    });
    
    // Reset
    setImportText('');
    setImportUrl('');
    setImportTitle('');
    setAutoTranslate(false);
    setIsImporting(false);
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString();

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-4 sm:p-8 animate-fade-in min-h-full">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4 border-b border-slate-200 pb-6 sticky top-0 bg-slate-50 z-10 transition-all">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                {activeGroupId ? (
                    <button onClick={() => setActiveGroupId(null)} className="hover:bg-slate-200 p-2 rounded-full transition-colors mr-1">
                        <ArrowLeftIcon className="w-6 h-6 text-slate-600" />
                    </button>
                ) : (
                    <BookOpenIcon className="w-8 h-8 text-indigo-600" />
                )}
                {activeGroupId ? (
                    <span className="truncate max-w-md">{groupedArticles.groups[activeGroupId]?.[0]?.groupTitle || 'Collection'}</span>
                ) : (
                    'Library'
                )}
            </h2>
            <p className="text-slate-500 mt-1 text-base ml-1">
                {activeGroupId 
                    ? `${groupedArticles.groups[activeGroupId]?.length || 0} Chapters in this book.`
                    : 'Your personal reading collection.'
                }
            </p>
          </div>
          
          {!activeGroupId && (
              <button 
                onClick={() => setIsImporting(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full flex items-center gap-2 font-bold shadow-lg shadow-indigo-600/20 transition-transform active:scale-95 w-full sm:w-auto justify-center"
              >
                <PlusIcon className="w-5 h-5" />
                Add Content
              </button>
          )}
        </div>

        {/* Import Modal */}
        {isImporting && (
          <div className="mb-10 bg-white p-4 sm:p-8 rounded-2xl shadow-xl border border-indigo-100 animate-slide-in-right relative z-20">
             <button onClick={() => setIsImporting(false)} className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 p-2">✕</button>
            <h3 className="font-bold text-lg sm:text-xl text-slate-800 mb-6 flex items-center gap-2">
                <PencilIcon className="w-6 h-6 text-indigo-500" />
                Import New Article
            </h3>
            
            <div className="flex gap-2 mb-6 border-b border-slate-100 pb-1 overflow-x-auto">
                <button 
                    onClick={() => setImportType('text')}
                    className={`px-4 py-2 rounded-t-lg text-sm font-bold flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${importType === 'text' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <PencilIcon className="w-4 h-4" /> Text Paste
                </button>
                <button 
                    onClick={() => setImportType('url')}
                    className={`px-4 py-2 rounded-t-lg text-sm font-bold flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${importType === 'url' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <GlobeAltIcon className="w-4 h-4" /> Import from URL
                </button>
            </div>

            <div className="space-y-5">
              <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Title / Book Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., The Great Gatsby"
                    value={importTitle}
                    onChange={(e) => setImportTitle(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                  />
              </div>

              {importType === 'text' ? (
                  <div>
                       <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Paste Content</label>
                      <textarea
                        placeholder="Paste text here... Long articles will be automatically split into multiple chapters and grouped."
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none min-h-[200px] sm:min-h-[240px] font-serif text-base sm:text-lg leading-relaxed text-slate-700 resize-y"
                      />
                  </div>
              ) : (
                  <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Article URL</label>
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                          <LinkIcon className="w-5 h-5 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="https://..."
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            className="w-full bg-transparent outline-none text-sm font-mono text-slate-600 min-w-0"
                          />
                      </div>
                      <div className="flex flex-col sm:flex-row justify-between items-start mt-2 gap-2">
                        <p className="text-[11px] text-slate-400">
                            Powered by <a href="https://jina.ai/reader" target="_blank" className="underline hover:text-indigo-500">Jina Reader</a>.
                        </p>
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">Auto-Splits & Groups</span>
                      </div>
                  </div>
              )}

              {/* Auto Translate Checkbox */}
              <div className="flex items-start sm:items-center gap-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                  <div className="relative flex items-center h-5">
                      <input 
                          type="checkbox" 
                          id="autoTranslate" 
                          checked={autoTranslate} 
                          onChange={e => setAutoTranslate(e.target.checked)}
                          className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                      />
                  </div>
                  <label htmlFor="autoTranslate" className="text-sm text-slate-700 font-medium cursor-pointer select-none flex-1">
                      <span className="flex items-center gap-2">
                          <SparklesIcon className="w-4 h-4 text-indigo-500" />
                          <span>Auto-translate to Chinese immediately</span>
                      </span>
                      <p className="text-xs text-slate-400 font-normal mt-0.5">Automatically generates translations for a bilingual reading experience.</p>
                  </label>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button 
                  onClick={() => setIsImporting(false)}
                  className="px-5 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleImport}
                  disabled={(importType === 'text' && !importText.trim()) || (importType === 'url' && !importUrl.trim()) || isLoadingUrl}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 flex items-center gap-2 transition-transform active:scale-95"
                >
                  {isLoadingUrl && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {importType === 'url' ? 'Fetch & Group' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Default Empty State */}
          {articles.length === 0 && (
            <div className="col-span-full py-24 text-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50">
              <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <BookOpenIcon className="w-10 h-10 text-slate-300" />
              </div>
              <p className="text-slate-600 font-bold text-lg mb-1">Your library is empty</p>
              <p className="text-slate-400 mb-6">Import content to start your reading journey.</p>
            </div>
          )}

          {/* Render Groups (Folders) if not in a group */}
          {!activeGroupId && Object.keys(groupedArticles.groups).map(groupId => {
              const group = groupedArticles.groups[groupId];
              const coverArticle = group[0];
              return (
                <div 
                    key={groupId}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative flex flex-col h-[280px] overflow-hidden"
                    onClick={() => setActiveGroupId(groupId)}
                >
                    {/* Delete Group Button (Top Right) */}
                    <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if(confirm(`Delete entire group "${coverArticle.groupTitle}" (${group.length} chapters)?`)) {
                                    if(onDeleteGroup) onDeleteGroup(groupId);
                                }
                            }}
                            className="p-2 bg-white/80 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full shadow-sm backdrop-blur-sm transition-colors border border-slate-100"
                            title="Delete Collection"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Folder Stack Effect */}
                    <div className="absolute top-0 right-0 p-4 z-10 pointer-events-none">
                        <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                            {group.length} Chapters
                        </span>
                    </div>
                    {/* Visual Stack Layers */}
                    <div className="absolute top-2 left-2 right-2 h-full bg-slate-100 rounded-t-xl border border-slate-200 -z-10 transform scale-[0.98] -translate-y-2"></div>
                    <div className="absolute top-4 left-4 right-4 h-full bg-slate-50 rounded-t-xl border border-slate-200 -z-20 transform scale-[0.96] -translate-y-4"></div>

                    <div className="p-6 flex-1 flex flex-col bg-white rounded-2xl relative z-0 h-full">
                        <div className="flex-1">
                            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 text-indigo-600">
                                <ListBulletIcon className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-xl text-slate-800 mb-2 line-clamp-2 font-serif group-hover:text-indigo-600 transition-colors">
                                {coverArticle.groupTitle || "Untitled Book"}
                            </h3>
                            <p className="text-slate-400 text-sm">
                                Collection
                            </p>
                        </div>
                        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-xs text-slate-400">
                                Last updated: {formatDate(coverArticle.createdAt)}
                            </span>
                            <div className="flex -space-x-2">
                                {/* Decorative Dots */}
                                <div className="w-2 h-2 rounded-full bg-indigo-200"></div>
                                <div className="w-2 h-2 rounded-full bg-indigo-300"></div>
                                <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                            </div>
                        </div>
                    </div>
                </div>
              );
          })}

          {/* Render Articles (Singles or Chapters inside a group) */}
          {(activeGroupId ? groupedArticles.groups[activeGroupId] : groupedArticles.singles).map(article => (
              <div 
                key={article.id} 
                className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative flex flex-col justify-between h-[280px]"
                onClick={() => onSelectArticle(article.id)}
              >
                 <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full uppercase tracking-wide">
                           {article.sentences.length} Sentences
                        </span>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if(confirm('Delete this article?')) onDeleteArticle(article.id);
                            }}
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-50 rounded-lg"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <h3 className="font-bold text-xl text-slate-800 mb-3 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors font-serif">
                        {article.title}
                    </h3>
                    
                    <div className="relative h-full">
                         <p className="text-slate-500 text-sm line-clamp-4 leading-relaxed font-serif opacity-80">
                            {article.sentences.slice(0, 5).map(s => s.text).join(' ')}...
                        </p>
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent"></div>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-2 text-xs text-slate-400 pt-4 border-t border-slate-50 mt-2">
                    <CheckCircleIcon className="w-3 h-3" />
                    <span>Added {formatDate(article.createdAt)}</span>
                 </div>
              </div>
          ))}
        </div>

      </div>
    </div>
  );
};
