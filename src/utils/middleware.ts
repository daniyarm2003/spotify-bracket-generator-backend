import { Express } from 'express';

import session from 'express-session';

import express from 'express';
import cors from 'cors';
import { getEnvValueOrThrow } from './env';
import cookieParser from 'cookie-parser';

export default function setupMiddleware(app: Express) {
    const frontendBaseUrl = getEnvValueOrThrow('FRONTEND_BASE_URL');

    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    app.use(cookieParser());
    app.use(cors({
        origin: frontendBaseUrl,
        credentials: true
    }));

    const sessionSecret = getEnvValueOrThrow('SESSION_HMAC_SECRET');

    app.use(session({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 3600000 }
    }));
}