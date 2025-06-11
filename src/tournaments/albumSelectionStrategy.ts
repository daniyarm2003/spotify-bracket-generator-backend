import { SpotifyAlbum } from '../generated/prisma';

export default interface AlbumSelectionStrategy {
    selectAlbums(userAlbums: SpotifyAlbum[], count: number): Promise<SpotifyAlbum[]>;
    getMaximumAlbumLimit(): number;
}

export class RandomAlbumSelectionStrategy implements AlbumSelectionStrategy {
    public async selectAlbums(userAlbums: SpotifyAlbum[], count: number) {
        const shuffled = userAlbums.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    public getMaximumAlbumLimit() {
        return Infinity;
    }
}

export class AIAlbumSelectionStrategy implements AlbumSelectionStrategy {
    public static readonly MAX_ALBUM_LIMIT = 128;

    private readonly sizeFilterSelectionStrategy;
    private readonly prompt: string;

    public constructor(prompt: string) {
        this.sizeFilterSelectionStrategy = new RandomAlbumSelectionStrategy();
        this.prompt = prompt;
    }

    public async selectAlbums(userAlbums: SpotifyAlbum[], count: number): Promise<SpotifyAlbum[]> {
        const filteredUserAlbums = await this.sizeFilterSelectionStrategy.selectAlbums(userAlbums, 2 * AIAlbumSelectionStrategy.MAX_ALBUM_LIMIT);

        throw new Error('Method not implemented.');
    }

    public getMaximumAlbumLimit() {
        return AIAlbumSelectionStrategy.MAX_ALBUM_LIMIT;
    }
}