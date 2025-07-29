// games/Velha/velha.js

const sessionManager = require('../../sessions/sessionManager');
// 1. REMOVEMOS a importação do 'whatsapp-web.js'
const path = require('path');
const fs = require('fs');
const botPlayer = require('./botPlayer');
const { renderizarVelha } = require('./imageRenderer.js');

const SIMBOLOS = ['❌', '⭕'];
const VITORIAS = [
    ['a1', 'a2', 'a3'], ['b1', 'b2', 'b3'], ['c1', 'c2', 'c3'],
    ['a1', 'b1', 'c1'], ['a2', 'b2', 'c2'], ['a3', 'b3', 'c3'],
    ['a1', 'b2', 'c3'], ['a3', 'b2', 'c1']
];

// As funções abaixo (lógica pura) não precisam de alterações
function prepararJogo(session) {
    console.log(`[JogoDaVelha] Preparando jogo para ${session.groupId}`);
    session.gameState = {
        jogadores: [session.players[0].id, session.players[1].id],
        historicoDeJogadas: [],
        vezDoJogador: 0
    };
}

function verificarVencedor(gameState) {
    const jogadorAtualId = gameState.jogadores[gameState.vezDoJogador];
    const posicoesDoJogador = new Set(
        gameState.historicoDeJogadas
            .filter(j => j.jogadorId === jogadorAtualId)
            .map(j => j.posicao)
    );
    if (posicoesDoJogador.size < 3) return null;
    for (const vitoria of VITORIAS) {
        if (vitoria.every(p => posicoesDoJogador.has(p))) {
            return { vencedor: jogadorAtualId, linha: vitoria };
        }
    }
    return null;
}

// 2. ATUALIZAMOS a assinatura das funções (client -> sock, message -> m)
async function dispararAcaoBot(session, sock) {
    const comandoBot = botPlayer.decideAction(session);
    if (comandoBot) {
        const fakeMessage = {
            key: { participant: botPlayer.BOT_ID, remoteJid: session.groupId },
            message: { conversation: comandoBot }
        };
        await processarJogada(fakeMessage, session, sock);
    }
}

async function processarJogada(m, session, sock) {
    const { gameState } = session;
    const playerId = m.key.participant || m.key.remoteJid;
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const chatId = m.key.remoteJid;
    const jogadorAtualId = gameState.jogadores[gameState.vezDoJogador];

    if (playerId === botPlayer.BOT_ID) {
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    if (playerId !== jogadorAtualId) {
        return sock.sendMessage(chatId, { text: "Calma, não é a sua vez de jogar!" }, { quoted: m });
    }

    const posicao = body.split(' ')[1]?.toLowerCase();
    const posicoesValidas = /^[a-c][1-3]$/;
    if (!posicao || !posicoesValidas.test(posicao)) {
        return sock.sendMessage(chatId, { text: "Posição inválida. Use o formato `a1`, `b2`, etc." }, { quoted: m });
    }
    
    const posicaoOcupada = gameState.historicoDeJogadas.some(j => j.posicao === posicao);
    if (posicaoOcupada) {
        return sock.sendMessage(chatId, { text: "Essa posição já está ocupada! Escolha outra." }, { quoted: m });
    }
    
    gameState.historicoDeJogadas.push({
        posicao,
        jogadorId: jogadorAtualId,
        simbolo: SIMBOLOS[gameState.vezDoJogador]
    });

    const resultadoVitoria = verificarVencedor(gameState);

    if (resultadoVitoria) {
        const jogadorVencedor = session.players.find(p => p.id === resultadoVitoria.vencedor);
        const legenda = `🏆 Fim de jogo! *${jogadorVencedor.name}* (${SIMBOLOS[gameState.vezDoJogador]}) venceu!`;
        
        // 3. ENVIAMOS A IMAGEM COM A NOVA SINTAXE
        const imagePath = await renderizarVelha(gameState.historicoDeJogadas, null, resultadoVitoria.linha);
        await sock.sendMessage(session.groupId, { image: { url: imagePath }, caption: legenda });
        fs.unlinkSync(imagePath); // Limpa o arquivo
        
        sessionManager.endSession(session.groupId);
        return;
    }

    let infoPecaRemovida = null;
    if (gameState.historicoDeJogadas.length > 8) { 
        const jogadaRemovida = gameState.historicoDeJogadas.shift(); 
        infoPecaRemovida = `O tabuleiro encheu! A jogada mais antiga (${jogadaRemovida.simbolo} em ${jogadaRemovida.posicao.toUpperCase()}) foi removida.`;
    }

    let posicaoParaDestacar = null;
    if (gameState.historicoDeJogadas.length === 8) {
        posicaoParaDestacar = gameState.historicoDeJogadas[0].posicao;
    }

    let legenda = '';
    if (infoPecaRemovida) {
        legenda += `${infoPecaRemovida}\n\n`;
    }
    
    gameState.vezDoJogador = (gameState.vezDoJogador + 1) % 2;
    const proximoJogador = session.players.find(p => p.id === gameState.jogadores[gameState.vezDoJogador]);
    legenda += `É a vez de *${proximoJogador.name}* (${SIMBOLOS[gameState.vezDoJogador]}). Use:\n \`!jogar <posição>\`.`;
    
    // 4. ENVIAMOS A IMAGEM ATUALIZADA
    const imagePath = await renderizarVelha(gameState.historicoDeJogadas, posicaoParaDestacar, null);
    await sock.sendMessage(session.groupId, { image: { url: imagePath }, caption: legenda });
    fs.unlinkSync(imagePath);
    
    const proximoJogadorId = gameState.jogadores[gameState.vezDoJogador];
    if (proximoJogadorId === botPlayer.BOT_ID) {
        await dispararAcaoBot(session, sock);
    }
}

// Removida a função 'montarDisplay', pois a lógica foi integrada em 'processarJogada'
module.exports = { prepararJogo, processarJogada, dispararAcaoBot };