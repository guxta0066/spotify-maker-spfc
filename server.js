// server.js - CÓDIGO FINAL COM FAIL-SAFE DE TOKEN (NOMES LIMPOS)

// ... (código mantido até o bloco 6) ...

// ---------------------------------
// 6. Rota de API para Criar Playlist (CORRIGIDA: ENDPOINT ROBUSTO E TRATAMENTO DE ERRO)
// ---------------------------------
app.post('/api/create-playlist', async (req, res) => {
    // NOVO: Adicionado newPlaylistName
    const { accessToken, artistName, trackUris, playlistOption, targetPlaylistId, newPlaylistName } = req.body; 

    if (!accessToken || !trackUris || trackUris.length === 0) {
        return res.status(400).json({ error: 'Dados incompletos para criar/adicionar playlist.' });
    }

    let userId;

    // 1. Obter o ID do usuário (COM TRY/CATCH DE FAIL-SAFE CONTRA 500)
    try {
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        userId = userResponse.data.id;
    } catch (tokenError) {
        // Se falhar ao obter o ID do usuário, o token está ruim (401)
        console.error('Falha ao obter ID do usuário (Token expirado/inválido):', tokenError.message);
        // Retorna 401 para que o frontend lide com a renovação/novo login
        return res.status(401).json({
            error: 'Sessão expirada. Seu token não é mais válido.',
            details: 'Por favor, saia da conta e faça login novamente para renovar sua sessão.'
        });
    }
    

    try {
        let playlistId;

        // 2. Criar nova playlist OU usar playlist existente
        if (playlistOption === 'new') {
            // Usa o nome enviado pelo frontend, ou um fallback se estiver vazio
            const finalPlaylistName = newPlaylistName || `Músicas de ${artistName}`; 
            
            try { // <--- TRY/CATCH PARA ISOLAR A CRIAÇÃO DE PLAYLIST
                const playlistResponse = await axios.post(
    `https://api.spotify.com/v1/users/${userId}/playlists`, // CORRIGIDO
    {
        name: finalPlaylistName,
        public: false,
        // Texto limpo:
        description: `Playlist gerada automaticamente para o artista ${artistName} via Playlist Studio.`
    },
    {
        headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    }
);

playlistId = playlistResponse.data.id;

            } catch (createError) {
                // Se a criação falhar, pare a execução e retorne o erro real
                console.error('Erro ao criar nova playlist:', createError.response ? createError.response.data : createError.message);
                const spotifyError = createError.response ? createError.response.data.error : { status: 500, message: 'Erro desconhecido.' };
                
                throw new Error(`Falha ao criar nova playlist. Status: ${spotifyError.status}. Verifique as permissões do seu token.`);
            }

        } else if (playlistOption === 'existing' && targetPlaylistId) {
            playlistId = targetPlaylistId;
        } else {
            return res.status(400).json({ error: 'Opção de playlist inválida.' });
        }

        // 3. Adicionar as faixas (músicas) à playlist (LÓGICA DE LOTES)
        const batchSize = 100; // Máximo permitido pelo Spotify para POST /tracks
        const totalTracks = trackUris.length;
        
        // NOVO: ENDPOINT ROBUSTO PARA ADIÇÃO DE FAIXAS
        const addTracksUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

        for (let i = 0; i < totalTracks; i += batchSize) {
            const batchUris = trackUris.slice(i, i + batchSize);
            
            // O corpo da requisição precisa ser JSON
            const body = { uris: batchUris };
            
            try {
                await axios.post(addTracksUrl, body, {
                    headers: { 
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                // Se a adição falhar em qualquer lote, pare e retorne o erro real do Spotify
                console.error(`Erro ao adicionar lote ${i / batchSize + 1} de músicas à playlist:`, error.response ? error.response.data : error.message);
                
                // Lança um erro detalhado para o catch externo
                const spotifyError = error.response ? error.response.data.error : { status: 500, message: 'Erro desconhecido ao adicionar faixas.' };
                
                throw new Error(`Falha ao adicionar músicas (Lote ${i / batchSize + 1}). Status: ${spotifyError.status}. Verifique se você tem permissão total para editar esta playlist.`);
            }
            
            // Pequeno delay entre lotes para evitar 429
            await new Promise(resolve => setTimeout(resolve, 50)); 
        }

        // Se chegar até aqui, é sucesso
 res.json({ message: 'Playlist criada/atualizada com sucesso!', playlistId: playlistId });

    } catch (error) {
        console.error('Erro fatal ao criar/adicionar playlist:', error.message);
        
        // Se o erro foi lançado dos blocos try/catch internos, usa a mensagem detalhada.
        const errorMessage = error.message.startsWith('Falha ao adicionar músicas') || error.message.startsWith('Falha ao criar nova playlist')
            ? error.message 
            : 'Falha grave e inesperada ao criar/adicionar playlist. Verifique o console do servidor para mais detalhes.';
            
        res.status(error.response ? error.response.status : 500).json({ 
            error: errorMessage, 
            details: error.response ? error.response.data : 'Erro interno.'
        });
    }
});


app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});