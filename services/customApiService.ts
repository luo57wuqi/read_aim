
import { CustomApiConfig, WordCardData } from '../types';

/**
 * Helper to perform the actual HTTP request and handle JSON/Stream parsing.
 */
async function executeRequest(url: string, method: string, headers: Record<string, string>, body: string | undefined): Promise<any> {
    try {
        const options: RequestInit = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: body
        };

        const response = await fetch(url, options);
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Custom API Error: ${response.status} ${response.statusText} \n${errText}`);
        }
        
        const rawText = await response.text();
        
        // Try standard JSON parse first
        try {
            return JSON.parse(rawText);
        } catch (jsonError) {
            // JSON parse failed. Check if it's an SSE Stream (data: {...})
            if (rawText.trim().startsWith('data:')) {
                const lines = rawText.split('\n');
                let fullContent = '';
                
                for (const line of lines) {
                    const cleanLine = line.trim();
                    if (!cleanLine.startsWith('data:')) continue;
                    
                    const payload = cleanLine.slice(5).trim();
                    if (payload === '[DONE]') continue;
                    
                    try {
                        const chunk = JSON.parse(payload);
                        // Handle OpenAI/Qwen compatible stream delta
                        const delta = chunk.choices?.[0]?.delta?.content;
                        if (delta) fullContent += delta;
                    } catch (e) {
                        // ignore bad chunk
                    }
                }
                
                // Reconstruct a standard OpenAI response structure
                return {
                    choices: [{ message: { content: fullContent } }]
                };
            } else {
                throw new Error(`Response is not valid JSON.`);
            }
        }
    } catch (err: any) {
        console.error("Custom API Request Failed:", err);
        throw err;
    }
}

/**
 * Extracts the model name from the bodyTemplate in config, defaulting to 'qwen-max' if parsing fails.
 */
function getModelFromConfig(config: CustomApiConfig): string {
    try {
        if (config.bodyTemplate) {
            const json = JSON.parse(config.bodyTemplate);
            if (json.model) return json.model;
        }
    } catch { }
    return 'qwen-max'; // Fallback
}

/**
 * Executes a configured Custom API request for Word Cards.
 */
export const fetchFromCustomApi = async (word: string, config: CustomApiConfig): Promise<WordCardData> => {
    // 1. Prepare URL
    const endpoint = config.url.replace(/{{word}}/g, encodeURIComponent(word));
    
    // 2. Prepare Headers
    const headers: Record<string, string> = {};
    config.headers.forEach(h => {
        if(h.key && h.value) headers[h.key] = h.value;
    });

    // 3. Prepare Body
    let body: string | undefined;
    if (config.method === 'POST' && config.bodyTemplate) {
        body = config.bodyTemplate.replace(/{{word}}/g, word);
    }

    // 4. Execute
    let data = await executeRequest(endpoint, config.method, headers, body);

    // 5. Map Response
    let result = data;
    if (config.responseMapping) {
        const path = config.responseMapping.split('.').filter(p => p.trim() !== '');
        for (const p of path) {
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
    if (typeof result === 'string') {
        try {
            // Remove Markdown code blocks if present
            let cleanResult = result.replace(/```json\n?|\n?```/g, '');
            const jsonMatch = cleanResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]) as WordCardData;
            }
            return JSON.parse(cleanResult) as WordCardData;
        } catch {
            throw new Error("Custom API returned a string that could not be parsed as WordCardData JSON.");
        }
    }
    
    return result as WordCardData;
};

/**
 * Translates a single text using the Custom API (assuming OpenAI/Qwen Chat format).
 * Ignores bodyTemplate but uses the model defined in it (or qwen-max).
 */
export const translateWithCustomApi = async (text: string, config: CustomApiConfig): Promise<string> => {
    const endpoint = config.url; // Use base URL
    const headers: Record<string, string> = {};
    config.headers.forEach(h => {
        if(h.key && h.value) headers[h.key] = h.value;
    });

    const model = getModelFromConfig(config);

    const body = JSON.stringify({
        model: model,
        messages: [
            { role: "system", content: "You are a professional translator. Translate the following text to Simplified Chinese. Return ONLY the translation, no extra text." },
            { role: "user", content: text }
        ],
        stream: false
    });

    const data = await executeRequest(endpoint, 'POST', headers, body);

    // Assume standard OpenAI format: choices[0].message.content
    const content = data?.choices?.[0]?.message?.content;
    if (content) return content.trim();
    
    throw new Error("Could not extract translation from Custom API response (Standard OpenAI format expected).");
};

/**
 * Batch translates text using Custom API.
 */
export const translateBatchWithCustomApi = async (texts: string[], config: CustomApiConfig): Promise<string[]> => {
    if (texts.length === 0) return [];

    const endpoint = config.url;
    const headers: Record<string, string> = {};
    config.headers.forEach(h => {
        if(h.key && h.value) headers[h.key] = h.value;
    });

    const model = getModelFromConfig(config);

    const prompt = `Translate the following array of English sentences/paragraphs into Chinese (Simplified). 
    Return a JSON object with a property 'translations' which is an array of strings, 
    corresponding exactly to the input order 1-to-1.
  
    Input Texts:
    ${JSON.stringify(texts)}`;

    const body = JSON.stringify({
        model: model,
        messages: [
            { role: "system", content: "You are a translator. You MUST return valid JSON." },
            { role: "user", content: prompt }
        ],
        stream: false
    });

    const data = await executeRequest(endpoint, 'POST', headers, body);
    const content = data?.choices?.[0]?.message?.content;

    if (!content) return [];

    try {
        let cleanJson = content.replace(/```json\n?|\n?```/g, '');
        // Find JSON object if mixed with text
        const match = cleanJson.match(/\{[\s\S]*\}/);
        if (match) cleanJson = match[0];
        
        const parsed = JSON.parse(cleanJson);
        return parsed.translations || [];
    } catch (e) {
        console.error("Failed to parse batch translation JSON", e);
        return [];
    }
};
