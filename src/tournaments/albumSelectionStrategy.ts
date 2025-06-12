import GenAIService, { GenAIChatService } from '../genai/genAIService';
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
    public static readonly MAX_ALBUM_LIMIT = 32;

    private readonly sizeFilterSelectionStrategy;

    private readonly aiService: GenAIService;
    private readonly prompt: string;

    public constructor(aiService: GenAIService, prompt: string) {
        this.sizeFilterSelectionStrategy = new RandomAlbumSelectionStrategy();

        this.aiService = aiService;
        this.prompt = prompt;
    }

    private getAlbumSelectionPrompt(albums: SpotifyAlbum[], albumSelectionCount: number) {
        const dataDescription = 'You are given the following list of albums, each one having a UUID, artist name, and album name in that order: \n\n';
        const albumListText = albums.map((album) => `ID: ${album.id}, Artist: "${album.artistName}", Name: "${album.name}"`).join('\n') + '\n\n';

        const instruction = `You must select ${albumSelectionCount} albums from the list of albums, and output the UUIDs of the ` +
            `selected albums as a JSON array of strings. Do not add any explanations, markdown, or additional text, simply write the JSON array. ` +
            `The albums that you select must adhere to the following rules: \n\n`;

        const rules = [
            `You must select ${albumSelectionCount} album IDs from the list, no more, no less, even if the below rules must be broken to do so.`,
            `The albums you select must try to adhere to the constraint: "${this.prompt}", if there are not enough albums that fit this constraint, ` +
                `pick random ones to reach the correct amount, and if the constraint does not make sense, simply ignore it.`
        ];

        const ruleText = rules.map((item, index) => `${index + 1}. ${item}`).join('\n');

        return dataDescription + albumListText + instruction + ruleText;
    }

    public async selectAlbums(userAlbums: SpotifyAlbum[], count: number): Promise<SpotifyAlbum[]> {
        const filteredUserAlbums = await this.sizeFilterSelectionStrategy.selectAlbums(userAlbums, 4 * AIAlbumSelectionStrategy.MAX_ALBUM_LIMIT);
        const chatService = await this.aiService.createChat();

        let prompt = this.getAlbumSelectionPrompt(filteredUserAlbums, count);
        let curCount = count;

        let selectedAlbums: SpotifyAlbum[] = [];

        for(let i = 0; i < 3; i++) {
            let chatResponse: string;

            try {
                chatResponse = await chatService.sendMessageSimple(prompt);
            }
            catch(err) {
                console.error(err);
                continue;
            }

            const trimmedResponse = chatResponse.trim();

            const arrayBegin = trimmedResponse.indexOf('[');
            const arrayEnd = trimmedResponse.lastIndexOf(']');

            const responseArrayStr = trimmedResponse.slice(arrayBegin, arrayEnd + 1);

            let albumIDArray: string[];

            try {
                albumIDArray = JSON.parse(responseArrayStr);

                if(!Array.isArray(albumIDArray)) {
                    throw new Error(`Data is not an array: ${albumIDArray}`);
                }

                for(const id of albumIDArray) {
                    if(typeof(id) !== 'string' || id?.length !== 36) {
                        throw new Error(`Not a UUID: ${id}`);
                    }
                }
            }
            catch(err) {
                console.error(err);

                prompt = 'Your response was not a JSON array of string UUIDs, please try again. Remember, no explanations or markdown.';
                continue;
            }

            const returnedAlbums = albumIDArray.map((id) => filteredUserAlbums.find((album) => album.id === id)).filter((album) => album !== undefined);

            if(returnedAlbums.length !== curCount) {
                console.warn(`The AI returned the wrong count (expected: ${curCount}, actual: ${albumIDArray.length})`);
                prompt = `The array does not have ${curCount} items, please try again. Remember, no explanations or markdown.`;

                const missingAlbums = curCount - albumIDArray.length;

                if(missingAlbums > 0) {
                    prompt = this.getAlbumSelectionPrompt(filteredUserAlbums, missingAlbums) + '\n\nDo not pick albums you have already selected.';
                    curCount = missingAlbums;

                    selectedAlbums = [ ...selectedAlbums, ...returnedAlbums ];
                }

                continue;
            }

            return [ ...selectedAlbums, ...returnedAlbums ];
        }

        console.warn('AI album selection failed, resorting to fallback.');
        return await this.sizeFilterSelectionStrategy.selectAlbums(userAlbums, count);
    }

    public getMaximumAlbumLimit() {
        return AIAlbumSelectionStrategy.MAX_ALBUM_LIMIT;
    }
}