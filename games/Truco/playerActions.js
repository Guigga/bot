// games/Truco/playerActions.js

const truco = require('./truco');
const sessionManager = require('../../sessions/sessionManager');

async function handleGameCommand(m, session, sock) {
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const command = body.split(' ')[0].toLowerCase();
    
    console.log(`[Truco Actions] Comando '${command}' recebido na sessão ${session.groupId}`);

    switch (command) {
        case '!carta':
            await truco.jogarCarta(m, session, sock);
            break;
        case '!truco':
            await truco.pedirTruco(m, session, sock);
            break;
        case '!aceitar':
            await truco.aceitarTruco(m, session, sock);
            break;
        case '!correr':
            await truco.correrDoTruco(m, session, sock);
            break;
        case '!pede6':
        case '!pede9':
        case '!pede12':
            await truco.aumentarAposta(m, session, sock);
            break;
        
        case '!sair':
            truco.limparTudo();
            if (sessionManager.endSession(session.groupId)) {
                await sock.sendMessage(session.groupId, { text: 'O jogo foi encerrado.' }, { quoted: m });
            }
            break;
            
        default:
            if (command.startsWith('!')) {
                 await sock.sendMessage(session.groupId, { text: "Comando de Truco não reconhecido." }, { quoted: m });
            }
            break;
    }
}

module.exports = {
    handleGameCommand
};