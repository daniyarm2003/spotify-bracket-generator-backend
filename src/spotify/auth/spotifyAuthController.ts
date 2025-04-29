import { AxiosError } from 'axios';
import { getEnvValueOrThrow } from '../../utils/env';
import SpotifyApiService from '../spotifyApiService';
import SpotifyAuthMiddleware from './spotifyAuthMiddleware';
import SpotifyAuthService from './spotifyAuthService';
import { Express, Request, Response } from 'express';
import SpotifyAuthStateManager from './spotifyAuthStateManager';

export default class SpotifyAuthController {
    public static readonly BEARER_TOKEN_COOKIE_NAME = 'authToken';
    public static readonly AUTH_CALLBACK_ROUTE_NAME = '/api/auth/callback';

    private readonly authService: SpotifyAuthService;
    private readonly apiService: SpotifyApiService;
    private readonly authMiddleware: SpotifyAuthMiddleware;
    private readonly authStateManager: SpotifyAuthStateManager;

    public constructor(authService: SpotifyAuthService, apiService: SpotifyApiService, authStateManager: SpotifyAuthStateManager, authMiddleware: SpotifyAuthMiddleware) {
        this.authService = authService;
        this.authMiddleware = authMiddleware;
        this.authStateManager = authStateManager;
        this.apiService = apiService;
    }

    public registerRoutes(app: Express) {
        app.get('/api/auth/login', this.handleLoginRoute.bind(this));
        app.get(SpotifyAuthController.AUTH_CALLBACK_ROUTE_NAME, this.handleCallbackRoute.bind(this));

        app.get('/api/auth/me', this.authMiddleware.runMiddleware.bind(this.authMiddleware), this.getCurrentUser.bind(this));
        app.post('/api/auth/logout', this.handleLogoutRoute.bind(this));
    }

    private async handleLoginRoute(req: Request, res: Response) {
        const state = this.authService.generateOAuthState();
        const frontendBaseUrl = getEnvValueOrThrow('FRONTEND_BASE_URL');

        const scopes = [
            'user-library-read',
            'user-read-private',
            'user-read-email'
        ];

        req.session.oauthState = state;

        try {
            await this.authStateManager.saveOAuthLoginState(req, state);

            const redirectTo = this.authService.getSpotifyRedirectURL(state, scopes);
            res.redirect(redirectTo);
        }
        catch(err) {
            console.error(err);
            res.redirect(`${frontendBaseUrl}?login_error=unexpected_error`);
        }
    }

    private async handleCallbackRoute(req: Request, res: Response) {
        const { code, state } = req.query;

        const frontendBaseUrl = getEnvValueOrThrow('FRONTEND_BASE_URL');

        if(!code || !state || typeof(code) !== 'string') {
            res.redirect(`${frontendBaseUrl}?login_error=bad_request`);
            return;
        }
    
        else if(req.session.oauthState !== state) {
            res.redirect(`${frontendBaseUrl}?login_error=state_mismatch`);
            return;
        }

        try {
            const tokenResponse = await this.authService.getSpotifyBearerToken(code);

            const userProfile = await this.apiService.getCurrentUserProfile(tokenResponse.access_token);

            await this.authStateManager.setAuthJWTCookie(res, tokenResponse, userProfile);
            await this.authService.onUserSignIn(tokenResponse.access_token, userProfile);

            res.redirect(`${frontendBaseUrl}/tournaments`);
        }
        catch(err) {
            console.error(err);
            res.redirect(`${frontendBaseUrl}?login_error=unexpected_error`);
        }
    }

    private async getCurrentUser(req: Request, res: Response) {
        res.json(req.user);
    }

    private async handleLogoutRoute(req: Request, res: Response) {
        let cookieCleared = false;

        if(req.cookies[SpotifyAuthController.BEARER_TOKEN_COOKIE_NAME]) {
            res.clearCookie(SpotifyAuthController.BEARER_TOKEN_COOKIE_NAME);
            cookieCleared = true;
        }

        res.json({
            cookieCleared,
            message: 'Logged out successfully'
        });
    }
}