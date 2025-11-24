
import React, { useState, useRef } from 'react';
import { AppSettings, BackupData, Article, SavedItem, HistoryRecord, WordStatsMap, DataSourceMode, Theme, CustomApiConfig } from '../types';
import { DownloadIcon, UploadIcon, XMarkIcon, CogIcon, BrainIcon, BookOpenIcon, LinkIcon, CardIcon, PlusIcon, TrashIcon, SparklesIcon } from './Icons';

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
  "temperature": 0.7
}`;

export const SettingsView: React.FC<SettingsViewProps> = ({ 
    onClose, 
    settings, 
    onSaveSettings,
    data,
    onImportData,
    onMergeVocabulary
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'advanced'>('general');
  const [includeImages, setIncludeImages] = useState(false); // Default false to save space
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vocabInputRef = useRef<HTMLInputElement>(null);

  // --- Theme Logic ---
  const themes: { id: Theme; name: string; color: string }[] = [
      { id: 'light', name: '默白 (Light)', color: '#f8fafc' },
      { id: 'dark', name: '夜间 (Dark)', color: '#0f172a' },
      { id: 'sepia', name: '羊皮纸 (Sepia)', color: '#f4ecd8' },
      { id: 'forest', name: '森林 (Forest)', color: '#0f291e' },
      { id: 'amethyst', name: '紫罗兰 (Amethyst)', color: '#2e1065' },
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

  const applyPreset = () => {
      if(!confirm("This will overwrite your current API settings. Continue?")) return;
      
      setLocalSettings(prev => ({
          ...prev,
          customApiConfig: {
              url: 'https://api.openai.com/v1/chat/completions',
              method: 'POST',
              headers: [
                  { key: 'Content-Type', value: 'application/json' },
                  { key: 'Authorization', value: 'Bearer YOUR_API_KEY_HERE' }
              ],
              bodyTemplate: OPENAI_BODY_TEMPLATE,
              responseMapping: 'choices[0].message.content'
          }
      }));
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

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden animate-slide-up-mobile md:animate-fade-in">
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
            <div className="flex border-b border-slate-200 shrink-0">
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === 'general' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                >
                    通用 & 主题 (General)
                </button>
                <button 
                    onClick={() => setActiveTab('advanced')}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === 'advanced' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                >
                    高级接口 (Advanced API)
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {activeTab === 'general' && (
                    <>
                    {/* Theme Selector */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">界面主题 (Theme)</h3>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {themes.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setLocalSettings(prev => ({...prev, theme: t.id}))}
                                    className={`flex flex-col items-center gap-2 group min-w-[80px]`}
                                >
                                    <div 
                                        className={`w-12 h-12 rounded-full shadow-sm border-2 transition-all ${localSettings.theme === t.id ? 'border-indigo-600 scale-110' : 'border-slate-200 group-hover:border-slate-300'}`}
                                        style={{ backgroundColor: t.color }}
                                    />
                                    <span className={`text-xs font-medium ${localSettings.theme === t.id ? 'text-indigo-600' : 'text-slate-500'}`}>
                                        {t.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Data Source Basic */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">数据源 (Data Source)</h3>
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
                            <div className="mt-3">
                                <label className="block text-xs text-slate-500 mb-1">Gemini API Key (Optional Override)</label>
                                <input 
                                    type="password"
                                    value={localSettings.customApiKey || ''}
                                    onChange={(e) => setLocalSettings(p => ({...p, customApiKey: e.target.value}))}
                                    placeholder="Use environment key by default"
                                    className="w-full p-2 border border-slate-300 rounded text-sm font-mono"
                                />
                            </div>
                        )}
                    </div>

                    {/* Export / Import */}
                    <div className="pt-4 border-t border-slate-100">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">数据管理 (Data Management)</h3>
                        
                        <div className="flex items-center gap-2 mb-4 bg-yellow-50 p-2 rounded text-xs text-yellow-800 border border-yellow-200">
                            <input 
                                type="checkbox" 
                                id="incImg"
                                checked={includeImages}
                                onChange={(e) => setIncludeImages(e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="incImg">备份包含图片 (Include Images) - File size will be larger</label>
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

                {activeTab === 'advanced' && (
                    <div className="space-y-6 pb-10">
                        
                        {/* Presets Section */}
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-bold text-indigo-800">快速预设 (Presets)</h3>
                                <SparklesIcon className="w-4 h-4 text-indigo-500" />
                            </div>
                            <p className="text-xs text-indigo-600 mb-3">
                                Use this to quickly configure OpenAI-compatible APIs (DeepSeek, Moonshot, etc).
                            </p>
                            <button 
                                onClick={applyPreset}
                                className="w-full py-2 bg-white border border-indigo-200 text-indigo-700 font-bold text-xs rounded-lg hover:bg-indigo-100 transition-colors shadow-sm"
                            >
                                Load Preset: OpenAI / Compatible
                            </button>
                        </div>

                        {/* Warning */}
                        <div className="bg-amber-50 p-3 rounded text-xs text-amber-800 leading-relaxed border border-amber-100">
                            <strong>Note:</strong> Custom API mode requires you to configure the request manually. Ensure your model returns the correct JSON structure (see bottom).
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
