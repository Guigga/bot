// games/Uno/botPlayer.js

const BOT_ID = 'bot_uno@cpu.bot';
const BOT_NAME = 'BOT Unildo';

/**
 * Cria um objeto de jogador para o bot.
 */
function createBotPlayer() {
    console.log(`[UnoBot] Criando jogador bot: ${BOT_NAME}`);
    return { id: BOT_ID, name: BOT_NAME };
}

function decideAction(gameState, maoDoBot) {
    const { cartaAtual, corAtual, efeitoAcumulado } = gameState;

    // --- LÓGICA DE PRIORIDADE: Responder a um efeito acumulado ---
    if (efeitoAcumulado.quantidade > 0) {
        const cartaParaRebaterIndex = maoDoBot.findIndex(c => c.valor === efeitoAcumulado.tipo);

        if (cartaParaRebaterIndex !== -1) {
            // Encontrou uma carta para rebater o efeito!
            const numeroCarta = cartaParaRebaterIndex + 1;
            let comando = `!jogar ${numeroCarta}`;
            
            // Se a carta de resposta for um coringa, escolhe uma cor aleatória
            if (maoDoBot[cartaParaRebaterIndex].cor === 'preto') {
                 const cores = ['vermelho', 'amarelo', 'verde', 'azul'];
                 const corAleatoria = cores[Math.floor(Math.random() * cores.length)];
                 comando += ` ${corAleatoria}`;
            }
            console.log(`[UnoBot] Rebatendo com ${efeitoAcumulado.tipo}! Decisão: ${comando}`);
            return comando;

        } else {
            // Não tem como rebater, a única decisão é comprar.
            console.log(`[UnoBot] Não pode rebater ${efeitoAcumulado.tipo}. Decisão: !comprar`);
            return '!comprar';
        }
    }
    // --- FIM DA LÓGICA DE PRIORIDADE ---

    // A lógica de jogada normal só executa se não houver efeito acumulado.
    const jogadasPossiveis = [];
    maoDoBot.forEach((carta, index) => {
        const podeJogar = (
            carta.cor === 'preto' ||
            carta.cor === corAtual ||
            carta.valor === cartaAtual.valor
        );
        
        if (podeJogar) {
            if (carta.cor === 'preto') {
                const cores = ['vermelho', 'amarelo', 'verde', 'azul'];
                const corAleatoria = cores[Math.floor(Math.random() * cores.length)];
                jogadasPossiveis.push(`!jogar ${index + 1} ${corAleatoria}`);
            } else {
                jogadasPossiveis.push(`!jogar ${index + 1}`);
            }
        }
    });

    if (jogadasPossiveis.length > 0) {
        const jogadaAleatoria = jogadasPossiveis[Math.floor(Math.random() * jogadasPossiveis.length)];
        console.log(`[UnoBot] Decisão do bot: ${jogadaAleatoria}`);
        return jogadaAleatoria;
    }

    console.log('[UnoBot] Decisão do bot: !comprar');
    return '!comprar';
}

module.exports = { createBotPlayer, decideAction, BOT_ID, BOT_NAME };