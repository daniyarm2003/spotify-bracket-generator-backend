import { TournamentRound, User } from '../generated/prisma';

export type TournamentRoundTreeNode = TournamentRound & {
    previousRounds: TournamentRoundTreeNode[];
};

export interface TournamentCreationDTO {
    user: User;
    name: string;
}