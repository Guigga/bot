// games/Uno/playerActions.js

const uno = require('./uno');

// 1. A assinatura da função é atualizada para o padrão do Baileys
async function handleGameCommand(m, session, sock) {
    // 2. Obtemos as informações da mensagem a partir do objeto 'm'
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const command = body.split(' ')[0].toLowerCase();

    // Direciona o comando para a função de lógica apropriada, passando os novos parâmetros
    switch (command) {
        case '!jogar':
            await uno.processarJogada(m, session, sock);
            break;
        case '!cor':
            await uno.processarEscolhaDeCor(m, session, sock);
            break;
        case '!comprar':
            await uno.processarCompra(m, session, sock);
            break;
        case '!passa':
        case '!passar':
            await uno.processarPasse(m, session, sock);
            break;
    }
}

module.exports = {
    handleGameCommand
};