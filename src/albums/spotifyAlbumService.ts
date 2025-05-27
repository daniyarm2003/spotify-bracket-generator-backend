import { PrismaClient, SpotifyAlbum, User } from '../generated/prisma';
import SpotifyApiService from '../spotify/spotifyApiService';

export default class SpotifyAlbumService {
    private readonly prismaClient: PrismaClient;
    private readonly spotifyApiService: SpotifyApiService;

    public constructor(prismaClient: PrismaClient, spotifyApiService: SpotifyApiService) {
        this.prismaClient = prismaClient;
        this.spotifyApiService = spotifyApiService;
    }

    public async updateUserSavedAlbums(user: User, bearerToken: string, albumFetchLimit?: number) {
        let savedAlbums = await this.spotifyApiService.getAllCurrentUserSavedAlbums(bearerToken, albumFetchLimit);
        savedAlbums = savedAlbums.filter(album => album.album_type === 'album');

        const { savedAlbums: updatedSavedAlbums } = await this.prismaClient.user.update({
            where: {
                id: user.id
            },
            data: {
                savedAlbums: {
                    connectOrCreate: savedAlbums.map(album => ({
                        where: {
                            spotifyId: album.id
                        },
                        create: {
                            spotifyId: album.id,
                            name: album.name,
                            artistName: album.artists[0]?.name ?? 'Unknown Artist',
                            imageUrl: album.images[0]?.url
                        }
                    }))
                }
            },
            include: {
                savedAlbums: true
            }
        });

        return updatedSavedAlbums;
    }

    public async getUserSavedAlbums(user: User) {
        const savedAlbums = await this.prismaClient.spotifyAlbum.findMany({
            where: {
                savingUsers: {
                    some: {
                        id: user.id
                    }
                }
            }
        });

        return savedAlbums;
    }

}