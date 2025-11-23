
import { CustomApiConfig, WordCardData } from '../types';

/**
 * Executes a configured Custom API request.
 * Supports {{word}} replacement in URL and Body.
 * Supports JSON Path extraction for response.
 */
export const fetchFromCustomApi = async (word: string, config: CustomApiConfig): Promise<WordCardData> => {
    // 1. Prepare URL
    const endpoint = config.url.replace(/{{word}}/g, encodeURIComponent(word));
    
    // 2. Prepare Headers
    const headers: Record<string, string> = {};
    config.headers.forEach(h => {
        if(h.key && h.value) headers[h.key] = h.value;
    });

    const options: RequestInit = {
        method: config.method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    };

    // 3. Prepare Body (if POST)
    if (config.method === 'POST' && config.bodyTemplate) {
        // Simple template replacement
        // Note: User must ensure bodyTemplate is valid JSON structure if Content-Type is application/json
        options.body = config.bodyTemplate.replace(/{{word}}/g, word);
    }

    // 4. Execute Request
    try {
        const response = await fetch(endpoint, options);
        if (!response.ok) {
            throw new Error(`Custom API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 5. Map Response
        let result = data;
        if (config.responseMapping) {
            // Simple dot notation traversal (e.g., "data.candidates[0].content")
            const path = config.responseMapping.split('.').filter(p => p.trim() !== '');
            for (const p of path) {
                // Check for array syntax: key[0]
                const arrayMatch = p.match(/(\w+)\[(\d+)\]/);
                if (arrayMatch) {
                    const key = arrayMatch[1];
                    const index = parseInt(arrayMatch[2]);
                    result = result[key]?.[index];
                } else {
                    result = result[p];
                }
                
                if (result === undefined) break;
            }
        }

        if (!result) {
            throw new Error("Custom API response mapping failed: Result is undefined");
        }

        // 6. Handle String vs Object
        // If the API returns a string containing JSON (common in LLM APIs), parse it.
        if (typeof result === 'string') {
            try {
                // Try to find JSON-like structure if mixed with text
                const jsonMatch = result.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]) as WordCardData;
                }
                return JSON.parse(result) as WordCardData;
            } catch {
                throw new Error("Custom API returned a string that could not be parsed as WordCardData JSON.");
            }
        }
        
        return result as WordCardData;

    } catch (err: any) {
        console.error("Custom API Execution Failed:", err);
        throw new Error(`Custom API Failed: ${err.message}`);
    }
};
