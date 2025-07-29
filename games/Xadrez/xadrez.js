// games/Xadrez/xadrez.js

// 1. REMOVEMOS MessageMedia e adicionamos fs
const { Chess } = require('chess.js');
const fs = require('fs');
const path = require('path');
const imageRenderer = require('./imageRenderer');
const xadrezBot = require('./botPlayer');
const sessionManager = require('../../sessions/sessionManager');

// A função prepararJogo não precisa de alterações
function prepararJogo(session) {
    const game = new Chess();
    session.gameState = {
        fen: game.fen(),
        jogadorDaVez: 'w',
        historico: [],
    };
    console.log('[Xadrez] Jogo preparado. FEN inicial:', session.gameState.fen);
}

/**
 * Função auxiliar para aplicar uma jogada, anunciar o resultado e passar a vez.
 * Adaptada para Baileys.
 */
async function aplicarJogadaEAnunciar(moveString, session, sock, m) {
    const game = new Chess(session.gameState.fen);
    const moveResult = game.move(moveString, { sloppy: true });

    if (moveResult === null) {
        // Apenas responde se a jogada for de um humano
        if (m.key.participant !== botPlayer.BOT_ID) {
            await sock.sendMessage(m.key.remoteJid, { text: '❌ Movimento inválido! Verifique a jogada e tente novamente.' }, { quoted: m });
        }
        return;
    }

    session.gameState.fen = game.fen();
    session.gameState.jogadorDaVez = game.turn();
    session.gameState.historico.push(moveResult.san);

    const imagemBuffer = await imageRenderer.renderBoardToImage(session.gameState);
    
    let legenda = `*${session.players[moveResult.color === 'w' ? 0 : 1].name}* jogou *${moveResult.san}*.`;

    if (game.isCheckmate() || game.isDraw()) {
        if (game.isCheckmate()) {
            legenda += `\n\n🏆 *XEQUE-MATE!* O jogador *${session.players[moveResult.color === 'w' ? 0 : 1].name}* venceu!`;
        } else {
            legenda += `\n\n🤝 *EMPATE!* O jogo terminou empatado.`;
        }
        
        if (imagemBuffer) {
            await sock.sendMessage(session.groupId, { image: imagemBuffer, caption: legenda });
        } else {
            await sock.sendMessage(session.groupId, { text: legenda + "\n\n(Erro ao gerar imagem)" });
        }
        sessionManager.endSession(session.groupId);
        return;
    }

    const proximoJogador = session.players[game.turn() === 'w' ? 0 : 1];
    legenda += `\n\nÉ a vez de *${proximoJogador.name}* (${game.turn() === 'w' ? 'Brancas' : 'Pretas'}).`;
    if (game.inCheck()) {
        legenda += `\n\n⚠️ *Você está em XEQUE!*`;
    }

    if (imagemBuffer) {
        await sock.sendMessage(session.groupId, { image: imagemBuffer, caption: legenda });
    } else {
        await sock.sendMessage(session.groupId, { text: '❌ Ocorreu um erro ao gerar a imagem do tabuleiro.' }, { quoted: m });
    }
    
    if (proximoJogador.id === xadrezBot.BOT_ID) {
        await sock.sendMessage(session.groupId, { text: `🤖 *${xadrezBot.BOT_NAME}* está pensando...` });
        const botMove = xadrezBot.getBotMove(session.gameState.fen);
        if (botMove) {
            // Criamos uma mensagem 'fake' para o bot
            const fakeMessage = { 
                key: { remoteJid: session.groupId, participant: botPlayer.BOT_ID },
                message: { conversation: `!mover ${botMove}` }
            };
            await aplicarJogadaEAnunciar(botMove, session, sock, fakeMessage);
        } else {
            await sock.sendMessage(session.groupId, { text: `O Bot não encontrou movimentos possíveis (Fim de Jogo).` });
        }
    }
}

/**
 * Manipula o comando !mover do jogador.
 */
async function processarJogada(m, session, sock) {
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const commandArgs = body.split(' ');

    if (commandArgs.length !== 3) {
        return await sock.sendMessage(m.key.remoteJid, { text: 'Formato incorreto. Use: `!mover <origem> <destino>` (ex: `!mover e2 e4`)' }, { quoted: m });
    }
    const fromSquare = commandArgs[1].toLowerCase();
    const toSquare = commandArgs[2].toLowerCase();
    const moveString = `${fromSquare}${toSquare}`;
    
    await aplicarJogadaEAnunciar(moveString, session, sock, m);
}

/**
 * Envia o estado atual do tabuleiro.
 */
async function enviarTabuleiroAtual(session, sock) {
    const { gameState } = session;
    const jogadorAtualIndex = gameState.jogadorDaVez === 'w' ? 0 : 1;
    const jogadorAtual = session.players[jogadorAtualIndex];
    
    const imagemBuffer = await imageRenderer.renderBoardToImage(gameState);
    const legenda = `É a vez de *${jogadorAtual.name}* (${jogadorAtualIndex === 0 ? 'Brancas' : 'Pretas'}).`;
    
    if (imagemBuffer) {
        await sock.sendMessage(session.groupId, { image: imagemBuffer, caption: legenda });
    } else {
        await sock.sendMessage(session.groupId, { text: "❌ Ocorreu um erro ao gerar a imagem do tabuleiro." });
    }
}

module.exports = {
    prepararJogo,
    processarJogada,
    enviarTabuleiroAtual,
    aplicarJogadaEAnunciar // Exportamos para o bot poder chamar
};