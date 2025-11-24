
import React, { useState, useEffect, useRef } from 'react';
import { translateText, generateWordCard, translateBatch } from './services/geminiService';
import { fetchFromCustomApi } from './services/customApiService';
import { SavedItem, WordCardData, ViewMode, HistoryRecord, Article, WordStatsMap, WordUsageData, Sentence, AppSettings, BackupData } from './types';
import { Sidebar } from './components/Sidebar';
import { VocabularyCard } from './components/VocabularyCard';
import { DraggableSheet } from './components/DraggableSheet';
import { StatsView } from './components/StatsView';
import { ArticleLibrary } from './components/ArticleLibrary';
import { SettingsView } from './components/SettingsView';
import { processTextToArticle } from './utils/textHelpers';
import { BookOpenIcon, ColumnsIcon, BookmarkIcon, SparklesIcon, TouchIcon, CheckCircleIcon, ChartBarIcon, LanguageIcon, CogIcon } from './components/Icons';

const DEFAULT_TEXT = `The concept of serendipity often plays a crucial role in scientific discovery. Many breakthrough inventions were not the result of rigorous planning, but rather happy accidents that occurred while researchers were looking for something else. For instance, penicillin was discovered when Alexander Fleming returned from a holiday to find that mold had killed bacteria in a petri dish he had left uncovered. This illustrates that while method is important, maintaining an open mind to the unexpected is equally vital for progress.`;

const DEFAULT_SETTINGS: AppSettings = {
    aiModel: 'gemini-2.5-flash',
    dataSourceMode: 'ai',
    theme: 'light'
};

function App() {
  // --- State ---
  
  // Library State
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.READ);
  
  // Stats State
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [wordStats, setWordStats] = useState<WordStatsMap>({});
  
  // Saved Items
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Settings & App Config
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Reading Mode State
  const [isInteractiveMode, setIsInteractiveMode] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false); 
  const [isTranslatingArticle, setIsTranslatingArticle] = useState(false); 
  const [selectionScope, setSelectionScope] = useState<'word' | 'sentence'>('word');
  
  // Navigation State
  const [highlightSentenceIndex, setHighlightSentenceIndex] = useState<number | null>(null);
  
  // Selection & Popups
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [contextSentence, setContextSentence] = useState<string>("");
  const [selectedSentenceIndex, setSelectedSentenceIndex] = useState<number>(0);
  
  // AI Results
  const [isLoading, setIsLoading] = useState(false);
  const [loadingNextCard, setLoadingNextCard] = useState(false);
  const [activeTranslation, setActiveTranslation] = useState<string | null>(null);
  
  // WORD STACK for chaining
  const [wordCardStack, setWordCardStack] = useState<WordCardData[]>([]);

  const [error, setError] = useState<string | null>(null);
  
  // UI Feedback
  const [toast, setToast] = useState<string | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const sentenceRefs = useRef<Map<number, HTMLElement>>(new Map());

  // --- Initialization & Persistence ---

  useEffect(() => {
    // Load persisted data
    const saved = localStorage.getItem('english_reader_saved_items');
    if (saved) setSavedItems(JSON.parse(saved));
    
    const history = localStorage.getItem('english_reader_history_records');
    if (history) setHistoryRecords(JSON.parse(history));

    const stats = localStorage.getItem('english_reader_word_stats');
    if (stats) setWordStats(JSON.parse(stats));

    const savedSettings = localStorage.getItem('english_reader_settings');
    if (savedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });

    const savedArticles = localStorage.getItem('english_reader_articles');
    if (savedArticles) {
        const parsedArticles = JSON.parse(savedArticles);
        setArticles(parsedArticles);
        if (parsedArticles.length > 0) {
            setActiveArticleId(parsedArticles[0].id);
        } else {
            createDefaultArticle();
        }
    } else {
        createDefaultArticle();
    }
  }, []);

  const createDefaultArticle = () => {
      const sentences = processTextToArticle(DEFAULT_TEXT);
      const defaultArticle: Article = {
          id: 'default-1',
          title: 'Serendipity in Science',
          sentences,
          createdAt: Date.now(),
          lastReadAt: Date.now()
      };
      setArticles([defaultArticle]);
      setActiveArticleId(defaultArticle.id);
  };

  // Persist State
  useEffect(() => localStorage.setItem('english_reader_saved_items', JSON.stringify(savedItems)), [savedItems]);
  useEffect(() => localStorage.setItem('english_reader_history_records', JSON.stringify(historyRecords)), [historyRecords]);
  useEffect(() => localStorage.setItem('english_reader_word_stats', JSON.stringify(wordStats)), [wordStats]);
  useEffect(() => localStorage.setItem('english_reader_articles', JSON.stringify(articles)), [articles]);
  useEffect(() => localStorage.setItem('english_reader_settings', JSON.stringify(settings)), [settings]);

  // --- Derived State ---
  const activeArticle = articles.find(a => a.id === activeArticleId);
  const topCard = wordCardStack.length > 0 ? wordCardStack[wordCardStack.length - 1] : null;
  const previousCard = wordCardStack.length > 1 ? wordCardStack[wordCardStack.length - 2] : null;

  // --- Theme Engine ---
  // Improved Hierarchy:
  // 1. appBg: The absolute back layer.
  // 2. paperBg: The reading surface, usually brighter/cleaner.
  // 3. headerBg: Translucent top bar.
  // 4. shadow: Elevation depth.
  const getThemePalette = () => {
      switch(settings.theme) {
          case 'dark': return {
              appBg: 'bg-slate-950',
              text: 'text-slate-200',
              textMuted: 'text-slate-400',
              headerBg: 'bg-slate-900/90 border-slate-800',
              paperBg: 'bg-slate-900 border-slate-800',
              shadow: 'shadow-2xl shadow-black/50',
              accent: 'text-indigo-400',
              highlight: 'bg-indigo-500/30 text-indigo-100',
              selection: 'bg-indigo-500/40'
          };
          case 'sepia': return {
              appBg: 'bg-[#f0e6d2]', // Darker cream
              text: 'text-[#5f4b32]',
              textMuted: 'text-[#8c7b66]',
              headerBg: 'bg-[#fcf7ea]/90 border-[#e8dfcc]',
              paperBg: 'bg-[#fcf7ea] border-[#e8dfcc]', // Lighter cream surface
              shadow: 'shadow-xl shadow-[#5f4b32]/10',
              accent: 'text-[#b08d55]',
              highlight: 'bg-[#b08d55]/20 text-[#5f4b32]',
              selection: 'bg-[#b08d55]/30'
          };
          case 'forest': return {
              appBg: 'bg-[#0f291e]', // Deep green
              text: 'text-[#e2e8f0]',
              textMuted: 'text-[#94a3b8]',
              headerBg: 'bg-[#1a4233]/90 border-[#245c48]',
              paperBg: 'bg-[#1a4233] border-[#245c48]', // Lighter green surface
              shadow: 'shadow-2xl shadow-black/60',
              accent: 'text-[#4ade80]',
              highlight: 'bg-[#4ade80]/20 text-[#ecfdf5]',
              selection: 'bg-[#4ade80]/30'
          };
          case 'amethyst': return {
              appBg: 'bg-[#1e1b2e]', // Deep purple
              text: 'text-[#e9d5ff]',
              textMuted: 'text-[#a78bfa]',
              headerBg: 'bg-[#2e2645]/90 border-[#4c3d75]',
              paperBg: 'bg-[#2e2645] border-[#4c3d75]', // Lighter purple surface
              shadow: 'shadow-2xl shadow-[#120f1f]/80',
              accent: 'text-[#d8b4fe]',
              highlight: 'bg-[#d8b4fe]/20 text-[#f3e8ff]',
              selection: 'bg-[#d8b4fe]/30'
          };
          case 'light': 
          default: return {
              appBg: 'bg-slate-100', // Slightly gray back
              text: 'text-slate-800',
              textMuted: 'text-slate-500',
              headerBg: 'bg-white/90 border-slate-200',
              paperBg: 'bg-white border-slate-200', // Pure white surface
              shadow: 'shadow-xl shadow-slate-200/60',
              accent: 'text-indigo-600',
              highlight: 'bg-indigo-50 text-indigo-900',
              selection: 'bg-indigo-100'
          };
      }
  };
  
  const theme = getThemePalette();

  // --- Effects ---

  // Handle Scroll / Progress
  const handleScroll = () => {
    const element = containerRef.current;
    if (!element) return;
    const { scrollTop, scrollHeight, clientHeight } = element;
    const totalScroll = scrollHeight - clientHeight;
    if (totalScroll <= 0) {
      setReadingProgress(100);
      return;
    }
    setReadingProgress(Math.min(100, Math.max(0, (scrollTop / totalScroll) * 100)));
  };

  useEffect(() => {
    const timer = setTimeout(handleScroll, 100);
    window.addEventListener('resize', handleScroll);
    return () => {
        window.removeEventListener('resize', handleScroll);
        clearTimeout(timer);
    };
  }, [activeArticle, viewMode, showTranslation]); 

  // Auto-scroll to highlight sentence
  useEffect(() => {
      if (highlightSentenceIndex !== null && viewMode === ViewMode.READ && activeArticleId) {
          setTimeout(() => {
              const el = sentenceRefs.current.get(highlightSentenceIndex);
              if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.classList.add(theme.selection); // Use theme-based highlight
                  setTimeout(() => el.classList.remove(theme.selection), 2000);
              }
              setHighlightSentenceIndex(null);
          }, 300);
      }
  }, [highlightSentenceIndex, viewMode, activeArticleId, theme]);

  // Toast Timer
  useEffect(() => {
     if (toast) {
         const timer = setTimeout(() => setToast(null), 3000);
         return () => clearTimeout(timer);
     }
  }, [toast]);

  // --- Logic ---

  const handleImportData = (data: BackupData) => {
      setArticles(data.articles);
      setSavedItems(data.savedItems);
      setHistoryRecords(data.historyRecords);
      setWordStats(data.wordStats);
      setSettings(data.settings);
      
      if (data.articles.length > 0) setActiveArticleId(data.articles[0].id);
      setToast("Data restored successfully!");
  };

  const handleMergeVocabulary = (newItems: SavedItem[]) => {
      let addedCount = 0;
      setSavedItems(prev => {
          const currentMap = new Map(prev.map(i => [i.original.toLowerCase(), i]));
          const merged = [...prev];
          
          newItems.forEach(item => {
              if (item.type === 'word' && !currentMap.has(item.original.toLowerCase())) {
                  const newItem = { ...item, id: Date.now().toString() + Math.random().toString().slice(2,5) };
                  merged.push(newItem);
                  currentMap.set(newItem.original.toLowerCase(), newItem);
                  addedCount++;
              }
          });
          return merged;
      });
      setToast(`Successfully imported ${addedCount} new words!`);
  };

  const toggleTranslation = async () => {
    const nextState = !showTranslation;
    setShowTranslation(nextState);

    if (nextState && activeArticle) {
        const needsTranslation = activeArticle.sentences.some(s => !s.translation);
        if (needsTranslation && !isTranslatingArticle) {
            setIsTranslatingArticle(true);
            setToast("Translating article...");
            
            try {
                const BATCH_SIZE = 20;
                const sentences = [...activeArticle.sentences];
                const newSentences = [...sentences];

                for (let i = 0; i < sentences.length; i += BATCH_SIZE) {
                    const chunk = sentences.slice(i, i + BATCH_SIZE);
                    const chunkIndices = chunk.map((s, idx) => ({ s, absIdx: i + idx })).filter(item => !item.s.translation);
                    
                    if (chunkIndices.length > 0) {
                        const textsToTranslate = chunkIndices.map(item => item.s.text);
                        const translations = await translateBatch(textsToTranslate, settings);
                        
                        chunkIndices.forEach((item, idx) => {
                           if (translations[idx]) {
                               newSentences[item.absIdx] = {
                                   ...newSentences[item.absIdx],
                                   translation: translations[idx]
                               };
                           }
                        });
                    }
                }

                const updatedArticle = { ...activeArticle, sentences: newSentences };
                setArticles(prev => prev.map(a => a.id === updatedArticle.id ? updatedArticle : a));
                setToast("Translation complete!");
            } catch (err) {
                console.error("Translation failed", err);
                setError("Could not translate entire article. Try again later.");
            } finally {
                setIsTranslatingArticle(false);
            }
        }
    }
  };

  const trackWordUsage = (word: string, articleId: string, sentenceIndex: number) => {
      const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
      if (!cleanWord) return;

      setWordStats(prev => {
          const existing = prev[cleanWord] || { word: cleanWord, frequency: 0, occurrences: [] };
          return {
              ...prev,
              [cleanWord]: {
                  ...existing,
                  frequency: existing.frequency + 1,
                  occurrences: [
                      ...existing.occurrences,
                      { articleId, sentenceIndex, timestamp: Date.now() }
                  ]
              }
          };
      });
  };
  
  const addToHistory = (action: 'ADD' | 'REMOVE' | 'LOOKUP', original: string, type: 'word' | 'sentence') => {
      if (!activeArticle) return;

      const newRecord: HistoryRecord = {
          id: Date.now().toString() + Math.random().toString().slice(2,5),
          action,
          original,
          type,
          timestamp: Date.now(),
          sourceArticleId: activeArticle.id,
          sourceArticleTitle: activeArticle.title,
          sourceContextSentence: contextSentence,
          sourceSentenceIndex: selectedSentenceIndex
      };
      
      setHistoryRecords(prev => [newRecord, ...prev]);
  };

  const handleInteractiveClick = (e: React.MouseEvent, text: string, sentence: Sentence, scope: 'word' | 'sentence') => {
    if (!isInteractiveMode) return;
    
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    const cleanText = text.trim();
    if (!cleanText) return;

    setSelectionRect(rect);
    setSelectedText(cleanText);
    setContextSentence(sentence.text);
    setSelectedSentenceIndex(sentence.index);
    setSelectionScope(scope);
    
    setActiveTranslation(null);
    setWordCardStack([]);
    setError(null);
  };

  // Helper to fetch data either from Local, AI, or Custom API
  const fetchCardData = async (word: string, context?: string): Promise<WordCardData> => {
      console.log("Fetching card data for:", word);

      // 1. Check Local "SavedItems"
      const cachedItem = savedItems.find(i => 
          i.type === 'word' && i.original.trim().toLowerCase() === word.trim().toLowerCase()
      );
      
      if (cachedItem && cachedItem.cardData) {
          console.log("Found local cache:", cachedItem.original);
          return { ...cachedItem.cardData };
      }

      // 2. Check "Local Only" mode
      if (settings.dataSourceMode === 'local_only') {
          throw new Error(`"${word}" not found in collection. Switch to AI mode to generate.`);
      }

      // 3. Custom API Mode (New Logic)
      if (settings.dataSourceMode === 'custom_api' && settings.customApiConfig?.url) {
          try {
              return await fetchFromCustomApi(word, settings.customApiConfig);
          } catch (e: any) {
              console.error(e);
              throw new Error(`Custom API Error: ${e.message}`);
          }
      }

      // 4. AI / Network Generation (Gemini)
      return await generateWordCard(word, context, settings);
  };

  const handleTranslate = async () => {
    if (!selectedText || !activeArticle) return;
    setIsLoading(true);
    setError(null);

    if (selectionScope === 'word') {
        trackWordUsage(selectedText, activeArticle.id, selectedSentenceIndex);
        addToHistory('LOOKUP', selectedText, 'word');
    } else {
        addToHistory('LOOKUP', selectedText, 'sentence');
    }

    try {
      if (selectionScope === 'word') {
        const cardData = await fetchCardData(selectedText, contextSentence);
        setWordCardStack([cardData]); 
      } else {
        const existingTranslation = activeArticle.sentences[selectedSentenceIndex]?.translation;
        
        if (existingTranslation) {
             setActiveTranslation(existingTranslation);
        } else {
             if (settings.dataSourceMode === 'local_only') {
                 throw new Error("Translation not available offline.");
             }
             const translation = await translateText(selectedText, settings);
             setActiveTranslation(translation);
             
             // Save sentence translation back to article
             const updatedSentences = [...activeArticle.sentences];
             updatedSentences[selectedSentenceIndex] = { 
                 ...updatedSentences[selectedSentenceIndex], 
                 translation 
             };
             const updatedArticle = { ...activeArticle, sentences: updatedSentences };
             setArticles(prev => prev.map(a => a.id === updatedArticle.id ? updatedArticle : a));
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process request.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewCard = async (wordOrItem: string | SavedItem) => {
     setIsLoading(true);
     setWordCardStack([]); 
     setSelectionRect(null); 
     setActiveTranslation(null);
     
     if (window.innerWidth < 768) {
         setIsSidebarOpen(false);
         if (viewMode === ViewMode.STATS) setViewMode(ViewMode.READ);
     }
     
     try {
         let cardData: WordCardData;
         
         if (typeof wordOrItem === 'object' && wordOrItem.cardData) {
             cardData = wordOrItem.cardData;
         } else {
             const word = typeof wordOrItem === 'string' ? wordOrItem : (wordOrItem as SavedItem).original;
             cardData = await fetchCardData(word);
         }
         
         setWordCardStack([cardData]);
     } catch (err: any) {
         setToast(err.message || "Could not load card.");
     } finally {
         setIsLoading(false);
     }
  };

  const handleSave = () => {
    const currentCard = topCard;
    if (!currentCard && !selectedText) return;
    if (!activeArticle) return;
    
    const textToSave = currentCard ? currentCard.word : selectedText!;
    
    const exists = savedItems.some(item => item.original.toLowerCase() === textToSave.toLowerCase());
    if (exists) {
        setToast("Item already exists in your collection.");
        return;
    }
    
    const newItem: SavedItem = {
      id: Date.now().toString(),
      original: textToSave,
      translation: activeTranslation || currentCard?.translation || '',
      type: currentCard ? 'word' : 'sentence',
      cardData: currentCard || undefined,
      timestamp: Date.now(),
      sourceArticleId: activeArticle.id,
      sourceArticleTitle: activeArticle.title,
      sourceContextSentence: contextSentence,
      sourceSentenceIndex: selectedSentenceIndex
    };

    setSavedItems(prev => [newItem, ...prev]);
    addToHistory('ADD', textToSave, newItem.type);
    setToast("Added to your collection!");
  };

  const removeSavedItem = (id: string) => {
    const item = savedItems.find(i => i.id === id);
    if (item) addToHistory('REMOVE', item.original, item.type);
    setSavedItems(prev => prev.filter(item => item.id !== id));
  };

  const handleJumpToContext = (articleId: string, sentenceIndex: number) => {
      setActiveArticleId(articleId);
      setHighlightSentenceIndex(sentenceIndex);
      setViewMode(ViewMode.READ);
      setIsSidebarOpen(false);
  };

  const handleImportArticle = (article: Article) => {
      setArticles(prev => [article, ...prev]);
      setActiveArticleId(article.id);
      setViewMode(ViewMode.READ);
      setToast("Article imported successfully!");
  };

  const handleDeleteArticle = (id: string) => {
      setArticles(prev => prev.filter(a => a.id !== id));
      if (activeArticleId === id) {
          setActiveArticleId(articles.length > 1 ? articles[0].id : null);
      }
  };

  const renderSentence = (sentence: Sentence) => {
      const sentenceContent = (
          <span 
            key={sentence.index} 
            ref={el => { if (el) sentenceRefs.current.set(sentence.index, el); }}
            className={`transition-colors duration-500 rounded px-1 ${isInteractiveMode ? 'cursor-pointer' : ''}`}
            id={`sentence-${sentence.index}`}
          >
             {isInteractiveMode && selectionScope === 'word' ? (
                 sentence.text.split(/([a-zA-Z0-9_'-]+)/g).map((token, tIdx) => {
                      const isWord = /^[a-zA-Z0-9_'-]+$/.test(token);
                      if (isWord) {
                          return (
                              <span
                                key={tIdx}
                                onClick={(e) => handleInteractiveClick(e, token, sentence, 'word')}
                                className={`rounded px-0.5 transition-colors duration-200 
                                    ${selectedText === token && !activeTranslation 
                                        ? 'bg-indigo-500 text-white shadow-sm' 
                                        : `hover:opacity-80 hover:underline decoration-2 decoration-indigo-400/50`
                                    }`}
                              >
                                  {token}
                              </span>
                          );
                      }
                      return <span key={tIdx}>{token}</span>;
                  })
             ) : (
                 <span
                    onClick={(e) => handleInteractiveClick(e, sentence.text, sentence, 'sentence')}
                    className={`hover:bg-indigo-500/10 ${selectedText === sentence.text.trim() && !topCard ? 'bg-indigo-500 text-white shadow-sm px-1' : ''}`}
                 >
                     {sentence.text}
                 </span>
             )}
          </span>
      );

      return (
          <div className="mb-1 inline" key={sentence.index}>
              {sentenceContent}
              {showTranslation && sentence.translation && (
                  <div className={`block mt-2 mb-4 text-sm font-sans border-l-2 pl-3 py-1 ${theme.textMuted} border-indigo-500/30`}>
                      {sentence.translation}
                  </div>
              )}
              {' '} 
          </div>
      );
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-500 ${theme.appBg} ${theme.text}`}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-down pointer-events-none">
            <div className="bg-slate-800/90 backdrop-blur-md text-white px-5 py-3 rounded-full shadow-2xl border border-white/10 flex items-center gap-3 text-sm font-medium">
                <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                {toast}
            </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Header */}
        <header className={`h-16 flex items-center justify-between px-4 sm:px-6 z-10 gap-2 sm:gap-4 transition-colors backdrop-blur-md border-b ${theme.headerBg}`}>
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity min-w-0"
            onClick={() => setViewMode(ViewMode.LIBRARY)}
          >
            <div className="bg-indigo-600 p-2 rounded-lg hidden sm:block shrink-0 shadow-lg shadow-indigo-600/20">
                <BookOpenIcon className="w-5 h-5 text-white" />
            </div>
            <div className="overflow-hidden">
                <h1 className="font-bold text-lg truncate tracking-tight">
                    {viewMode === ViewMode.LIBRARY ? 'Library' : (viewMode === ViewMode.STATS ? 'Analytics' : (activeArticle?.title || 'Reader'))}
                </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {viewMode === ViewMode.READ && (
                <>
                    <button 
                        onClick={toggleTranslation}
                        className={`p-2 rounded-md transition-all flex items-center gap-1 ${showTranslation ? theme.highlight : 'opacity-60 hover:opacity-100 hover:bg-black/5'}`}
                        title={showTranslation ? "Hide Translation" : "Show Chinese Translation"}
                    >
                        <LanguageIcon className="w-5 h-5" />
                        <span className="text-xs font-bold hidden sm:inline">CN</span>
                        {isTranslatingArticle && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />}
                    </button>

                    <div className="w-px h-6 bg-current opacity-10 mx-1 hidden sm:block"></div>

                    <div className="flex bg-black/5 p-1 rounded-lg mr-2 hidden md:flex">
                        <button 
                            onClick={() => setSelectionScope('word')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${selectionScope === 'word' ? 'bg-white text-indigo-700 shadow-sm' : 'text-inherit opacity-60 hover:opacity-100'}`}
                        >
                            Word
                        </button>
                        <button 
                            onClick={() => setSelectionScope('sentence')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${selectionScope === 'sentence' ? 'bg-white text-indigo-700 shadow-sm' : 'text-inherit opacity-60 hover:opacity-100'}`}
                        >
                            Sentence
                        </button>
                    </div>

                    <button 
                    onClick={() => setIsInteractiveMode(!isInteractiveMode)}
                    className={`p-2 rounded-md transition-all ${isInteractiveMode ? 'bg-emerald-500/10 text-emerald-600' : 'opacity-60 hover:opacity-100 hover:bg-black/5'}`}
                    title="Toggle Interactive Mode"
                    >
                        <TouchIcon className="w-5 h-5" active={isInteractiveMode} />
                    </button>
                </>
            )}

            <button
                onClick={() => setViewMode(viewMode === ViewMode.STATS ? ViewMode.READ : ViewMode.STATS)}
                className={`p-2 rounded-md transition-all ${viewMode === ViewMode.STATS ? theme.highlight : 'opacity-60 hover:opacity-100 hover:bg-black/5'}`}
                title="View Stats & History"
            >
                <ChartBarIcon className="w-5 h-5" />
            </button>
            
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-md hover:bg-black/5 opacity-60 hover:opacity-100 transition-colors"
                title="Settings"
            >
                <CogIcon className="w-5 h-5" />
            </button>

            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-2 rounded-md hover:bg-black/5 transition-all ${isSidebarOpen ? theme.accent : 'opacity-60'}`}
            >
                <BookmarkIcon className="w-5 h-5" solid={isSidebarOpen} />
            </button>
          </div>
        </header>

        {/* View Content Switcher */}
        {viewMode === ViewMode.STATS ? (
            <StatsView 
                history={historyRecords} 
                wordStats={wordStats}
                articles={articles}
                currentArticleId={activeArticleId || undefined}
                onClose={() => setViewMode(ViewMode.READ)}
                onNavigateToContext={handleJumpToContext} 
                onViewCard={handleViewCard}
            />
        ) : viewMode === ViewMode.LIBRARY ? (
            <ArticleLibrary 
                articles={articles} 
                onSelectArticle={(id) => {
                    setActiveArticleId(id);
                    setViewMode(ViewMode.READ);
                }} 
                onImportArticle={handleImportArticle}
                onDeleteArticle={handleDeleteArticle}
            />
        ) : (
            <>
                {/* READ MODE */}
                <div className="w-full h-1 bg-black/5 relative z-20">
                    <div 
                        className="h-full bg-indigo-500 transition-all duration-150 ease-out"
                        style={{ width: `${readingProgress}%` }}
                    />
                </div>

                <div 
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 relative pb-24"
                    onClick={() => {
                        setSelectedText(null);
                        setSelectionRect(null);
                        setWordCardStack([]);
                    }}
                >
                    <div className={`max-w-3xl mx-auto min-h-[60vh] p-8 sm:p-12 rounded-xl relative transition-all duration-500 
                        ${theme.paperBg} ${theme.text} ${theme.shadow} border
                        `}
                    >
                        {!activeArticle ? (
                            <div className="text-center py-20 opacity-50">
                                <p>No article selected.</p>
                                <button onClick={() => setViewMode(ViewMode.LIBRARY)} className="text-indigo-500 hover:underline">Go to Library</button>
                            </div>
                        ) : (
                            <div className={`reader-text text-lg sm:text-xl leading-loose`}>
                                <h2 className="text-3xl font-bold mb-8 font-serif">{activeArticle.title}</h2>
                                {activeArticle.sentences.map((sentence, idx) => (
                                    <React.Fragment key={sentence.index}>
                                        {sentence.isParagraphStart && idx > 0 && <div className="h-6" />} 
                                        {renderSentence(sentence)}
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                        
                        {isTranslatingArticle && (
                            <div className="absolute bottom-4 right-4 bg-white shadow-lg border border-indigo-100 px-4 py-2 rounded-full flex items-center gap-2 text-sm text-indigo-600 animate-bounce">
                                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                Translating remaining text...
                            </div>
                        )}
                    </div>
                </div>

                {/* Floating Action Menu */}
                {selectionRect && !topCard && !activeTranslation && !error && (
                    <div 
                        className="absolute z-40 animate-fade-in-up"
                        style={{ 
                            top: selectionRect.bottom + (isInteractiveMode ? 20 : 15), 
                            left: selectionRect.left + selectionRect.width / 2,
                            transform: 'translateX(-50%)'
                        }}
                    >
                        <button 
                            onClick={handleTranslate}
                            className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl hover:bg-black hover:scale-105 flex items-center gap-3 text-sm font-bold transition-all whitespace-nowrap border border-slate-700 ring-2 ring-white/20"
                        >
                            <SparklesIcon className="w-4 h-4 text-yellow-400" />
                            {isLoading ? 'Thinking...' : (selectionScope === 'word' ? 'Explain Word' : 'Translate Sentence')}
                        </button>
                    </div>
                )}

                {/* Result Sheets */}
                {previousCard && (
                     <DraggableSheet
                         key={`prev-${previousCard.word}`}
                         title={`Previous: ${previousCard.word}`}
                         onClose={() => setWordCardStack(prev => prev.slice(0, -1))} 
                         initialOffset={window.innerWidth >= 768 ? { x: -320, y: 0 } : { x: 0, y: -40 }}
                         className="opacity-95 z-40 border-slate-300 shadow-xl"
                     >
                         <VocabularyCard 
                            data={previousCard} 
                            isStacked={true}
                            onGoBack={() => setWordCardStack(prev => prev.slice(0, -2).concat(prev.slice(-1)))}
                            canGoBack={false} 
                         />
                     </DraggableSheet>
                )}

                {(topCard || activeTranslation || error) && (
                    <DraggableSheet
                        key={topCard?.word || 'active'}
                        title={topCard ? "Vocabulary Card" : "Translation"}
                        initialOffset={{ x: 0, y: 0 }}
                        onClose={() => {
                            setWordCardStack([]);
                            setActiveTranslation(null);
                            setError(null);
                        }}
                        className="z-50 border-indigo-100 shadow-2xl"
                    >
                        {error && (
                            <div className="p-6 text-red-600 text-center">{error}</div>
                        )}

                        {activeTranslation && (
                            <div className="p-6 pb-12">
                                <div className="mb-4">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Original</h3>
                                    <p className="text-slate-800 text-lg font-serif leading-relaxed">{selectedText}</p>
                                </div>
                                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6">
                                    <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">Translation</h3>
                                    <p className="text-indigo-900 text-lg leading-relaxed">{activeTranslation}</p>
                                </div>
                                <button onClick={handleSave} className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800">
                                    Save to Collection
                                </button>
                            </div>
                        )}

                        {topCard && (
                            <VocabularyCard 
                                data={topCard} 
                                onSave={handleSave}
                                onUpdate={(newData) => {
                                    setWordCardStack(prev => [...prev.slice(0, -1), newData]);
                                    setSavedItems(prevItems => {
                                        const exists = prevItems.some(i => i.type === 'word' && i.original.toLowerCase() === newData.word.toLowerCase());
                                        if (!exists) return prevItems;
                                        return prevItems.map(item => {
                                            if (item.type === 'word' && item.original.toLowerCase() === newData.word.toLowerCase()) {
                                                return {
                                                    ...item,
                                                    translation: newData.translation,
                                                    cardData: newData
                                                };
                                            }
                                            return item;
                                        });
                                    });
                                }}
                                isSaved={savedItems.some(i => i.original.toLowerCase() === topCard.word.toLowerCase())}
                                canGoBack={wordCardStack.length > 1}
                                onGoBack={() => setWordCardStack(prev => prev.slice(0, -1))}
                                onExploreRelated={async (word) => {
                                    setLoadingNextCard(true);
                                    try {
                                        const card = await fetchCardData(word);
                                        setWordCardStack(prev => [...prev, card]);
                                        trackWordUsage(word, activeArticle?.id || 'unknown', selectedSentenceIndex);
                                    } catch(err: any) {
                                        setToast(err.message);
                                    } finally {
                                        setLoadingNextCard(false);
                                    }
                                }}
                                isLoading={loadingNextCard}
                            />
                        )}
                    </DraggableSheet>
                )}
            </>
        )}
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
          <SettingsView 
            settings={settings}
            onClose={() => setIsSettingsOpen(false)}
            onSaveSettings={setSettings}
            data={{ articles, savedItems, historyRecords, wordStats }}
            onImportData={handleImportData}
            onMergeVocabulary={handleMergeVocabulary}
          />
      )}

      {/* Sidebar */}
      {isSidebarOpen && (
        <div className="hidden md:block w-80 shrink-0 h-full border-l border-white/10 relative z-20 shadow-2xl">
            <Sidebar 
                savedItems={savedItems} 
                onRemoveItem={removeSavedItem} 
                onSelectSavedItem={(item) => handleJumpToContext(item.sourceArticleId, item.sourceSentenceIndex)}
                onViewCard={handleViewCard}
                theme={settings.theme}
            />
        </div>
      )}
      
      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/50 flex justify-end backdrop-blur-sm">
           <div className="w-80 h-full shadow-2xl relative animate-slide-in-right">
              <button onClick={() => setIsSidebarOpen(false)} className="absolute top-2 right-2 p-2 text-slate-400 z-10">✕</button>
              <Sidebar 
                savedItems={savedItems} 
                onRemoveItem={removeSavedItem} 
                onSelectSavedItem={(item) => handleJumpToContext(item.sourceArticleId, item.sourceSentenceIndex)}
                onViewCard={handleViewCard}
                theme={settings.theme}
            />
           </div>
        </div>
      )}

    </div>
  );
}

export default App;
