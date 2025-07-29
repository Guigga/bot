// games/Xadrez/botPlayer.js

// Agora precisamos do chess.js aqui para encontrar os movimentos válidos.
const { Chess } = require('chess.js');

const BOT_ID = 'BOT_XADREZ_ID@c.us';
const BOT_NAME = 'BOT Aleatório'; // Nome mais apropriado agora :)

/**
 * Cria um objeto representando o jogador BOT.
 * @returns {{id: string, name: string}}
 */
function createBotPlayer() {
    return {
        id: BOT_ID,
        name: BOT_NAME,
    };
}

/**
 * Escolhe uma jogada válida aleatória.
 * @param {string} fen - A representação FEN do estado atual do tabuleiro.
 * @returns {string|null} Uma jogada válida aleatória ou null se não houver jogadas.
 */
function getBotMove(fen) {
    // Carrega o estado do jogo a partir da FEN
    const game = new Chess(fen);

    // Pega a lista de todos os movimentos possíveis
    const possibleMoves = game.moves();

    // Se não houver movimentos (xeque-mate ou empate), retorna nulo.
    if (possibleMoves.length === 0) {
        return null;
    }

    // Escolhe um índice aleatório da lista de movimentos
    const randomIndex = Math.floor(Math.random() * possibleMoves.length);
    
    // Retorna o movimento escolhido
    const randomMove = possibleMoves[randomIndex];

    console.log(`[Bot Aleatório] Escolheu a jogada "${randomMove}" de ${possibleMoves.length} opções.`);
    
    return randomMove;
}

module.exports = {
    createBotPlayer,
    getBotMove,
    BOT_ID,
    BOT_NAME,
};