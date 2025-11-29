
import { Sentence } from '../types';

export const processTextToArticle = (text: string): Sentence[] => {
  // 1. Split into paragraphs first to preserve structure
  const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
  
  let globalIndex = 0;
  const sentences: Sentence[] = [];

  // 2. Use Intl.Segmenter if available (modern browsers) for accurate sentence splitting
  const segmenter = typeof Intl !== 'undefined' && (Intl as any).Segmenter 
    ? new (Intl as any).Segmenter('en', { granularity: 'sentence' }) 
    : null;

  paragraphs.forEach((para) => {
    let paraSentences: string[] = [];

    if (segmenter) {
      const segments = segmenter.segment(para);
      for (const segment of segments) {
        paraSentences.push(segment.segment);
      }
    } else {
      // Fallback regex for older environments
      paraSentences = para.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [para];
    }

    // Clean and add to result
    paraSentences.forEach((s, idx) => {
      const cleanText = s.trim();
      if (cleanText) {
        sentences.push({
          index: globalIndex++,
          text: cleanText,
          isParagraphStart: idx === 0
        });
      }
    });
  });

  return sentences;
};

export const countWordStats = (text: string) => {
    // Basic English word count (split by spaces)
    const enCount = text.trim().split(/\s+/).length;
    
    // Chinese character count
    const cnMatch = text.match(/[\u4e00-\u9fa5]/g);
    const cnCount = cnMatch ? cnMatch.length : 0;

    // Estimate reading time: 200 wpm for English, 300 cpm for Chinese
    const readingTimeMin = Math.ceil(enCount / 200 + cnCount / 300);

    return { enCount, cnCount, readingTimeMin };
};

export const splitContentIntoChapters = (text: string, wordsPerChapter: number = 2500): string[] => {
    const paragraphs = text.split(/\n+/);
    const chapters: string[] = [];
    let currentChapter: string[] = [];
    let currentWordCount = 0;

    for (const para of paragraphs) {
        const wordsInPara = para.split(/\s+/).length;
        
        // If adding this paragraph exceeds limit significantly (unless it's the start of a new chapter), push current chapter
        if (currentWordCount + wordsInPara > wordsPerChapter && currentChapter.length > 0) {
            chapters.push(currentChapter.join('\n\n'));
            currentChapter = [];
            currentWordCount = 0;
        }

        currentChapter.push(para);
        currentWordCount += wordsInPara;
    }

    if (currentChapter.length > 0) {
        chapters.push(currentChapter.join('\n\n'));
    }

    return chapters;
};

export const extractContentFromUrl = async (url: string): Promise<string> => {
    // Using Jina Reader (free tier) to scrape content
    // r.jina.ai converts web pages to markdown/text
    try {
        const response = await fetch(`https://r.jina.ai/${url}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status}`);
        }
        const text = await response.text();
        // Basic cleanup of Jina's markdown output to plain text for our reader
        return text.replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
                   .replace(/\[.*?\]\(.*?\)/g, '$1') // Keep link text, remove url
                   .replace(/#{1,6}\s/g, '') // Remove headings
                   .replace(/\*\*/g, '') // Remove bold
                   .trim();
    } catch (e) {
        console.error("URL Extraction failed", e);
        throw new Error("Could not extract content from URL. CORS or Network error.");
    }
};
