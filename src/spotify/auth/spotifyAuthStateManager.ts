import { Request, Response } from 'express';
import SpotifyApiService from '../spotifyApiService';
import { SpotifyTokenResponse } from './spotifyAuthService';
import { getEnvValueOrThrow } from '../../utils/env';
import { SpotifyAuthJWTPayload, SpotifyUserProfileFragment } from '../types';
import * as jwt from 'jsonwebtoken';

export class SpotifyAuthError extends Error {
    
}

export default class SpotifyAuthStateManager {
    public static readonly BEARER_TOKEN_COOKIE_NAME = 'authToken';
    private static readonly BEARER_COOKIE_PREMATURE_EXPIRY_SECONDS = 60;

    public constructor() {
        
    }

    public async saveOAuthLoginState(req: Request, state: string) {
        req.session.oauthState = state;

        return new Promise<string>((resolve, reject) => req.session.save(err => {
            if(err) {
                reject(err);
            }
            else if(!req.session.oauthState) {
                reject(new Error('OAuth state was not saved in session'));
            }
            else {
                resolve(req.session.oauthState);
            }
        }));
    }

    public async setAuthJWTCookie(res: Response, { access_token, expires_in }: SpotifyTokenResponse, { id, email }: SpotifyUserProfileFragment) {
        const secret = getEnvValueOrThrow('SESSION_HMAC_SECRET');

        const payload: SpotifyAuthJWTPayload = {
            id,
            email,
            bearerToken: access_token
        };

        const token = jwt.sign(payload, secret);

        res.cookie(SpotifyAuthStateManager.BEARER_TOKEN_COOKIE_NAME, token, {
            expires: new Date(Date.now() + 1000 * (expires_in - SpotifyAuthStateManager.BEARER_COOKIE_PREMATURE_EXPIRY_SECONDS)),
            httpOnly: true,
            sameSite: 'lax',
        });

        return res;
    }

    public hasAuthJWTCookie(req: Request) {
        return req.cookies[SpotifyAuthStateManager.BEARER_TOKEN_COOKIE_NAME] !== undefined;
    }

    public getAuthJWTCookie(req: Request) {
        if(!this.hasAuthJWTCookie(req)) {
            throw new SpotifyAuthError('No auth JWT detected');
        }

        const secret = getEnvValueOrThrow('SESSION_HMAC_SECRET');
        const authCookieValueStr = req.cookies[SpotifyAuthStateManager.BEARER_TOKEN_COOKIE_NAME];

        try {
            const authCookieValue = jwt.verify(authCookieValueStr, secret);
            return authCookieValue as SpotifyAuthJWTPayload;
        }
        catch(err) {
            throw new SpotifyAuthError('Invalid or altered JWT detected');
        }
    }

    public revokeAuthJwtCookie(res: Response) {
        return res.clearCookie(SpotifyAuthStateManager.BEARER_TOKEN_COOKIE_NAME);
    }
}