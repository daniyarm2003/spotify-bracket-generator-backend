import SpotifyAlbumService from '../albums/spotifyAlbumService';
import { Prisma, PrismaClient, Tournament, TournamentRound, User } from '../generated/prisma';
import { RandomAlbumSelectionStrategy } from './albumSelectionStrategy';
import BracketGenerationStrategy, { RandomBracketGenerationStrategy } from './bracketGenerationStrategy';
import { AlbumLimitError } from './errors';
import { TournamentCreationDTO, TournamentEditDTO, TournamentRoundEditDTO, TournamentRoundTreeNode, TournamentRoundTreeNodeComplex } from './types';

export default class TournamentService {
    private readonly prismaClient: PrismaClient;
    private readonly spotifyAlbumService: SpotifyAlbumService;

    public constructor(prismaClient: PrismaClient, spotifyAlbumService: SpotifyAlbumService) {
        this.prismaClient = prismaClient;
        this.spotifyAlbumService = spotifyAlbumService;
    }

    public async getTournamentById(id: string) {
        const tournament = await this.prismaClient.tournament.findUnique({
            where: {
                id
            },
            include: {
                user: true
            }
        });

        return tournament;
    }

    public async getTournamentRoundById(id: number) {
        const tournamentRound = await this.prismaClient.tournamentRound.findUnique({
            where: {
                id
            },
            include: {
                tournament: {
                    include: {
                        user: true
                    }
                },
                previousRounds: true
            }
        });

        return tournamentRound;
    }

    public async getTournamentsByUser(user: User) {
        const tournaments = await this.prismaClient.tournament.findMany({
            where: {
                user
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        return tournaments;
    }

    private async getTournamentSubTree(tournamentRound: TournamentRoundTreeNodeComplex): Promise<TournamentRoundTreeNodeComplex> {
        const subRounds = await this.prismaClient.tournamentRound.findMany({
            where: {
                nextRoundId: tournamentRound.id
            },
            include: {
                album: true
            },
            orderBy: {
                id: 'asc'
            }
        }) as unknown as TournamentRoundTreeNodeComplex[];

        // This approach avoids overflowing the connection pool
        let subTrees: TournamentRoundTreeNodeComplex[] = [];
        for (const subRound of subRounds) {
            subTrees.push(await this.getTournamentSubTree(subRound));
        }

        return {
            ...tournamentRound,
            previousRounds: subTrees
        };
    }

    public async getTournamentBracket(tournament: Tournament) {
        const finalRound = await this.prismaClient.tournamentRound.findFirst({
            where: {
                tournament,
                nextRound: null
            },
            include: {
                album: true
            }
        }) as unknown as TournamentRoundTreeNodeComplex;

        if(!finalRound) {
            return null;
        }

        return await this.getTournamentSubTree(finalRound);
    }

    private async createCurrentLevelRounds(generationStrategy: BracketGenerationStrategy, tournament: Tournament, firstRounds: TournamentRound[]) {
        let currentRounds: TournamentRound[] = firstRounds;
        let nextRounds: Prisma.TournamentRoundCreateArgs[] = [];
        let leftoverRound: TournamentRound | null = null;

        // Continue processing rounds until there are no more rounds left
        while (currentRounds.length > 0) {
            // Process pairs of rounds or handle the leftover round
            while (currentRounds.length > 1 || (currentRounds.length === 1 && leftoverRound)) {
                let bracket1: TournamentRound;
                let bracket2: TournamentRound;

                if (leftoverRound) {
                    // Use the leftover round as the first bracket
                    bracket1 = leftoverRound;

                    // Randomly select the second bracket from the current rounds
                    const bracket2Index = Math.floor(Math.random() * currentRounds.length);
                    bracket2 = currentRounds.splice(bracket2Index, 1)[0];

                    // Clear the leftover round
                    leftoverRound = null;
                } else {
                    // Use the generation strategy to create a matchup
                    [bracket1, bracket2] = await generationStrategy.createMatchup(currentRounds);

                    // Remove the selected brackets from the current rounds
                    currentRounds = currentRounds.filter(round => round.id !== bracket1.id && round.id !== bracket2.id);
                }

                // Prepare the new bracket to be created in the next round
                const newBracket: Prisma.TournamentRoundCreateArgs = {
                    data: {
                        previousRounds: {
                            connect: [
                                { id: bracket1.id },
                                { id: bracket2.id }
                            ]
                        },
                        tournament: {
                            connect: { id: tournament.id }
                        }
                    }
                };

                nextRounds.push(newBracket);
            }

            // If there's one round left, save it as the leftover round for the next iteration
            if (currentRounds.length === 1) {
                leftoverRound = currentRounds[0];
            }

            // Create the next level of rounds in the database
            currentRounds = await this.prismaClient.$transaction(nextRounds.map(round => {
                return this.prismaClient.tournamentRound.create(round);
            }));

            // Clear the next rounds for the next iteration
            nextRounds = [];
        }
    }

    public async createTournament(user: User, { name, albumCount }: TournamentCreationDTO) {
        const albumSelectionStrategy = new RandomAlbumSelectionStrategy();
        const generationStrategy = new RandomBracketGenerationStrategy();

        const userAlbums = await this.spotifyAlbumService.getUserSavedAlbums(user);

        if (userAlbums.length < albumCount) {
            throw new AlbumLimitError(`Not enough albums saved by user. Required: ${albumCount}, Available: ${userAlbums.length}`, albumCount);
        }
        else if(albumCount > albumSelectionStrategy.getMaximumAlbumLimit()) {
            throw new AlbumLimitError(`Album count exceeds the maximum limit of ${albumSelectionStrategy.getMaximumAlbumLimit()}`, 
                albumSelectionStrategy.getMaximumAlbumLimit());
        }

        const shuffledAlbums = await albumSelectionStrategy.selectAlbums(userAlbums, albumCount);

        const tournament = await this.prismaClient.tournament.create({
            data: {
                name,
                user: {
                    connect: { id: user.id }
                }
            }
        });

        const firstRounds = shuffledAlbums.map((album) => ({
            album: {
                connect: { id: album.id }
            },
            tournament: {
                connect: { id: tournament.id }
            }
        }));

        const savedFirstRounds = await this.prismaClient.$transaction(firstRounds.map(round => {
            return this.prismaClient.tournamentRound.create({
                data: round
            });
        }));

        await this.createCurrentLevelRounds(generationStrategy, tournament, savedFirstRounds);

        return this.prismaClient.tournament.findUnique({
            where: {
                id: tournament.id
            },
        });
    }

    public async editTournamentById(tournamentId: string, editDTO: TournamentEditDTO) {
        return this.prismaClient.tournament.update({
            where: {
                id: tournamentId
            },
            data: editDTO
        });
    }

    public async setTournamentRoundWinner(nextRound: TournamentRound, winningRound?: TournamentRound) {
        // Perform a transaction to update the tournament round tree
        const updatedRoundTree = await this.prismaClient.$transaction(async (tx) => {
            let lastUpdatedRound: TournamentRound | null = null;
            let roundToUpdate: TournamentRound | null = nextRound;

            // Flag to determine whether to update the current round
            let updateCurrent = true;

            // Traverse and update the rounds until there are no more rounds to update
            while(roundToUpdate && (roundToUpdate.albumId || updateCurrent)) {
                updateCurrent = false;

                // Update the current round with the winning album
                const updatedRound = await tx.tournamentRound.update({
                    where: {
                        id: roundToUpdate.id
                    },
                    data: {
                        albumId: winningRound?.albumId ?? null
                    },
                    include: {
                        album: true,
                        nextRound: true
                    }
                });

                // Keep track of the last updated round
                lastUpdatedRound = updatedRound as unknown as TournamentRound;

                // Move to the next round in the tree
                roundToUpdate = updatedRound.nextRound as unknown as TournamentRound;
            }

            // Return the last updated round
            return lastUpdatedRound;
        });

        // Retrieve and return the updated tournament round tree
        return this.getTournamentSubTree(updatedRoundTree as unknown as TournamentRoundTreeNodeComplex);
    }
}