export interface SpotifyUserProfileFragment {
    id: string;
    email: string;
    display_name: string;
}

interface SpotifyAlbumImage {
    url: string;
    width: number;
    height: number;
}

interface SpotifyAlbumArtistFragment {
    id: string;
    name: string;
}

export interface SpotifyAlbumFragment {
    id: string;
    name: string;
    album_type: 'album' | 'single' | 'compilation';
    total_tracks: number;
    images: SpotifyAlbumImage[];
    artists: SpotifyAlbumArtistFragment[];
}

export interface SpotifySavedAlbumResponse {
    total: number;
    offset: number;
    limit: number;
    href: string;
    previous: string;
    next?: string;
    items: {
        added_at: string;
        album: SpotifyAlbumFragment;
    }[];
}