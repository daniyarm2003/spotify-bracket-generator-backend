import { IsNumber, IsOptional, IsString, Length } from 'class-validator';
import { SpotifyAlbum, TournamentRound } from '../generated/prisma';

export type TournamentRoundTreeNode = TournamentRound & {
    previousRounds: TournamentRoundTreeNode[];
};

export type TournamentRoundTreeNodeComplex = Omit<TournamentRound, 'albumId'> & {
    album?: SpotifyAlbum;
    previousRounds: TournamentRoundTreeNodeComplex[];
}

export class TournamentCreationDTO {
    @IsString({
        message: 'Tournament name must be a string'
    })
    @Length(1, 32, {
        message: 'Tournament name must be between 1 and 32 characters long'
    })
    name: string;

    @IsNumber({}, {
        message: 'Album count must be a number'
    })
    albumCount: number;
}

export class TournamentEditDTO {
    @IsString({
        message: 'Tournament name must be a string'
    })
    @Length(1, 32, {
        message: 'Tournament name must be between 1 and 32 characters long'
    })
    name?: string;
}

export class TournamentRoundEditDTO {
    @IsOptional()
    @IsNumber({}, {
        message: 'Tournament round ID must be a number'
    })
    winnerId?: number;
}