// server.js
require('dotenv').config(); 
const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');

// Variáveis de Ambiente (Serão lidas do .env local ou do Render)
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
// A URL agora é a TEMPORÁRIA/REAL do Render
const REDIRECT_URI = process.env.REDIRECT_URI; 

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    console.error("ERRO: CLIENT_ID, CLIENT_SECRET e REDIRECT_URI devem ser definidos no arquivo .env.");
    process.exit(1);
}

const app = express();
const port = process.env.PORT || 8888; 

app.use(express.static('public')) 
   .use(cookieParser())
   .use(express.json()); 

// Função utilitária para gerar um estado aleatório (segurança CSRF)
const generateRandomString = (length) => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// Rota para a página inicial
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// ---------------------------------
// 1. Rota de Login (Inicia o fluxo OAuth)
// ---------------------------------
app.get('/login', (req, res) => {
    const state = generateRandomString(16);
    // O cookie deve ser seguro, mas para o Render, httpOnly já ajuda
    res.cookie('spotify_auth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    // Scopes necessários: criar playlists e ler dados do usuário
    const scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private user-library-read';

    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: CLIENT_ID,
            scope: scope,
            redirect_uri: REDIRECT_URI,
            state: state
        }));
});

// ---------------------------------
// 2. Rota de Callback (Recebe o código e troca por tokens)
// ---------------------------------
app.get('/callback', async (req, res) => {
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies.spotify_auth_state : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' + querystring.stringify({ error: 'state_mismatch' }));
    } else {
        res.clearCookie('spotify_auth_state');
        
        try {
            const response = await axios({
                method: 'post',
                url: 'https://accounts.spotify.com/api/token',
                data: querystring.stringify({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: REDIRECT_URI
                }),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
                }
            });

            const { access_token, refresh_token } = response.data;
            
            // Redireciona para o frontend, passando os tokens na URL hash
            res.redirect('/#' + querystring.stringify({
                access_token: access_token,
                refresh_token: refresh_token
            }));

        } catch (error) {
            console.error('Erro ao obter tokens:', error.response ? error.response.data : error.message);
            res.redirect('/#' + querystring.stringify({ error: 'invalid_token' }));
        }
    }
});

// ---------------------------------
// 3. Rota de API para Pesquisar Artista e Músicas
// ---------------------------------
app.post('/api/search-artist', async (req, res) => {
    const { artistName, accessToken } = req.body;

    if (!accessToken || !artistName) {
        return res.status(400).json({ error: 'Token de acesso e nome do artista são necessários.' });
    }

    try {
        // 1. Buscar o Artista mais relevante
        const artistSearchResponse = await axios.get('https://api.spotify.com/v1/search', {
            params: { q: artistName, type: 'artist', limit: 1 },
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const artist = artistSearchResponse.data.artists.items[0];
        if (!artist) {
             return res.status(404).json({ error: 'Artista não encontrado.' });
        }
        
        // 2. Buscar as músicas mais populares do artista
        const topTracksResponse = await axios.get(`https://api.spotify.com/v1/artists/${artist.id}/top-tracks?country=BR&limit=50`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        // 3. Buscar as Playlists do Usuário
        const userPlaylistsResponse = await axios.get('https://api.spotify.com/v1/me/playlists?limit=50', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        res.json({
            artist: {
                id: artist.id,
                name: artist.name,
                image: artist.images.length > 0 ? artist.images[0].url : null,
                followers: artist.followers.total
            },
            tracks: topTracksResponse.data.tracks,
            playlists: userPlaylistsResponse.data.items
        });

    } catch (error) {
        console.error('Erro na pesquisa do artista:', error.response ? error.response.data : error.message);
        res.status(error.response ? error.response.status : 500).json({ 
            error: 'Falha ao buscar dados do Spotify.', 
            details: error.response ? error.response.data : 'Erro interno.'
        });
    }
});


// ---------------------------------
// 4. Rota de API para Criar Playlist
// ---------------------------------
app.post('/api/create-playlist', async (req, res) => {
    const { accessToken, artistName, trackUris, playlistOption, targetPlaylistId } = req.body;

    if (!accessToken || !trackUris || trackUris.length === 0) {
        return res.status(400).json({ error: 'Dados incompletos para criar/adicionar playlist.' });
    }

    try {
        let playlistId;
        
        // 1. Obter o ID do usuário
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const userId = userResponse.data.id;

        // 2. Criar nova playlist OU usar playlist existente
        if (playlistOption === 'new') {
            const playlistName = `SPFC - Músicas de ${artistName}`;
            const playlistResponse = await axios.post(`http://googleusercontent.com/spotify.com/8{userId}/playlists`, {
                name: playlistName,
                public: false, // Criar como privada por padrão
                description: `Playlist gerada automaticamente para o artista ${artistName} via App SPFC.`
            }, {
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            playlistId = playlistResponse.data.id;
        } else if (playlistOption === 'existing' && targetPlaylistId) {
            playlistId = targetPlaylistId;
        } else {
            return res.status(400).json({ error: 'Opção de playlist inválida.' });
        }

        // 3. Adicionar as faixas (músicas) à playlist
        await axios.post(`http://googleusercontent.com/spotify.com/9{playlistId}/tracks`, {
            uris: trackUris 
        }, {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        res.json({ message: 'Playlist criada/atualizada com sucesso!', playlistId: playlistId });

    } catch (error) {
        console.error('Erro ao criar/adicionar playlist:', error.response ? error.response.data : error.message);
        res.status(error.response ? error.response.status : 500).json({ 
            error: 'Falha ao criar ou adicionar músicas à playlist.', 
            details: error.response ? error.response.data : 'Erro interno.'
        });
    }
});


app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});