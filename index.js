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
        const lowerCaseText = messageText.toLowerCase();

        // --- LÓGICA DE SESSÃO ATIVA (JOGOS E CONVERSAS) ---
        const activeSession = sessionManager.getSession(chatId);
        if (activeSession && activeSession.creatorId === senderId) {
            await handleCommand(sock, m, null, activeSession); // Trata a mensagem como parte de uma sessão
            return; 
        }

        // --- SE NÃO HÁ SESSÃO, CONTINUA ---
        const fullAccessUsers = (process.env.FULL_ACCESS_USERS || '').split(',').map(id => id.trim());
        const betaTesters = (process.env.FUEL_BETA_TESTERS || '').split(',').map(id => id.trim());
        const normalizedSenderId = senderId.split('@')[0];

        let userAccessLevel = 'none';
        if (fullAccessUsers.includes(normalizedSenderId)) {
            userAccessLevel = 'full';
        } else if (betaTesters.includes(normalizedSenderId)) {
            userAccessLevel = 'beta';
        }

        if (userAccessLevel === 'none') return; // Bloqueia usuários não listados

        // --- ROTEAMENTO DE COMANDOS E GATILHOS ---
        
        // Gatilhos de palavra-chave para iniciar a conversa de combustível
        const fuelTriggerPrefixes = ['abas', 'gaso', 'et', 'alc'];
        const isFuelTrigger = fuelTriggerPrefixes.some(prefix => lowerCaseText.startsWith(prefix));
        
        if (isFuelTrigger && !messageText.startsWith('!')) {
            await handleCommand(sock, m, userAccessLevel, null);
            return;
        }
        
        // Comandos normais que começam com "!"
        if (messageText.startsWith('!')) {
            try {
                logger.log(sock, msg, `Comando recebido: ${messageText}`);
                await handleCommand(sock, m, userAccessLevel, null);
            } catch (error) {
                logger.log(sock, msg, 'ERRO FATAL AO PROCESSAR COMANDO:', error);
                await sock.sendMessage(chatId, { text: '❌ Ocorreu um erro inesperado.' });
            }
        }
    });
}

// Conecta ao DB e depois inicia o bot
connectDB().then(() => {
    connectToWhatsApp();
}).catch(err => console.error("Falha ao conectar ao DB", err));