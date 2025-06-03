import { TournamentRound } from '../generated/prisma';

export type TournamentRoundTreeNode = TournamentRound & {
    previousRounds: TournamentRoundTreeNode[];
};

export interface TournamentCreationDTO {
    name: string;
    albumCount: number;
}

export interface TournamentEditDTO {
    name?: string;
}