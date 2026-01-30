
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { translateText, generateWordCard, translateBatch } from './services/geminiService';
import { fetchFromCustomApi, translateWithCustomApi, translateBatchWithCustomApi } from './services/customApiService';
import { api } from './services/backendService';
import { feishuStorageApi } from './services/feishuStorageService';
import { SavedItem, WordCardData, ViewMode, HistoryRecord, Article, WordStatsMap, WordUsageData, Sentence, AppSettings, BackupData, ReadingSession } from './types';
import { Sidebar } from './components/Sidebar';
import { LeftSidebar } from './components/LeftSidebar';
import { VocabularyCard } from './components/VocabularyCard';
import { DraggableSheet } from './components/DraggableSheet';
import { StatsView } from './components/StatsView';
import { ArticleLibrary } from './components/ArticleLibrary';
import { SettingsView } from './components/SettingsView';
import { ReadingDashboard } from './components/ReadingDashboard'; 
import { processTextToArticle, countWordStats } from './utils/textHelpers';
import { BookOpenIcon, BookmarkIcon, SparklesIcon, TouchIcon, CheckCircleIcon, ChartBarIcon, LanguageIcon, CogIcon, ListBulletIcon, SunIcon, MoonIcon, TextSizeIcon, ArrowLeftIcon, LineHeightIcon } from './components/Icons';

const DEFAULT_TEXT = `The concept of serendipity often plays a crucial role in scientific discovery. Many breakthrough inventions were not the result of rigorous planning, but rather happy accidents that occurred while researchers were looking for something else. For instance, penicillin was discovered when Alexander Fleming returned from a holiday to find that mold had killed bacteria in a petri dish he had left uncovered. This illustrates that while method is important, maintaining an open mind to the unexpected is equally vital for progress.`;

const DEFAULT_SETTINGS: AppSettings = {
    aiModel: 'gemini-2.5-flash',
    dataSourceMode: 'ai',
    useServerStorage: false,
    useFeishuStorage: false,
    theme: 'light',
    serverUrl: 'http://localhost:5000',
    feishuFolderToken: '',
    feishuFileName: 'reader-state.json',
    fontSize: 18,
    lineHeight: 1.6,
    layoutMode: 'inline',
    customThemeColors: {
        appBg: '#ffffff',
        text: '#000000',
        headerBg: '#f8fafc',
        accent: '#6366f1'
    }
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
  const [readingSessions, setReadingSessions] = useState<ReadingSession[]>([]);
  
  // Saved Items
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  
  // Layout State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Right sidebar
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false); // Left sidebar (TOC)
  
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

  // Refs for Session Tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const sentenceRefs = useRef<Map<number, HTMLElement>>(new Map());
  const sessionStartTimeRef = useRef<number>(0);
  const sessionMaxProgressRef = useRef<number>(0);
  const previousArticleIdRef = useRef<string | null>(null);

  // --- Initialization & Persistence ---

  // Load Settings first
  useEffect(() => {
    const savedSettings = localStorage.getItem('english_reader_settings');
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            
            // Migration Logic: If coming from old version where dataSourceMode was 'server'
            if (parsed.dataSourceMode === 'server') {
                parsed.useServerStorage = true;
                parsed.dataSourceMode = 'ai'; // Revert AI to default Gemini, let user switch to custom if needed
            }
            
            setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch (e) {
            console.error("Failed to parse settings", e);
        }
    }
  }, []);

  // Data Loading Effect
  useEffect(() => {
    const loadData = async () => {
        // Load local data as fallback/baseline
        const savedItemsLocal = JSON.parse(localStorage.getItem('english_reader_saved_items') || '[]');
        const articlesLocal = JSON.parse(localStorage.getItem('english_reader_articles') || '[]');
        const historyLocal = JSON.parse(localStorage.getItem('english_reader_history_records') || '[]');
        const statsLocal = JSON.parse(localStorage.getItem('english_reader_word_stats') || '{}');
        const sessionsLocal = JSON.parse(localStorage.getItem('english_reader_sessions') || '[]');

        // Feishu Mode (via Pages Functions)
        if (settings.useFeishuStorage) {
            const folderToken = settings.feishuFolderToken || '';
            const fileName = settings.feishuFileName || 'reader-state.json';
            const userToken = settings.feishuUserAccessToken || '';

            if (!folderToken || !userToken) {
                setToast(
                    !folderToken
                        ? "Feishu enabled but folder token is empty. Using local data."
                        : "Feishu enabled but user_access_token is empty. Using local data."
                );
                setArticles(articlesLocal);
                setSavedItems(savedItemsLocal);
                setHistoryRecords(historyLocal);
                setWordStats(statsLocal);
                setReadingSessions(sessionsLocal);
                if (articlesLocal.length === 0) createDefaultArticle();
                return;
            }

            try {
                const remote = await feishuStorageApi.pullState(folderToken, fileName, userToken);
                if (remote) {
                    setArticles(remote.articles || []);
                    setSavedItems(remote.savedItems || []);
                    setHistoryRecords(remote.historyRecords || []);
                    setWordStats(remote.wordStats || {});
                    setReadingSessions(remote.sessions || []);

                    // Keep Feishu mode enabled locally even if remote settings differ
                    setSettings(prev => ({
                        ...DEFAULT_SETTINGS,
                        ...(remote.settings || {}),
                        useFeishuStorage: true,
                        useServerStorage: false,
                        feishuFolderToken: prev.feishuFolderToken || folderToken,
                        feishuFileName: prev.feishuFileName || fileName,
                    }));

                    if ((remote.articles || []).length > 0 && !activeArticleId) {
                        setActiveArticleId(remote.articles[0].id);
                    } else if ((remote.articles || []).length === 0) {
                        if (articlesLocal.length === 0) createDefaultArticle();
                    }
                } else {
                    // Remote file missing or not readable yet, fallback to local
                    setArticles(articlesLocal);
                    setSavedItems(savedItemsLocal);
                    setHistoryRecords(historyLocal);
                    setWordStats(statsLocal);
                    setReadingSessions(sessionsLocal);
                    if (articlesLocal.length === 0) createDefaultArticle();
                }
            } catch (err) {
                console.error("Feishu pull failed", err);
                setToast("Feishu sync failed. Using local data.");
                setArticles(articlesLocal);
                setSavedItems(savedItemsLocal);
                setHistoryRecords(historyLocal);
                setWordStats(statsLocal);
                setReadingSessions(sessionsLocal);
                if (articlesLocal.length === 0) createDefaultArticle();
            }
            return;
        }

        // Only attempt server fetch if useServerStorage is TRUE
        if (settings.useServerStorage && settings.serverUrl) {
            try {
                // Try to connect to backend
                const [serverArticles, serverItems] = await Promise.all([
                    api.getArticles(settings.serverUrl),
                    api.getSavedItems(settings.serverUrl)
                ]);
                
                // If successful, use server data
                setArticles(serverArticles);
                setSavedItems(serverItems);
                
                // History/Stats/Sessions still local for now unless backend expanded
                setHistoryRecords(historyLocal);
                setWordStats(statsLocal);
                setReadingSessions(sessionsLocal);
                
                if (serverArticles.length > 0 && !activeArticleId) {
                    setActiveArticleId(serverArticles[0].id);
                } else if (serverArticles.length === 0) {
                    // Only create default if local is also empty or we want to ensure some content
                     if (articlesLocal.length === 0) createDefaultArticle();
                }
            } catch (err) {
                console.error("Server Connection Failed", err);
                
                // CRITICAL FIX: Automatically disable server storage if unreachable to prevent "Failed to fetch" loops
                setToast("Server unreachable. Disabling Server Sync.");
                setSettings(prev => ({ ...prev, useServerStorage: false }));
                
                // Fallback to local data immediately
                setArticles(articlesLocal);
                setSavedItems(savedItemsLocal);
                setHistoryRecords(historyLocal);
                setWordStats(statsLocal);
                setReadingSessions(sessionsLocal);
                if (articlesLocal.length === 0) createDefaultArticle();
            }
        } else {
            // Local Mode
            setArticles(articlesLocal);
            setSavedItems(savedItemsLocal);
            setHistoryRecords(historyLocal);
            setWordStats(statsLocal);
            setReadingSessions(sessionsLocal);
            if (articlesLocal.length === 0) createDefaultArticle();
        }
    };
    loadData();
  }, [settings.useServerStorage, settings.serverUrl, settings.useFeishuStorage, settings.feishuFolderToken, settings.feishuFileName]); 

  // Feishu Sync: periodic save + best-effort save on exit
  useEffect(() => {
      if (!settings.useFeishuStorage) return;
      if (!settings.feishuFolderToken) return;
      if (!settings.feishuUserAccessToken) return;
      const fileName = settings.feishuFileName || 'reader-state.json';

      let cancelled = false;

      const buildBackup = (): BackupData => ({
          version: 1,
          timestamp: Date.now(),
          articles,
          savedItems,
          historyRecords,
          wordStats,
          settings,
          sessions: readingSessions,
      });

      const push = async () => {
          try {
              await feishuStorageApi.pushState(
                  settings.feishuFolderToken!,
                  fileName,
                  buildBackup(),
                  settings.feishuUserAccessToken
              );
          } catch (e) {
              console.warn("Feishu periodic push failed", e);
          }
      };

      const interval = setInterval(() => {
          if (cancelled) return;
          push();
      }, 60_000);

      const handleVisibility = () => {
          if (document.visibilityState === 'hidden') {
              // Try a quick push when tab is backgrounded
              push();
          }
      };

      const handleBeforeUnload = () => {
          // Best effort only; request may not finish.
          // keepalive: true is set in feishuStorageApi.
          push();
      };

      document.addEventListener('visibilitychange', handleVisibility);
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
          cancelled = true;
          clearInterval(interval);
          document.removeEventListener('visibilitychange', handleVisibility);
          window.removeEventListener('beforeunload', handleBeforeUnload);
      };
  }, [
      settings.useFeishuStorage,
      settings.feishuFolderToken,
      settings.feishuFileName,
      // Data dependencies
      articles,
      savedItems,
      historyRecords,
      wordStats,
      readingSessions,
      settings,
  ]);

  // Persist State (Local backup always happens)
  useEffect(() => {
      localStorage.setItem('english_reader_saved_items', JSON.stringify(savedItems));
      localStorage.setItem('english_reader_articles', JSON.stringify(articles));
      localStorage.setItem('english_reader_history_records', JSON.stringify(historyRecords));
      localStorage.setItem('english_reader_word_stats', JSON.stringify(wordStats));
      localStorage.setItem('english_reader_sessions', JSON.stringify(readingSessions));
      localStorage.setItem('english_reader_settings', JSON.stringify(settings));
  }, [savedItems, articles, historyRecords, wordStats, settings, readingSessions]);

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

  const activeArticle = articles.find(a => a.id === activeArticleId);
  const topCard = wordCardStack.length > 0 ? wordCardStack[wordCardStack.length - 1] : null;
  const previousCard = wordCardStack.length > 1 ? wordCardStack[wordCardStack.length - 2] : null;
  
  const currentArticleSessions = readingSessions
    .filter(s => s.articleId === activeArticleId)
    .sort((a, b) => b.startTime - a.startTime);

  const groupData = useMemo(() => {
     if (!activeArticle) return { siblings: [], currentIndex: -1, prev: null, next: null };
     
     let siblings: Article[] = [];
     if (activeArticle.groupId) {
         siblings = articles
            .filter(a => a.groupId === activeArticle.groupId)
            .sort((a,b) => a.createdAt - b.createdAt);
     } else {
         siblings = [activeArticle];
     }
     
     const currentIndex = siblings.findIndex(a => a.id === activeArticleId);
     const prev = currentIndex > 0 ? siblings[currentIndex - 1] : null;
     const next = currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

     return { siblings, currentIndex, prev, next };
  }, [activeArticle, articles, activeArticleId]);

  const articleStats = activeArticle 
      ? countWordStats(activeArticle.sentences.map(s => s.text).join(' ')) 
      : { enCount: 0, cnCount: 0, readingTimeMin: 0 };

  const getThemePalette = () => {
      if (settings.theme === 'custom' && settings.customThemeColors) {
          return {
              appBg: 'transition-colors duration-500', 
              text: 'transition-colors duration-500',
              textMuted: 'opacity-60',
              headerBg: 'backdrop-blur-md border-b',
              paperBg: '', 
              shadow: 'shadow-2xl',
              accent: 'transition-colors duration-500',
              highlight: 'bg-white/20',
              selection: 'bg-white/30',
              isCustom: true
          };
      }

      switch(settings.theme) {
          case 'dark': return {
              appBg: 'bg-[#0f1115]',
              text: 'text-slate-200',
              textMuted: 'text-slate-500',
              headerBg: 'bg-[#0f1115]/90 border-slate-800',
              paperBg: 'bg-[#15171b] border-slate-800',
              shadow: 'shadow-2xl shadow-black/50',
              accent: 'text-indigo-400',
              highlight: 'bg-indigo-500/30 text-indigo-100',
              selection: 'bg-indigo-500/40',
              isCustom: false
          };
          case 'sepia': return {
              appBg: 'bg-[#f4ecd8]', 
              text: 'text-[#433422]',
              textMuted: 'text-[#8c7b66]',
              headerBg: 'bg-[#f4ecd8]/90 border-[#e8dfcc]',
              paperBg: 'bg-[#fdf6e3] border-[#e8dfcc]', 
              shadow: 'shadow-xl shadow-[#5f4b32]/10',
              accent: 'text-[#b08d55]',
              highlight: 'bg-[#b08d55]/20 text-[#5f4b32]',
              selection: 'bg-[#b08d55]/30',
              isCustom: false
          };
          case 'forest': return {
              appBg: 'bg-[#1c211f]', 
              text: 'text-[#c6d1cc]',
              textMuted: 'text-[#6e7d77]',
              headerBg: 'bg-[#1c211f]/90 border-[#2a302d]',
              paperBg: 'bg-[#232926] border-[#2a302d]', 
              shadow: 'shadow-2xl shadow-black/60',
              accent: 'text-[#4ade80]',
              highlight: 'bg-[#4ade80]/20 text-[#ecfdf5]',
              selection: 'bg-[#4ade80]/30',
              isCustom: false
          };
          case 'amethyst': return {
              appBg: 'bg-[#1e1b2e]', 
              text: 'text-[#e9d5ff]',
              textMuted: 'text-[#a78bfa]',
              headerBg: 'bg-[#2e2645]/90 border-[#4c3d75]',
              paperBg: 'bg-[#2e2645] border-[#4c3d75]', 
              shadow: 'shadow-2xl shadow-[#120f1f]/80',
              accent: 'text-[#d8b4fe]',
              highlight: 'bg-[#d8b4fe]/20 text-[#f3e8ff]',
              selection: 'bg-[#d8b4fe]/30',
              isCustom: false
          };
          case 'light': 
          default: return {
              appBg: 'bg-[#f8f9fa]',
              text: 'text-[#2d333b]',
              textMuted: 'text-[#8590a6]',
              headerBg: 'bg-white/90 border-slate-100',
              paperBg: 'bg-white border-transparent',
              shadow: 'shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
              accent: 'text-indigo-600',
              highlight: 'bg-indigo-50 text-indigo-900',
              selection: 'bg-indigo-100',
              isCustom: false
          };
      }
  };
  
  const theme = getThemePalette();
  const customStyle = theme.isCustom ? {
      backgroundColor: settings.customThemeColors?.appBg,
      color: settings.customThemeColors?.text,
  } : {};

  // --- Effects ---

  const handleScroll = () => {
    const element = containerRef.current;
    if (!element) return;
    const { scrollTop, scrollHeight, clientHeight } = element;
    const totalScroll = scrollHeight - clientHeight;
    if (totalScroll <= 0) {
      setReadingProgress(100);
      sessionMaxProgressRef.current = 100;
      return;
    }
    const currentProg = Math.min(100, Math.max(0, (scrollTop / totalScroll) * 100));
    setReadingProgress(currentProg);
    
    if (currentProg > sessionMaxProgressRef.current) {
        sessionMaxProgressRef.current = currentProg;
    }
  };

  useEffect(() => {
    const timer = setTimeout(handleScroll, 100);
    window.addEventListener('resize', handleScroll);
    return () => {
        window.removeEventListener('resize', handleScroll);
        clearTimeout(timer);
    };
  }, [activeArticle, viewMode, showTranslation, settings.fontSize, settings.lineHeight, settings.layoutMode]); 

  // Session Tracking
  useEffect(() => {
      if (previousArticleIdRef.current) {
          const endTime = Date.now();
          const duration = (endTime - sessionStartTimeRef.current) / 1000;
          if (duration > 10) { 
              const prevArticle = articles.find(a => a.id === previousArticleIdRef.current);
              if (prevArticle) {
                  const newSession: ReadingSession = {
                      id: Date.now().toString() + Math.random().toString().slice(2, 5),
                      articleId: prevArticle.id,
                      articleTitle: prevArticle.title,
                      startTime: sessionStartTimeRef.current,
                      endTime: endTime,
                      durationSeconds: Math.floor(duration),
                      maxProgress: Math.floor(sessionMaxProgressRef.current)
                  };
                  setReadingSessions(prev => [newSession, ...prev]);
              }
          }
      }

      if (activeArticleId && viewMode === ViewMode.READ) {
          sessionStartTimeRef.current = Date.now();
          sessionMaxProgressRef.current = 0;
          previousArticleIdRef.current = activeArticleId;
          setReadingProgress(0);
          if (containerRef.current) containerRef.current.scrollTop = 0;
      } else {
          previousArticleIdRef.current = null;
      }
  }, [activeArticleId, viewMode]);

  useEffect(() => {
      if (highlightSentenceIndex !== null && viewMode === ViewMode.READ && activeArticleId) {
          setTimeout(() => {
              const el = sentenceRefs.current.get(highlightSentenceIndex);
              if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.classList.add(theme.selection); 
                  setTimeout(() => el.classList.remove(theme.selection), 2000);
              }
              setHighlightSentenceIndex(null);
          }, 300);
      }
  }, [highlightSentenceIndex, viewMode, activeArticleId, theme]);

  useEffect(() => {
     if (toast) {
         const timer = setTimeout(() => setToast(null), 3000);
         return () => clearTimeout(timer);
     }
  }, [toast]);

  // --- Logic ---

  const handleImportData = async (data: BackupData) => {
      setArticles(data.articles);
      setSavedItems(data.savedItems);
      setHistoryRecords(data.historyRecords);
      setWordStats(data.wordStats);
      setSettings(data.settings);
      setReadingSessions(data.sessions || []);
      
      if (data.articles.length > 0) setActiveArticleId(data.articles[0].id);
      setToast("Data restored locally!");

      if (settings.useServerStorage && settings.serverUrl) {
          setToast("Syncing backup to server database...");
          try {
              await api.restoreBackup(settings.serverUrl, data);
              setToast("Server Sync Complete!");
          } catch (e) {
              console.error("Server sync failed", e);
              setError("Local restore ok, but Server Sync failed.");
          }
      }
  };

  const handleMergeVocabulary = (newItems: SavedItem[]) => {
      let addedCount = 0;
      const newItemsToAdd: SavedItem[] = [];

      setSavedItems(prev => {
          const currentMap = new Map(prev.map(i => [i.original.toLowerCase(), i]));
          const merged = [...prev];
          
          newItems.forEach(item => {
              if (item.type === 'word' && !currentMap.has(item.original.toLowerCase())) {
                  const newItem = { ...item, id: Date.now().toString() + Math.random().toString().slice(2,5) };
                  merged.push(newItem);
                  newItemsToAdd.push(newItem);
                  currentMap.set(newItem.original.toLowerCase(), newItem);
                  addedCount++;
              }
          });
          return merged;
      });

      if (settings.useServerStorage && settings.serverUrl) {
          newItemsToAdd.forEach(item => {
              api.saveItem(settings.serverUrl, item).catch(e => console.error("Sync merge failed", e));
          });
      }

      setToast(`Successfully imported ${addedCount} new words!`);
  };

  const executeArticleTranslation = async (targetArticle: Article) => {
    if (isTranslatingArticle) return;
    const needsTranslation = targetArticle.sentences.some(s => !s.translation);
    if (!needsTranslation) {
        setToast("Translations already exist.");
        return;
    }

    setIsTranslatingArticle(true);
    setToast(`Translating: ${targetArticle.title}...`);
    
    try {
        const BATCH_SIZE = 20;
        const sentences = [...targetArticle.sentences];
        const newSentences = [...sentences];

        for (let i = 0; i < sentences.length; i += BATCH_SIZE) {
            const chunk = sentences.slice(i, i + BATCH_SIZE);
            const chunkIndices = chunk.map((s, idx) => ({ s, absIdx: i + idx })).filter(item => !item.s.translation);
            
            if (chunkIndices.length > 0) {
                const textsToTranslate = chunkIndices.map(item => item.s.text);
                let translations: string[] = [];
                
                if (settings.dataSourceMode === 'custom_api' && settings.customApiConfig) {
                    translations = await translateBatchWithCustomApi(textsToTranslate, settings.customApiConfig);
                } else {
                    translations = await translateBatch(textsToTranslate, settings);
                }
                
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

        const updatedArticle = { ...targetArticle, sentences: newSentences };
        setArticles(prev => prev.map(a => a.id === updatedArticle.id ? updatedArticle : a));
        
        if (settings.useServerStorage && settings.serverUrl) {
            await api.saveArticle(settings.serverUrl, updatedArticle);
        }

        setToast("Translation complete!");
    } catch (err: any) {
        console.error("Translation failed", err);
        const errStr = err.toString();
        const isQuota = errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED');
        if (isQuota) {
            setError("API Quota Exceeded (429). Switch to 'Custom API'.");
        } else {
            setError("Could not translate entire article. Try again later.");
        }
    } finally {
        setIsTranslatingArticle(false);
    }
  };

  const toggleTranslation = async () => {
    const nextState = !showTranslation;
    setShowTranslation(nextState);
    setSettings(prev => ({
        ...prev,
        layoutMode: nextState ? 'split' : 'inline'
    }));

    if (nextState && activeArticle) {
        await executeArticleTranslation(activeArticle);
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

  const fetchCardData = async (word: string, context?: string): Promise<WordCardData> => {
      const cachedItem = savedItems.find(i => 
          i.type === 'word' && i.original.trim().toLowerCase() === word.trim().toLowerCase()
      );
      if (cachedItem && cachedItem.cardData) {
          return { ...cachedItem.cardData };
      }
      if (settings.dataSourceMode === 'local_only') {
          throw new Error(`"${word}" not found in collection. Switch to AI mode to generate.`);
      }
      if (settings.dataSourceMode === 'custom_api' && settings.customApiConfig?.url) {
          try {
              return await fetchFromCustomApi(word, settings.customApiConfig);
          } catch (e: any) {
              console.error(e);
              throw new Error(e.message);
          }
      }
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
             
             let translation = '';
             if (settings.dataSourceMode === 'custom_api' && settings.customApiConfig) {
                 translation = await translateWithCustomApi(selectedText, settings.customApiConfig);
             } else {
                 translation = await translateText(selectedText, settings);
             }

             setActiveTranslation(translation);
             
             const updatedSentences = [...activeArticle.sentences];
             updatedSentences[selectedSentenceIndex] = { 
                 ...updatedSentences[selectedSentenceIndex], 
                 translation 
             };
             const updatedArticle = { ...activeArticle, sentences: updatedSentences };
             setArticles(prev => prev.map(a => a.id === updatedArticle.id ? updatedArticle : a));
             
             if (settings.useServerStorage && settings.serverUrl) {
                 await api.saveArticle(settings.serverUrl, updatedArticle);
             }
        }
      }
    } catch (err: any) {
      console.error(err);
      const errStr = err.toString();
      const isQuota = errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED');
      if (isQuota) {
          setError("API Quota Exceeded (429). Please switch to 'Custom API' in Settings.");
      } else {
          setError(err.message || "Failed to process request.");
      }
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

  const handleSave = async () => {
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
    
    if (settings.useServerStorage && settings.serverUrl) {
        try {
            await api.saveItem(settings.serverUrl, newItem);
        } catch (err) {
            console.error("Failed to save to server", err);
            setToast("Saved locally, but server sync failed.");
            return;
        }
    }
    setToast("Added to your collection!");
  };

  const removeSavedItem = async (id: string) => {
    const item = savedItems.find(i => i.id === id);
    if (item) addToHistory('REMOVE', item.original, item.type);
    setSavedItems(prev => prev.filter(item => item.id !== id));

    if (settings.useServerStorage && settings.serverUrl) {
        try {
            await api.deleteItem(settings.serverUrl, id);
        } catch(e) {
            console.error("Failed to delete from server", e);
        }
    }
  };

  const handleJumpToContext = (articleId: string, sentenceIndex: number) => {
      setActiveArticleId(articleId);
      setHighlightSentenceIndex(sentenceIndex);
      setViewMode(ViewMode.READ);
      setIsSidebarOpen(false);
  };

  const handleImportArticle = async (article: Article, autoTranslate: boolean = false) => {
      setArticles(prev => [article, ...prev]);
      setActiveArticleId(article.id);
      setViewMode(ViewMode.READ);
      setToast("Article imported successfully!");
      
      if (settings.useServerStorage && settings.serverUrl) {
          await api.saveArticle(settings.serverUrl, article);
      }

      if (autoTranslate) {
          setShowTranslation(true);
          setSettings(prev => ({ ...prev, layoutMode: 'split' }));
          await executeArticleTranslation(article);
      }
  };

  const handleDeleteArticle = async (id: string) => {
      setArticles(prev => prev.filter(a => a.id !== id));
      if (activeArticleId === id) {
          setActiveArticleId(articles.length > 1 ? articles[0].id : null);
      }
      if (settings.useServerStorage && settings.serverUrl) {
          await api.deleteArticle(settings.serverUrl, id);
      }
  };

  const handleDeleteGroup = async (groupId: string) => {
      const articlesToDelete = articles.filter(a => a.groupId === groupId);
      setArticles(prev => prev.filter(a => a.groupId !== groupId));
      
      // If currently reading one of the deleted articles, reset view
      if (activeArticle && activeArticle.groupId === groupId) {
          setActiveArticleId(null);
      }

      if (settings.useServerStorage && settings.serverUrl) {
          // Sequentially delete from server
          for (const a of articlesToDelete) {
              try {
                  await api.deleteArticle(settings.serverUrl, a.id);
              } catch(e) {
                  console.error("Failed to delete article from server", a.id);
              }
          }
      }
  };
  
  const toggleNightMode = () => {
      setSettings(prev => ({
          ...prev,
          theme: prev.theme === 'dark' ? 'light' : 'dark'
      }));
  };
  
  const changeFontSize = (delta: number) => {
      setSettings(prev => ({
          ...prev,
          fontSize: Math.max(12, Math.min(32, prev.fontSize + delta))
      }));
  };

  const changeLineHeight = (delta: number) => {
      setSettings(prev => {
          const current = prev.lineHeight || 1.6;
          const newVal = Math.max(1.2, Math.min(2.4, current + delta));
          return {
              ...prev,
              lineHeight: Number(newVal.toFixed(1))
          };
      });
  };

  const renderInteractiveToken = (token: string, sentence: Sentence, tIdx: number) => {
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
                 sentence.text.split(/([a-zA-Z0-9_'-]+)/g).map((token, tIdx) => renderInteractiveToken(token, sentence, tIdx))
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

      if (settings.layoutMode === 'inline') {
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
      }
      
      return sentenceContent;
  };

  return (
    <div 
        className={`flex h-screen overflow-hidden font-sans transition-colors duration-500 ${theme.appBg} ${theme.text}`}
        style={customStyle}
    >
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-down pointer-events-none">
            <div className="bg-slate-800/90 backdrop-blur-md text-white px-5 py-3 rounded-full shadow-2xl border border-white/10 flex items-center gap-3 text-sm font-medium">
                <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                {toast}
            </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header 
            className={`flex items-center justify-between px-4 sm:px-6 z-10 gap-2 sm:gap-4 transition-colors ${theme.headerBg} pb-2`}
            style={{ 
                ...theme.isCustom ? { backgroundColor: settings.customThemeColors?.headerBg } : {},
                paddingTop: 'env(safe-area-inset-top)',
                minHeight: 'calc(4rem + env(safe-area-inset-top))'
            }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {viewMode === ViewMode.READ && activeArticle && (
                 <button 
                    onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
                    className={`p-2 rounded-lg shrink-0 transition-colors ${isLeftSidebarOpen ? theme.accent : 'hover:bg-black/5 opacity-60 hover:opacity-100'}`}
                    style={isLeftSidebarOpen && theme.isCustom ? { color: settings.customThemeColors?.accent } : {}}
                    title="Toggle Table of Contents"
                >
                    <ListBulletIcon className="w-6 h-6" />
                </button>
            )}

            <button
                className="bg-indigo-600 p-2 rounded-lg hidden sm:block shrink-0 shadow-lg shadow-indigo-600/20 hover:scale-105 transition-transform"
                onClick={() => setViewMode(ViewMode.LIBRARY)}
            >
                <BookOpenIcon className="w-5 h-5 text-white" />
            </button>
            <div className="flex flex-col overflow-hidden cursor-pointer" onClick={() => setViewMode(ViewMode.LIBRARY)}>
                <h1 className="font-bold text-lg truncate tracking-tight leading-tight">
                    {viewMode === ViewMode.LIBRARY ? 'Library' : (viewMode === ViewMode.STATS ? 'Analytics' : (activeArticle?.title || 'Reader'))}
                </h1>
                
                {viewMode === ViewMode.READ && activeArticle && (
                    <div className="flex items-center gap-2 text-[10px] uppercase font-bold opacity-60">
                        <span>{articleStats.enCount} Words</span>
                        <span className="w-1 h-1 rounded-full bg-current"></span>
                        <span>{articleStats.readingTimeMin} Min</span>
                    </div>
                )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {viewMode === ViewMode.READ && (
                <>  
                    <div className="flex items-center bg-black/5 rounded-lg mr-1 p-1 hidden md:flex">
                        <button 
                            onClick={() => changeFontSize(-1)}
                            className="p-1 hover:bg-white/50 rounded text-xs font-bold w-6 h-6 flex items-center justify-center transition-colors"
                            title="Decrease Font Size"
                        >
                            A-
                        </button>
                        <TextSizeIcon className="w-4 h-4 mx-1 opacity-50" />
                        <button 
                            onClick={() => changeFontSize(1)}
                            className="p-1 hover:bg-white/50 rounded text-xs font-bold w-6 h-6 flex items-center justify-center transition-colors"
                            title="Increase Font Size"
                        >
                            A+
                        </button>
                    </div>

                    <div className="flex items-center bg-black/5 rounded-lg mr-2 p-1 hidden lg:flex">
                        <button 
                            onClick={() => changeLineHeight(-0.2)}
                            className="p-1 hover:bg-white/50 rounded text-xs font-bold w-6 h-6 flex items-center justify-center transition-colors"
                            title="Decrease Line Spacing"
                        >
                            -
                        </button>
                        <LineHeightIcon className="w-4 h-4 mx-1 opacity-50" />
                        <button 
                            onClick={() => changeLineHeight(0.2)}
                            className="p-1 hover:bg-white/50 rounded text-xs font-bold w-6 h-6 flex items-center justify-center transition-colors"
                            title="Increase Line Spacing"
                        >
                            +
                        </button>
                    </div>

                    <button 
                        onClick={toggleNightMode}
                        className={`p-2 rounded-md transition-all ${settings.theme === 'dark' ? 'bg-indigo-500/20 text-indigo-300' : 'opacity-60 hover:opacity-100 hover:bg-black/5'}`}
                        title="Toggle Night Mode"
                    >
                         {settings.theme === 'dark' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                    </button>
                    
                    <button 
                        onClick={toggleTranslation}
                        className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 border font-bold text-xs ml-2
                        ${showTranslation 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20' 
                            : 'bg-transparent border-current opacity-60 hover:opacity-100'
                        }`}
                        title={showTranslation ? "Hide Translation" : "Split View & Translate"}
                    >
                        <LanguageIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Translate</span>
                        {isTranslatingArticle && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                    </button>

                    <div className="w-px h-6 bg-current opacity-10 mx-2 hidden sm:block"></div>

                    <div className="flex bg-black/5 p-1 rounded-lg mr-2 hidden lg:flex">
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
                style={theme.isCustom ? { color: settings.customThemeColors?.accent } : {}}
            >
                <BookmarkIcon className="w-5 h-5" solid={isSidebarOpen} />
            </button>
          </div>
        </header>
        
        <div className="flex-1 flex overflow-hidden">
            {isLeftSidebarOpen && viewMode === ViewMode.READ && activeArticle && (
                <div className="hidden md:block shrink-0 relative z-20">
                     <LeftSidebar 
                        articles={groupData.siblings}
                        currentArticleId={activeArticleId}
                        groupTitle={activeArticle.groupTitle || activeArticle.title}
                        onSelectArticle={setActiveArticleId}
                        theme={settings.theme}
                     />
                </div>
            )}
            
            {isLeftSidebarOpen && viewMode === ViewMode.READ && activeArticle && (
                <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
                   <div 
                        className="w-72 h-full animate-slide-in-right bg-white shadow-2xl relative"
                        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
                   >
                        <button onClick={() => setIsLeftSidebarOpen(false)} className="absolute right-2 p-2 text-slate-400 z-10 mt-2" style={{ top: 'env(safe-area-inset-top)' }}>✕</button>
                        <LeftSidebar 
                            articles={groupData.siblings}
                            currentArticleId={activeArticleId}
                            groupTitle={activeArticle.groupTitle || activeArticle.title}
                            onSelectArticle={setActiveArticleId}
                            onCloseMobile={() => setIsLeftSidebarOpen(false)}
                            theme={settings.theme}
                        />
                   </div>
                </div>
            )}

            {viewMode === ViewMode.STATS ? (
                <StatsView 
                    history={historyRecords} 
                    wordStats={wordStats}
                    articles={articles}
                    sessions={readingSessions}
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
                    onDeleteGroup={handleDeleteGroup}
                />
            ) : (
                <>
                    {viewMode === ViewMode.READ && activeArticle && (
                        <ReadingDashboard 
                            wordCount={articleStats.enCount} 
                            progress={readingProgress}
                            isActive={!isSettingsOpen && !isSidebarOpen}
                            themeAccent={theme.accent}
                            sessions={currentArticleSessions}
                        />
                    )}

                    <div 
                        className="w-full h-1 bg-black/5 absolute left-0 right-0 z-20 mt-16"
                        style={{ top: 'env(safe-area-inset-top)' }}
                    >
                        <div 
                            className="h-full bg-indigo-500 transition-all duration-150 ease-out"
                            style={{ width: `${readingProgress}%`, backgroundColor: theme.isCustom ? settings.customThemeColors?.accent : undefined }}
                        />
                    </div>

                    <div 
                        ref={containerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 relative pb-24 scroll-smooth"
                        onClick={() => {
                            setSelectedText(null);
                            setSelectionRect(null);
                            setWordCardStack([]);
                        }}
                    >
                        <div className={`max-w-4xl mx-auto min-h-[60vh] p-8 sm:p-12 rounded-xl relative transition-all duration-500 
                            ${theme.paperBg} ${theme.shadow} border
                            ${settings.layoutMode === 'split' ? 'max-w-[90rem]' : ''}
                            ${theme.isCustom ? 'bg-white/5 backdrop-blur-sm border-white/10' : ''}
                            `}
                        >
                            {!activeArticle ? (
                                <div className="text-center py-20 opacity-50">
                                    <p>No article selected.</p>
                                    <button onClick={() => setViewMode(ViewMode.LIBRARY)} className="text-indigo-500 hover:underline">Go to Library</button>
                                </div>
                            ) : (
                                <div 
                                    className={`reader-text`} 
                                    style={{ 
                                        fontSize: `${settings.fontSize}px`,
                                        lineHeight: settings.lineHeight || 1.6
                                    }}
                                >
                                    <div className="mb-8 border-b border-dashed border-current/10 pb-6">
                                        <h2 className="text-4xl font-bold font-serif mb-2 tracking-tight">{activeArticle.title}</h2>
                                        <p className={`text-sm opacity-50 ${theme.textMuted} font-mono`}>
                                            {new Date(activeArticle.createdAt).toLocaleDateString()}
                                            {groupData.siblings.length > 1 && ` • Chapter ${groupData.currentIndex + 1} of ${groupData.siblings.length}`}
                                        </p>
                                    </div>
                                    
                                    {settings.layoutMode === 'split' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                                            {activeArticle.sentences.map((sentence, idx) => (
                                                <React.Fragment key={sentence.index}>
                                                    <div className={`
                                                        ${sentence.isParagraphStart && idx > 0 ? 'mt-8' : ''} 
                                                        hover:bg-black/5 rounded p-1 -ml-1 transition-colors
                                                    `}>
                                                        {renderSentence(sentence)}
                                                    </div>
                                                    <div className={`
                                                        ${sentence.isParagraphStart && idx > 0 ? 'mt-8' : ''} 
                                                        ${theme.textMuted} font-sans leading-relaxed text-base flex items-center
                                                        hover:bg-black/5 rounded p-1 -ml-1 transition-colors
                                                    `}>
                                                        {showTranslation && sentence.translation ? (
                                                            <div className="pl-2 border-l-2 border-indigo-500/20 w-full">
                                                                {sentence.translation}
                                                            </div>
                                                        ) : (
                                                            <span className="opacity-10 select-none w-full border-l-2 border-transparent pl-2">•</span>
                                                        )}
                                                    </div>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    ) : (
                                        activeArticle.sentences.map((sentence, idx) => (
                                            <React.Fragment key={sentence.index}>
                                                {sentence.isParagraphStart && idx > 0 && <div className="h-6" />} 
                                                {renderSentence(sentence)}
                                            </React.Fragment>
                                        ))
                                    )}

                                    <div className="mt-16 pt-8 border-t border-current/10 flex justify-between items-center gap-4">
                                        {groupData.prev ? (
                                            <button 
                                                onClick={() => setActiveArticleId(groupData.prev!.id)}
                                                className={`flex-1 p-4 rounded-xl border border-current/10 hover:bg-black/5 text-left transition-colors group flex flex-col`}
                                            >
                                                <span className="text-xs uppercase font-bold opacity-50 mb-1 flex items-center gap-1">
                                                    <ArrowLeftIcon className="w-3 h-3" /> Previous
                                                </span>
                                                <span className="font-bold text-lg line-clamp-1 group-hover:underline">
                                                    {groupData.prev.title}
                                                </span>
                                            </button>
                                        ) : <div className="flex-1"></div>}

                                        {groupData.next ? (
                                            <button 
                                                onClick={() => setActiveArticleId(groupData.next!.id)}
                                                className={`flex-1 p-4 rounded-xl border border-current/10 hover:bg-black/5 text-right transition-colors group flex flex-col items-end`}
                                            >
                                                <span className="text-xs uppercase font-bold opacity-50 mb-1 flex items-center gap-1">
                                                    Next <ArrowLeftIcon className="w-3 h-3 rotate-180" />
                                                </span>
                                                <span className="font-bold text-lg line-clamp-1 group-hover:underline">
                                                    {groupData.next.title}
                                                </span>
                                            </button>
                                        ) : <div className="flex-1"></div>}
                                    </div>

                                </div>
                            )}
                            
                            {isTranslatingArticle && (
                                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white shadow-2xl px-6 py-3 rounded-full flex items-center gap-3 text-sm animate-bounce z-50">
                                    <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></span>
                                    Translating in background...
                                </div>
                            )}
                        </div>
                    </div>

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
                            title={topCard ? "Vocabulary Card" : (error ? "Error" : "Translation")}
                            initialOffset={{ x: 0, y: 0 }}
                            onClose={() => {
                                setWordCardStack([]);
                                setActiveTranslation(null);
                                setError(null);
                            }}
                            className="z-50 border-indigo-100 shadow-2xl"
                        >
                            {error && (
                                <div className="p-6 text-red-600 text-center flex flex-col items-center gap-4">
                                    <p className="font-bold">{error}</p>
                                    {error.includes('Quota') && (
                                        <button 
                                            onClick={() => setIsSettingsOpen(true)}
                                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold shadow-lg"
                                        >
                                            Configure API Key
                                        </button>
                                    )}
                                </div>
                            )}

                            {activeTranslation && !error && (
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

                            {topCard && !error && (
                                <VocabularyCard 
                                    data={topCard} 
                                    onSave={handleSave}
                                    onUpdate={(newData) => {
                                        setWordCardStack(prev => [...prev.slice(0, -1), newData]);
                                        setSavedItems(prevItems => {
                                            const exists = prevItems.some(i => i.type === 'word' && i.original.toLowerCase() === newData.word.toLowerCase());
                                            if (!exists) return prevItems;
                                            
                                            const updatedItems = prevItems.map(item => {
                                                if (item.type === 'word' && item.original.toLowerCase() === newData.word.toLowerCase()) {
                                                    const updatedItem = {
                                                        ...item,
                                                        translation: newData.translation,
                                                        cardData: newData
                                                    };
                                                    if(settings.useServerStorage && settings.serverUrl) {
                                                        api.saveItem(settings.serverUrl, updatedItem).catch(console.error);
                                                    }
                                                    return updatedItem;
                                                }
                                                return item;
                                            });
                                            return updatedItems;
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
      </div>

      {isSettingsOpen && (
          <SettingsView 
            settings={settings}
            onClose={() => setIsSettingsOpen(false)}
            onSaveSettings={setSettings}
            data={{ articles, savedItems, historyRecords, wordStats }}
            onImportData={handleImportData}
            onMergeVocabulary={handleMergeVocabulary}
            onFeishuSyncNow={async () => {
                if (!settings.useFeishuStorage) {
                    setToast("请先启用飞书服务器开关");
                    return;
                }
                if (!settings.feishuFolderToken) {
                    setToast("Feishu Folder Token 为空");
                    return;
                }
                if (!settings.feishuUserAccessToken) {
                    setToast("user_access_token 为空，请先在设置中粘贴从飞书获取的 token");
                    return;
                }
                const fileName = settings.feishuFileName || 'reader-state.json';
                try {
                    const backup: BackupData = {
                        version: 1,
                        timestamp: Date.now(),
                        articles,
                        savedItems,
                        historyRecords,
                        wordStats,
                        settings,
                        sessions: readingSessions,
                    };
                    await feishuStorageApi.pushState(
                        settings.feishuFolderToken,
                        fileName,
                        backup,
                        settings.feishuUserAccessToken
                    );
                    setToast("已手动同步到飞书 JSON 文件");
                } catch (e: any) {
                    console.error("Manual Feishu sync failed", e);
                    const errorMsg = e?.message || String(e);
                    setToast(`同步飞书失败: ${errorMsg}`);
                }
            }}
          />
      )}

      {isSidebarOpen && (
        <div 
            className="hidden md:block w-80 shrink-0 h-full border-l border-white/10 relative z-20 shadow-2xl"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <Sidebar 
                savedItems={savedItems} 
                onRemoveItem={removeSavedItem} 
                onSelectSavedItem={(item) => handleJumpToContext(item.sourceArticleId, item.sourceSentenceIndex)}
                onViewCard={handleViewCard}
                theme={settings.theme}
            />
        </div>
      )}
      
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/50 flex justify-end backdrop-blur-sm">
           <div 
                className="w-80 h-full shadow-2xl relative animate-slide-in-right"
                style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
           >
              <button onClick={() => setIsSidebarOpen(false)} className="absolute right-2 p-2 text-slate-400 z-10 mt-2" style={{ top: 'env(safe-area-inset-top)' }}>✕</button>
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
