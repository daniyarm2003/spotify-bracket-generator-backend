import { Prisma, PrismaClient, Tournament, TournamentRound, User } from '../generated/prisma';
import { TournamentCreationDTO, TournamentRoundTreeNode } from './types';

export default class TournamentService {
    private readonly prismaClient: PrismaClient;

    public constructor(prismaClient: PrismaClient) {
        this.prismaClient = prismaClient;
    }

    public async getTournamentsByUser(user: User) {
        const tournaments = await this.prismaClient.tournament.findMany({
            where: {
                user
            },
            include: {
                rounds: {
                    where: {
                        nextRound: null
                    },
                    take: 1
                }
            }
        });

        return tournaments;
    }

    private async getTournamentSubTree(tournamentRound: TournamentRoundTreeNode): Promise<TournamentRoundTreeNode> {
        const subRounds = await this.prismaClient.tournamentRound.findMany({
            where: {
                nextRoundId: tournamentRound.id
            }
        }) as TournamentRoundTreeNode[];

        // This approach avoids overflowing the connection pool
        let subTrees: TournamentRoundTreeNode[] = [];
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
            }
        }) as TournamentRoundTreeNode;

        if(!finalRound) {
            return null;
        }

        return await this.getTournamentSubTree(finalRound);
    }

    public async createTournament({ user, name }: TournamentCreationDTO) {
        
    }
}