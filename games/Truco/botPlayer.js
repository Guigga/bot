// C:\Users\Guilherme\bot-whatsapp\games\Truco\botPlayer.js

const BOT_ID = 'bot_truco@cpu.bot';
const BOT_NAME = 'BOT Zé da Roça';

/**
 * Cria um objeto de jogador para o bot.
 * @returns {{id: string, name: string}}
 */
function createBotPlayer() {
    console.log(`[TrucoBot] Criando jogador bot: ${BOT_NAME}`);
    return { id: BOT_ID, name: BOT_NAME };
}

function decideAction(session) {
    const gameState = session.gameState;
    
    // --- Lógica de Resposta ao Truco (Prioridade 1) ---
    const botIndex = gameState.jogadores.findIndex(p => p.id === BOT_ID);
    
    // Se o bot não estiver no jogo por algum motivo, não faz nada.
    if (botIndex === -1) {
        return null; 
    }
    
    // Descobre a qual time o bot pertence ('time1' ou 'time2')
    const botTeam = (botIndex % 2 === 0) ? 'time1' : 'time2';

    // Verifica se o jogo está aguardando uma resposta e se é do time do bot
    if (gameState.status === 'aguardando_resposta_truco' && gameState.trucoState.pendingResponseFrom === botTeam) {
        // Lógica simples: se o bot não tiver manilhas, ele corre. Senão, aceita.
        const botHand = gameState.jogadores[botIndex].mao;
        const hasManilha = botHand.some(carta => carta && carta[0] === gameState.manilhaValor);

        if (hasManilha) {
            console.log(`[TrucoBot] Bot do time ${botTeam} foi desafiado, TEM MANILHA e vai aceitar.`);
            return '!aceitar';
        } else {
            console.log(`[TrucoBot] Bot do time ${botTeam} foi desafiado, NÃO TEM MANILHA e vai correr.`);
            return '!correr';
        }
    }

    // --- Lógica de Jogar Carta (Prioridade 2) ---
    const jogadorDaVez = gameState.jogadores[gameState.vezDoJogador];

    // Verifica se é a vez do bot jogar uma carta
    if (!jogadorDaVez || jogadorDaVez.id !== BOT_ID) {
        return null; // Se não for a vez do bot, ele não faz nada.
    }

    // Se for a vez dele, encontra a primeira carta disponível na mão
    const indexCartaParaJogar = jogadorDaVez.mao.findIndex(carta => carta !== null);
    
    if (indexCartaParaJogar !== -1) {
        // Se encontrou uma carta, monta o comando com o número correto (índice + 1)
        const command = `!carta ${indexCartaParaJogar + 1}`;
        console.log(`[TrucoBot] Decisão do bot: ${command}`);
        return command;
    } else {
        // Caso raro onde é a vez do bot mas ele não tem mais cartas
        console.error(`[TrucoBot] É a vez do bot (${jogadorDaVez.name}), mas ele não tem cartas na mão.`);
        return null;
    }
}

module.exports = {
    createBotPlayer,
    decideAction,
    BOT_ID
};
