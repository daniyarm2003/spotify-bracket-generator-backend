import { SpotifyAlbum, TournamentRound } from '../generated/prisma';

export type TournamentRoundTreeNode = TournamentRound & {
    previousRounds: TournamentRoundTreeNode[];
};

export type TournamentRoundTreeNodeComplex = Omit<TournamentRound, 'albumId'> & {
    album?: SpotifyAlbum;
    previousRounds: TournamentRoundTreeNodeComplex[];
}

export interface TournamentCreationDTO {
    name: string;
    albumCount: number;
}

export interface TournamentEditDTO {
    name?: string;
}