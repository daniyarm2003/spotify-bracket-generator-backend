import { Chat, GoogleGenAI } from '@google/genai';
import GenAIService, { CommonGenAIResponseConfig, GenAIChatService, SimpleChatHistoryEntry } from './genAIService';

class GeminiChatService implements GenAIChatService {
    private readonly chat: Chat;
    
    public constructor(chat: Chat) {
        this.chat = chat;
    }

    public async getHistorySimple(): Promise<SimpleChatHistoryEntry[]> {
        const history = this.chat.getHistory(true);

        return history.map((item) => ({
            role: item.role === 'user' ? 'user' : 'assistant',
            message: item.parts?.reduce((prev, cur) => prev + (cur.text ?? ''), '') ?? ''
        }));
    }

    public async sendMessageSimple(prompt: string, config?: CommonGenAIResponseConfig): Promise<string> {
        const response = await this.chat.sendMessage({
            message: prompt,
            config
        });

        const responseText = response.text;

        if(!responseText) {
            throw new Error('Model returned empty response');
        }

        return responseText;
    }
}

export default class GeminiService implements GenAIService {
    private readonly geminiSdk: GoogleGenAI;
    private readonly geminiModel: string;

    public constructor(geminiSdk: GoogleGenAI, geminiModel: string) {
        this.geminiSdk = geminiSdk;
        this.geminiModel = geminiModel;
    }

    public async generateContentSimple(prompt: string, config?: CommonGenAIResponseConfig): Promise<string> {
        const response = await this.geminiSdk.models.generateContent({
            model: this.geminiModel,
            contents: prompt,
            config
        });

        const responseText = response.text;

        if(!responseText) {
            throw new Error('Model returned empty response');
        }

        return responseText;
    }

    public async createChat(): Promise<GenAIChatService> {
        return new GeminiChatService(this.geminiSdk.chats.create({
            model: this.geminiModel
        }));
    }
}