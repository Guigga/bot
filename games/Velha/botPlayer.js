// games/Velha/botPlayer.js

const BOT_ID = 'bot_velha@cpu.bot';
const BOT_NAME = 'BOT Velhaco';

/**
 * Cria um objeto de jogador para o bot.
 */
function createBotPlayer() {
    console.log(`[VelhaBot] Criando jogador bot: ${BOT_NAME}`);
    return { id: BOT_ID, name: BOT_NAME };
}

/**
 * Decide a próxima jogada do bot.
 * @param {object} session - A sessão atual do jogo.
 * @returns {string|null} O comando da jogada (ex: "!j a1") ou null se não houver jogada.
 */
function decideAction(session) {
    const { historicoDeJogadas } = session.gameState;
    const todasPosicoes = ['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'c1', 'c2', 'c3'];

    // Cria um Set com as posições já ocupadas para uma verificação rápida
    const posicoesOcupadas = new Set(historicoDeJogadas.map(j => j.posicao));

    // Filtra para encontrar todas as posições livres
    let posicoesLivres = todasPosicoes.filter(p => !posicoesOcupadas.has(p));

    // Lógica para o modo infinito: se não há casas livres, a casa mais antiga fica livre
    if (posicoesLivres.length === 0 && historicoDeJogadas.length >= 9) {
        posicoesLivres.push(historicoDeJogadas[0].posicao);
    }

    // Se existem posições livres, escolhe uma aleatoriamente
    if (posicoesLivres.length > 0) {
        const jogadaAleatoria = posicoesLivres[Math.floor(Math.random() * posicoesLivres.length)];
        const command = `!j ${jogadaAleatoria}`;
        console.log(`[VelhaBot] Decisão do bot: ${command}`);
        return command;
    }

    return null; // Caso não haja jogadas possíveis
}

module.exports = { createBotPlayer, decideAction, BOT_ID };