import { NextFunction, Request, Response } from 'express';
import UserService from '../../users/userService';
import SpotifyAuthStateManager, { SpotifyAuthError } from './spotifyAuthStateManager';

export default class SpotifyAuthMiddleware {
    private readonly userService: UserService;
    private readonly authStateManager: SpotifyAuthStateManager;

    public constructor(userService: UserService, authStateManager: SpotifyAuthStateManager) {
        this.userService = userService;
        this.authStateManager = authStateManager;
    }

    public async runMiddleware(req: Request, res: Response, next: NextFunction) {
        if(!this.authStateManager.hasAuthJWTCookie(req)) {
            res.status(401).json({
                message: 'Unauthorized'
            });

            return;
        }

        try {
            const jwtPayload = this.authStateManager.getAuthJWTCookie(req);
            const user = await this.userService.getUserBySpotifyId(jwtPayload.id);

            if(!user) {
                res.status(401).json({
                    message: `User with Spotify ID ${jwtPayload.id} was not found in the database`
                });

                return;
            }

            req.user = user;
            next();
        }
        catch(err) {
            if(err instanceof SpotifyAuthError) {
                this.authStateManager.revokeAuthJwtCookie(res).status(401).json({
                    message: err.message
                });
            }
            else {
                console.error(err);

                res.status(500).json({
                    message: 'Unexpected error'
                });
            }
        }
    }
}