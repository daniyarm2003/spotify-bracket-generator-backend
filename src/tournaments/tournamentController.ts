import SpotifyAuthMiddleware from '../spotify/auth/spotifyAuthMiddleware';
import TournamentService from './tournamentService';
import { Express, Request, Response } from 'express';
import { isTournamentCreationDTO, isTournamentEditDTO } from './typeValidation';
import SpotifyAlbumService from '../albums/spotifyAlbumService';

export default class TournamentController {
    private readonly tournamentService: TournamentService;
    private readonly spotifyAuthMiddleware: SpotifyAuthMiddleware;
    private readonly spotifyAlbumService: SpotifyAlbumService;

    public constructor(tournamentService: TournamentService, spotifyAuthMiddleware: SpotifyAuthMiddleware, spotifyAlbumService: SpotifyAlbumService) {
        this.tournamentService = tournamentService;
        this.spotifyAuthMiddleware = spotifyAuthMiddleware;
        this.spotifyAlbumService = spotifyAlbumService;
    }

    public registerRoutes(app: Express) {
        app.get('/api/tournaments', this.spotifyAuthMiddleware.runMiddleware.bind(this.spotifyAuthMiddleware), this.getTournamentsByLoggedInUser.bind(this));
        app.get('/api/tournaments/:tournamentId', this.spotifyAuthMiddleware.runMiddleware.bind(this.spotifyAuthMiddleware), this.getTournamentById.bind(this));
        app.post('/api/tournaments', this.spotifyAuthMiddleware.runMiddleware.bind(this.spotifyAuthMiddleware), this.createTournamentForLoggedInUser.bind(this));
        app.patch('/api/tournaments/:tournamentId', this.spotifyAuthMiddleware.runMiddleware.bind(this.spotifyAuthMiddleware), this.editTournamentOfLoggedInUser.bind(this));
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

    private validateTournamentName(name: string) {
        const minNameLength = 1;
        const maxNameLength = 32;

        if(name.length < minNameLength || name.length > maxNameLength) {
            throw new Error(`Tournament name must be between ${minNameLength} and ${maxNameLength} characters long`);
        }

        return true;
    }

    private async createTournamentForLoggedInUser(req: Request, res: Response) {
        const user = req.user!;
        const tournamentCreationDTO = req.body;

        if(!isTournamentCreationDTO(tournamentCreationDTO)) {
            res.status(400).json({ message: 'Invalid tournament creation data' });
            return;
        }

        try {
            this.validateTournamentName(tournamentCreationDTO.name);
        }
        catch(err: any) {
            res.status(400).json({ message: err.message });
            return;
        }

        const minAlbumCount = 1;
        const maxAlbumCount = await this.spotifyAlbumService.getUserSavedAlbumCount(user);

        if(tournamentCreationDTO.albumCount < minAlbumCount || tournamentCreationDTO.albumCount > maxAlbumCount) {
            res.status(400).json({ message: `Tournament must have between ${minAlbumCount} and ${maxAlbumCount} albums` });
            return;
        }

        try {
            const tournament = await this.tournamentService.createTournament(user, tournamentCreationDTO);
            res.status(201).json(tournament);
        }
        catch(err) {
            console.error(err);
            res.status(500).json({ message: 'Unexpected error while creating tournament' });
        }
    }

    private async editTournamentOfLoggedInUser(req: Request, res: Response) {
        const user = req.user!;
        const tournamentEditDTO = req.body;

        const { tournamentId } = req.params;

        const tournament = await this.tournamentService.getTournamentById(tournamentId);

        if(!tournament) {
            res.status(404).json({ message: 'Tournament not found' });
            return;
        }
        else if(tournament.user.id !== user.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        if(!isTournamentEditDTO(tournamentEditDTO)) {
            res.status(400).json({ message: 'Invalid tournament edit data' });
            return;
        }

        try {
            if(tournamentEditDTO.name) {
                this.validateTournamentName(tournamentEditDTO.name);
            }
        }
        catch(err: any) {
            res.status(400).json({ message: err.message });
            return;
        }

        try {
            const updatedTournament = await this.tournamentService.editTournamentById(tournamentId, tournamentEditDTO);
            res.status(200).json(updatedTournament);
        }
        catch(err) {
            console.error(err);
            res.status(500).json({ message: 'Unexpected error while editing tournament' });
        }
    }
}