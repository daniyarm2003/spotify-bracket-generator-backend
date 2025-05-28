import SpotifyAuthMiddleware from '../spotify/auth/spotifyAuthMiddleware';
import TournamentService from './tournamentService';
import { Express, Request, Response } from 'express';

export default class TournamentController {
    private readonly tournamentService: TournamentService;
    private readonly spotifyAuthMiddleware: SpotifyAuthMiddleware;

    public constructor(tournamentService: TournamentService, spotifyAuthMiddleware: SpotifyAuthMiddleware) {
        this.tournamentService = tournamentService;
        this.spotifyAuthMiddleware = spotifyAuthMiddleware;
    }

    public registerRoutes(app: Express) {
        app.get('/api/tournaments', this.spotifyAuthMiddleware.runMiddleware.bind(this.spotifyAuthMiddleware), this.getTournamentsByLoggedInUser.bind(this));
        app.post('/api/tournaments/:tournamentId/bracket', this.spotifyAuthMiddleware.runMiddleware.bind(this.spotifyAuthMiddleware), this.getTournamentById.bind(this));
    }

    private async getTournamentsByLoggedInUser(req: Request, res: Response) {
        const user = req.user!;

        try {
            const tournaments = await this.tournamentService.getTournamentsByUser(user);
            res.status(200).json(tournaments);
        }
        catch(err) {
            console.error(err);
            res.status(500).json({ message: 'Unexpected error while fetching tournaments' });
        }
    }

    private async getTournamentById(req: Request, res: Response) {
        const { tournamentId } = req.params;
        const user = req.user!;

        const tournament = await this.tournamentService.getTournamentById(tournamentId);

        if(!tournament) {
            res.status(404).json({ message: 'Tournament not found' });
            return;
        }
        else if(tournament.user.id !== user.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        try {
            const bracket = await this.tournamentService.getTournamentBracket(tournament);

            // A neat trick I just learned to filter out the user and userId properties from the tournament object
            const { user, userId, ...filteredTournament } = tournament;

            res.status(200).json({
                ...filteredTournament,
                bracket
            });
        }
        catch(err) {
            console.error(err);
            res.status(500).json({ message: 'Unexpected error while fetching tournament' });
        }
    }
}