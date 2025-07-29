// sessions/sessionManager.js

const sessions = {};
const playerSessionMap = {};

/**
 * Cria uma nova sessão para um grupo/chat.
 * @param {string} groupId - O ID do chat (m.key.remoteJid).
 * @param {string} game - O tipo de sessão (ex: 'confirmacao-limpeza').
 * @param {string} creatorId - O ID do usuário que iniciou a sessão.
 * @returns {object} A sessão criada.
 */
function createSession(groupId, game, creatorId) {
    if (!sessions[groupId]) {
        sessions[groupId] = {
            groupId: groupId,
            creatorId: creatorId,
            game: game,
            players: [], // Mantido para possível uso futuro
            gameState: null,
        };
        console.log(`Sessão '${game}' criada para o grupo: ${groupId} por ${creatorId}`);
    }
    return sessions[groupId];
}

/**
 * Obtém a sessão ativa de um grupo/chat.
 * @param {string} groupId - O ID do chat.
 * @returns {object|undefined} A sessão, se existir.
 */
function getSession(groupId) {
    return sessions[groupId];
}

/**
 * Encerra uma sessão e limpa os dados associados.
 * @param {string} groupId - O ID do chat.
 * @returns {boolean} True se a sessão foi encerrada, false caso contrário.
 */
function endSession(groupId) {
    const session = sessions[groupId];
    if (session) {
        // Lógica simplificada: se houver jogadores mapeados na sessão, desmapeia eles.
        // Isso é útil caso você adicione no futuro uma funcionalidade que popule o array 'players'.
        if (Array.isArray(session.players) && session.players.length > 0) {
            const playerIds = session.players.map(p => p.id);
            unmapPlayersInGroup(playerIds);
        }
        
        // Remove a sessão principal.
        delete sessions[groupId];
        console.log(`Sessão encerrada para o grupo: ${groupId}`);
        return true;
    }
    return false;
}

/**
 * Mapeia um jogador a um grupo para encontrar sua sessão ativa.
 * @param {string} playerId - ID do jogador.
 * @param {string} groupId - ID do grupo/chat.
 */
function mapPlayerToGroup(playerId, groupId) {
    playerSessionMap[playerId] = groupId;
    console.log(`[Player Map] Jogador ${playerId.split('@')[0]} mapeado para o grupo ${groupId}`);
}

/**
 * Encontra o ID do grupo em que um jogador está ativo.
 * @param {string} playerId - ID do jogador.
 * @returns {string|null} O ID do grupo ou null se não for encontrado.
 */
function getGroupFromPlayer(playerId) {
    return playerSessionMap[playerId] || null;
}

/**
 * Remove o mapeamento de um grupo para uma lista de jogadores.
 * @param {string[]} playerIds - Array de IDs de jogadores.
 */
function unmapPlayersInGroup(playerIds) {
    if (!playerIds || playerIds.length === 0) return;
    playerIds.forEach(pId => {
        if (playerSessionMap[pId]) {
            delete playerSessionMap[pId];
            console.log(`[Player Map] Jogador ${pId.split('@')[0]} desmapeado.`);
        }
    });
}

// Exporta apenas as funções necessárias para o Finanzap.
module.exports = {
    createSession,
    getSession,
    endSession,
    mapPlayerToGroup,
    getGroupFromPlayer,
    unmapPlayersInGroup,
};