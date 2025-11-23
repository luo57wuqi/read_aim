import React, { useState, useEffect, useRef } from 'react';
import { WordCardData } from '../types';
import { SparklesIcon, AudioIcon, LinkIcon, CheckCircleIcon, PencilIcon, XMarkIcon, BrainIcon, EyeIcon, PhotoIcon, ArrowLeftIcon } from './Icons';

interface VocabularyCardProps {
  data: WordCardData;
  onClose?: () => void;
  isSaving?: boolean;
  onSave?: () => void;
  onUpdate?: (newData: WordCardData) => void;
  isSaved?: boolean;
  onExploreRelated?: (word: string) => void;
  isLoading?: boolean;
  
  // Navigation Props
  canGoBack?: boolean;
  onGoBack?: () => void;
  isStacked?: boolean; // If true, rendering as a "previous" card in background
}

export const VocabularyCard: React.FC<VocabularyCardProps> = ({ 
  data, 
  onClose, 
  onSave, 
  onUpdate,
  isSaved, 
  onExploreRelated, 
  isLoading,
  canGoBack,
  onGoBack,
  isStacked
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<WordCardData>(data);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync editData when prop data changes (unless we are currently editing)
  useEffect(() => {
    if (!isEditing) {
      setEditData(data);
    }
  }, [data, isEditing]);

  const playAudio = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const handleInputChange = (field: keyof WordCardData, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedInputChange = (parent: 'related_word_suggestion', field: 'word' | 'reason', value: string) => {
     setEditData(prev => ({
         ...prev,
         [parent]: {
             ...prev[parent]!,
             [field]: value
         }
     }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64String = reader.result as string;
              setEditData(prev => ({
                  ...prev,
                  custom_image_base64: base64String,
                  custom_image_url: undefined // Clear URL if upload is used
              }));
          };
          reader.readAsDataURL(file);
      }
  };

  const saveEdits = () => {
    if (onUpdate) {
        onUpdate(editData);
    }
    setIsEditing(false);
  };

  const cancelEdits = () => {
    setEditData(data);
    setIsEditing(false);
  };

  // Helper to get the image source to display
  const getDisplayImage = () => {
      if (editData.custom_image_base64) return editData.custom_image_base64;
      if (editData.custom_image_url) return editData.custom_image_url;
      return null;
  };

  const displayImage = getDisplayImage();

  return (
    <div className={`bg-white w-full relative pb-10 transition-opacity ${isStacked ? 'opacity-100' : 'opacity-100'}`}>
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center h-full min-h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
            <p className="text-sm text-indigo-700 font-medium">Connecting ideas...</p>
        </div>
      )}

      {/* Header - Word & Phonetic */}
      <div className={`p-6 text-white relative ${isStacked ? 'bg-slate-700' : 'bg-gradient-to-r from-slate-900 to-indigo-900'}`}>
        <div className="flex flex-col gap-3">
            {/* Navigation Bar */}
            <div className="flex justify-between items-center mb-1">
                 {canGoBack ? (
                    <button 
                        onClick={onGoBack}
                        className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-indigo-200 hover:text-white transition-colors"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Previous
                    </button>
                 ) : (
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-300/50">Vocabulary Card</span>
                 )}
                 
                 <div className="flex items-center gap-2">
                     {!isEditing && !isLoading && !isStacked && (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="p-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-full transition-colors backdrop-blur-sm text-white border border-white/10 shadow-sm"
                            title="Edit Card"
                        >
                            <PencilIcon className="w-4 h-4" />
                        </button>
                    )}
                 </div>
            </div>

            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold font-serif mb-1 break-words tracking-tight">{data.word}</h2>
                    <div className="flex items-center gap-3 opacity-90">
                        <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-sm text-indigo-200">/{data.phonetic}/</span>
                        <button onClick={() => playAudio(data.word)} className="hover:bg-white/20 rounded-full p-1.5 transition-colors">
                            <AudioIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
            
            {!isEditing ? (
                <div className={`self-start backdrop-blur-sm px-3 py-1 rounded-md text-sm font-medium border ${isStacked ? 'bg-slate-600/20 text-slate-200 border-slate-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>
                    {data.translation}
                </div>
            ) : (
                <input 
                    type="text"
                    value={editData.translation}
                    onChange={(e) => handleInputChange('translation', e.target.value)}
                    className="self-start bg-white/90 text-indigo-900 px-3 py-1 rounded-md text-sm font-medium border-none focus:ring-2 focus:ring-indigo-400 outline-none w-full"
                    placeholder="Translation"
                />
            )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-6">
        
        {/* Edit Mode Actions */}
        {isEditing && (
            <div className="flex gap-2 mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="flex-1">
                    <p className="text-xs text-indigo-800 font-medium">Editing Mode</p>
                    <p className="text-[10px] text-indigo-600">Customize your memory aid & images.</p>
                </div>
                <div className="flex gap-2">
                     <button onClick={cancelEdits} className="p-2 text-slate-500 hover:bg-white rounded-md">
                        <XMarkIcon className="w-5 h-5" />
                     </button>
                     <button onClick={saveEdits} className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-md shadow-sm">
                        Done
                     </button>
                </div>
            </div>
        )}

        {/* 1. Recorded Meanings (有记录意思) */}
        <div className="border-b border-slate-100 pb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">有记录意思 (Recorded)</h3>
            {!isEditing ? (
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{data.recorded_meanings}</p>
            ) : (
                <textarea 
                    value={editData.recorded_meanings}
                    onChange={(e) => handleInputChange('recorded_meanings', e.target.value)}
                    className="w-full p-2 text-slate-800 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                    rows={3}
                />
            )}
        </div>

        {/* 2. Mnemonic / Interesting Discovery (有意思发现) */}
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 relative overflow-hidden">
             <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600">
                    <BrainIcon className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">有意思发现 (Discovery)</h3>
             </div>
             
             {!isEditing ? (
                 <p className="text-amber-900 text-sm font-medium leading-relaxed whitespace-pre-line">
                    {data.mnemonic_analysis}
                 </p>
             ) : (
                 <textarea 
                    value={editData.mnemonic_analysis}
                    onChange={(e) => handleInputChange('mnemonic_analysis', e.target.value)}
                    className="w-full p-2 bg-white/80 border border-amber-200 rounded-md text-sm text-amber-900 focus:ring-1 focus:ring-amber-500 outline-none"
                    rows={6}
                    placeholder="Breakdown the word (sound, spelling, root)..."
                />
             )}
        </div>

        {/* 3. Visual Cue (图) - with Image Upload */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 border-dashed relative">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <EyeIcon className="w-3 h-3 text-slate-400" />
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">图 (Visual)</h3>
                </div>
            </div>
             
             {/* Text Description */}
             {!isEditing ? (
                 <p className="text-xs text-slate-500 italic mb-2">
                    "{data.visual_image_prompt}"
                 </p>
             ) : (
                 <input 
                    type="text"
                    value={editData.visual_image_prompt}
                    onChange={(e) => handleInputChange('visual_image_prompt', e.target.value)}
                    className="w-full p-1 bg-white border border-slate-200 rounded text-xs text-slate-600 italic focus:ring-1 focus:ring-indigo-500 outline-none mb-2"
                    placeholder="Describe the image..."
                />
             )}

             {/* Actual Image Display */}
             {displayImage && (
                 <div className="rounded-lg overflow-hidden border border-slate-200 mt-2">
                     <img src={displayImage} alt="Visual memory aid" className="w-full h-auto object-cover max-h-48" />
                 </div>
             )}

             {/* Image Editor Controls */}
             {isEditing && (
                 <div className="mt-3 flex flex-col gap-2">
                     <div className="flex gap-2">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-300 py-1.5 rounded text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                            <PhotoIcon className="w-3 h-3" />
                            Upload Image
                        </button>
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileUpload} 
                            className="hidden" 
                        />
                     </div>
                     <div className="relative">
                        <span className="absolute left-2 top-1.5 text-slate-400 text-xs">URL:</span>
                        <input
                            type="text"
                            value={editData.custom_image_url || ''}
                            onChange={(e) => {
                                setEditData(prev => ({ 
                                    ...prev, 
                                    custom_image_url: e.target.value,
                                    custom_image_base64: undefined // Clear upload if URL is manually typed
                                }));
                            }}
                            className="w-full pl-10 pr-2 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                            placeholder="https://example.com/image.jpg"
                        />
                     </div>
                 </div>
             )}
        </div>

        {/* 4. Core Logic (核心含义内核) */}
        <div>
             <div className="flex items-center gap-2 mb-2">
                <SparklesIcon className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">核心含义内核 (Core Logic)</h3>
             </div>
             {!isEditing ? (
                 <p className="text-slate-800 font-semibold text-lg border-l-4 border-indigo-500 pl-3 py-1">
                    {data.core_logic}
                 </p>
             ) : (
                 <input 
                    type="text"
                    value={editData.core_logic}
                    onChange={(e) => handleInputChange('core_logic', e.target.value)}
                    className="w-full p-2 bg-white border border-indigo-200 rounded-md text-lg font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
             )}
        </div>

        {/* 5. Scenario (例句) */}
        <div className="space-y-1 pt-2">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">例句 (Example)</h3>
             {!isEditing ? (
                 <>
                    <p className="text-slate-800 italic">"{data.scenario_sentence_en}"</p>
                    <p className="text-slate-500 text-sm">{data.scenario_sentence_cn}</p>
                 </>
             ) : (
                 <div className="space-y-2">
                    <textarea 
                        value={editData.scenario_sentence_en}
                        onChange={(e) => handleInputChange('scenario_sentence_en', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-md text-sm text-slate-800 italic focus:ring-1 focus:ring-indigo-500 outline-none"
                        rows={2}
                    />
                    <input 
                        type="text"
                        value={editData.scenario_sentence_cn}
                        onChange={(e) => handleInputChange('scenario_sentence_cn', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-md text-sm text-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                 </div>
             )}
        </div>

        {/* Linked Word Suggestion */}
        {(data.related_word_suggestion || isEditing) && (
            <div 
                onClick={!isEditing && onExploreRelated && data.related_word_suggestion ? () => onExploreRelated(data.related_word_suggestion!.word) : undefined}
                className={`mt-4 p-3 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-lg ${!isEditing && onExploreRelated ? 'cursor-pointer hover:shadow-md hover:border-indigo-300' : ''} transition-all group`}
            >
                <div className="flex items-center gap-2 mb-1">
                    <LinkIcon className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Deep Dive / Related</span>
                </div>
                
                {!isEditing && data.related_word_suggestion ? (
                     <div className="flex justify-between items-center">
                        <div>
                            <p className="font-serif font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                                {data.related_word_suggestion.word}
                            </p>
                            <p className="text-xs text-slate-500 line-clamp-1">
                                {data.related_word_suggestion.reason}
                            </p>
                        </div>
                        <div className="text-slate-300 group-hover:text-indigo-400 transform group-hover:translate-x-1 transition-all">
                            →
                        </div>
                    </div>
                ) : isEditing ? (
                    <div className="space-y-2">
                        <input 
                            type="text"
                            value={editData.related_word_suggestion?.word || ''}
                            onChange={(e) => handleNestedInputChange('related_word_suggestion', 'word', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-md text-sm font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                            placeholder="Related Word"
                        />
                        <input 
                            type="text"
                            value={editData.related_word_suggestion?.reason || ''}
                            onChange={(e) => handleNestedInputChange('related_word_suggestion', 'reason', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                            placeholder="Reason for connection"
                        />
                    </div>
                ) : null}
            </div>
        )}

        {/* Actions (Only show if not editing and not stacked) */}
        {!isEditing && !isStacked && (
            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-2 sticky bottom-0 bg-white pb-2 z-10">
                {onSave && (
                    <button 
                        onClick={onSave}
                        disabled={isSaved}
                        className={`flex-1 py-3.5 rounded-xl font-bold transition-all flex justify-center items-center gap-2 shadow-sm active:scale-[0.98] ${isSaved ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 opacity-80' : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg'}`}
                    >
                        {isSaved ? (
                            <>
                            <CheckCircleIcon className="w-5 h-5" />
                            Collected
                            </>
                        ) : 'Save Card'}
                    </button>
                )}
            </div>
        )}

      </div>
    </div>
  );
};