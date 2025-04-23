import axios, { Axios } from 'axios';
import { SpotifyAlbumFragment, SpotifySavedAlbumResponse, SpotifyUserProfileFragment } from './types';

export default class SpotifyApiService {
    private spotifyApiClient: Axios;

    public constructor() {
        this.spotifyApiClient = axios.create({
            baseURL: 'https://api.spotify.com'
        });
    }

    public async getCurrentUserProfile(bearerToken: string) {
        const profileRes = await this.spotifyApiClient.get('/v1/me', {
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Accept': 'application/json'
            }
        });
        
        return profileRes.data as SpotifyUserProfileFragment;
    }

    public async getCurrentUserSavedAlbums(bearerToken: string, offset = 0, limit = 50) {
        if(!isFinite(offset) || offset < 0) {
            throw new Error(`Offset must be non negative, is currently ${offset}`);
        }

        else if(!isFinite(limit) || limit < 1 || limit > 50) {
            throw new Error(`Limit must be between 1 and 50 inclusive, is currently ${limit}`);
        }

        const albumsRes = await this.spotifyApiClient.get('/v1/me/albums', {
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Accept': 'application/json'
            },
            params: {
                limit,
                offset
            }
        });

        return albumsRes.data as SpotifySavedAlbumResponse;
    }

    public async getNextCurrentUserSavedAlbums(bearerToken: string, prevResponse: SpotifySavedAlbumResponse) {
        if(!prevResponse.next) {
            throw new Error('Next page of albums does not exist');
        }

        const albumsRes = await axios.get(prevResponse.next, {
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Accept': 'application/json'
            }
        });

        return albumsRes.data as SpotifySavedAlbumResponse;
    }

    public async getAllCurrentUserSavedAlbums(bearerToken: string, limit = Infinity) {
        const albums: SpotifyAlbumFragment[] = [];
        let prevResponse: SpotifySavedAlbumResponse | null = null;

        while((!prevResponse || prevResponse.next) && albums.length < limit) {
            if(!prevResponse) {
                prevResponse = await this.getCurrentUserSavedAlbums(bearerToken);
            }
            else {
                prevResponse = await this.getNextCurrentUserSavedAlbums(bearerToken, prevResponse);
            }

            for(const item of prevResponse.items) {
                albums.push(item.album);
            }
        }

        return albums;
    }
}