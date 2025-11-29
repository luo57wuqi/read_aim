
import React, { useState } from 'react';
import { HistoryRecord, WordStatsMap, Article, SavedItem, WordUsageData, ReadingSession } from '../types';
import { ChartBarIcon, TrashIcon, CheckCircleIcon, BookOpenIcon, EyeIcon, CardIcon, ClockIcon } from './Icons';

interface StatsViewProps {
  history: HistoryRecord[];
  wordStats: WordStatsMap;
  articles: Article[];
  sessions?: ReadingSession[];
  currentArticleId?: string; // To filter stats by current reading context
  onClose: () => void;
  onNavigateToContext: (articleId: string, sentenceIndex: number) => void;
  onViewCard: (word: string) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ 
  history, 
  wordStats, 
  articles, 
  sessions = [],
  currentArticleId,
  onClose,
  onNavigateToContext,
  onViewCard
}) => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'history' | 'frequency'>('sessions');

  // Calculate Stats
  const totalAdded = history.filter(h => h.action === 'ADD').length;
  const totalTimeSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const totalTimeFormatted = totalTimeSeconds > 3600 
    ? `${(totalTimeSeconds / 3600).toFixed(1)} hrs` 
    : `${Math.ceil(totalTimeSeconds / 60)} mins`;
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit'
    });
  };

  const getArticleTitle = (id: string) => articles.find(a => a.id === id)?.title || "Unknown Article";

  // Filter and Sort words
  const sortedWords = Object.entries(wordStats)
    .map(([word, data]) => {
        const usageData = data as WordUsageData;
        const articleFrequency = currentArticleId 
            ? usageData.occurrences.filter(o => o.articleId === currentArticleId).length 
            : 0;
        return {
            word,
            ...usageData,
            articleFrequency
        };
    })
    .sort((a, b) => {
         return b.frequency - a.frequency;
    });

  // Sort Sessions
  const sortedSessions = [...sessions].sort((a, b) => b.startTime - a.startTime);

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-4 sm:p-8 animate-fade-in relative">
        <div className="max-w-4xl mx-auto pb-20">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ChartBarIcon className="w-7 h-7 text-indigo-600" />
                        Learning Analytics
                    </h2>
                    <p className="text-slate-500 text-sm">
                        Insights into your reading habits.
                    </p>
                </div>
                <button 
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600 font-medium text-sm px-4 py-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                    Back to Reader
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-sm text-slate-500 font-medium uppercase tracking-wider mb-1">Total Time</p>
                        <p className="text-3xl font-bold text-slate-800">{totalTimeFormatted}</p>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-indigo-600 text-xs font-bold">
                        <ClockIcon className="w-4 h-4" /> Reading Duration
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-sm text-slate-500 font-medium uppercase tracking-wider mb-1">Items Saved</p>
                        <p className="text-3xl font-bold text-slate-800">{totalAdded}</p>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold">
                        <CheckCircleIcon className="w-4 h-4" /> Vocabulary
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-sm text-slate-500 font-medium uppercase tracking-wider mb-1">Sessions</p>
                        <p className="text-3xl font-bold text-slate-800">{sessions.length}</p>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-amber-600 text-xs font-bold">
                        <BookOpenIcon className="w-4 h-4" /> Reading Logs
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-slate-200 mb-6 px-2">
                <button 
                    onClick={() => setActiveTab('sessions')}
                    className={`pb-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'sessions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    Reading Sessions
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`pb-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    Action Log
                </button>
                <button 
                    onClick={() => setActiveTab('frequency')}
                    className={`pb-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'frequency' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    Vocabulary Stats
                </button>
            </div>

            {/* Sessions View (New) */}
            {activeTab === 'sessions' && (
                <div className="space-y-4 animate-fade-in-up">
                    {sortedSessions.length === 0 ? (
                        <div className="p-12 bg-white rounded-xl border border-slate-200 border-dashed text-center text-slate-400">
                            <ClockIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
                            <p>No reading sessions recorded yet.</p>
                            <p className="text-sm">Start reading an article for more than 10 seconds to generate a log.</p>
                        </div>
                    ) : (
                        sortedSessions.map((session) => (
                            <div key={session.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <BookOpenIcon className="w-4 h-4 text-indigo-500" />
                                        <h3 className="font-bold text-slate-800 text-base line-clamp-1">{session.articleTitle}</h3>
                                    </div>
                                    <p className="text-xs text-slate-400 pl-6">
                                        {formatDate(session.startTime)}
                                    </p>
                                </div>
                                <div className="text-right flex items-center gap-6">
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Duration</p>
                                        <p className="text-sm font-mono font-bold text-slate-700">
                                            {session.durationSeconds < 60 ? `${session.durationSeconds}s` : `${Math.floor(session.durationSeconds/60)}m`}
                                        </p>
                                    </div>
                                    <div className="w-px h-8 bg-slate-100"></div>
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Progress</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500" style={{ width: `${session.maxProgress}%` }}></div>
                                            </div>
                                            <span className="text-sm font-mono font-bold text-emerald-600">{session.maxProgress}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Frequency View */}
            {activeTab === 'frequency' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-3">Word</th>
                                <th className="px-6 py-3">Total Freq</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedWords.map((data) => {
                                const lastOccurrence = data.occurrences[data.occurrences.length - 1];
                                return (
                                    <tr key={data.word} className="hover:bg-slate-50 transition-colors group">
                                        <td 
                                            className="px-6 py-4 font-bold text-slate-800 cursor-pointer"
                                            onClick={() => onNavigateToContext(lastOccurrence.articleId, lastOccurrence.sentenceIndex)}
                                        >
                                            {data.word}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, data.frequency * 10)}%` }}></div>
                                                </div>
                                                <span className="text-sm font-mono text-slate-600">{data.frequency}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 flex gap-2">
                                            <button 
                                                onClick={() => onViewCard(data.word)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                title="View Word Card"
                                            >
                                                <CardIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* History View */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
                    <div className="divide-y divide-slate-100">
                        {history.length === 0 ? (
                            <div className="p-10 text-center text-slate-400">
                                No history recorded yet.
                            </div>
                        ) : (
                            history.map((record) => (
                                <div 
                                    key={record.id} 
                                    className="p-4 hover:bg-slate-50 transition-colors flex gap-4 group items-start"
                                >
                                    <div 
                                        className="shrink-0 pt-1 cursor-pointer"
                                        onClick={() => onNavigateToContext(record.sourceArticleId, record.sourceSentenceIndex)}
                                    >
                                        {record.action === 'ADD' && <CheckCircleIcon className="w-5 h-5 text-emerald-500" />}
                                        {record.action === 'REMOVE' && <TrashIcon className="w-5 h-5 text-red-500" />}
                                        {record.action === 'LOOKUP' && <EyeIcon className="w-5 h-5 text-indigo-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                    {record.action}
                                                </span>
                                                <span className="text-xs text-slate-300">•</span>
                                                <span className="text-xs text-slate-400 font-mono">{formatDate(record.timestamp)}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-between items-start">
                                            <p 
                                                className="text-slate-800 font-medium text-base mb-1 cursor-pointer hover:text-indigo-600"
                                                onClick={() => onNavigateToContext(record.sourceArticleId, record.sourceSentenceIndex)}
                                            >
                                                {record.original}
                                            </p>
                                            {record.type === 'word' && (
                                                <button 
                                                    onClick={() => onViewCard(record.original)}
                                                    className="opacity-0 group-hover:opacity-100 text-indigo-500 hover:bg-indigo-50 p-1 rounded transition-all text-xs flex items-center gap-1"
                                                >
                                                    <CardIcon className="w-3 h-3" /> View Card
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                            <BookOpenIcon className="w-3 h-3 text-slate-400" />
                                            <span className="italic truncate">{record.sourceArticleTitle || getArticleTitle(record.sourceArticleId)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
