
import React, { useState, useRef } from 'react';
import { AppSettings, BackupData, Article, SavedItem, HistoryRecord, WordStatsMap, DataSourceMode, Theme, CustomApiConfig } from '../types';
import { DownloadIcon, UploadIcon, XMarkIcon, CogIcon, BrainIcon, BookOpenIcon, LinkIcon, CardIcon, PlusIcon, TrashIcon, SparklesIcon, ClockIcon, PencilIcon, CheckCircleIcon } from './Icons';
import { api } from '../services/backendService';

interface SettingsViewProps {
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  data: {
      articles: Article[];
      savedItems: SavedItem[];
      historyRecords: HistoryRecord[];
      wordStats: WordStatsMap;
  };
  onImportData: (data: BackupData) => void;
  onMergeVocabulary: (items: SavedItem[]) => void;
  onFeishuSyncNow?: () => void;
}

const REQUIRED_JSON_FIELDS = [
    { key: 'word', desc: '单词拼写 (String)' },
    { key: 'phonetic', desc: '音标 (String)' },
    { key: 'translation', desc: '中文释义 (String)' },
    { key: 'recorded_meanings', desc: '详细字典释义 (String)' },
    { key: 'mnemonic_analysis', desc: '联想记忆法解析，核心字段 (String)' },
    { key: 'core_logic', desc: '核心抽象含义，如"让高度升高" (String)' },
    { key: 'visual_image_prompt', desc: '画面感描述 (String)' },
    { key: 'scenario_sentence_en', desc: '英文例句 (String)' },
    { key: 'scenario_sentence_cn', desc: '例句翻译 (String)' },
    { key: 'related_word_suggestion', desc: '可选：关联词对象 {word, reason}' },
];

const OPENAI_BODY_TEMPLATE = `{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "system",
      "content": "You are an expert English vocabulary teacher. You MUST return valid JSON only. Do not wrap in markdown code blocks."
    },
    {
      "role": "user",
      "content": "Analyze the English word: '{{word}}'. Create a vocabulary card for a Chinese learner using Associative Memory techniques.\\n\\nReturn a JSON object with exactly these keys:\\n{\\n  \\"word\\": \\"{{word}}\\",\\n  \\"phonetic\\": \\"IPA\\",\\n  \\"translation\\": \\"Common meaning\\",\\n  \\"recorded_meanings\\": \\"Detailed dictionary definitions\\",\\n  \\"mnemonic_analysis\\": \\"Explain using sound/spelling/root associations in Chinese\\",\\n  \\"core_logic\\": \\"Abstract core concept (short)\\",\\n  \\"visual_image_prompt\\": \\"Description for a visual aid image\\",\\n  \\"scenario_sentence_en\\": \\"Example sentence\\",\\n  \\"scenario_sentence_cn\\": \\"Sentence translation\\",\\n  \\"related_word_suggestion\\": { \\"word\\": \\"related_word\\", \\"reason\\": \\"why\\" }\\n}"
    }
  ],
  "temperature": 0.7,
  "stream": false
}`;

const QWEN_BODY_TEMPLATE = `{
  "model": "qwen-max",
  "messages": [
    {
      "role": "system",
      "content": "You are an expert English vocabulary teacher. You MUST return valid JSON only. Do not wrap in markdown code blocks."
    },
    {
      "role": "user",
      "content": "Analyze the English word: '{{word}}'. Create a vocabulary card for a Chinese learner using Associative Memory techniques.\\n\\nReturn a JSON object with exactly these keys:\\n{\\n  \\"word\\": \\"{{word}}\\",\\n  \\"phonetic\\": \\"IPA\\",\\n  \\"translation\\": \\"Common meaning\\",\\n  \\"recorded_meanings\\": \\"Detailed dictionary definitions\\",\\n  \\"mnemonic_analysis\\": \\"Explain using sound/spelling/root associations in Chinese\\",\\n  \\"core_logic\\": \\"Abstract core concept (short)\\",\\n  \\"visual_image_prompt\\": \\"Description for a visual aid image\\",\\n  \\"scenario_sentence_en\\": \\"Example sentence\\",\\n  \\"scenario_sentence_cn\\": \\"Sentence translation\\",\\n  \\"related_word_suggestion\\": { \\"word\\": \\"related_word\\", \\"reason\\": \\"why\\" }\\n}"
    }
  ],
  "temperature": 0.7,
  "stream": false
}`;

export const SettingsView: React.FC<SettingsViewProps> = ({ 
    onClose, 
    settings, 
    onSaveSettings,
    data,
    onImportData,
    onMergeVocabulary,
    onFeishuSyncNow
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'advanced' | 'server'>('general');
  const [includeImages, setIncludeImages] = useState(false);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');
  const [presetMessage, setPresetMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vocabInputRef = useRef<HTMLInputElement>(null);

  // --- Theme Logic ---
  const themes: { id: Theme; name: string; color: string }[] = [
      { id: 'light', name: '默白 (Light)', color: '#f8fafc' },
      { id: 'dark', name: '夜间 (Dark)', color: '#0f172a' },
      { id: 'sepia', name: '羊皮纸 (Sepia)', color: '#f4ecd8' },
      { id: 'forest', name: '森林 (Forest)', color: '#0f291e' },
      { id: 'amethyst', name: '紫罗兰 (Amethyst)', color: '#2e1065' },
      { id: 'custom', name: '自定义 (Custom)', color: 'linear-gradient(45deg, #ff9a9e 0%, #fad0c4 99%, #fad0c4 100%)' },
  ];

  // --- API Config Helpers ---
  const updateApiConfig = (field: keyof CustomApiConfig, value: any) => {
      setLocalSettings(prev => ({
          ...prev,
          customApiConfig: {
              url: '',
              method: 'GET',
              headers: [],
              bodyTemplate: '',
              responseMapping: '',
              ...prev.customApiConfig,
              [field]: value
          }
      }));
  };

  const applyPreset = (type: 'openai' | 'qwen') => {
      const isQwen = type === 'qwen';
      // Removed confirm dialog to prevent blocking issues
      
      setLocalSettings(prev => ({
          ...prev,
          dataSourceMode: 'custom_api', // Auto-switch to custom api
          customApiConfig: {
              url: isQwen 
                ? 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions' 
                : 'https://api.openai.com/v1/chat/completions',
              method: 'POST',
              headers: [
                  { key: 'Content-Type', value: 'application/json' },
                  { key: 'Authorization', value: isQwen ? 'Bearer YOUR_DASHSCOPE_KEY' : 'Bearer YOUR_API_KEY' }
              ],
              bodyTemplate: isQwen ? QWEN_BODY_TEMPLATE : OPENAI_BODY_TEMPLATE,
              responseMapping: 'choices[0].message.content'
          }
      }));

      // Show temporary success message
      setPresetMessage(isQwen ? "已加载通义千问预设 (Qwen Loaded)" : "Loaded OpenAI Preset");
      setTimeout(() => setPresetMessage(null), 3000);
  };

  const addHeader = () => {
      const current = localSettings.customApiConfig?.headers || [];
      updateApiConfig('headers', [...current, { key: '', value: '' }]);
  };

  const updateHeader = (index: number, field: 'key' | 'value', val: string) => {
      const current = [...(localSettings.customApiConfig?.headers || [])];
      current[index] = { ...current[index], [field]: val };
      updateApiConfig('headers', current);
  };

  const removeHeader = (index: number) => {
      const current = [...(localSettings.customApiConfig?.headers || [])];
      current.splice(index, 1);
      updateApiConfig('headers', current);
  };

  const checkServerConnection = async () => {
      setServerStatus('unknown');
      const url = localSettings.serverUrl || 'http://localhost:5000';
      const isOk = await api.checkStatus(url);
      setServerStatus(isOk ? 'ok' : 'error');
  };

  const handleOpenFeishuApiExplorer = () => {
      // Open Feishu API Explorer in a generic way; you可以在页面内选择具体接口和应用
      window.open('https://open.feishu.cn/api-explorer?from=guide', '_blank');
  };

  // --- Export Logic ---
  const handleExport = () => {
      const optimizedSavedItems = data.savedItems.map(item => {
          if (item.cardData && item.cardData.custom_image_base64 && !includeImages) {
              const { custom_image_base64, ...restCardData } = item.cardData;
              return { ...item, cardData: restCardData };
          }
          return item;
      });

      const backup: BackupData = {
          version: 1,
          timestamp: Date.now(),
          articles: data.articles,
          savedItems: optimizedSavedItems,
          historyRecords: data.historyRecords,
          wordStats: data.wordStats,
          settings: localSettings
      };
      
      downloadJSON(backup, `reader-backup-${new Date().toISOString().slice(0,10)}.json`);
  };

  const handleExportVocabulary = () => {
      const words = data.savedItems.filter(item => item.type === 'word');
      const optimizedWords = words.map(item => {
        if (item.cardData && item.cardData.custom_image_base64 && !includeImages) {
            const { custom_image_base64, ...restCardData } = item.cardData;
            return { ...item, cardData: restCardData };
        }
        return item;
      });
      downloadJSON(optimizedWords, `vocabulary-db-${new Date().toISOString().slice(0,10)}.json`);
  };

  const downloadJSON = (obj: any, filename: string) => {
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  // --- Import Logic ---
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (json.version && Array.isArray(json.articles)) {
                  if(confirm("确定覆盖当前数据吗？ (Are you sure to overwrite?)")) {
                      onImportData(json as BackupData);
                      onClose();
                  }
              } else {
                  alert("格式错误 (Invalid format)");
              }
          } catch { alert("JSON解析失败 (Parse Failed)"); }
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const handleImportVocabulary = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (Array.isArray(json)) {
                  onMergeVocabulary(json as SavedItem[]);
                  onClose();
              } else { alert("需要数组格式 (Expected Array)"); }
          } catch { alert("JSON解析失败"); }
          if (vocabInputRef.current) vocabInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  // Helper for Custom Colors
  const updateCustomColor = (key: 'appBg' | 'text' | 'headerBg' | 'accent', value: string) => {
      setLocalSettings(prev => ({
          ...prev,
          customThemeColors: {
              appBg: prev.customThemeColors?.appBg || '#ffffff',
              text: prev.customThemeColors?.text || '#000000',
              headerBg: prev.customThemeColors?.headerBg || '#f8fafc',
              accent: prev.customThemeColors?.accent || '#6366f1',
              ...prev.customThemeColors,
              [key]: value
          }
      }));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden animate-slide-up-mobile md:animate-fade-in relative">
            
            {/* Success Toast */}
            {presetMessage && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold flex items-center gap-2 animate-fade-in-down">
                    <CheckCircleIcon className="w-5 h-5" />
                    {presetMessage}
                </div>
            )}

            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center shrink-0">
                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <CogIcon className="w-5 h-5 text-indigo-600" />
                    设置与数据 (Settings)
                </h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                    <XMarkIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 shrink-0 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`flex-1 py-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap ${activeTab === 'general' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                >
                    通用 (General)
                </button>
                <button 
                    onClick={() => setActiveTab('advanced')}
                    className={`flex-1 py-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap ${activeTab === 'advanced' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                >
                    AI 配置 (AI API)
                </button>
                <button 
                    onClick={() => setActiveTab('server')}
                    className={`flex-1 py-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap ${activeTab === 'server' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                >
                    后端同步 (Server)
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {activeTab === 'general' && (
                    <>
                    {/* Theme Selector */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">界面主题 (Theme)</h3>
                        <div className="flex flex-wrap gap-3 pb-2">
                            {themes.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setLocalSettings(prev => ({...prev, theme: t.id}))}
                                    className={`flex flex-col items-center gap-2 group min-w-[80px]`}
                                >
                                    <div 
                                        className={`w-12 h-12 rounded-full shadow-sm border-2 transition-all ${localSettings.theme === t.id ? 'border-indigo-600 scale-110' : 'border-slate-200 group-hover:border-slate-300'}`}
                                        style={{ background: t.color }}
                                    />
                                    <span className={`text-xs font-medium ${localSettings.theme === t.id ? 'text-indigo-600' : 'text-slate-500'}`}>
                                        {t.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                        
                        {/* Custom Theme Colors Picker */}
                        {localSettings.theme === 'custom' && (
                            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-fade-in-down">
                                <div className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-600">
                                    <PencilIcon className="w-4 h-4" /> 自定义配色 (Color Palette)
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">背景色 (Background)</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="color" 
                                                value={localSettings.customThemeColors?.appBg || '#ffffff'}
                                                onChange={(e) => updateCustomColor('appBg', e.target.value)}
                                                className="w-8 h-8 rounded cursor-pointer border-0"
                                            />
                                            <span className="text-xs font-mono">{localSettings.customThemeColors?.appBg}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">文字颜色 (Text)</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="color" 
                                                value={localSettings.customThemeColors?.text || '#000000'}
                                                onChange={(e) => updateCustomColor('text', e.target.value)}
                                                className="w-8 h-8 rounded cursor-pointer border-0"
                                            />
                                            <span className="text-xs font-mono">{localSettings.customThemeColors?.text}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">顶部栏 (Header)</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="color" 
                                                value={localSettings.customThemeColors?.headerBg || '#f8fafc'}
                                                onChange={(e) => updateCustomColor('headerBg', e.target.value)}
                                                className="w-8 h-8 rounded cursor-pointer border-0"
                                            />
                                            <span className="text-xs font-mono">{localSettings.customThemeColors?.headerBg}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">强调色 (Accent)</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="color" 
                                                value={localSettings.customThemeColors?.accent || '#6366f1'}
                                                onChange={(e) => updateCustomColor('accent', e.target.value)}
                                                className="w-8 h-8 rounded cursor-pointer border-0"
                                            />
                                            <span className="text-xs font-mono">{localSettings.customThemeColors?.accent}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Data Source Basic */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">单词来源 (AI Source)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <button 
                                onClick={() => setLocalSettings(p => ({...p, dataSourceMode: 'ai'}))}
                                className={`p-3 rounded-lg border text-center transition-all ${localSettings.dataSourceMode === 'ai' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
                            >
                                <BrainIcon className="w-5 h-5 mx-auto mb-1" />
                                <span className="text-sm font-bold">Gemini AI</span>
                            </button>
                            <button 
                                onClick={() => setLocalSettings(p => ({...p, dataSourceMode: 'local_only'}))}
                                className={`p-3 rounded-lg border text-center transition-all ${localSettings.dataSourceMode === 'local_only' ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600'}`}
                            >
                                <BookOpenIcon className="w-5 h-5 mx-auto mb-1" />
                                <span className="text-sm font-bold">Local Only</span>
                            </button>
                            <button 
                                onClick={() => setLocalSettings(p => ({...p, dataSourceMode: 'custom_api'}))}
                                className={`p-3 rounded-lg border text-center transition-all ${localSettings.dataSourceMode === 'custom_api' ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500 text-amber-700' : 'border-slate-200 text-slate-600'}`}
                            >
                                <LinkIcon className="w-5 h-5 mx-auto mb-1" />
                                <span className="text-sm font-bold">Custom API</span>
                            </button>
                        </div>
                        {localSettings.dataSourceMode === 'ai' && (
                            <div className="mt-3 space-y-2">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Gemini API Key (Optional Override)</label>
                                    <input 
                                        type="password"
                                        value={localSettings.customApiKey || ''}
                                        onChange={(e) => setLocalSettings(p => ({...p, customApiKey: e.target.value}))}
                                        placeholder="Use environment key by default"
                                        className="w-full p-2 border border-slate-300 rounded text-sm font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Gemini Base URL (Proxy) - Optional</label>
                                    <input 
                                        type="text"
                                        value={localSettings.geminiBaseUrl || ''}
                                        onChange={(e) => setLocalSettings(p => ({...p, geminiBaseUrl: e.target.value}))}
                                        placeholder="https://your-proxy-domain.com"
                                        className="w-full p-2 border border-slate-300 rounded text-sm font-mono"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">If you are in China, you may need a proxy URL.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Export / Import */}
                    <div className="pt-4 border-t border-slate-100">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">本地数据管理 (Local Data)</h3>
                        
                        <div className="flex items-center gap-2 mb-4 bg-yellow-50 p-2 rounded text-xs text-yellow-800 border border-yellow-200">
                            <input 
                                type="checkbox" 
                                id="incImg"
                                checked={includeImages}
                                onChange={(e) => setIncludeImages(e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="incImg">备份包含图片 (Include Images) - Large file size</label>
                        </div>

                        <div className="space-y-4">
                            {/* Vocab Only */}
                            <div className="flex gap-2">
                                <button onClick={handleExportVocabulary} className="flex-1 py-2 px-3 bg-white border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2">
                                    <DownloadIcon className="w-4 h-4" /> 导出单词本
                                </button>
                                <button onClick={() => vocabInputRef.current?.click()} className="flex-1 py-2 px-3 bg-white border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2">
                                    <UploadIcon className="w-4 h-4" /> 导入合并单词
                                </button>
                            </div>

                            {/* Full Backup */}
                            <div className="flex gap-2">
                                <button onClick={handleExport} className="flex-1 py-3 bg-slate-800 text-white rounded text-sm font-bold hover:bg-slate-900 flex items-center justify-center gap-2">
                                    <DownloadIcon className="w-4 h-4" /> 全量备份
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 bg-red-50 text-red-600 border border-red-100 rounded text-sm font-bold hover:bg-red-100 flex items-center justify-center gap-2">
                                    <UploadIcon className="w-4 h-4" /> 恢复备份
                                </button>
                            </div>
                        </div>
                    </div>

                    <input ref={vocabInputRef} type="file" accept=".json" onChange={handleImportVocabulary} className="hidden" />
                    <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                    </>
                )}
                
                {activeTab === 'server' && (
                    <div className="space-y-6">
                         <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-bold text-emerald-800">飞书云盘同步 (Feishu Drive via Pages Functions)</h3>
                                <ClockIcon className="w-4 h-4 text-emerald-600" />
                            </div>
                            <p className="text-xs text-emerald-700 mb-3 leading-relaxed">
                                Use Cloudflare Pages Functions as a secure proxy to sync your state JSON to a Feishu Drive folder.
                                <br />
                                <strong>Recommended:</strong> enable periodic save + save-on-exit.
                            </p>
                        </div>

                        {/* Base64 配置导入 */}
                        <div className="bg-white p-3 rounded-lg border border-emerald-200 mb-3">
                            <label className="block text-[11px] text-slate-600 mb-2 font-bold">快速导入配置 (Base64)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    id="feishu-base64-config"
                                    placeholder="粘贴 base64 编码的配置 JSON"
                                    className="flex-1 p-2 border border-slate-300 rounded font-mono text-[10px]"
                                    onPaste={async (e) => {
                                        const pastedText = e.clipboardData.getData('text');
                                        try {
                                            const decoded = atob(pastedText.trim());
                                            const config = JSON.parse(decoded);
                                            
                                            const updates: Partial<AppSettings> = {};
                                            if (config.feishuFolderToken) updates.feishuFolderToken = config.feishuFolderToken;
                                            if (config.feishuFileName) updates.feishuFileName = config.feishuFileName;
                                            if (config.feishuUserAccessToken) updates.feishuUserAccessToken = config.feishuUserAccessToken;
                                            if (config.feishuAppId) updates.feishuAppId = config.feishuAppId;
                                            if (config.feishuAppSecret) updates.feishuAppSecret = config.feishuAppSecret;
                                            if (config.feishuRedirectUri) updates.feishuRedirectUri = config.feishuRedirectUri;
                                            
                                            if (Object.keys(updates).length > 0) {
                                                setLocalSettings(p => ({ ...p, ...updates }));
                                                setPresetMessage('✅ 配置已自动填写');
                                                setTimeout(() => {
                                                    (e.currentTarget as HTMLInputElement).value = '';
                                                }, 100);
                                            }
                                        } catch (error) {
                                            // Auto-decode failed, user can click decode button
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const input = document.getElementById('feishu-base64-config') as HTMLInputElement;
                                        if (!input || !input.value.trim()) {
                                            setPresetMessage('❌ 请输入 base64 编码的配置');
                                            return;
                                        }
                                        
                                        try {
                                            const decoded = atob(input.value.trim());
                                            const config = JSON.parse(decoded);
                                            
                                            const updates: Partial<AppSettings> = {};
                                            if (config.feishuFolderToken) updates.feishuFolderToken = config.feishuFolderToken;
                                            if (config.feishuFileName) updates.feishuFileName = config.feishuFileName;
                                            if (config.feishuUserAccessToken) updates.feishuUserAccessToken = config.feishuUserAccessToken;
                                            if (config.feishuAppId) updates.feishuAppId = config.feishuAppId;
                                            if (config.feishuAppSecret) updates.feishuAppSecret = config.feishuAppSecret;
                                            if (config.feishuRedirectUri) updates.feishuRedirectUri = config.feishuRedirectUri;
                                            
                                            if (Object.keys(updates).length > 0) {
                                                setLocalSettings(p => ({ ...p, ...updates }));
                                                setPresetMessage('✅ 配置已自动填写');
                                                input.value = '';
                                            } else {
                                                setPresetMessage('⚠️ 未找到有效的配置字段');
                                            }
                                        } catch (error: any) {
                                            setPresetMessage(`❌ 解码失败: ${error?.message || '无效的 base64 或 JSON 格式'}`);
                                        }
                                    }}
                                    className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 whitespace-nowrap"
                                >
                                    解码填写
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const config = {
                                            feishuFolderToken: localSettings.feishuFolderToken || '',
                                            feishuFileName: localSettings.feishuFileName || 'reader-state.json',
                                            feishuUserAccessToken: localSettings.feishuUserAccessToken || '',
                                            feishuAppId: localSettings.feishuAppId || '',
                                            feishuAppSecret: localSettings.feishuAppSecret || '',
                                            feishuRedirectUri: localSettings.feishuRedirectUri || '',
                                        };
                                        
                                        const base64 = btoa(JSON.stringify(config, null, 2));
                                        
                                        navigator.clipboard.writeText(base64).then(() => {
                                            setPresetMessage('✅ Base64 配置已复制到剪贴板');
                                        }).catch(() => {
                                            alert(`Base64 配置:\n\n${base64}`);
                                        });
                                    }}
                                    className="px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 whitespace-nowrap"
                                    title="将当前配置编码为 base64 并复制"
                                >
                                    导出配置
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">
                                支持格式：<code className="bg-slate-100 px-1 rounded">{"{"}"feishuFolderToken": "...", "feishuFileName": "...", "feishuUserAccessToken": "..."{"}"}</code> 的 base64 编码
                            </p>
                        </div>

                        {/* Feishu Config */}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Feishu Folder Token</label>
                                <input
                                    type="text"
                                    value={localSettings.feishuFolderToken || ''}
                                    onChange={(e) => setLocalSettings(p => ({ ...p, feishuFolderToken: e.target.value }))}
                                    placeholder="e.g. HCeBfQsBKl9IF9dkZWvcqxIWnKh"
                                    className="w-full p-2 border border-slate-300 rounded font-mono text-sm"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Copy from folder URL: <code>https://my.feishu.cn/drive/folder/&lt;folder_token&gt;</code>
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">State JSON File Name</label>
                                <input
                                    type="text"
                                    value={localSettings.feishuFileName || 'reader-state.json'}
                                    onChange={(e) => setLocalSettings(p => ({ ...p, feishuFileName: e.target.value }))}
                                    placeholder="reader-state.json"
                                    className="w-full p-2 border border-slate-300 rounded font-mono text-sm"
                                />
                            </div>
                        </div>

                        {/* Feishu OAuth Helper */}
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                            <div className="text-xs font-bold text-slate-600 mb-1">Feishu OAuth Helper（打开飞书网页手动拿 user_access_token）</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] text-slate-500 mb-1">Feishu App ID</label>
                                    <input
                                        type="text"
                                        value={localSettings.feishuAppId || ''}
                                        onChange={(e) => setLocalSettings(p => ({ ...p, feishuAppId: e.target.value }))}
                                        placeholder="cli_xxxxxx"
                                        className="w-full p-2 border border-slate-300 rounded font-mono text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-slate-500 mb-1">Feishu App Secret</label>
                                    <input
                                        type="password"
                                        value={localSettings.feishuAppSecret || ''}
                                        onChange={(e) => setLocalSettings(p => ({ ...p, feishuAppSecret: e.target.value }))}
                                        placeholder="********"
                                        className="w-full p-2 border border-slate-300 rounded font-mono text-xs"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] text-slate-500 mb-1">Redirect URI</label>
                                <input
                                    type="text"
                                    value={localSettings.feishuRedirectUri || window.location.origin}
                                    onChange={(e) => setLocalSettings(p => ({ ...p, feishuRedirectUri: e.target.value }))}
                                    placeholder="例如：https://your-domain.com"
                                    className="w-full p-2 border border-slate-300 rounded font-mono text-xs"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">
                                    必须与飞书开发者后台“重定向 URL”配置一致。授权成功后会带 <code>?code=xxx</code> 回到这个地址。
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                                <div className="text-[11px] text-slate-500">
                                    建议步骤：<br />
                                    1. 点击右侧按钮打开飞书 <span className="font-mono">API 调试台</span>。<br />
                                    2. 选择你的应用并完成一次授权调用。<br />
                                    3. 在请求详情里找到 <span className="font-mono">Authorization: Bearer ...</span>，把后面的 access_token 粘到下方输入框。
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleOpenFeishuApiExplorer}
                                        className="flex-1 py-2 px-3 bg-white border border-emerald-300 rounded text-[11px] font-bold text-emerald-700 hover:bg-emerald-50"
                                    >
                                        打开飞书 API 调试台
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] text-slate-500 mb-1">user_access_token（用于 Feishu 同步）</label>
                                <textarea
                                    value={localSettings.feishuUserAccessToken || ''}
                                    onChange={(e) => setLocalSettings(p => ({ ...p, feishuUserAccessToken: e.target.value }))}
                                    placeholder="成功换取后会自动填入，你也可以粘贴已有的 user_access_token"
                                    className="w-full p-2 border border-slate-300 rounded font-mono text-[11px] h-20"
                                />
                            </div>
                        </div>

                        {/* Enable Feishu Mode Toggle */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 border border-emerald-200 rounded-lg bg-emerald-50/50">
                            <div>
                                <span className="block font-bold text-slate-700 text-sm">启用飞书服务器 (Enable Feishu Storage)</span>
                                <span className="text-xs text-slate-500">Sync full app state JSON to Feishu Drive via <code>/api/feishu/state</code>.</span>
                            </div>
                            <div className="flex items-center gap-3">
                                {localSettings.useFeishuStorage && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch('/api/feishu/health');
                                                    const data = await res.json();
                                                    if (data.ok) {
                                                        setPresetMessage('✅ Cloudflare Function 连接正常');
                                                    } else {
                                                        setPresetMessage('❌ Cloudflare Function 响应异常');
                                                    }
                                                } catch (e: any) {
                                                    setPresetMessage(`❌ 无法连接到 /api/feishu/health: ${e?.message || String(e)}`);
                                                }
                                            }}
                                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-full hover:bg-blue-700"
                                        >
                                            测试连接
                                        </button>
                                        {onFeishuSyncNow && (
                                            <button
                                                type="button"
                                                onClick={onFeishuSyncNow}
                                                className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-full hover:bg-emerald-700"
                                            >
                                                立即同步飞书
                                            </button>
                                        )}
                                    </>
                                )}
                                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                    <input
                                        type="checkbox"
                                        name="toggle"
                                        id="feishu-toggle"
                                        checked={Boolean(localSettings.useFeishuStorage)}
                                        onChange={(e) => setLocalSettings(p => ({
                                            ...p,
                                            useFeishuStorage: e.target.checked,
                                            // Feishu and Python server are mutually exclusive
                                            useServerStorage: e.target.checked ? false : p.useServerStorage
                                        }))}
                                        className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300 ease-in-out checked:right-0 right-5 checked:border-emerald-600"
                                        style={{ right: localSettings.useFeishuStorage ? '0' : 'auto', left: localSettings.useFeishuStorage ? 'auto' : '0' }}
                                    />
                                    <label
                                        htmlFor="feishu-toggle"
                                        className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-300 ${localSettings.useFeishuStorage ? 'bg-emerald-600' : 'bg-slate-300'}`}
                                    ></label>
                                </div>
                            </div>
                        </div>

                         <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-bold text-blue-800">自托管 Python 后端 (Self-Hosted Backend)</h3>
                                <ClockIcon className="w-4 h-4 text-blue-500" />
                            </div>
                            <p className="text-xs text-blue-600 mb-3 leading-relaxed">
                                Connect to a local Flask + SQLite server to manage data outside the browser. 
                                <br/>
                                <strong>Note:</strong> When enabled, the app syncs data with your Python server regardless of which AI model (Gemini/Custom) you use.
                            </p>
                        </div>

                        {/* Server URL Config */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Server URL</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={localSettings.serverUrl || 'http://localhost:5000'}
                                    onChange={(e) => setLocalSettings(p => ({...p, serverUrl: e.target.value}))}
                                    placeholder="http://localhost:5000"
                                    className="flex-1 p-2 border border-slate-300 rounded font-mono text-sm"
                                />
                                <button 
                                    onClick={checkServerConnection}
                                    className="px-3 bg-slate-100 border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-200"
                                >
                                    Test
                                </button>
                            </div>
                            
                            {serverStatus === 'ok' && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">● Connected successfully</p>}
                            {serverStatus === 'error' && <p className="text-xs text-red-500 mt-1 flex items-center gap-1">● Connection failed. Is the Flask app running?</p>}
                        </div>

                        {/* Enable Server Mode Toggle */}
                        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50">
                            <div>
                                <span className="block font-bold text-slate-700 text-sm">启用服务器存储 (Enable Server Storage)</span>
                                <span className="text-xs text-slate-500">Sync data with backend. Independent of AI source.</span>
                            </div>
                            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                <input 
                                    type="checkbox" 
                                    name="toggle" 
                                    id="server-toggle" 
                                    checked={localSettings.useServerStorage}
                                    onChange={(e) => setLocalSettings(p => ({
                                        ...p, 
                                        useServerStorage: e.target.checked,
                                        // Feishu and Python server are mutually exclusive
                                        useFeishuStorage: e.target.checked ? false : p.useFeishuStorage
                                    }))}
                                    className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300 ease-in-out checked:right-0 right-5 checked:border-indigo-600"
                                    style={{ right: localSettings.useServerStorage ? '0' : 'auto', left: localSettings.useServerStorage ? 'auto' : '0' }}
                                />
                                <label 
                                    htmlFor="server-toggle" 
                                    className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-300 ${localSettings.useServerStorage ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                ></label>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'advanced' && (
                    <div className="space-y-6 pb-10">
                        
                        {/* Presets Section */}
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-bold text-indigo-800">快速预设 (Presets)</h3>
                                <SparklesIcon className="w-4 h-4 text-indigo-500" />
                            </div>
                            <p className="text-xs text-indigo-600 mb-3">
                                Use these to quickly configure Custom API for other providers.
                            </p>
                            <div className="flex flex-col gap-2">
                                <button 
                                    onClick={() => applyPreset('qwen')}
                                    className="w-full py-2 bg-white border border-indigo-200 text-indigo-700 font-bold text-xs rounded-lg hover:bg-indigo-100 transition-colors shadow-sm text-left px-4 flex items-center justify-between"
                                >
                                    <span>Load Preset: Alibaba Qwen (通义千问)</span>
                                    <span className="text-[10px] bg-indigo-100 px-2 py-0.5 rounded text-indigo-600">Recommmended</span>
                                </button>
                                <button 
                                    onClick={() => applyPreset('openai')}
                                    className="w-full py-2 bg-white border border-indigo-200 text-indigo-700 font-bold text-xs rounded-lg hover:bg-indigo-100 transition-colors shadow-sm text-left px-4"
                                >
                                    Load Preset: OpenAI / Compatible
                                </button>
                            </div>
                        </div>

                        {/* Warning */}
                        <div className="bg-amber-50 p-3 rounded text-xs text-amber-800 leading-relaxed border border-amber-100">
                            <strong>Note:</strong> Ensure you replace <code>YOUR_API_KEY</code> in Headers below with your actual key.
                        </div>

                        {/* Configuration Form */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Endpoint URL</label>
                            <input 
                                type="text"
                                value={localSettings.customApiConfig?.url || ''}
                                onChange={(e) => updateApiConfig('url', e.target.value)}
                                placeholder="https://api.openai.com/v1/chat/completions"
                                className="w-full p-2 border border-slate-300 rounded font-mono text-sm"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Available variable for GET: <code>{`{{word}}`}</code></p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Method</label>
                                <select 
                                    value={localSettings.customApiConfig?.method || 'GET'}
                                    onChange={(e) => updateApiConfig('method', e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded font-mono text-sm bg-white"
                                >
                                    <option value="GET">GET</option>
                                    <option value="POST">POST</option>
                                </select>
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Response Mapping</label>
                                <input 
                                    type="text"
                                    value={localSettings.customApiConfig?.responseMapping || ''}
                                    onChange={(e) => updateApiConfig('responseMapping', e.target.value)}
                                    placeholder="choices[0].message.content"
                                    className="w-full p-2 border border-slate-300 rounded font-mono text-sm"
                                />
                             </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase">Headers</label>
                                <button onClick={addHeader} className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 hover:underline">
                                    <PlusIcon className="w-3 h-3" /> Add
                                </button>
                            </div>
                            <div className="space-y-2">
                                {(localSettings.customApiConfig?.headers || []).map((h, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input 
                                            placeholder="Key (e.g. Authorization)"
                                            value={h.key}
                                            onChange={(e) => updateHeader(idx, 'key', e.target.value)}
                                            className="flex-1 p-2 border border-slate-300 rounded text-xs font-mono"
                                        />
                                        <input 
                                            placeholder="Value"
                                            value={h.value}
                                            onChange={(e) => updateHeader(idx, 'value', e.target.value)}
                                            className="flex-1 p-2 border border-slate-300 rounded text-xs font-mono"
                                        />
                                        <button onClick={() => removeHeader(idx)} className="text-slate-400 hover:text-red-500">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {localSettings.customApiConfig?.method === 'POST' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Body Template (JSON)</label>
                                <textarea 
                                    value={localSettings.customApiConfig?.bodyTemplate || ''}
                                    onChange={(e) => updateApiConfig('bodyTemplate', e.target.value)}
                                    placeholder={'{\n  "prompt": "Explain {{word}}",\n  "model": "gpt-4"\n}'}
                                    className="w-full p-2 border border-slate-300 rounded font-mono text-xs h-48 leading-normal"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Use <code>{`{{word}}`}</code> to inject the selected word.</p>
                            </div>
                        )}

                         {/* Data Contract Description */}
                         <div className="pt-4 border-t border-slate-200 mt-6">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">接口响应数据规范 (Required JSON Response)</h3>
                            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 overflow-x-auto">
                                <p className="text-[10px] text-slate-400 mb-2">Your API must return a JSON object with these exact keys:</p>
                                <table className="w-full text-left border-collapse">
                                    <tbody>
                                        {REQUIRED_JSON_FIELDS.map(f => (
                                            <tr key={f.key} className="border-b border-slate-100 last:border-0">
                                                <td className="py-1 pr-2 font-mono text-[10px] text-indigo-600 font-semibold">{f.key}</td>
                                                <td className="py-1 text-[10px] text-slate-600">{f.desc}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg"
                >
                    取消 (Cancel)
                </button>
                <button 
                    onClick={() => {
                        onSaveSettings(localSettings);
                        onClose();
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-sm"
                >
                    保存 (Save Changes)
                </button>
            </div>
        </div>
    </div>
  );
};
