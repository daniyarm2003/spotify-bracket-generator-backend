export interface CommonGenAIResponseConfig {
    maxOutputTokens?: number;       // Maximum number of tokens to generate
    temperature?: number;           // Controls randomness (0 = deterministic, higher = more random)
    topP?: number;                  // Nucleus sampling (limits next tokens to top P probability mass)
    topK?: number;                  // Limits next tokens to top K most likely options
    stopSequences?: string[];       // Optional sequences to stop generation at
    presencePenalty?: number;       // Penalizes new tokens based on whether they appear in the text so far
    frequencyPenalty?: number;      // Penalizes new tokens based on their existing frequency in the text
}

export interface SimpleChatHistoryEntry {
    role: 'user' | 'assistant';
    message: string;
}

export interface GenAIChatService {
    getHistorySimple(): Promise<SimpleChatHistoryEntry[]>;
    sendMessageSimple(prompt: string, config?: CommonGenAIResponseConfig): Promise<string>;
}

export default interface GenAIService {
    generateContentSimple(prompt: string, config?: CommonGenAIResponseConfig): Promise<string>;
    createChat(): Promise<GenAIChatService>;
}