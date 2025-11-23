
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
