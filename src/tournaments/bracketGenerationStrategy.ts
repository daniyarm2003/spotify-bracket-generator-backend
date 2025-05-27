import { TournamentRound } from '../generated/prisma';

export default interface BracketGenerationStrategy {
    createMatchup(subBrackets: TournamentRound[]): Promise<TournamentRound[]>;
}

export class RandomBracketGenerationStrategy implements BracketGenerationStrategy {
    public async createMatchup(subBrackets: TournamentRound[]) {
        if(subBrackets.length < 2) {
            throw new Error('Not enough sub-brackets to create a matchup');
        }

        const bracketIndex1 = Math.floor(Math.random() * subBrackets.length);
        const bracket1 = subBrackets[bracketIndex1];

        const remainingBrackets = subBrackets.filter(bracket => bracket.id !== bracket1.id);

        const bracketIndex2 = Math.floor(Math.random() * remainingBrackets.length);
        const bracket2 = remainingBrackets.splice(bracketIndex2, 1)[0];

        return [ bracket1, bracket2 ];
    }
}