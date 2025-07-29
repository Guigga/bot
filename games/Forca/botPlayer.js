// games/Forca/botPlayer.js

const BOT_ID = 'bot_forca@cpu.bot';
const BOT_NAME = 'BOT Palpiteiro';

/**
 * Cria um objeto de jogador para o bot.
 */
function createBotPlayer() {
    console.log(`[ForcaBot] Criando jogador bot: ${BOT_NAME}`);
    return { id: BOT_ID, name: BOT_NAME };
}

/**
 * O bot decide sua próxima ação: chutar uma letra aleatória que ainda não foi tentada.
 * @param {object} gameState - O estado atual do jogo.
 * @returns {string|null} O comando da jogada (ex: "!letra A") ou null se não houver mais letras.
 */
function decideAction(gameState) {
    const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const letrasTentadas = gameState.letrasTentadas || [];

    // Filtra o alfabeto para obter apenas as letras que ainda não foram usadas
    const letrasDisponiveis = alfabeto.filter(letra => !letrasTentadas.includes(letra));

    if (letrasDisponiveis.length === 0) {
        return null; // Não há mais letras para chutar
    }

    // Escolhe uma letra aleatória da lista de disponíveis
    const letraAleatoria = letrasDisponiveis[Math.floor(Math.random() * letrasDisponiveis.length)];
    
    const command = `!letra ${letraAleatoria}`;
    console.log(`[ForcaBot] Decisão do bot: ${command}`);
    return command;
}

module.exports = { createBotPlayer, decideAction, BOT_ID };