
import { WordCardData, AppSettings } from '../types';

const getModelName = (settings?: AppSettings) => {
    return settings?.aiModel || 'gemini-2.5-flash';
};

// --- Low-level REST call helper (avoid bundling @google/genai to fix Vite parse issues) ---
const callGemini = async (prompt: string, settings: AppSettings | undefined, extraConfig?: Record<string, any>): Promise<string> => {
  // Determine API Key
  // Prefer settings.customApiKey; fallback to Vite env VITE_API_KEY
  let apiKey: string | undefined = settings?.customApiKey;
  if (!apiKey) {
      const envAny: any = import.meta.env || {};
      apiKey = envAny.VITE_API_KEY;
  }
  if (!apiKey) {
      throw new Error("An API Key must be set. Please configure it in Settings or VITE_API_KEY env.");
  }

  const model = getModelName(settings);
  const baseUrl = (settings?.geminiBaseUrl && settings.geminiBaseUrl.trim() !== '')
      ? settings.geminiBaseUrl!.replace(/\/+$/, '')
      : 'https://generativelanguage.googleapis.com';

  const url = `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
      contents: [
          {
              role: 'user',
              parts: [{ text: prompt }]
          }
      ],
      generationConfig: {
          temperature: 0.6,
          ...(extraConfig || {}),
      }
  };

  const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
  });

  if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini HTTP ${res.status}: ${text}`);
  }

  const data: any = await res.json();
  const textPart = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textPart || typeof textPart !== 'string') {
      throw new Error("Gemini response missing text content");
  }
  return textPart;
};

export const generateWordCard = async (word: string, contextSentence?: string, settings?: AppSettings): Promise<WordCardData> => {
  const prompt = `
    Analyze the English word: "${word}".
    ${contextSentence ? `Context: "${contextSentence}".` : ''}
    
    Create a vocabulary card for a Chinese learner using the "Associative Memory" (联想记忆法) method. 
    ALL explanations MUST be in Simplified Chinese.
    
    You MUST follow this EXACT structure and tone from the user's preferred examples:

    [User Example 1: Heave]
    Word: Heave /hi:v/
    有记录意思: vt（用力）提起，捡起，扔；vi.起伏，隆起，呕吐，慈心。
    有意思发现[用起来]: heave是已经记忆过的单词 heaven (n. 天堂)；末尾去掉 -n，得到核心含义相关的动词含义，这里可以理解为去到天堂的方式-->由于天堂在天上，因此地上的人想要去到高空中的天堂，，便需要让自己高度升高。
    图: (留给读者擦汗如图片或或手动简笔画) - 简笔画：一个人用力把一个大箱子举过头顶，箭头指向天空。
    注意: 有关heave这个单词，重点把握其表示“使……的位置变得更高”这个核心含义内核即可，具体的含义可在具体的语境中通过分析清楚让什么东西位置的更高推到得出。
    核心含义内核: “让高度升高”
    例句: Heave the box onto the top shelf. 把这个盒子举到最上面一层的隔板上。

    [User Example 2: Heaven]
    Word: Heaven /'hevn/
    有记录意思: n. 天堂，极乐
    有意思发现[用起来]: 划分 hea|ven。
    针对第一个元素采用谐音记忆法，hea在单词里的发音类似中文“很”，表示程度：很，非常；
    针对第二个元素采用词根词缀分析法，ven在我们记忆单词convenient adj.便利的 时已经接触过，表示去，去到。
    综合考虑hea(很，非常)+ven - - >所有人死后都会去到的地方们也就是所谓的上天堂，词heaven表示 n. 天堂，极乐。
    核心含义内核: 极致的美好/归宿
    图: 云端之上有一扇发光的门。
    例句: The island is a real Heaven on earth. 这个岛真是人间天堂。

    Generate the JSON response to fit this content style:
    1. 'recorded_meanings': Corresponds to "有记录意思". List parts of speech and meanings.
    2. 'mnemonic_analysis': Corresponds to "有意思发现[用起来]". This is the most important part. Use logic like:
       - Spelling tricks (remove letter, add letter)
       - Harmonic/Sound associations (Hea -> 很)
       - Etymology/Root words (ven -> come/go)
       - Always connect back to the 'Core Logic'.
    3. 'core_logic': Corresponds to "核心含义内核" (e.g., "让高度升高"). Short, abstract concept.
    4. 'visual_image_prompt': Corresponds to "图". Describe a simple image.
    5. 'scenario_sentence_en/cn': A good example sentence.

    Target Word: "${word}"
  `;

  const raw = await callGemini(
      prompt + '\n\nReturn ONLY valid JSON object for WordCardData, no extra text or explanation.',
      settings,
  );
  // 清洗出 JSON
  const clean = raw.replace(/```json\n?|\n?```/g, '');
  const match = clean.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : clean;
  return JSON.parse(jsonStr) as WordCardData;
};

export const translateText = async (text: string, settings?: AppSettings): Promise<string> => {
  const prompt = `Translate the following English text to Chinese (Simplified). 
  Keep the tone natural and accurate to the context.
  
  Text: "${text}"`;

  const result = await callGemini(prompt, settings, { temperature: 0.3 });
  return result.trim();
};

export const translateBatch = async (texts: string[], settings?: AppSettings): Promise<string[]> => {
  if (texts.length === 0) return [];

  const prompt = `Translate the following array of English sentences/paragraphs into Chinese (Simplified). 
  Return a JSON object with a property 'translations' which is an array of strings, 
  corresponding exactly to the input order 1-to-1.

  Input Texts:
  ${JSON.stringify(texts)}
  `;

  const raw = await callGemini(
      prompt + '\n\nYou MUST return ONLY JSON like: {"translations": [...]} with no extra text.',
      settings,
      { temperature: 0.3 },
  );
  let clean = raw.replace(/```json\n?|\n?```/g, '');
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) clean = match[0];
  const result = JSON.parse(clean || "{}");
  return Array.isArray(result.translations) ? result.translations : [];
}
