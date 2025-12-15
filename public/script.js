// script.js - CÓDIGO FINAL E MAIS ROBUSTO (NOMES LIMPOS)

// Variáveis de estado global
let accessToken = null;
let refreshToken = null; // NOVO: Para renovar o Access Token
let currentArtistId = null; 
let artistName = null;
let currentSearchQuery = ''; 
let excludedArtistIds = []; 
const BASE_URL = window.location.origin;

// Elementos DOM (MANTIDOS)
const loginScreen = document.getElementById('login-screen');
// ... (restante dos elementos DOM) ...
const logoutBtn = document.getElementById('logout-btn'); // Botão de Logout

// Função para formatar números (MANTIDA)
const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// ---------------------------------
// Ações de Interface e Estado (MANTIDAS)
// ---------------------------------
const applyTheme = (theme) => {
    // ... (código mantido) ...
};

themeToggle.addEventListener('change', () => {
    // ... (código mantido) ...
});

const savedTheme = localStorage.getItem('theme') || 'light';
themeToggle.checked = savedTheme === 'light';
applyTheme(savedTheme);


playlistDestinationSelect.addEventListener('change', (e) => {
    // ... (código mantido) ...
});

const checkCreationButtonState = () => {
    // ... (código mantido) ...
};

existingPlaylistSelect.addEventListener('change', checkCreationButtonState);
newPlaylistNameInput.addEventListener('input', checkCreationButtonState);


// ---------------------------------
// Funções de Autenticação (MANTIDAS)
// ---------------------------------
const getTokensFromHash = () => {
    // ... (código mantido) ...
};

const logout = () => {
    // ... (código mantido) ...
};

const initAuth = () => {
    // ... (código mantido) ...
};


// ---------------------------------
// Funções de API Spotify (MANTIDAS)
// ---------------------------------

const fetchUserProfile = async (token) => {
    // ... (código mantido) ...
};

// -----------------------------------------------------
// FUNÇÕES DE PESQUISA 
// -----------------------------------------------------

// Funcao Auxiliar para renovar o token (MANTIDA)
const renewAccessToken = async () => {
    // ... (código mantido) ...
};


// 1. Inicia a busca (MANTIDA)
const searchArtist = async () => {
    // ... (código mantido) ...
};

// 2. Lógica central de busca e filtragem (MANTIDA)
const performArtistSearch = async (query, excludedIds) => {
    // ... (código mantido) ...
};

// 3. Busca as músicas e playlists (LIMPEZA DO NOME SUGERIDO)
const fetchTracksAndPlaylists = async () => {
    try {
        const response = await fetch(`${BASE_URL}/api/search-artist-details`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                artistId: currentArtistId,
                accessToken: accessToken,
                artistName: artistName
            })
        });

        if (!response.ok) {
            // Tenta renovar o token se for erro de autenticação (401)
            if (response.status === 401 && refreshToken && await renewAccessToken()) {
                // Tenta a busca novamente após a renovação
                return await fetchTracksAndPlaylists();
            }
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro desconhecido ao obter detalhes.');
        }

        const data = await response.json();

        // 1. Preencher lista de playlists (opções)
        populatePlaylistSelect(data.playlists);

        // 2. Preencher lista de músicas (com checkbox)
        populateTracksList(data.tracks);
        
        // --- LÓGICA DE SUGESTÃO DE NOME ---
        const suggestedName = `Playlist de ${artistName}`; // NOME LIMPO
        
        playlistNameSuggestion.querySelector('.suggestion-name').textContent = `"${suggestedName}"`;
        playlistNameSuggestion.classList.remove('hidden');
        
        playlistNameSuggestion.dataset.suggestedName = suggestedName;
        
        if (playlistDestinationSelect.value === 'new') {
            newPlaylistNameContainer.classList.remove('hidden');
        }
        // --- FIM LÓGICA DE SUGESTÃO DE NOME ---

        playlistCreatorSection.classList.remove('hidden');
        searchStatus.className = 'status-message success-message';
        searchStatus.textContent = `Artista ${artistName} confirmado. Músicas e participações listadas abaixo.`;

    } catch (error) {
        console.error('Erro nos detalhes do artista:', error);
        searchStatus.className = 'status-message error-message';
        searchStatus.textContent = error.message || 'Erro ao buscar detalhes do artista.';
    }
}

// Função para preencher o SELECT de playlists existentes (MANTIDA)
const populatePlaylistSelect = (playlists) => {
    // ... (código mantido) ...
};

// public/script.js - Função Atualizada para mostrar todas as informações (MANTIDA)
const populateTracksList = (tracks) => {
    // ... (código mantido) ...
};

// ---------------------------------
// Funções de Criação de Playlist (MANTIDAS)
// ---------------------------------

const createPlaylist = async () => {
    // ... (código mantido) ...
};

// ---------------------------------
// Adicionar Listeners e Inicializar (MANTIDOS)
// ---------------------------------

document.addEventListener('DOMContentLoaded', initAuth);
searchButton.addEventListener('click', searchArtist);
artistSearchInput.addEventListener('keypress', (e) => {
    // ... (código mantido) ...
});
createPlaylistBtn.addEventListener('click', createPlaylist);
logoutBtn.addEventListener('click', logout);
playlistNameSuggestion.addEventListener('click', () => {
    // ... (código mantido) ...
});
confirmArtistBtn.addEventListener('click', async () => {
    // ... (código mantido) ...
});
refineSearchBtn.addEventListener('click', async () => {
    // ... (código mantido) ...
});