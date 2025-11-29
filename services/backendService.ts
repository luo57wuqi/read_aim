
import { Article, SavedItem, BackupData } from '../types';

const DEFAULT_URL = 'http://localhost:5000';

export const api = {
    checkStatus: async (baseUrl: string = DEFAULT_URL) => {
        try {
            const res = await fetch(`${baseUrl}/api/status`);
            return res.ok;
        } catch {
            return false;
        }
    },

    // Articles
    getArticles: async (baseUrl: string = DEFAULT_URL): Promise<Article[]> => {
        const res = await fetch(`${baseUrl}/api/articles`);
        if (!res.ok) throw new Error("Failed to fetch articles");
        return await res.json();
    },

    saveArticle: async (baseUrl: string = DEFAULT_URL, article: Article) => {
        const res = await fetch(`${baseUrl}/api/articles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(article)
        });
        if (!res.ok) throw new Error("Failed to save article");
        return await res.json();
    },

    deleteArticle: async (baseUrl: string = DEFAULT_URL, id: string) => {
        const res = await fetch(`${baseUrl}/api/articles/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error("Failed to delete article");
    },

    // Saved Items (Words)
    getSavedItems: async (baseUrl: string = DEFAULT_URL): Promise<SavedItem[]> => {
        const res = await fetch(`${baseUrl}/api/saved_items`);
        if (!res.ok) throw new Error("Failed to fetch saved items");
        return await res.json();
    },

    saveItem: async (baseUrl: string = DEFAULT_URL, item: SavedItem) => {
        const res = await fetch(`${baseUrl}/api/saved_items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        if (!res.ok) throw new Error("Failed to save item");
        return await res.json();
    },

    deleteItem: async (baseUrl: string = DEFAULT_URL, id: string) => {
        const res = await fetch(`${baseUrl}/api/saved_items/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error("Failed to delete item");
    },

    // Bulk Restore
    restoreBackup: async (baseUrl: string = DEFAULT_URL, data: BackupData) => {
        // We handle this sequentially or in small batches to avoid SQLite locking issues 
        // or overwhelming the simple Flask server with hundreds of concurrent requests.
        
        console.log("Starting Server Sync...");

        // 1. Sync Articles
        for (const article of data.articles) {
            try {
                await api.saveArticle(baseUrl, article);
            } catch (e) {
                console.warn(`Failed to sync article ${article.title}`, e);
            }
        }

        // 2. Sync Saved Items
        // Process in chunks of 5 to speed it up slightly while remaining safe
        const CHUNK_SIZE = 5;
        for (let i = 0; i < data.savedItems.length; i += CHUNK_SIZE) {
            const chunk = data.savedItems.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(item => 
                api.saveItem(baseUrl, item).catch(e => console.warn(`Failed to sync item ${item.original}`, e))
            ));
        }

        return true;
    }
};
