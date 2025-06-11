export class AlbumLimitError extends Error {
    private readonly maxLimit: number;

    constructor(message: string, maxLimit: number) {
        super(message);

        this.name = 'AlbumLimitError';
        this.maxLimit = maxLimit;
    }

    public getMaxLimit(): number {
        return this.maxLimit;
    }
}