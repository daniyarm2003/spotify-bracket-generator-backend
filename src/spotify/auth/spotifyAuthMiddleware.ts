import { NextFunction, Request, Response } from 'express';
import SpotifyAuthController from './spotifyAuthController';
import SpotifyApiService from '../spotifyApiService';
import { AxiosError } from 'axios';
import UserService from '../../users/userService';

export default class SpotifyAuthMiddleware {
    private readonly apiService: SpotifyApiService;
    private readonly userService: UserService;

    public constructor(apiService: SpotifyApiService, userService: UserService) {
        this.apiService = apiService;
        this.userService = userService;
    }

    public async runMiddleware(req: Request, res: Response, next: NextFunction) {
        const bearerToken = req.cookies[SpotifyAuthController.BEARER_TOKEN_COOKIE_NAME];

        if(!bearerToken) {
            res.status(401).json({
                message: 'Unauthorized'
            });

            return;
        }

        try {
            const spotifyUserData = await this.apiService.getCurrentUserProfile(bearerToken);
            const user = await this.userService.getUserBySpotifyProfile(spotifyUserData);

            if(!user) {
                res.clearCookie(SpotifyAuthController.BEARER_TOKEN_COOKIE_NAME).status(401).json({
                    message: 'Unauthorized due to missing entry in database'
                });

                return;
            }

            req.user = user;
            next();
        }
        catch(err) {
            if(err instanceof AxiosError && err.status === 401) {
                res.clearCookie(SpotifyAuthController.BEARER_TOKEN_COOKIE_NAME).status(401).json({
                    message: 'Unauthorized from Spotify API'
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