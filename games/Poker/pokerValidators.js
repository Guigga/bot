// C:\Users\Guilherme\bot-whatsapp\games\Poker\pokerValidators.js

/**
 * Verifica se um jogo está iniciado na sessão.
 * @param {object} session - O objeto de sessão do jogo.
 * @returns {boolean} True se o jogo está iniciado, false caso contrário.
 */
function isGameStarted(session) {
    return session.gameState?.iniciou === true;
}

/**
 * Verifica se um jogador está participando do jogo na sessão.
 * Agora verifica se o ID do jogador existe dentro dos objetos do array 'players'.
 * @param {object} session - O objeto de sessão do jogo.
 * @param {string} playerId - O ID do WhatsApp do jogador.
 * @returns {boolean} True se o jogador está na sessão, false caso contrário.
 */
function isPlayerInGame(session, playerId) {
    // Procura por um objeto no array players cujo 'id' corresponda ao playerId
    return session && session.players && session.players.some(p => p.id === playerId);
}

/**
 * Verifica se é a vez de um jogador agir na rodada atual.
 * @param {object} session - O objeto de sessão do jogo.
 * @param {string} playerId - O ID do WhatsApp do jogador.
 * @returns {boolean} True se é a vez do jogador, false caso contrário.
 */
function isPlayersTurn(session, playerId) {
    // Certifique-se de que o gameState e ativos existem antes de acessar
    if (!session || !session.gameState || !session.gameState.ativos || session.gameState.ativos.length === 0) {
        return false;
    }
    const currentPlayerId = session.gameState.ativos[session.gameState.currentPlayerIndex];
    return playerId === currentPlayerId;
}

/**
 * Verifica se um jogador está ativo na rodada atual (não desistiu).
 * @param {object} session - O objeto de sessão do jogo.
 * @param {string} playerId - O ID do WhatsApp do jogador.
 * @returns {boolean} True se o jogador está ativo, false caso contrário.
 */
function isPlayerActiveInRound(session, playerId) {
    // Certifique-se de que o gameState e ativos existem antes de acessar
    if (!session || !session.gameState || !session.gameState.ativos) {
        return false;
    }
    return session.gameState.ativos.includes(playerId);
}

/**
 * Retorna o nome formatado de um jogador, buscando na sessão.
 * @param {string} playerId - O ID do jogador.
 * @param {object} session - O objeto de sessão do jogo para buscar o nome do jogador.
 * @returns {string} O nome do jogador ou uma versão formatada do ID se o nome não for encontrado.
 */
function getFormattedId(playerId, session) {
    if (!playerId) return 'N/A';
    
    // Tenta encontrar o jogador na lista de jogadores da sessão para obter o nome
    const playerInSession = session?.players?.find(p => p.id === playerId);
    
    // Se encontrou o jogador na sessão e ele tem um nome, retorna o nome.
    if (playerInSession && playerInSession.name) {
        return playerInSession.name;
    }
    
    // Fallback: retorna a parte numérica do ID se o nome não for encontrado na sessão
    return playerId.split('@')[0];
}

module.exports = {
    isGameStarted,
    isPlayerInGame,
    isPlayersTurn,
    isPlayerActiveInRound,
    getFormattedId
};