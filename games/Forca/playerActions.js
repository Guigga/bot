// games/Forca/playerActions.js

const forca = require('./forca');
const sessionManager = require('../../sessions/sessionManager');

// A assinatura da função muda para o padrão do Baileys
async function handleGameCommand(m, session, sock) {
    // Obtemos as informações do novo objeto 'm'
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const command = body.split(' ')[0].toLowerCase();
    const playerId = m.key.participant || m.key.remoteJid;
    const chatId = m.key.remoteJid;

    console.log(`[Forca Actions] Comando '${command}' recebido de ${playerId} na sessão ${session.groupId}`);

    switch (command) {
        case '!palavra':
            // Passamos 'm' e 'sock' em vez de 'message' e 'client'
            await forca.definirPalavra(m, session, sock);
            break;

        case '!letra':
            await forca.processarLetra(m, session, sock);
            break;

        case '!sair':
            const playerIndex = session.gameState.jogadores.findIndex(p => p.id === playerId);
            if (playerIndex === -1) return;

            const playerSaindo = session.gameState.jogadores[playerIndex];
            session.gameState.jogadores.splice(playerIndex, 1);
            sessionManager.unmapPlayersInGroup([playerId]); 

            await sock.sendMessage(chatId, { text: `*${playerSaindo.name}* saiu do jogo da Forca.` }, { quoted: m });

            const eraDefinidor = playerId === session.gameState.definidorDaPalavra;

            if (session.gameState.jogadores.length < 2) {
                await sock.sendMessage(chatId, { text: 'O jogo da Forca foi encerrado por falta de jogadores.' });
                sessionManager.endSession(session.groupId);
                return;
            }

            if (eraDefinidor) {
                await sock.sendMessage(chatId, { text: `Como quem estava escolhendo a palavra saiu, vamos para a próxima rodada!` });
                await forca.iniciarRodada(session, sock);
            }
            break;
            
        default:
            break;
    }
}

module.exports = {
    handleGameCommand
};