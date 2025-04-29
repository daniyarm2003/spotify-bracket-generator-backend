import { randomBytes } from 'crypto';
import qs from 'qs';
import axios, { Axios } from 'axios';
import SpotifyAuthController from './spotifyAuthController';
import SpotifyApiService from '../spotifyApiService';
import UserService from '../../users/userService';
import { SpotifyUserProfileFragment } from '../types';
import SpotifyAlbumService from '../../albums/spotifyAlbumService';

export interface SpotifyTokenResponse {
    access_token: string;
    expires_in: number;
}

export default class SpotifyAuthService {
    private static readonly SPOTIFY_ACCOUNTS_BASE_URL = 'https://accounts.spotify.com';
    private static readonly OAUTH_STATE_BYTES = 16;

    private static readonly ALBUM_FETCH_MAX_LIMIT = 100;
    private static readonly ALBUM_LOGIN_FETCH_MAX_LIMIT = 20;

    private readonly backendBaseUrl: string;
    private readonly redirectUri: string;

    private readonly clientId: string;

    private readonly authClient: Axios;

    private readonly userService: UserService;
    private readonly albumService: SpotifyAlbumService;

    public constructor(userService: UserService, albumService: SpotifyAlbumService, clientId: string, clientSecret: string, backendBaseUrl: string) {
        this.clientId = clientId;
        this.backendBaseUrl = backendBaseUrl;
        this.redirectUri = this.backendBaseUrl + SpotifyAuthController.AUTH_CALLBACK_ROUTE_NAME;

        const authString = Buffer.from(`${this.clientId}:${clientSecret}`).toString('base64');

        this.authClient = axios.create({
            baseURL: SpotifyAuthService.SPOTIFY_ACCOUNTS_BASE_URL,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${authString}`,
                'Accept': 'application/json'
            }
        });

        this.userService = userService;
        this.albumService = albumService;
    }

    public generateOAuthState() {
        return randomBytes(SpotifyAuthService.OAUTH_STATE_BYTES).toString('hex');
    }

    public getSpotifyRedirectURL(state: string, scopes: string[]) {
        return SpotifyAuthService.SPOTIFY_ACCOUNTS_BASE_URL + '/authorize?' + qs.stringify({
            response_type: 'code',
            client_id: this.clientId,
            scope: scopes.join(' '),
            redirect_uri: this.redirectUri,
            state
        });
    }

    public async getSpotifyBearerToken(code: string) {
        const tokenRes = await this.authClient.post('/api/token', qs.stringify({
            code,
            redirect_uri: this.redirectUri,
            grant_type: 'authorization_code'
        }));

        return tokenRes.data as SpotifyTokenResponse;
    }

    public async onUserSignIn(bearerToken: string, spotifyProfile: SpotifyUserProfileFragment) {
        let user = await this.userService.getUserBySpotifyId(spotifyProfile.id);

        if(!user) {
            user = await this.userService.addUserWithSpotifyProfile(spotifyProfile);
            console.log(`User with email ${user.email} has signed in for the first time!`);

            await this.albumService.updateUserSavedAlbums(user, bearerToken, SpotifyAuthService.ALBUM_FETCH_MAX_LIMIT);
        }
        else {
            await this.albumService.updateUserSavedAlbums(user, bearerToken, SpotifyAuthService.ALBUM_LOGIN_FETCH_MAX_LIMIT);
        }
    }
}