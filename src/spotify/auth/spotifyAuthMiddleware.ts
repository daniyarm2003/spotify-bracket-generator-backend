import { NextFunction, Request, Response } from 'express';
import SpotifyAuthController from './spotifyAuthController';

export default class SpotifyAuthMiddleware {
    public constructor() {
        
    }

    public async runMiddleware(req: Request, res: Response, next: NextFunction) {
        if(!req.cookies[SpotifyAuthController.BEARER_TOKEN_COOKIE_NAME]) {
            res.status(401).json({
                message: 'Unauthorized'
            });

            return;
        }

        next();
    }
}