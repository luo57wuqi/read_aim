
export interface WordCardData {
  word: string;
  phonetic: string;
  translation: string;
  // "有记录意思"
  recorded_meanings: string; 
  // "有意思发现[用起来]" (Mnemonic Analysis)
  mnemonic_analysis: string;
  // "核心含义内核" (Core Logic)
  core_logic: string;
  // "图" (Visual Prompt description)
  visual_image_prompt: string;
  
  // Custom User Image (URL or Base64)
  custom_image_url?: string;
  custom_image_base64?: string; // For uploaded images stored in localStorage
  
  // Standard fields for example
  scenario_sentence_en: string;
  scenario_sentence_cn: string;
  
  related_word_suggestion?: {
    word: string;
    reason: string;
  };
}

export interface Sentence {
  index: number;
  text: string;
  translation?: string;
  isParagraphStart?: boolean; // Visual helper
}

export interface Article {
  id: string;
  title: string;
  sentences: Sentence[];
  createdAt: number;
  lastReadAt: number;
  groupId?: string; // ID for grouping chapters together
  groupTitle?: string; // Title of the book/collection
}

export interface SavedItem {
  id: string;
  original: string;
  translation: string;
  type: 'word' | 'sentence';
  cardData?: WordCardData; // Only for words
  timestamp: number;
  // Source Metadata
  sourceArticleId: string;
  sourceArticleTitle: string;
  sourceContextSentence: string;
  sourceSentenceIndex: number; 
}

export interface HistoryRecord {
  id: string;
  action: 'ADD' | 'REMOVE' | 'LOOKUP'; // Added LOOKUP for tracking frequency without saving
  original: string;
  type: 'word' | 'sentence';
  timestamp: number;
  // Source Metadata
  sourceArticleId: string;
  sourceArticleTitle: string;
  sourceContextSentence: string;
  sourceSentenceIndex: number;
}

export interface ReadingSession {
  id: string;
  articleId: string;
  articleTitle: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  maxProgress: number; // 0-100%
}

export interface WordUsageData {
  word: string;
  frequency: number;
  occurrences: {
    articleId: string;
    sentenceIndex: number;
    timestamp: number;
  }[];
}

export type WordStatsMap = Record<string, WordUsageData>;

export type DataSourceMode = 'ai' | 'local_only' | 'custom_api' | 'server';
export type Theme = 'light' | 'dark' | 'sepia' | 'forest' | 'amethyst' | 'custom';
export type LayoutMode = 'inline' | 'split';

export interface CustomThemeColors {
    appBg: string;
    text: string;
    headerBg: string;
    accent: string;
}

export interface CustomApiConfig {
  url: string;
  method: 'GET' | 'POST';
  headers: { key: string; value: string }[];
  bodyTemplate?: string; // e.g. '{"query": "{{word}}"}'
  responseMapping?: string; // e.g. 'data.choices[0].text'
}

export interface AppSettings {
  aiModel: string; // e.g. 'gemini-2.5-flash'
  customApiKey?: string; // Optional user override
  geminiBaseUrl?: string; // Optional Base URL for proxying (e.g. https://my-proxy.com)
  dataSourceMode: DataSourceMode; // Preference for fetching data
  
  // Appearance
  theme: Theme;
  customThemeColors?: CustomThemeColors; // User defined colors
  fontSize: number; // Base font size in px
  lineHeight: number; // Line height multiplier (e.g., 1.6)
  layoutMode: LayoutMode; // 'inline' or 'split'
  
  // Backend Server Config
  serverUrl?: string; // e.g. "http://localhost:5000"

  // Custom API Advanced Config
  customApiConfig?: CustomApiConfig;
}

export interface BackupData {
  version: number;
  timestamp: number;
  articles: Article[];
  savedItems: SavedItem[];
  historyRecords: HistoryRecord[];
  wordStats: WordStatsMap;
  settings: AppSettings;
  sessions?: ReadingSession[]; // Added sessions to backup
}

export enum ViewMode {
  LIBRARY = 'LIBRARY',
  READ = 'READ',
  STATS = 'STATS',
}
