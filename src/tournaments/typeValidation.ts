import { TournamentCreationDTO, TournamentEditDTO } from './types';

export function isTournamentCreationDTO(obj: any): obj is TournamentCreationDTO {
    if(!obj || typeof obj !== 'object') {
        return false;
    }

    const albumCount = parseInt(obj.albumCount);

    return (
        typeof obj.name === 'string' &&
        obj.name.trim() !== '' &&
        !isNaN(albumCount)
    );
}

export function isTournamentEditDTO(obj: any): obj is TournamentEditDTO {
    if(!obj || typeof obj !== 'object') {
        return false;
    }

    return obj.name === undefined || (typeof obj.name === 'string' && obj.name.trim() !== '');
}