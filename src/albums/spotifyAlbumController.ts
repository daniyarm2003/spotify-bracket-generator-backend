import { Express, Request, Response } from 'express';
import SpotifyAlbumService from './spotifyAlbumService';
import SpotifyAuthMiddleware from '../spotify/auth/spotifyAuthMiddleware';

export default class SpotifyAlbumController {
    private readonly spotifyAlbumService: SpotifyAlbumService;
    private readonly spotifyAuthMiddleware: SpotifyAuthMiddleware;

    public constructor(spotifyAlbumService: SpotifyAlbumService, spotifyAuthMiddleware: SpotifyAuthMiddleware) {
        this.spotifyAlbumService = spotifyAlbumService;
        this.spotifyAuthMiddleware = spotifyAuthMiddleware;
    }

    public registerRoutes(app: Express) {
        app.get('/api/albums', this.spotifyAuthMiddleware.runMiddleware.bind(this.spotifyAuthMiddleware), this.getSavedAlbumsByLoggedInUser.bind(this));
        app.get('/api/albums/count', this.spotifyAuthMiddleware.runMiddleware.bind(this.spotifyAuthMiddleware), this.getSavedAlbumCountByLoggedInUser.bind(this));
    }

    private async getSavedAlbumsByLoggedInUser(req: Request, res: Response) {
        const user = req.user!;

        try {
            const albums = await this.spotifyAlbumService.getUserSavedAlbums(user);
            res.status(200).json(albums);
        }
        catch(err) {
            console.error(err);
            res.status(500).json({ message: 'Unexpected error while fetching albums' });
        }
    }

    private async getSavedAlbumCountByLoggedInUser(req: Request, res: Response) {
        const user = req.user!;

        try {
            const count = await this.spotifyAlbumService.getUserSavedAlbumCount(user);
            res.status(200).json({ count });
        }
        catch(err) {
            console.error(err);
            res.status(500).json({ message: 'Unexpected error while fetching album count' });
        }
    }
}