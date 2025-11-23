import React, { useState, useRef } from 'react';
import { AppSettings, BackupData, Article, SavedItem, HistoryRecord, WordStatsMap, DataSourceMode } from '../types';
import { DownloadIcon, UploadIcon, XMarkIcon, CogIcon, BrainIcon, BookOpenIcon, LinkIcon } from './Icons';

interface SettingsViewProps {
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  // Data props for export
  data: {
      articles: Article[];
      savedItems: SavedItem[];
      historyRecords: HistoryRecord[];
      wordStats: WordStatsMap;
  };
  onImportData: (data: BackupData) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
    onClose, 
    settings, 
    onSaveSettings,
    data,
    onImportData
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
      // Clean up data for export
      // User Requirement: "Most memory efficient way to export text data" if not URL.
      // Strategy: Remove 'custom_image_base64' from savedItems to keep JSON size low.
      const optimizedSavedItems = data.savedItems.map(item => {
          if (item.cardData && item.cardData.custom_image_base64) {
              // Create a shallow copy of cardData excluding the heavy base64 string
              const { custom_image_base64, ...restCardData } = item.cardData;
              return {
                  ...item,
                  cardData: {
                      ...restCardData,
                      // Optionally add a note or flag that image was stripped
                      // visual_image_prompt is kept, so user still has the text description.
                  }
              };
          }
          // If it's a URL (custom_image_url), we keep it as it's just text.
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
      
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `english-reader-backup-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              // Basic validation
              if (json.version && Array.isArray(json.articles)) {
                  if(confirm("This will overwrite your current data. Are you sure?")) {
                      onImportData(json as BackupData);
                      onClose();
                  }
              } else {
                  alert("Invalid backup file format.");
              }
          } catch (err) {
              alert("Failed to parse JSON file.");
              console.error(err);
          }
      };
      reader.readAsText(file);
  };

  const handleModeSelect = (mode: DataSourceMode) => {
      setLocalSettings(prev => ({ ...prev, dataSourceMode: mode }));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up-mobile md:animate-fade-in">
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <CogIcon className="w-5 h-5 text-indigo-600" />
                    Settings & Data
                </h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                    <XMarkIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
                
                {/* Data Source Configuration */}
                <div>
                     <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Data Sources</h3>
                     <div className="grid grid-cols-1 gap-3">
                         <button 
                             onClick={() => handleModeSelect('ai')}
                             className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${localSettings.dataSourceMode === 'ai' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 hover:bg-slate-50'}`}
                         >
                             <div className={`p-2 rounded-full ${localSettings.dataSourceMode === 'ai' ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                 <BrainIcon className="w-5 h-5" />
                             </div>
                             <div>
                                 <p className="font-semibold text-slate-800">AI Generation (Default)</p>
                                 <p className="text-xs text-slate-500">Dynamically generate cards using Gemini AI. Always checks local cache first.</p>
                             </div>
                         </button>

                         <button 
                             onClick={() => handleModeSelect('local_only')}
                             className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${localSettings.dataSourceMode === 'local_only' ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200 hover:bg-slate-50'}`}
                         >
                             <div className={`p-2 rounded-full ${localSettings.dataSourceMode === 'local_only' ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                 <BookOpenIcon className="w-5 h-5" />
                             </div>
                             <div>
                                 <p className="font-semibold text-slate-800">Local Cache Only</p>
                                 <p className="text-xs text-slate-500">Only search your saved items. Good for offline review.</p>
                             </div>
                         </button>
                         
                         <button 
                             onClick={() => handleModeSelect('custom_api')}
                             className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${localSettings.dataSourceMode === 'custom_api' ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500' : 'border-slate-200 hover:bg-slate-50'}`}
                         >
                             <div className={`p-2 rounded-full ${localSettings.dataSourceMode === 'custom_api' ? 'bg-amber-200 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                 <LinkIcon className="w-5 h-5" />
                             </div>
                             <div>
                                 <p className="font-semibold text-slate-800">Custom API (Advanced)</p>
                                 <p className="text-xs text-slate-500">Fetch data from a custom JSON endpoint.</p>
                             </div>
                         </button>
                     </div>
                     
                     {localSettings.dataSourceMode === 'custom_api' && (
                         <div className="mt-3 ml-12">
                             <input 
                                type="text"
                                placeholder="https://api.example.com/word?q="
                                value={localSettings.customApiEndpoint || ''}
                                onChange={(e) => setLocalSettings(prev => ({ ...prev, customApiEndpoint: e.target.value }))}
                                className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-amber-500 outline-none"
                             />
                             <p className="text-[10px] text-slate-400 mt-1">App will append the word to this URL.</p>
                         </div>
                     )}
                </div>

                {/* AI Configuration */}
                <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">AI Model Settings</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Model Name</label>
                            <input 
                                type="text" 
                                value={localSettings.aiModel}
                                onChange={(e) => setLocalSettings({...localSettings, aiModel: e.target.value})}
                                placeholder="e.g. gemini-2.5-flash"
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Custom API Key</label>
                            <input 
                                type="password" 
                                value={localSettings.customApiKey || ''}
                                onChange={(e) => setLocalSettings({...localSettings, customApiKey: e.target.value})}
                                placeholder="Overwrite default API key"
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-mono"
                            />
                        </div>
                    </div>
                </div>

                {/* Data Management */}
                <div className="pt-4 border-t border-slate-100">
                     <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Backup & Restore</h3>
                     <div className="grid grid-cols-2 gap-4">
                         <button 
                            onClick={handleExport}
                            className="flex flex-col items-center justify-center gap-2 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all group"
                        >
                             <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full group-hover:bg-indigo-100">
                                <DownloadIcon className="w-6 h-6" />
                             </div>
                             <span className="font-medium text-slate-700">Backup JSON</span>
                         </button>

                         <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center gap-2 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all group"
                        >
                             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-full group-hover:bg-emerald-100">
                                <UploadIcon className="w-6 h-6" />
                             </div>
                             <span className="font-medium text-slate-700">Restore JSON</span>
                         </button>
                         <input 
                            ref={fileInputRef}
                            type="file" 
                            accept=".json"
                            onChange={handleImportFile}
                            className="hidden" 
                        />
                     </div>
                     <p className="text-xs text-slate-400 mt-2 text-center">
                         Note: Local image files (uploads) are stripped from backups to save space. URLs are preserved.
                     </p>
                </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg"
                >
                    Cancel
                </button>
                <button 
                    onClick={() => {
                        onSaveSettings(localSettings);
                        onClose();
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-sm"
                >
                    Save Changes
                </button>
            </div>
        </div>
    </div>
  );
};