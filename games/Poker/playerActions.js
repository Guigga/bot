// games/Poker/playerActions.js

const poker = require('./poker');
const sessionManager = require('../../sessions/sessionManager');
const pokerValidators = require('./pokerValidators');
const chipManager = require('../../economy/chipManager');
const botPlayer = require('./botPlayer');

// Função "mãe" adaptada para a nova estrutura
async function handleGameCommand(m, session, sock) {
    const chatId = m.key.remoteJid;
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const commandArgs = body.split(' ');
    const command = commandArgs[0].toLowerCase();
    const playerId = m.key.participant || m.key.remoteJid;

    console.log(`[Poker Actions] Comando '${command}' recebido de ${playerId} na sessão ${session.groupId}`);

    if (!pokerValidators.isPlayerInGame(session, playerId)) {
        return sock.sendMessage(chatId, { text: "Você não está participando deste jogo." }, { quoted: m });
    }

    // Comandos que podem ser usados a qualquer momento
    switch (command) {
        case '!sair':
            return await handleLeaveCommand(m, session, sock);
        case '!status':
            await sessionManager.notificarStatusCompleto(session, sock);
            return;
        case '!ajuda':
        case '!help':
            const helpMessage = getPokerHelpMessage(session);
            return sock.sendMessage(chatId, { text: helpMessage }, { quoted: m });
    }

    // Validações de turno
    if (!pokerValidators.isPlayersTurn(session, playerId)) {
        if (playerId !== botPlayer.BOT_ID) {
            return sock.sendMessage(playerId, { text: "Não é sua vez de jogar!" });
        }
        return;
    }

    if (!pokerValidators.isPlayerActiveInRound(session, playerId)) {
        return;
    }

    // Ações de jogo (na vez do jogador)
    switch (command) {
        case '!mesa': case '!check':
            await handleCheckCommand(m, session, sock);
            break;
        case '!pagar': case '!call':
            await handleCallCommand(m, session, sock);
            break;
        case '!apostar': case '!bet':
            await handleBetCommand(m, session, sock);
            break;
        case '!aumentar': case '!raise':
            await handleRaiseCommand(m, session, sock);
            break;
        case '!allin':
            await handleAllInCommand(m, session, sock);
            break;
        case '!correr': case '!fold':
            await handleFold(m, session, sock);
            break;
        default:
            if (command.startsWith('!') && playerId !== botPlayer.BOT_ID) {
                await sock.sendMessage(chatId, { text: "Comando de Poker não reconhecido. Digite !ajuda para ver os comandos." }, { quoted: m });
            }
            break;
    }
}

// --- FUNÇÕES AUXILIARES ADAPTADAS ---

async function handleLeaveCommand(m, session, sock) {
    const playerId = m.key.participant || m.key.remoteJid;
    const chatId = m.key.remoteJid;

    if (!pokerValidators.isPlayerInGame(session, playerId)) {
        await sock.sendMessage(chatId, { text: 'Você não está mais na mesa.' }, { quoted: m });
        return;
    }

    const playerName = pokerValidators.getFormattedId(playerId, session);
    const wasHisTurn = pokerValidators.isPlayersTurn(session, playerId);

    session.players = session.players.filter(p => p.id !== playerId);
    session.gameState.ativos = session.gameState.ativos.filter(id => id !== playerId);
    chipManager.removePlayer(playerId);
    
    await sock.sendMessage(chatId, { text: `👋 ${playerName} saiu do jogo.` });

    if (session.gameState.ativos.length < 2 && session.players.length < 2) {
        await sock.sendMessage(chatId, { text: 'Jogadores insuficientes para continuar. Encerrando o jogo.' });
        sessionManager.endSession(session.groupId);
        return;
    }
    
    if (wasHisTurn) {
        await poker.avancarTurnoApostas(session, sock, playerId);
    }
}

// As funções abaixo agora apenas extraem as informações de 'm' e passam para o 'poker.js'
async function handleCheckCommand(m, session, sock) {
    await poker.handleCheck(session, m.key.participant || m.key.remoteJid, sock, m);
}
async function handleCallCommand(m, session, sock) {
    await poker.handleCall(session, m.key.participant || m.key.remoteJid, sock, m);
}
async function handleBetCommand(m, session, sock) {
    const amount = parseInt(m.message.conversation.split(' ')[1]);
    if (isNaN(amount) || amount <= 0) {
        await sock.sendMessage(m.key.remoteJid, { text: 'Valor de aposta inválido. Use: !apostar <valor>' }, { quoted: m });
        return;
    }
    await poker.handleBet(session, m.key.participant || m.key.remoteJid, amount, sock, m);
}
async function handleRaiseCommand(m, session, sock) {
    const amount = parseInt(m.message.conversation.split(' ')[1]);
    if (isNaN(amount) || amount <= 0) {
        await sock.sendMessage(m.key.remoteJid, { text: 'Valor de aumento inválido. Use: !aumentar <valor>' }, { quoted: m });
        return;
    }
    await poker.handleRaise(session, m.key.participant || m.key.remoteJid, amount, sock, m);
}
async function handleAllInCommand(m, session, sock) {
    await poker.handleAllIn(session, m.key.participant || m.key.remoteJid, sock, m);
}
async function handleFold(m, session, sock) {
    const playerId = m.key.participant || m.key.remoteJid;
    const chatId = m.key.remoteJid;
    
    await sock.sendMessage(chatId, { text: `🚪 ${pokerValidators.getFormattedId(playerId, session)} desistiu da rodada.` });

    session.gameState.ativos = session.gameState.ativos.filter(id => id !== playerId);
    session.gameState.playersWhoActed.delete(playerId);

    if (session.gameState.ativos.length === 1) {
        const winnerId = session.gameState.ativos[0];
        const pot = session.gameState.pote;
        chipManager.addChips(winnerId, pot);
        await sock.sendMessage(chatId, { text: `🎉 ${pokerValidators.getFormattedId(winnerId, session)} venceu a rodada! Ganhou ${pot} fichas.` });
        await poker.iniciarRodada(session, sock);
    } else {
        await poker.avancarTurnoApostas(session, sock, playerId);
    }
}

function getPokerHelpMessage(session) {
    let helpMessage = `📖 *Comandos de Poker:*\n`;
    if (session.status === 'em_jogo') {
        helpMessage += `- !status - Mostra o status atual da rodada\n`;
        helpMessage += `- !mesa (ou !check) - Passa a vez sem apostar\n`; 
        helpMessage += `- !pagar (ou !call) - Iguala a aposta atual\n`; 
        helpMessage += `- !apostar <valor> - Faz uma aposta inicial\n`; 
        helpMessage += `- !aumentar <valor> - Aumenta a aposta atual\n`; 
        helpMessage += `- !allin - Aposta todas as suas fichas\n`; 
        helpMessage += `- !correr (ou !fold) - Sai da rodada atual\n`;
    }
    helpMessage += `\n*Comandos Gerais:*\n - !sair - Sai do jogo (encerra se não houver jogadores)\n`; 
    return helpMessage;
}

module.exports = {
    handleGameCommand
};