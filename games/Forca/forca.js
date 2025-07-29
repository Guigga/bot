// games/Forca/forca.js

// 1. REMOVEMOS A IMPORTAÇÃO DO 'whatsapp-web.js'
const path = require('path');
const fs = require('fs'); // Adicionamos fs para apagar a imagem temporária
const sessionManager = require('../../sessions/sessionManager');
const getPalavraAleatoria = require('./palavras');
const botPlayer = require('./botPlayer');

/**
 * Monta as informações para exibir o estado do jogo.
 * Retorna o caminho da imagem e a legenda, em vez de um objeto de mídia.
 */
function montarDisplayInfo(gameState) {
    const erros = 6 - gameState.vidas;
    const imagePath = path.join(__dirname, 'assets', `forca_${erros}.png`);
    
    const palavraDisplay = gameState.palavraOculta.join(' ');
    let legenda = `Palavra: \`${palavraDisplay}\`\n\n`;

    if (gameState.letrasTentadas.some(l => !gameState.palavra.includes(l))) {
        const letrasErradas = gameState.letrasTentadas.filter(l => !gameState.palavra.includes(l));
        legenda += `Letras erradas: ${letrasErradas.join(', ')}\n\n`;
    }
    
    legenda += 'Para jogar, digite `!letra <letra>`';

    // 2. Retornamos um objeto simples com o caminho da imagem e a legenda
    return { imagePath, legenda };
}

/** Prepara o estado inicial do jogo da Forca (NÃO PRECISA DE MUDANÇAS) */
function prepararJogo(session) {
    console.log(`[Forca] Jogo preparado para ${session.groupId}`);
    session.gameState = {
        jogadores: session.players.map(p => ({ ...p })),
        definidorDaPalavra: null,
        definidorIndex: 0,
        vezDoJogador: 0,
        palavra: [],
        palavraOculta: [],
        letrasTentadas: [],
        vidas: 6,
        status: 'preparando'
    };
    session.status = 'em_jogo';
}

/** Inicia uma nova rodada (adaptado para Baileys) */
async function iniciarRodada(session, sock) {
    const { gameState } = session;
    
    gameState.palavra = [];
    gameState.palavraOculta = [];
    gameState.letrasTentadas = [];
    gameState.vidas = 6;
    
    if (gameState.modo === 'solo') {
        // Lógica do modo solo (se existir)
    } else { // Multiplayer
        const definidor = gameState.jogadores[gameState.definidorIndex]; 
        gameState.definidorDaPalavra = definidor.id;
        gameState.vezDoJogador = (gameState.definidorIndex + 1) % gameState.jogadores.length; 
        gameState.status = 'definindo_palavra';

        // 3. ADAPTAMOS O ENVIO DE MENSAGENS PARA O PADRÃO BAILEYS
        await sock.sendMessage(session.groupId, { text: `Nova rodada! Agora é a vez de *${definidor.name}* escolher a palavra secreta. Estou aguardando no privado... 🤫` });
        await sock.sendMessage(definidor.id, { text: `Sua vez de escolher a palavra para o jogo da forca!\nUse o comando \`!palavra <SUA_PALAVRA>\` aqui no nosso privado (sem acentos ou espaços).` });
    }
}

/** Dispara a ação do bot (adaptado para Baileys) */
async function dispararAcaoBot(session, sock) {
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    const comandoBot = botPlayer.decideAction(session.gameState);
    if (comandoBot) {
        // Criamos uma mensagem 'fake' no formato do Baileys
        const fakeMessage = { 
            key: { participant: botPlayer.BOT_ID, remoteJid: session.groupId },
            message: { conversation: comandoBot }
        };
        await processarLetra(fakeMessage, session, sock);
    }
}

/** Lida com a palavra secreta (adaptado para Baileys) */
async function definirPalavra(m, session, sock) {
    const from = m.key.remoteJid; // Mensagens privadas vêm com o ID no remoteJid
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const { gameState } = session;

    if (from !== gameState.definidorDaPalavra) { return; }
    if (gameState.status !== 'definindo_palavra') { 
        return sock.sendMessage(from, { text: "❌ Você só pode definir a palavra no início da rodada." }, { quoted: m });
    }

    const palavra = body.split(' ').slice(1).join(' ').trim().toUpperCase();
    
    if (!palavra || palavra.length < 3 || palavra.length > 15 || !/^[A-Z]+$/.test(palavra)) {
        return sock.sendMessage(from, { text: '❌ Comando inválido ou palavra inválida! Use: `!palavra SUA_PALAVRA` (apenas letras, sem espaços, de 3 a 15 caracteres).' });
    }

    gameState.palavra = palavra.split('');
    gameState.palavraOculta = Array(palavra.length).fill('_');
    gameState.status = 'aguardando_palpite';
    
    await sock.sendMessage(from, { text: `✅ Sua palavra foi definida, ela é: *${palavra}*` }, { quoted: m });

    const proximoJogador = gameState.jogadores[gameState.vezDoJogador];
    
    // Usamos a nova função montarDisplayInfo e construímos a mensagem para o Baileys
    const { imagePath, legenda } = montarDisplayInfo(gameState);
    const legendaComVez = `A palavra foi definida! *${proximoJogador.name}*, é sua vez de adivinhar.\n\n${legenda}`;
    await sock.sendMessage(session.groupId, { image: { url: imagePath }, caption: legendaComVez });

    if (proximoJogador && proximoJogador.id === botPlayer.BOT_ID) {
        await dispararAcaoBot(session, sock);
    }
}

/** Processa a tentativa de uma letra (adaptado para Baileys) */
async function processarLetra(m, session, sock) {
    const { gameState } = session;
    const playerId = m.key.participant || m.key.remoteJid;
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const chatId = m.key.remoteJid;

    if (gameState.status !== 'aguardando_palpite') { return; }
    if (playerId === gameState.definidorDaPalavra) { return sock.sendMessage(chatId, { text: "Você não pode chutar letras, você que escolheu a palavra!" }, { quoted: m }); }
    if (playerId !== gameState.jogadores[gameState.vezDoJogador].id) { return sock.sendMessage(chatId, { text: "Opa, não é a sua vez de jogar!" }, { quoted: m }); }
    
    const letra = body.split(' ')[1]?.toUpperCase();

    if (!letra || letra.length !== 1 || !/^[A-Z]$/.test(letra)) { return; }
    if (gameState.letrasTentadas.includes(letra)) {
        if(playerId !== botPlayer.BOT_ID) sock.sendMessage(chatId, { text: `A letra *${letra}* já foi tentada!` }, { quoted: m });
        return;
    }
    gameState.letrasTentadas.push(letra);

    const acertou = gameState.palavra.includes(letra);
    if (acertou) {
        gameState.palavra.forEach((l, index) => { if (l === letra) gameState.palavraOculta[index] = l; });
    } else {
        gameState.vidas--;
    }

    const vitoria = !gameState.palavraOculta.includes('_');
    const derrota = gameState.vidas <= 0;

    if (vitoria || derrota) {
        const autorDaJogada = gameState.jogadores.find(p => p.id === playerId)?.name || 'Alguém';
        let mensagemRodada = vitoria
            ? `🏆 Rodada vencida por *${autorDaJogada.toUpperCase()}*!`
            : `💀 Fim da rodada! Vocês não adivinharam.`;
        
        await sock.sendMessage(session.groupId, { text: mensagemRodada });

        const { imagePath: finalImagePath } = montarDisplayInfo(gameState);
        const legendaFinal = `A palavra era: *${gameState.palavra.join('')}*`;
        await sock.sendMessage(session.groupId, { image: { url: finalImagePath }, caption: legendaFinal });
        
        gameState.definidorIndex++; 

        if (gameState.definidorIndex >= gameState.jogadores.length) {
            await sock.sendMessage(session.groupId, { text: '🏁 *FIM DE JOGO!* Todos os jogadores já definiram uma palavra. Obrigado por jogar!' });
            sessionManager.endSession(session.groupId);
            return;
        } else {
            await sock.sendMessage(session.groupId, { text: 'Próxima rodada em 5 segundos...' });
            setTimeout(() => {
                iniciarRodada(session, sock);
            }, 5000);
            return;
        }
    }
    
    gameState.vezDoJogador = (gameState.vezDoJogador + 1) % gameState.jogadores.length;
    if (gameState.jogadores[gameState.vezDoJogador].id === gameState.definidorDaPalavra) {
        gameState.vezDoJogador = (gameState.vezDoJogador + 1) % gameState.jogadores.length;
    }

    const proximoJogador = gameState.jogadores[gameState.vezDoJogador];
    const { imagePath, legenda } = montarDisplayInfo(gameState);
    const legendaComVez = `${legenda}\n\nÉ a vez de *${proximoJogador.name}*.`;
    await sock.sendMessage(session.groupId, { image: { url: imagePath }, caption: legendaComVez });

    if (proximoJogador.id === botPlayer.BOT_ID) {
        await dispararAcaoBot(session, sock);
    }
}

module.exports = { prepararJogo, iniciarRodada, definirPalavra, processarLetra, montarDisplayInfo };