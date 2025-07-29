// C:\Users\Guilherme\bot-whatsapp\games\Poker\pokerAI.js (VERSÃO FINAL)

const chipManager = require('../../economy/chipManager');
const evaluator = require('poker-evaluator');

const BOT_ID = 'bot@cpu.bot';
const BOT_NAME = 'BOT Dealer';

function getPreFlopHandCategory(hand) {
    const ranks = '23456789TJQKA', r1 = hand[0][0], r2 = hand[1][0];
    const isSuited = hand[0][1] === hand[1][1], isPair = r1 === r2;
    const highCard = ranks.indexOf(r1) > ranks.indexOf(r2) ? r1 : r2;
    const lowCard = ranks.indexOf(r1) > ranks.indexOf(r2) ? r2 : r1;
    let handKey = highCard + lowCard;
    if (!isPair) handKey += isSuited ? 's' : 'o';
    const PREMIUM_HANDS = ['AA', 'KK', 'QQ', 'JJ', 'AKs'];
    const STRONG_HANDS = ['TT', 'AQs', 'AJs', 'KQs', 'AKo'];
    const SPECULATIVE_HANDS = ['99', '88', '77', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'KJs', 'KTs', 'QJs', 'QTs', 'JTs', 'T9s', '98s', '87s', '76s'];
    const MARGINAL_HANDS = ['66', '55', '44', '33', '22', 'A9o', 'KJo', 'QJo'];
    if (PREMIUM_HANDS.includes(handKey)) return 'MUITO_FORTE';
    if (STRONG_HANDS.includes(handKey)) return 'FORTE';
    if (SPECULATIVE_HANDS.includes(handKey)) return 'MEDIA';
    if (MARGINAL_HANDS.includes(handKey)) return 'FRACA';
    return 'MUITO_FRACA';
}

function getPostFlopHandStrength(botHand, board) {
    const result = evaluator.evalHand([...botHand, ...board]);
    // Sequência de poker: Royal Flush > Straight Flush > 4 of a Kind > Full House > Flush > Straight
    if (result.value > 6604) return { name: result.handName, strength: 'MUITO_FORTE' }; // Flush ou melhor
    if (result.value > 3218) return { name: result.handName, strength: 'FORTE' };     // Two Pair, 3 of a Kind, Straight
    if (result.value > 1609) return { name: result.handName, strength: 'MEDIA' };     // One Pair
    return { name: result.handName, strength: 'FRACA' };                              // High Card
}

function definirPerfilFinanceiro(session) {
    const botStack = chipManager.getPlayerChips(BOT_ID);
    const bigBlind = session.gameState.bigBlindValue;
    if (!bigBlind || bigBlind === 0) return 'DEFAULT';
    const stackInBBs = botStack / bigBlind;
    if (stackInBBs < 30) return 'CONSERVADOR';
    if (stackInBBs > 120) return 'AGRESSIVO';
    return 'DEFAULT';
}

function calculateBetSize(session, profile, handStrength, isRaise = false) {
    const { pote, apostaAtual, bigBlindValue } = session.gameState;
    const botStack = chipManager.getPlayerChips(BOT_ID);
    let betAmount;

    if (isRaise) {
        const raiseMultiplier = profile === 'AGRESSIVO' ? 3 : 2.5;
        betAmount = apostaAtual * raiseMultiplier;
    } else {
        let potPercentage = profile === 'AGRESSIVO' ? 0.75 : (profile === 'CONSERVADOR' ? 0.5 : 0.65);
        if (handStrength === 'MEDIA') potPercentage = 0.4; // Blefes são menores
        betAmount = pote * potPercentage;
    }
    const finalBet = Math.max(bigBlindValue, Math.round(betAmount / 10) * 10);
    return Math.min(botStack, finalBet);
}

// A nova decideAction que retorna um COMANDO DE TEXTO
// C:\Users\Guilherme\bot-whatsapp\games\Poker\botPlayer.js

// ... (todo o código anterior como getPreFlopHandCategory, etc. permanece o mesmo)

// A nova decideAction que retorna um COMANDO DE TEXTO
function decideAction(session) {
    const gameState = session.gameState;
    const botStack = chipManager.getPlayerChips(BOT_ID);
    const perfil = definirPerfilFinanceiro(session);
    const handInfo = (gameState.etapa === 'pre-flop') 
        ? { strength: getPreFlopHandCategory(gameState.maosPrivadas[BOT_ID]) }
        : getPostFlopHandStrength(gameState.maosPrivadas[BOT_ID], gameState.mesa);

    const apostaRodadaBot = gameState.apostasRodada[BOT_ID] || 0;
    const isFacingBet = gameState.apostaAtual > apostaRodadaBot;
    const amountToCall = gameState.apostaAtual - apostaRodadaBot;

    let command = '!correr';
    let amount = 0;

    // --- NOVA LÓGICA DE DECISÃO ---

    // 1. O bot pode cobrir a aposta?
    if (isFacingBet && botStack <= amountToCall) {
        // Se não pode cobrir, as únicas opções são all-in (pagando o que resta) ou desistir.
        const odds = 0.2; // Chance de 20% de pagar com mão FORTE (não MUITO_FORTE)
        if (handInfo.strength === 'MUITO_FORTE' || (handInfo.strength === 'FORTE' && Math.random() < odds)) {
            command = '!allin'; // O handler de allin cuidará do resto.
        } else {
            command = '!correr';
        }
    } else {
        // Se PODE cobrir a aposta, usa a lógica antiga.
        if (handInfo.strength === 'MUITO_FORTE') {
            command = isFacingBet ? '!aumentar' : '!apostar';
        } else if (handInfo.strength === 'FORTE') {
            if (isFacingBet) {
                command = '!pagar';
                amount = amountToCall; // ADICIONE ESTA LINHA
            } else {
                command = '!apostar';
            }
        } else if (handInfo.strength === 'MEDIA') {
            command = isFacingBet ? '!correr' : '!mesa';
            // Lógica de blefe simples
            if (!isFacingBet && perfil !== 'CONSERVADOR' && Math.random() < 0.15) {
                command = '!apostar';
            }
        } else { // FRACA ou MUITO_FRACA
            command = isFacingBet ? '!correr' : '!mesa';
        }
    }

    // 2. Se a decisão for apostar ou aumentar, calcula o valor.
    if (command === '!apostar' || command === '!aumentar') {
        const isRaise = command === '!aumentar';
        amount = calculateBetSize(session, perfil, handInfo.strength, isRaise);

        // Se o valor calculado for todo o stack do bot, a ação correta é !allin
        if (amount >= botStack) {
            command = '!allin';
            amount = 0; // O comando !allin não precisa de valor.
        }
    }
    
    // 3. Validação final para não dar !mesa enfrentando aposta
    if (command === '!mesa' && isFacingBet) {
        command = '!correr';
    }

    const finalCommand = amount > 0 ? `${command} ${amount}` : command;
    console.log(`[pokerAI] Perfil: ${perfil} | Força: ${handInfo.strength} | Stack: ${botStack} -> Decisão: ${finalCommand}`);
    return finalCommand;
}


module.exports = {
    createBotPlayer: () => ({ id: BOT_ID, name: BOT_NAME }),
    decideAction,
    BOT_ID
};