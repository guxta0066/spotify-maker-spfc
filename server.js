const playlistResponse = await axios.post(
    `https://api.spotify.com/v1/users/${userId}/playlists`,
    {
        name: finalPlaylistName,
        public: false,
        description: `Playlist gerada automaticamente para o artista ${artistName}.`
    },
    {
        headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    }
);
