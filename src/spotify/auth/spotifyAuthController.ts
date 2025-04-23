import { AxiosError } from 'axios';
import { getEnvValueOrThrow } from '../../utils/env';
import SpotifyApiService from '../spotifyApiService';
import SpotifyAuthMiddleware from './spotifyAuthMiddleware';
import SpotifyAuthService from './spotifyAuthService';
import { Express, Request, Response } from 'express';

export default class SpotifyAuthController {
    public static readonly BEARER_TOKEN_COOKIE_NAME = 'authToken';
    public static readonly AUTH_CALLBACK_ROUTE_NAME = '/api/auth/callback';

    private static readonly BEARER_COOKIE_PREMATURE_EXPIRY_SECONDS = 10;

    private readonly authService: SpotifyAuthService;
    private readonly apiService: SpotifyApiService;
    private readonly authMiddleware: SpotifyAuthMiddleware;

    public constructor(authService: SpotifyAuthService, apiService: SpotifyApiService, authMiddleware: SpotifyAuthMiddleware) {
        this.authService = authService;
        this.apiService = apiService;
        this.authMiddleware = authMiddleware;
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
            await new Promise<void>((resolve, reject) => req.session.save(err => {
                if(err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            }));

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
            const { access_token, expires_in } = await this.authService.getSpotifyBearerToken(code);

            await this.authService.onUserSignIn(access_token);

            res.cookie(SpotifyAuthController.BEARER_TOKEN_COOKIE_NAME, access_token, {
                expires: new Date(Date.now() + 1000 * (expires_in - SpotifyAuthController.BEARER_COOKIE_PREMATURE_EXPIRY_SECONDS)),
                httpOnly: true
            })
            .redirect(`${frontendBaseUrl}/tournaments`);
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