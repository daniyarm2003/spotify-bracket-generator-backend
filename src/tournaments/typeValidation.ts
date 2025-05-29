import { TournamentCreationDTO } from './types';

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