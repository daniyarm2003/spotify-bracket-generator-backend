import 'dotenv/config';

import express from 'express';
import { getEnvValueOrThrow, getIntegerEnvValueOrThrow } from './utils/env';
import setupMiddleware from './utils/middleware';
import SpotifyAuthService from './spotify/auth/spotifyAuthService';
import SpotifyAuthController from './spotify/auth/spotifyAuthController';
import SpotifyApiService from './spotify/spotifyApiService';
import SpotifyAuthMiddleware from './spotify/auth/spotifyAuthMiddleware';
import createDatabaseClient from './utils/db';
import UserService from './users/userService';
import SpotifyAuthStateManager from './spotify/auth/spotifyAuthStateManager';
import SpotifyAlbumService from './albums/spotifyAlbumService';
import TournamentService from './tournaments/tournamentService';
import TournamentController from './tournaments/tournamentController';

async function main() {
    const app = express();
    setupMiddleware(app);

    const prismaClient = createDatabaseClient();
    const spotifyApiService = new SpotifyApiService();

    const userService = new UserService(prismaClient);
    const spotifyAlbumService = new SpotifyAlbumService(prismaClient, spotifyApiService);
    const tournamentService = new TournamentService(prismaClient, spotifyAlbumService);

    const spotifyAuthService = new SpotifyAuthService(
        userService,
        spotifyAlbumService,
        getEnvValueOrThrow('SPOTIFY_APP_CLIENT_ID'),
        getEnvValueOrThrow('SPOTIFY_APP_CLIENT_SECRET'),
        getEnvValueOrThrow('BACKEND_BASE_URL')
    );

    const spotifyAuthStateManager = new SpotifyAuthStateManager();
    const spotifyAuthMiddleware = new SpotifyAuthMiddleware(userService, spotifyAuthStateManager);

    const spotifyAuthController = new SpotifyAuthController(spotifyAuthService, spotifyApiService, spotifyAuthStateManager, spotifyAuthMiddleware);
    spotifyAuthController.registerRoutes(app);

    const tournamentController = new TournamentController(tournamentService, spotifyAuthMiddleware);
    tournamentController.registerRoutes(app);

    const portNumber = getIntegerEnvValueOrThrow('SERVER_PORT', 1, 65535);
    app.listen(portNumber, () => console.log(`Server is listening on port ${portNumber}`));
}

main();