// C:\Users\Guilherme\bot-whatsapp\economy\chipManager.js

// Usaremos um objeto simples em memória para armazenar as fichas dos jogadores.
// Em um futuro com persistência, isso seria substituído por um banco de dados.
const playerChips = {};

/**
 * Inicializa ou redefine as fichas de um jogador.
 * @param {string} playerId - O ID do WhatsApp do jogador.
 * @param {number} initialAmount - A quantidade inicial de fichas.
 */
function initializePlayerChips(playerId, initialAmount) {
    if (typeof initialAmount !== 'number' || initialAmount < 0) {
        console.warn(`[ChipManager] Tentativa de inicializar ${playerId} com quantia inválida: ${initialAmount}`);
        playerChips[playerId] = 0; // Garante que a quantia seja pelo menos 0
        return;
    }
    playerChips[playerId] = initialAmount;
    console.log(`[ChipManager] Fichas de ${playerId.split('@')[0]} inicializadas para ${initialAmount}.`);
}

/**
 * Adiciona fichas ao saldo de um jogador.
 * @param {string} playerId - O ID do WhatsApp do jogador.
 * @param {number} amount - A quantidade de fichas a ser adicionada.
 * @returns {boolean} - true se a operação foi bem-sucedida, false caso contrário.
 */
function addChips(playerId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
        console.warn(`[ChipManager] Tentativa de adicionar quantia inválida para ${playerId}: ${amount}`);
        return false;
    }
    if (playerChips[playerId] === undefined) {
        console.warn(`[ChipManager] Jogador ${playerId.split('@')[0]} não possui fichas inicializadas.`);
        return false;
    }
    playerChips[playerId] += amount;
    console.log(`[ChipManager] ${amount} fichas adicionadas a ${playerId.split('@')[0]}. Novo saldo: ${playerChips[playerId]}.`);
    return true;
}

/**
 * Deduz (remove) fichas do saldo de um jogador.
 * Renomeado de 'removeChips' para 'deductChips' para maior clareza e consistência.
 * @param {string} playerId - O ID do WhatsApp do jogador.
 * @param {number} amount - A quantidade de fichas a ser deduzida.
 * @returns {boolean} - true se a operação foi bem-sucedida e o jogador tinha fichas suficientes, false caso contrário.
 */
function deductChips(playerId, amount) { // <-- AQUI: NOME DA FUNÇÃO MUDOU
    if (typeof amount !== 'number' || amount <= 0) {
        console.warn(`[ChipManager] Tentativa de deduzir quantia inválida para ${playerId}: ${amount}`);
        return false;
    }
    if (playerChips[playerId] === undefined || playerChips[playerId] < amount) {
        console.warn(`[ChipManager] Jogador ${playerId.split('@')[0]} (${playerChips[playerId] || 0} fichas) não tem fichas suficientes para deduzir ${amount}.`);
        return false;
    }
    playerChips[playerId] -= amount;
    console.log(`[ChipManager] ${amount} fichas deduzidas de ${playerId.split('@')[0]}. Novo saldo: ${playerChips[playerId]}.`);
    return true;
}

/**
 * Transfere fichas de um jogador para outro.
 * @param {string} fromPlayerId - O ID do WhatsApp do jogador de origem.
 * @param {string} toPlayerId - O ID do WhatsApp do jogador de destino.
 * @param {number} amount - A quantidade de fichas a ser transferida.
 * @returns {boolean} - true se a transferência foi bem-sucedida, false caso contrário.
 */
function transferChips(fromPlayerId, toPlayerId, amount) {
    if (fromPlayerId === toPlayerId) {
        console.warn(`[ChipManager] Tentativa de transferir fichas para o mesmo jogador: ${fromPlayerId}.`);
        return false;
    }
    // Usa deductChips aqui
    if (deductChips(fromPlayerId, amount)) { 
        if (addChips(toPlayerId, amount)) {
            console.log(`[ChipManager] ${amount} fichas transferidas de ${fromPlayerId.split('@')[0]} para ${toPlayerId.split('@')[0]}.`);
            return true;
        } else {
            // Rollback: se adicionar falhar, devolve as fichas ao remetente
            addChips(fromPlayerId, amount);
            console.error(`[ChipManager] Falha ao adicionar fichas a ${toPlayerId.split('@')[0]}. Transferência revertida.`);
            return false;
        }
    }
    return false; // deductChips falhou
}

/**
 * Obtém o saldo de fichas de um jogador.
 * @param {string} playerId - O ID do WhatsApp do jogador.
 * @returns {number} - O saldo de fichas do jogador, ou 0 se não inicializado.
 */
function getPlayerChips(playerId) {
    return playerChips[playerId] || 0;
}

/**
 * Remove um jogador do gerenciador de fichas (útil ao final de um jogo ou quando o jogador sai).
 * @param {string} playerId - O ID do WhatsApp do jogador.
 */
function removePlayer(playerId) {
    if (playerChips[playerId] !== undefined) {
        delete playerChips[playerId];
        console.log(`[ChipManager] Fichas de ${playerId.split('@')[0]} removidas.`);
    }
}

// Para testes e depuração, permite ver todos os saldos (não para uso em produção)
function getAllChipBalances() {
    return { ...playerChips }; // Retorna uma cópia para evitar modificações externas
}

module.exports = {
    initializePlayerChips,
    addChips,
    deductChips, // <-- AQUI: AGORA EXPORTA 'deductChips'
    transferChips,
    getPlayerChips,
    removePlayer,
    getAllChipBalances 
};
