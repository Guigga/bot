// games/lobby.js

// 1. IMPORTAÇÕES ATUALIZADAS
const poker = require('./Poker/poker');
const truco = require('./Truco/truco');
const sessionManager = require('../sessions/sessionManager');
const forca = require('./Forca/forca');
const velha = require('./Velha/velha');
const uno = require('./Uno/uno');
const xadrez = require('./Xadrez/xadrez');
const imageRenderer = require('./Xadrez/imageRenderer'); // Mantemos para o Xadrez

// --- Bots
const pokerBot = require('./Poker/botPlayer');
const trucoBot = require('./Truco/botPlayer');
const forcaBot = require('./Forca/botPlayer');
const velhaBot = require('./Velha/botPlayer');
const unoBot = require('./Uno/botPlayer');
const xadrezBot = require('./Xadrez/botPlayer');


// --- LÓGICA PRINCIPAL DO LOBBY ---

// 2. Assinatura da função atualizada (client -> sock, message -> m)
async function criarLobby(session, sock, m) {
    session.status = 'lobby';
    console.log(`[Lobby] Criando lobby para o jogo: ${session.game}`);
    
    if (session.game === 'truco') {
        session.players = { timeBlue: [], timeRed: [] };
    } else {
        session.players = [];
    }

    const lobbyMessage = gerarMensagemLobby(session);
    // 3. Envio de mensagem atualizado
    await sock.sendMessage(session.groupId, { text: lobbyMessage }, { quoted: m });
}

async function handleLobbyCommand(m, session, sock) {
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const command = body.split(' ')[0].toLowerCase();

    switch (command) {
        case '!ajuda':
        case '!comandos':
        case '!help':
            await enviarAjudaLobby(session, sock, m);
            return;
    }

    if (session.game === 'truco') {
        await handleTrucoLobby(m, session, sock);
    } else {
        await handleLobbyGenerico(m, session, sock);
    }
}

// ... (gerarMensagemLobby não muda, pois só retorna texto)
function gerarMensagemLobby(session) {
    if (session.game === 'poker') return gerarMensagemLobbyPoker(session);
    if (session.game === 'truco') return gerarMensagemLobbyTruco(session);
    if (session.game === 'forca') return gerarMensagemLobbyForca(session);
    if (session.game === 'velha') return gerarMensagemLobbyVelha(session);
    if (session.game === 'uno') return gerarMensagemLobbyUno(session);
    if (session.game === 'xadrez') return gerarMensagemLobbyXadrez(session);
    return 'Lobby em modo desconhecido.';
}

// --- LÓGICAS DE LOBBY GENÉRICO ---

async function handleLobbyGenerico(m, session, sock) {
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const command = body.split(' ')[0].toLowerCase();
    switch (command) {
        case '!entrar':
            await adicionarJogadorGenerico(m, session, sock);
            break;
        case '!iniciar':
            if (session.game === 'poker') await iniciarJogoPoker(m, session, sock);
            else if (session.game === 'forca') await iniciarJogoForca(m, session, sock);
            else if (session.game === 'velha') await iniciarJogoVelha(m, session, sock);
            else if (session.game === 'uno') await iniciarJogoUno(m, session, sock);
            else if (session.game === 'xadrez') await iniciarJogoXadrez(m, session, sock);
            break;
    }
}

const MAX_NAME_LENGTH = 20;

async function adicionarJogadorGenerico(m, session, sock) {
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const playerId = m.key.participant || m.key.remoteJid;
    const chatId = m.key.remoteJid;

    let MAX_PLAYERS = 8;
    if (session.game === 'velha' || session.game === 'xadrez') {
        MAX_PLAYERS = 2;
    }

    if (session.players.length >= MAX_PLAYERS) {
        return sock.sendMessage(chatId, { text: '❌ A sala está cheia!' }, { quoted: m });
    }
    if (session.players.some(p => p.id === playerId)) {
        return sock.sendMessage(chatId, { text: '✔️ Você já está na mesa.' }, { quoted: m });
    }
    
    let playerName = body.split(' ').slice(1).join(' ').trim();
    if (!playerName) {
        return sock.sendMessage(chatId, { text: '⚠️ Por favor, digite seu nome. Ex: `!entrar João`' }, { quoted: m });
    }

    if (playerName.length > MAX_NAME_LENGTH) {
        playerName = playerName.substring(0, MAX_NAME_LENGTH);
        await sock.sendMessage(chatId, { text: `Seu nome era muito longo e foi encurtado para: *${playerName}*` }, { quoted: m });
    }

    session.players.push({ id: playerId, name: playerName });
    sessionManager.mapPlayerToGroup(playerId, session.groupId);
    const lobbyMessage = gerarMensagemLobby(session);
    await sock.sendMessage(session.groupId, { text: lobbyMessage });
}

// --- LÓGICAS ESPECÍFICAS DE CADA JOGO (TODAS ADAPTADAS) ---

// ================= POKER =================
function gerarMensagemLobbyPoker(session) {
    // ... (não muda)
    const MAX_PLAYERS = 8;
    let playersList = '';
    for (let i = 0; i < MAX_PLAYERS; i++) {
        const player = session.players[i];
        playersList += `${i + 1}. ${player ? player.name : '<vazio>'}\n`;
    }
    let comandos = '[ !entrar <seu_nome> ]  [ !ajuda ]';
    if (session.players.length >= 1) {
        comandos += '  *[ !iniciar ]*';
    }
    let lobbyMessage = `*Mesa de Poker Criada!* 🃏\n\n*Jogadores:*\n${playersList}\n---\n${comandos}`;
    if (session.players.length === 1) {
        lobbyMessage += '\n\n*Aviso:* Se iniciar agora, um BOT completará a mesa! 🤖';
    }
    return lobbyMessage;
}

async function iniciarJogoPoker(m, session, sock) {
    const playerId = m.key.participant || m.key.remoteJid;
    const chatId = m.key.remoteJid;

    if (session.players.length > 0 && session.players[0].id !== playerId) {
        return sock.sendMessage(chatId, { text: 'Apenas o primeiro jogador que entrou na mesa pode iniciar o jogo.' }, { quoted: m });
    }
    if (session.players.length === 0) {
        return sock.sendMessage(chatId, { text: '⚠️ Não é possível iniciar um jogo sem jogadores!' });
    }
    if (session.players.length === 1) {
        const bot = pokerBot.createBotPlayer();
        session.players.push(bot);
        await sock.sendMessage(chatId, { text: `🤖 ${bot.name} entrou para completar a mesa.` });
    }

    session.status = 'em_jogo';
    poker.prepararJogo(session);
    await sock.sendMessage(chatId, { text: '🎲 O jogo de *Poker* está começando! Boa sorte a todos.' });
    await poker.iniciarRodada(session, sock);
}

// ================= TRUCO =================
function gerarMensagemLobbyTruco(session) {
    // ... (não muda)
    let blueList = '';
    let redList = '';
    for (let i = 0; i < 2; i++) {
        const playerBlue = session.players.timeBlue[i];
        blueList += `${i + 1}. ${playerBlue ? playerBlue.name : '<vazio>'}\n`;
        const playerRed = session.players.timeRed[i];
        redList += `${i + 1}. ${playerRed ? playerRed.name : '<vazio>'}\n`;
    }
    let comandos = '[ !entrar <seu_nome> <blue ou red> ]  [ !ajuda ]';
    const blueCount = session.players.timeBlue.length;
    const redCount = session.players.timeRed.length;
    const totalPlayers = blueCount + redCount;
    if (totalPlayers === 1 || (blueCount === 1 && redCount === 1) || (blueCount === 2 && redCount === 2)) {
        comandos += '  *[ !iniciar ]*';
    }
    let lobbyMessage = `*Mesa de Truco Criada!* 🎴\n\n*Jogadores:*\n\n*Time Blue* 🔵\n${blueList}\n*Time Red* 🔴\n${redList}\n---\n${comandos}`;
    if (totalPlayers === 1) {
        lobbyMessage += '\n\n*Aviso:* Se iniciar agora, você jogará contra um BOT! 🤖';
    }
    return lobbyMessage;
}

async function handleTrucoLobby(m, session, sock) {
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const command = body.split(' ')[0].toLowerCase();
    switch (command) {
        case '!entrar':
            await adicionarJogadorTruco(m, session, sock);
            break;
        case '!iniciar':
            await iniciarJogoTruco(m, session, sock);
            break;
    }
}

async function adicionarJogadorTruco(m, session, sock) {
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const playerId = m.key.participant || m.key.remoteJid;
    const chatId = m.key.remoteJid;
    const args = body.split(' ').slice(1);
    
    if (session.players.timeBlue.some(p => p.id === playerId) || session.players.timeRed.some(p => p.id === playerId)) {
        return sock.sendMessage(chatId, { text: '✔️ Você já está em um time.' }, { quoted: m });
    }
    if (args.length === 0) {
        return sock.sendMessage(chatId, { text: '⚠️ Por favor, digite seu nome. Ex: `!entrar João`' }, { quoted: m });
    }

    let playerName;
    let timeEscolhido = args[args.length - 1].toLowerCase();
    let timeObject;

    if (timeEscolhido === 'blue' || timeEscolhido === 'red') {
        playerName = args.slice(0, -1).join(' ').trim();
    } else {
        playerName = args.join(' ').trim();
    }
    if (!playerName) {
        return sock.sendMessage(chatId, { text: '⚠️ Por favor, digite seu nome. Ex: `!entrar João blue`' }, { quoted: m });
    }
    if (playerName.length > MAX_NAME_LENGTH) {
        playerName = playerName.substring(0, MAX_NAME_LENGTH);
        await sock.sendMessage(chatId, { text: `Seu nome era muito longo e foi encurtado para: *${playerName}*` }, { quoted: m });
    }

    if (timeEscolhido === 'blue' || timeEscolhido === 'red') {
        timeObject = (timeEscolhido === 'blue') ? session.players.timeBlue : session.players.timeRed;
        if (timeObject.length >= 2) {
            return sock.sendMessage(chatId, { text: `❌ O time ${timeEscolhido} já está cheio!` }, { quoted: m });
        }
    } else {
        if (session.players.timeBlue.length <= session.players.timeRed.length && session.players.timeBlue.length < 2) {
            timeObject = session.players.timeBlue;
            await sock.sendMessage(chatId, { text: `Você foi alocado automaticamente ao time *Blue 🔵*!` }, { quoted: m });
        } else if (session.players.timeRed.length < 2) {
            timeObject = session.players.timeRed;
            await sock.sendMessage(chatId, { text: `Você foi alocado automaticamente ao time *Red 🔴*!` }, { quoted: m });
        } else {
            return sock.sendMessage(chatId, { text: '❌ A mesa está cheia! Não há vagas em nenhum time.' }, { quoted: m });
        }
    }
    
    timeObject.push({ id: playerId, name: playerName });
    sessionManager.mapPlayerToGroup(playerId, session.groupId);
    const lobbyMessage = gerarMensagemLobby(session);
    await sock.sendMessage(session.groupId, { text: lobbyMessage });
}

async function iniciarJogoTruco(m, session, sock) {
    const playerId = m.key.participant || m.key.remoteJid;
    const chatId = m.key.remoteJid;
    const criadorId = session.players.timeBlue[0]?.id || session.players.timeRed[0]?.id;

    if (criadorId && criadorId !== playerId) {
        return sock.sendMessage(chatId, { text: 'Apenas o primeiro jogador que entrou na mesa pode iniciar o jogo.' }, { quoted: m });
    }

    let blueCount = session.players.timeBlue.length;
    let redCount = session.players.timeRed.length;
    if (blueCount + redCount === 1) {
        const bot = trucoBot.createBotPlayer();
        if (blueCount === 1) { session.players.timeRed.push(bot); redCount++; } 
        else { session.players.timeBlue.push(bot); blueCount++; }
        await sock.sendMessage(chatId, { text: `🤖 ${bot.name} entrou para o time adversário!` });
    }

    if (!((blueCount === 1 && redCount === 1) || (blueCount === 2 && redCount === 2))) {
        return sock.sendMessage(chatId, { text: '⚠️ Não é possível iniciar! O jogo deve ser 1x1 ou 2x2.' }, { quoted: m });
    }
    
    const jogadoresOrdenados = [];
    const timeBlue = session.players.timeBlue;
    const timeRed = session.players.timeRed;
    for (let i = 0; i < 2; i++) {
        if (timeBlue[i]) jogadoresOrdenados.push(timeBlue[i]);
        if (timeRed[i]) jogadoresOrdenados.push(timeRed[i]);
    }
    
    session.players = jogadoresOrdenados;
    session.status = 'em_jogo';
    truco.prepararJogo(session);
    await sock.sendMessage(chatId, { text: '🎲 O jogo de *Truco* está começando! Boa sorte a todos.' });
    await truco.iniciarRodada(session, sock);
}

// ================= FORCA =================
function gerarMensagemLobbyForca(session) {
    // ... (não muda)
    const MAX_PLAYERS = 8;
    let playersList = '';
    for (let i = 0; i < MAX_PLAYERS; i++) {
        const player = session.players[i];
        playersList += `${i + 1}. ${player ? player.name : '<vazio>'}\n`;
    }
    let comandos = '[ !entrar <seu_nome> ]  [ !ajuda ]';
    if (session.players.length >= 1) {
        comandos += '  *[ !iniciar ]*';
    }
    let lobbyMessage = `*Sala de Jogo da Forca Criada!* 💀\n\n*Jogadores na Fila:*\n${playersList}\n---\n${comandos}`;
    if (session.players.length === 1) {
        lobbyMessage += '\n\n*Aviso:* Se iniciar agora, você jogará sozinho contra o Bot!';
    } else if (session.players.length > 1) {
        lobbyMessage += `\n\n*Aviso:* Se iniciar agora, o jogo será em grupo e *${session.players[0].name}* escolherá a primeira palavra!`;
    }
    return lobbyMessage;
}

async function iniciarJogoForca(m, session, sock) {
    const playerId = m.key.participant || m.key.remoteJid;
    const chatId = m.key.remoteJid;

    if (session.players.length > 0 && session.players[0].id !== playerId) {
        return sock.sendMessage(chatId, { text: 'Apenas o primeiro jogador que entrou na sala pode iniciar o jogo.' }, { quoted: m });
    }
    if (session.players.length === 0) {
        return sock.sendMessage(chatId, { text: '⚠️ Não é possível iniciar um jogo sem jogadores!' });
    }
    if (session.players.length === 1) {
        const bot = forcaBot.createBotPlayer();
        session.players.push(bot);
        await sock.sendMessage(chatId, { text: `🤖 ${bot.name} entrou na sala para adivinhar a sua palavra!` });
    }

    session.status = 'em_jogo';
    forca.prepararJogo(session);
    await sock.sendMessage(chatId, { text: '💀 O *Jogo da Forca* está começando!' });
    await forca.iniciarRodada(session, sock);
}

// ================= VELHA =================
function gerarMensagemLobbyVelha(session) {
    // ... (não muda)
    let playersList = '1. <vazio>\n2. <vazio>\n';
    if (session.players.length > 0) {
        playersList = `1. ${session.players[0].name}\n`;
        playersList += `2. ${session.players[1] ? session.players[1].name : '<vazio>'}\n`;
    }
    let comandos = '[ !entrar <seu_nome> ]  [ !ajuda ]';
    if (session.players.length >= 1) {
        comandos += '  *[ !iniciar ]*';
    }
    let lobbyMessage = `*Sala de Jogo da Velha Infinito Criada!* ♾️\n\n*Jogadores (2 no total):*\n${playersList}\n---\n${comandos}`;
    if (session.players.length === 1) {
        lobbyMessage += `\n\n*Aviso:* Se iniciar agora, você jogará contra o *BOT Velhaco*! 🤖`;
    }
    return lobbyMessage;
}

async function iniciarJogoVelha(m, session, sock) {
    const playerId = m.key.participant || m.key.remoteJid;
    const chatId = m.key.remoteJid;

    if (session.players.length > 0 && session.players[0].id !== playerId) {
        return sock.sendMessage(chatId, { text: 'Apenas o primeiro jogador que entrou na mesa pode iniciar o jogo.' }, { quoted: m });
    }
    if (session.players.length === 1) {
        const bot = velhaBot.createBotPlayer();
        session.players.push(bot);
        await sock.sendMessage(chatId, { text: `🤖 ${bot.name} entrou para jogar contra você!` });
    }
    if (session.players.length !== 2) {
        return sock.sendMessage(chatId, { text: '⚠️ É preciso exatamente 2 jogadores para iniciar o Jogo da Velha.' }, { quoted: m });
    }

    session.status = 'em_jogo';
    velha.prepararJogo(session);

    const primeiroJogador = session.players[0];
    const legenda = `♾️ O *Jogo da Velha Infinito* está começando!\n\nÉ a vez de *${primeiroJogador.name}* (❌). Use \`!jogar <posição>\`, ex: \`!jogar a1\`.`;
    
    // A função de montar display foi removida de velha.js, então chamamos o renderer diretamente
    const imagePath = await require('./Velha/imageRenderer').renderizarVelha(session.gameState.historicoDeJogadas, null);
    await sock.sendMessage(session.groupId, { image: { url: imagePath }, caption: legenda });
    fs.unlinkSync(imagePath);

    if (primeiroJogador.id === velhaBot.BOT_ID) {
        await velha.dispararAcaoBot(session, sock);
    }
}

// ================= UNO =================
function gerarMensagemLobbyUno(session) {
    // ... (não muda)
    const MAX_PLAYERS = 8;
    let playersList = '';
    for (let i = 0; i < MAX_PLAYERS; i++) {
        const player = session.players[i];
        playersList += `${i + 1}. ${player ? player.name : '<vazio>'}\n`;
    }
    let comandos = '[ !entrar <seu_nome> ]  [ !ajuda ]';
    if (session.players.length >= 1) {
        comandos += '  *[ !iniciar ]*';
    }
    let lobbyMessage = `*Mesa de UNO Criada!* 🃏\n\n*Jogadores:*\n${playersList}\n---\n${comandos}`;
    if (session.players.length === 1) {
        lobbyMessage += `\n\n*Aviso:* Se iniciar agora, você jogará contra o *${unoBot.BOT_NAME}*! 🤖`;
    }
    return lobbyMessage;
}

async function iniciarJogoUno(m, session, sock) {
    const playerId = m.key.participant || m.key.remoteJid;
    const chatId = m.key.remoteJid;

    if (session.players.length > 0 && session.players[0].id !== playerId) {
        return sock.sendMessage(chatId, { text: 'Apenas o primeiro jogador que entrou na mesa pode iniciar o jogo.' }, { quoted: m });
    }
    if (session.players.length === 0) {
        return sock.sendMessage(chatId, { text: '⚠️ Não é possível iniciar um jogo sem jogadores!' });
    }
    if (session.players.length === 1) {
        const bot = unoBot.createBotPlayer();
        session.players.push(bot);
        await sock.sendMessage(chatId, { text: `🤖 ${bot.name} entrou para completar a mesa.` });
    }

    uno.prepararJogo(session);
    await sock.sendMessage(chatId, { text: '🃏 O jogo de *UNO* está começando! Boa sorte a todos.' });
    await uno.iniciarPartida(session, sock);
}

// ================= XADREZ =================
function gerarMensagemLobbyXadrez(session) {
    // ... (não muda)
    let playersList = '1. (Brancas) <vazio>\n2. (Pretas) <vazio>\n';
    if (session.players.length > 0) {
        playersList = `1. (Brancas) ${session.players[0].name}\n`;
        playersList += `2. (Pretas) ${session.players[1] ? session.players[1].name : '<vazio>'}\n`;
    }
    let comandos = '[ !entrar <seu_nome> ]  [ !ajuda ]';
    if (session.players.length >= 1) {
        comandos += '  *[ !iniciar ]*';
    }
    let lobbyMessage = `*Mesa de Xadrez Criada!* ♟️\n\n*Jogadores (2 no total):*\n${playersList}\n---\n${comandos}`;
    if (session.players.length === 1) {
        lobbyMessage += `\n\n*Aviso:* Se iniciar agora, você jogará contra o *BOT Kasparov*! 🤖`;
    }
    return lobbyMessage;
}

async function iniciarJogoXadrez(m, session, sock) {
    const playerId = m.key.participant || m.key.remoteJid;
    const chatId = m.key.remoteJid;

    if (session.players.length > 0 && session.players[0].id !== playerId) {
        return sock.sendMessage(chatId, { text: 'Apenas o primeiro jogador que entrou na mesa pode iniciar o jogo.' }, { quoted: m });
    }
    if (session.players.length === 1) {
        const bot = xadrezBot.createBotPlayer();
        session.players.push(bot);
        await sock.sendMessage(chatId, { text: `🤖 *BOT Kasparov* entrou para jogar de Pretas!` });
    }
    if (session.players.length !== 2) {
        return sock.sendMessage(chatId, { text: '⚠️ É preciso exatamente 2 jogadores para iniciar o Xadrez.' }, { quoted: m });
    }

    session.status = 'em_jogo';
    xadrez.prepararJogo(session);
    
    const primeiroJogador = session.players[0];
    const legenda = `♟️ O jogo de *Xadrez* está começando!\n\nÉ a vez de *${primeiroJogador.name}* (Brancas).\n Use \`!mover <origem> <destino>\`\n ex: \`!mover e2 e4\`.`;
    
    const imagemBuffer = await imageRenderer.renderBoardToImage(session.gameState);
    
    if (imagemBuffer) {
        // Envia a imagem diretamente com o buffer
        await sock.sendMessage(session.groupId, { image: imagemBuffer, caption: legenda });
    } else {
        await sock.sendMessage(chatId, { text: '❌ Ocorreu um erro ao gerar a imagem do tabuleiro.' }, { quoted: m });
    }
}

// ================= AJUDA =================
async function enviarAjudaLobby(session, sock, m) {
    let ajudaMsg = '';
    // ... (lógica de ajuda)
    await sock.sendMessage(m.key.remoteJid, { text: ajudaMsg }, { quoted: m });
}

module.exports = {
    criarLobby,
    handleLobbyCommand
};