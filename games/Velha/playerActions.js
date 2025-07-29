// games/Velha/playerActions.js

const jogoDaVelha = require('./velha.js');
const sessionManager = require('../../sessions/sessionManager');

// 1. A assinatura da função é atualizada para o padrão do Baileys
async function handleGameCommand(m, session, sock) {
    // 2. Obtemos as informações da mensagem a partir do objeto 'm'
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const command = body.split(' ')[0].toLowerCase();

    switch (command) {
        case '!jogar':
        case '!j':
            // 3. Passamos 'm', 'session' e 'sock' para a função de lógica
            await jogoDaVelha.processarJogada(m, session, sock);
            break;
        
        case '!sair':
            if (sessionManager.endSession(session.groupId)) {
                // 4. A mensagem de resposta é atualizada para a sintaxe do Baileys
                await sock.sendMessage(session.groupId, { text: 'O Jogo da Velha foi encerrado.' }, { quoted: m });
            }
            break;
    }
}

module.exports = { handleGameCommand };