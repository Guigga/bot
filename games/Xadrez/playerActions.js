// games/Xadrez/playerActions.js

const xadrez = require('./xadrez.js');
const sessionManager = require('../../sessions/sessionManager');

// 1. A assinatura da função é atualizada para o padrão do Baileys
async function handleGameCommand(m, session, sock) {
    // 2. Obtemos as informações da mensagem a partir do objeto 'm'
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const command = body.split(' ')[0].toLowerCase();
    const playerId = m.key.participant || m.key.remoteJid;
    const chatId = m.key.remoteJid;
    
    const jogadorAtualIndex = session.gameState.jogadorDaVez === 'w' ? 0 : 1;
    const jogadorAtual = session.players[jogadorAtualIndex];

    switch (command) {
        case '!mover':
            if (playerId !== jogadorAtual.id) {
                return await sock.sendMessage(chatId, { text: '❌ Não é a sua vez de jogar!' }, { quoted: m });
            }
            // Passamos 'm', 'session' e 'sock' para a função de lógica
            await xadrez.processarJogada(m, session, sock);
            break;

        case '!desistir':
            const vencedorIndex = jogadorAtualIndex === 0 ? 1 : 0;
            const vencedor = session.players[vencedorIndex];
            await sock.sendMessage(chatId, { text: `🏳️ *${jogadorAtual.name}* desistiu da partida. *${vencedor.name}* é o vencedor!` });
            sessionManager.endSession(session.groupId);
            break;

        case '!tabuleiro':
        case '!status':
            await xadrez.enviarTabuleiroAtual(session, sock);
            break;
        
        case '!sair': // Comando de sair adicionado para consistência
            if (sessionManager.endSession(session.groupId)) {
                await sock.sendMessage(chatId, { text: 'O Jogo de Xadrez foi encerrado.' }, { quoted: m });
            }
            break;

        default:
            if (command.startsWith('!')) {
                await sock.sendMessage(chatId, { text: 'Comando de xadrez inválido. Use `!mover`, `!desistir` ou `!tabuleiro`.' }, { quoted: m });
            }
            break;
    }
}

module.exports = { handleGameCommand };