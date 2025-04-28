import { PrismaClient } from '../generated/prisma';
import { SpotifyUserProfileFragment } from '../spotify/types';

export default class UserService {
    private readonly prismaClient: PrismaClient;

    public constructor(prismaClient: PrismaClient) {
        this.prismaClient = prismaClient;
    }

    public async getUserBySpotifyId(id: string) {
        return await this.prismaClient.user.findUnique({
            where: {
                spotifyId: id
            }
        });
    }

    public async addUserWithSpotifyProfile(profile: SpotifyUserProfileFragment) {
        return await this.prismaClient.user.create({
            data: {
                spotifyId: profile.id,
                email: profile.email,
                name: profile.display_name
            }
        });
    }
}