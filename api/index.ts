import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import crypto from 'crypto';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Helper to decrypt
const decryptKey = (encryptedText: string): string => {
    const secret = process.env.ENCRYPTION_SECRET || 'default_secret_please_change';
    // Ensure key is 32 bytes
    const key = crypto.createHash('sha256').update(String(secret)).digest();

    try {
        const textParts = encryptedText.split(':');
        const iv = Buffer.from(textParts.shift()!, 'hex');
        const encryptedData = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedData);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        console.error('Decryption failed:', error);
        return '';
    }
}

// Helper to get formatted context
const getContext = (websiteInfo: any) => {
    return websiteInfo && websiteInfo.title
        ? `You are a helpful assistant for ${websiteInfo.title}. ${websiteInfo.description || ''} Answer the user's questions based on this context, you are representing this website, so act like you are ${websiteInfo.title}.`
        : 'You are a helpful assistant. Answer the user\'s questions.';
};

// Routes

// 1. Gemini Endpoint
app.post('/api/chat/gemini', async (req: Request, res: Response) => {
    try {
        let apiKey = req.headers['x-gemini-api-key'] as string || req.body.apiKey;

        // Try decrypting if encrypted header is present
        if (!apiKey && req.headers['x-encrypted-api-key']) {
            apiKey = decryptKey(req.headers['x-encrypted-api-key'] as string);
        }

        // Fallback to Env
        apiKey = apiKey || process.env.GEMINI_API_KEY;

        const { message, websiteInfo, model } = req.body;

        // Check if API key is found
        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required (headers, encrypted header, body, or env)' });
        }

        const context = getContext(websiteInfo);
        const geminiModel = (model && model.startsWith('gemini-')) ? model : 'gemini-2.0-flash';

        // PASS THE USER'S API KEY IN THE URL
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${geminiModel}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${context}\n\nUser question: ${message}\n\nPlease provide a helpful response.`
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API Error:', errorData);
            return res.status(response.status).json({ error: errorData.error?.message || 'Gemini API request failed' });
        }

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't process your request. Please try again.";

        res.json({ reply });

    } catch (error: any) {
        console.error('Server Error (Gemini):', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. OpenAI Endpoint
app.post('/api/chat/openai', async (req: Request, res: Response) => {
    try {
        let apiKey = req.headers['x-openai-api-key'] as string || req.body.apiKey;

        // Try decrypting if encrypted header is present
        if (!apiKey && req.headers['x-encrypted-api-key']) {
            apiKey = decryptKey(req.headers['x-encrypted-api-key'] as string);
        }

        // Fallback to Env
        apiKey = apiKey || process.env.OPENAI_API_KEY;

        const { message, websiteInfo, model } = req.body;

        // Check if API key is found
        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required (headers, encrypted header, body, or env)' });
        }

        const context = getContext(websiteInfo);
        const defaultModel = model || 'gpt-3.5-turbo';

        // PASS THE USER'S API KEY IN THE AUTHORIZATION HEADER
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}` // Use the user-provided key
            },
            body: JSON.stringify({
                model: defaultModel,
                messages: [
                    { role: 'system', content: context },
                    { role: 'user', content: message }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI API Error:', errorText);
            return res.status(response.status).json({ error: `OpenAI API request failed: ${errorText}` });
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || "I couldn't process your request. Please try again.";

        res.json({ reply });

    } catch (error: any) {
        console.error('Server Error (OpenAI):', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 3. Config Endpoint (Returns keys from .env)
app.get('/api/config', (req: Request, res: Response) => {
    res.json({
        geminiApiKey: process.env.GEMINI_API_KEY || '',
        openaiApiKey: process.env.OPENAI_API_KEY || ''
    });
});

app.get('/', (req: Request, res: Response) => {
    res.send('Chatbot Backend is running');
});

// Start server if running directly (not serverless)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;
