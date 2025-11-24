
import { Article, SavedItem } from '../types';

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
    }
};
