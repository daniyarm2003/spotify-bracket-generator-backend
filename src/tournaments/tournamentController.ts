import SpotifyAuthMiddleware from '../spotify/auth/spotifyAuthMiddleware';
import TournamentService from './tournamentService';
import { Express, Request, Response } from 'express';
import SpotifyAlbumService from '../albums/spotifyAlbumService';
import { validate } from 'class-validator';
import { TournamentCreationDTO, TournamentEditDTO, TournamentRoundEditDTO } from './types';
import { plainToInstance } from 'class-transformer';
import { TournamentRound } from '../generated/prisma';
import { AlbumLimitError } from './errors';

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
        app.get('/api/tournaments', 
            this.spotifyAuthMiddleware.runMiddleware.bind(this.spotifyAuthMiddleware), 
            this.getTournamentsByLoggedInUser.bind(this)
        );

        app.get('/api/tournaments/:tournamentId', 
            this.spotifyAuthMiddleware.runMiddleware.bind(this.spotifyAuthMiddleware), 
            this.getTournamentById.bind(this)
        );

        app.delete('/api/tournaments/:tournamentId',
            this.spotifyAuthMiddleware.runMiddleware.bind(this.spotifyAuthMiddleware),
            this.deleteTournamentById.bind(this)
        );

        app.post('/api/tournaments', 
            this.spotifyAuthMiddleware.runMiddleware.bind(this.spotifyAuthMiddleware), 
            this.createTournamentForLoggedInUser.bind(this)
        );

        app.patch('/api/tournaments/:tournamentId', 
            this.spotifyAuthMiddleware.runMiddleware.bind(this.spotifyAuthMiddleware), 
            this.editTournamentOfLoggedInUser.bind(this)
        );

        app.put('/api/tournaments/rounds/:tournamentRoundId',
            this.spotifyAuthMiddleware.runMiddleware.bind(this.spotifyAuthMiddleware),
            this.updateTournamentRound.bind(this)
        );
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

    private async deleteTournamentById(req: Request, res: Response) {
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
            const deletedTournament = await this.tournamentService.deleteTournamentById(tournamentId);
            res.status(200).json(deletedTournament);
        }
        catch(err) {
            console.error(err);
            res.status(500).json({ message: 'Unexpected error while deleting tournament' });
        }
    }

    private async createTournamentForLoggedInUser(req: Request, res: Response) {
        const user = req.user!;

        const tournamentCreationDTOBody = req.body;
        const tournamentCreationDTO = plainToInstance(TournamentCreationDTO, tournamentCreationDTOBody);

        const validationErrors = await validate(tournamentCreationDTO);

        if(validationErrors.length > 0) {
            res.status(400).json({ message: 'Invalid tournament creation data', errors: validationErrors });
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
            if(err instanceof AlbumLimitError) {
                res.status(400).json({ message: err.message, maxLimit: err.getMaxLimit() });
                return;
            }

            console.error(err);
            res.status(500).json({ message: 'Unexpected error while creating tournament' });
        }
    }

    private async editTournamentOfLoggedInUser(req: Request, res: Response) {
        const user = req.user!;

        const tournamentEditDTOBody = req.body;
        const tournamentEditDTO = plainToInstance(TournamentEditDTO, tournamentEditDTOBody);

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

        const validationErrors = await validate(tournamentEditDTO, {
            skipMissingProperties: true,
            whitelist: true
        });

        if(validationErrors.length > 0) {
            res.status(400).json({ message: 'Invalid tournament edit data', errors: validationErrors });
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

    public async updateTournamentRound(req: Request, res: Response) {
        const user = req.user!;

        const { tournamentRoundId } = req.params;

        const tournamentRoundEditDTOBody = req.body;
        const tournamentRoundEditDTO = plainToInstance(TournamentRoundEditDTO, tournamentRoundEditDTOBody);

        const validationErrors = await validate(tournamentRoundEditDTO, {
            skipMissingProperties: true,
            whitelist: true
        });

        if(validationErrors.length > 0) {
            res.status(400).json({ message: 'Invalid tournament round edit data', errors: validationErrors });
            return;
        }
        
        const nextRoundId = parseInt(tournamentRoundId, 10);

        if(isNaN(nextRoundId)) {
            res.status(400).json({ message: 'Invalid tournament round ID' });
            return;
        }

        const tournamentRound = await this.tournamentService.getTournamentRoundById(nextRoundId);

        if(!tournamentRound) {
            res.status(404).json({ message: 'Tournament round not found' });
            return;
        }
        else if(tournamentRound.tournament.user.id !== user.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        else if(tournamentRound.previousRounds.length === 0 && !tournamentRoundEditDTO.winnerId) {
            res.status(400).json({ message: 'Cannot clear a leaf node round' });
            return;
        }
        
        let winningRound;

        if(!tournamentRoundEditDTO.winnerId) {
            winningRound = null;
        }
        else {
            winningRound = tournamentRound.previousRounds.find(round => round.id === tournamentRoundEditDTO.winnerId);

            if(!winningRound) {
                res.status(404).json({ message: 'Winning round not found in previous rounds' });
                return;
            }
        }

        try {
            const updatedTournamentRound = await this.tournamentService.setTournamentRoundWinner(tournamentRound, winningRound as TournamentRound | undefined);
            res.status(200).json(updatedTournamentRound);
        }
        catch(err) {
            console.error(err);
            res.status(500).json({ message: 'Unexpected error while setting tournament round winner' });
        }
    }
}