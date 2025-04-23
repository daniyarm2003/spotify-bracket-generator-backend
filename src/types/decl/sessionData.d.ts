declare module 'express-session' {
    interface SessionData {
        oauthState: string;
    }
}

export {};