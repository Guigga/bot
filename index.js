// index.js (Versão com Filtro de Grupos e Logger)

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const connectDB = require('./config/db');
const handleCommand = require('./commandHandler');
const qrcode = require('qrcode-terminal');
const logger = require('./utils/logger');
const sessionManager = require('./sessions/sessionManager');
const lobby = require('./games/lobby');
const pokerActions = require('./games/Poker/playerActions');
const trucoActions = require('./games/Truco/playerActions');
const forcaActions = require('./games/Forca/playerActions');
const velhaActions = require('./games/Velha/playerActions');
const unoActions = require('./games/Uno/playerActions');
const xadrezActions = require('./games/Xadrez/playerActions');

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log("QR Code recebido, gerando para o terminal...");
            qrcode.generate(qr, { small: true }, (qrCode) => {
                console.log(qrCode);
                console.log("Escaneie o QR Code acima para conectar.");
            });
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexão fechada. Motivo:', lastDisconnect.error, '. Reconectando:', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ Conectado ao WhatsApp!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || msg.key.remoteJid;
        const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // --- NOVA LÓGICA DE ROTEAMENTO DE JOGO ---
        // Primeiro, verifica se há uma sessão ativa neste chat
        const session = sessionManager.getSession(chatId);
        if (session) {
            try {
                logger.log(sock, msg, `Sessão ativa de '${session.game}'. Roteando para o jogo...`);
                
                // Se a sessão está no lobby, manda para o handler do lobby
                if (session.status === 'lobby') {
                    await lobby.handleLobbyCommand(msg, session, sock);
                    return; // Encerra o processamento aqui, pois a mensagem foi tratada
                }

                // Se a sessão está em jogo, manda para o handler do jogo específico
                if (session.status === 'em_jogo') {
                    const gameActions = { 
                        poker: pokerActions, 
                        truco: trucoActions, 
                        forca: forcaActions, 
                        velha: velhaActions, 
                        uno: unoActions, 
                        xadrez: xadrezActions 
                    };

                    if (gameActions[session.game]) {
                        await gameActions[session.game].handleGameCommand(msg, session, sock);
                        return; // Encerra o processamento aqui
                    }
                }
            } catch (error) {
                logger.log(sock, msg, 'ERRO DURANTE SESSÃO DE JOGO:', error);
                await sock.sendMessage(chatId, { text: '❌ Ocorreu um erro durante o jogo.' }, { quoted: msg });
            }
            return; // Garante que, se houver sessão, não tente processar como um comando normal
        }
        // --- FIM DA NOVA LÓGICA DE JOGO ---


        // Se não há sessão de jogo, continua para o tratamento de comandos normais
        if (!messageText || !messageText.startsWith('!')) {
            return;
        }

        // Filtro de usuários (lógica que já existia)
        const allowedUserIds = (process.env.ALLOWED_USER_IDS || '').split(',').map(id => id.trim());
        const normalizedSenderId = senderId.split('@')[0];

        if (allowedUserIds.length > 0 && !allowedUserIds.includes(normalizedSenderId)) {
            logger.log(sock, msg, `Usuário não autorizado (${normalizedSenderId}) tentou usar o comando: ${messageText}`);
            return;
        }

        // Filtro de grupos (lógica que já existia)
        const groupFilterEnabled = process.env.ENABLE_GROUP_FILTER === 'true';
        const isGroup = chatId.endsWith('@g.us');

        if (groupFilterEnabled && isGroup) {
            const allowedGroupIds = process.env.ALLOWED_GROUP_IDS ? process.env.ALLOWED_GROUP_IDS.split(',') : [];
            if (!allowedGroupIds.includes(chatId)) {
                logger.log(sock, msg, `Comando ignorado: O grupo (${chatId}) não está na lista de permissão.`);
                return;
            }
        }

        // Se passou por tudo, executa o comando via commandHandler.js
        try {
            logger.log(sock, msg, `Comando recebido: ${messageText}`);
            await handleCommand(sock, msg);
        } catch (error) {
            logger.log(sock, msg, 'ERRO FATAL AO PROCESSAR COMANDO:', error);
            await sock.sendMessage(chatId, { text: '❌ Ocorreu um erro inesperado.' }, { quoted: msg });
        }
    });
}

// Conecta ao DB e depois inicia o bot
connectDB().then(() => {
    connectToWhatsApp();
}).catch(err => console.error("Falha ao conectar ao DB", err));