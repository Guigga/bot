// commands/jogo.js

// 1. IMPORTAMOS OS MÓDULOS NECESSÁRIOS NO TOPO
const sessionManager = require('../sessions/sessionManager');
const lobby = require('../games/lobby');
const JOGOS_VALIDOS = ['poker', 'truco', 'forca', 'velha', 'uno', 'xadrez'];

module.exports = {
    name: '!jogo',
    aliases: ['!sair'],
    // 2. ADICIONAMOS CATEGORIA E DESCRIÇÃO
    category: 'jogos',
    description: 'Gerencia as sessões de jogo (iniciar, sair).',

    // 3. ADAPTAMOS A ASSINATURA DA FUNÇÃO EXECUTE
    async execute(sock, m, command, body) {
        
        // 4. ADAPTAMOS A FORMA DE OBTER AS INFORMAÇÕES DA MENSAGEM
        const chatId = m.key.remoteJid;
        const senderId = m.key.participant || m.key.remoteJid;
        const commandArgs = body.split(' ');
        const session = sessionManager.getSession(chatId); // Buscamos a sessão aqui

        if (command === '!jogo') {
            if (session) {
                return sock.sendMessage(chatId, { text: `❌ Um jogo de *${session.game}* já está em andamento. Para encerrar, use \`!sair\`.` }, { quoted: m });
            }

            const gameName = commandArgs[1]?.toLowerCase();

            if (!gameName) {
                return sock.sendMessage(chatId, { text: `🤔 Qual jogo você quer iniciar? Use: \`!jogo <nome>\`\n\n*Disponíveis:*\n${JOGOS_VALIDOS.join(', ')}` }, { quoted: m });
            }

            if (!JOGOS_VALIDOS.includes(gameName)) {
                return sock.sendMessage(chatId, { text: `❌ Jogo inválido! Os jogos disponíveis são: *${JOGOS_VALIDOS.join(', ')}*.` }, { quoted: m });
            }

            const creatorId = senderId;
            const novaSessao = sessionManager.createSession(chatId, gameName, creatorId);

            if (novaSessao) {
                // Passamos o 'sock' (novo client) e o 'm' (mensagem) para a função
                await lobby.criarLobby(novaSessao, sock, m); 
            } else {
                await sock.sendMessage(chatId, { text: '❌ Ocorreu um erro ao criar a sessão do jogo.' }, { quoted: m });
            }
        }

        if (command === '!sair') {
            if (session) {
                const gameName = session.game.charAt(0).toUpperCase() + session.game.slice(1);
                if (sessionManager.endSession(session.groupId)) {
                    await sock.sendMessage(chatId, { text: `✅ O jogo de *${gameName}* foi encerrado.` }, { quoted: m });
                }
            } else {
                await sock.sendMessage(chatId, { text: 'Não há nenhum jogo ou lobby em andamento para sair.' }, { quoted: m });
            }
        }
    }
};