// games/Uno/uno.js

const { renderizarMao, renderizarCartaUnica } = require('./imageRendererUno');
// 1. REMOVEMOS a importação do 'whatsapp-web.js'
const path = require('path');
const fs = require('fs');
const sessionManager = require('../../sessions/sessionManager');
const { gerarBaralhoUno } = require('./baralhoUno');
const botPlayer = require('./botPlayer');

// As funções abaixo não precisam de alterações na sua lógica interna
function formatarMaoJogador(mao, gameState, cartasCompradas = []) {
    const corEmoji = { 'vermelho': '🟥', 'amarelo': '🟨', 'verde': '🟩', 'azul': '🟦', 'preto': '🎨' };
    let textoFinal = '*Sua mão atual:*\n';
    const maoAntiga = mao.filter(c => !cartasCompradas.includes(c));
    if (maoAntiga.length > 0) {
        maoAntiga.forEach((carta, index) => {
            textoFinal += `${index + 1}. ${corEmoji[carta.cor]} ${carta.valor}\n`;
        });
    } else if (cartasCompradas.length === 0) {
        return 'Você não tem mais cartas. Parabéns, você venceu!';
    }
    if (cartasCompradas.length > 0) {
        textoFinal += '---\n*Cartas compradas:*\n';
        cartasCompradas.forEach((carta, index) => {
            textoFinal += `${maoAntiga.length + index + 1}. ${corEmoji[carta.cor]} ${carta.valor}\n`;
        });
    }
    textoFinal += '\nPara jogar, use `!jogar <número da carta>`.';
    if (gameState && gameState.comprouNestaRodada) {
        textoFinal += '\nSe não puder jogar, use `!passar`.';
    }
    return textoFinal;
}

function prepararJogo(session) {
    session.status = 'em_jogo';
    session.gameState = { jogadores: session.players.map(p => ({ ...p, mao: [] })), baralho: gerarBaralhoUno(), pilhaDescarte: [], cartaAtual: null, jogadorDaVezIndex: 0, sentido: 1, corAtual: null, efeitoAcumulado: { tipo: null, quantidade: 0 }, comprouNestaRodada: false, disseUno: new Set() };
    console.log(`[UNO] Jogo preparado para ${session.groupId}`);
}

// 2. ATUALIZAMOS a assinatura da função (client -> sock)
async function iniciarPartida(session, sock) {
    const { gameState } = session;
    for (let i = 0; i < 7; i++) {
        for (const jogador of gameState.jogadores) {
            if (gameState.baralho.length === 0) break;
            jogador.mao.push(gameState.baralho.pop());
        }
    }
    let primeiraCarta = gameState.baralho.pop();
    while (primeiraCarta.valor === '+4') {
        gameState.baralho.push(primeiraCarta);
        for (let i = gameState.baralho.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [gameState.baralho[i], gameState.baralho[j]] = [gameState.baralho[j], gameState.baralho[i]];
        }
        primeiraCarta = gameState.baralho.pop();
    }
    gameState.pilhaDescarte.push(primeiraCarta);
    gameState.cartaAtual = primeiraCarta;
    gameState.corAtual = primeiraCarta.cor;

    for (const jogador of gameState.jogadores) {
        if (jogador.id.includes('@cpu.bot')) {
            console.log(`[UNO] Mão do Bot ${jogador.name}:`, jogador.mao.map(c => `${c.cor} ${c.valor}`).join(', '));
        } else {
            await enviarMaoGrafica(jogador, sock);
        }
    }

    try {
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const tempCardPath = path.join(tempDir, `initial_card_${Date.now()}.png`);
        await renderizarCartaUnica(primeiraCarta, tempCardPath);
        
        // 3. ATUALIZAMOS o envio de mídia para o padrão Baileys
        const legendaAnuncio = `*O jogo de UNO começou!* 🃏\n\nA primeira carta na mesa é:`;
        await sock.sendMessage(session.groupId, { image: { url: tempCardPath }, caption: legendaAnuncio });
        fs.unlinkSync(tempCardPath);

    } catch (error) {
        console.error('[UNO] Falha ao renderizar carta inicial, usando fallback de texto.', error);
        const corEmoji = { 'vermelho': '🟥', 'amarelo': '🟨', 'verde': '🟩', 'azul': '🟦', 'preto': '🎨' };
        await sock.sendMessage(session.groupId, { text: `*O jogo de UNO começou!* 🃏\n\nA primeira carta na mesa é: *${corEmoji[gameState.corAtual]} ${gameState.cartaAtual.valor}*` });
    }

    let anuncioEfeitos = '';
    const jogadorInicial = gameState.jogadores[gameState.jogadorDaVezIndex];

    switch (primeiraCarta.valor) {
        case 'pular':
            gameState.jogadorDaVezIndex = (gameState.jogadorDaVezIndex + gameState.sentido + gameState.jogadores.length) % gameState.jogadores.length;
            anuncioEfeitos += `*${jogadorInicial.name}* foi pulado!\n`;
            break;
        case 'reverso':
            gameState.sentido *= -1;
            gameState.jogadorDaVezIndex = (gameState.jogadorDaVezIndex + gameState.sentido + gameState.jogadores.length) % gameState.jogadores.length;
            anuncioEfeitos += `O sentido do jogo foi invertido!\n`;
            break;
        case '+2':
            anuncioEfeitos += `*${jogadorInicial.name}* compra 2 cartas e perde a vez!\n`;
            const cartasCompradas = [];
            for (let i = 0; i < 2; i++) {
                if (gameState.baralho.length === 0) await reembaralharPilha(session, sock);
                const carta = gameState.baralho.pop();
                jogadorInicial.mao.push(carta);
                cartasCompradas.push(carta);
            }
            if (!jogadorInicial.id.includes('@cpu.bot')) {
                await enviarMaoGrafica(jogadorInicial, sock, `O jogo começou e você já comprou 2 cartas!`);
            }
            gameState.jogadorDaVezIndex = (gameState.jogadorDaVezIndex + gameState.sentido + gameState.jogadores.length) % gameState.jogadores.length;
            break;
        case 'curinga':
            if (jogadorInicial.id.includes('@cpu.bot')) {
                const cores = ['vermelho', 'amarelo', 'verde', 'azul'];
                gameState.corAtual = cores[Math.floor(Math.random() * cores.length)];
                anuncioEfeitos += `*${jogadorInicial.name}* (BOT) escolheu a cor *${gameState.corAtual.toUpperCase()}*!\n`;
            } else {
                session.status = 'aguardando_escolha_cor';
                const anuncioCor = `*${jogadorInicial.name}*, você começa! Use \`!cor <vermelho|azul|verde|amarelo>\` para escolher a cor.`;
                await sock.sendMessage(session.groupId, { text: anuncioCor });
                return;
            }
            break;
    }

    const jogadorDaVez = gameState.jogadores[gameState.jogadorDaVezIndex];
    anuncioEfeitos += `É a vez de *${jogadorDaVez.name}* jogar.`;
    await sock.sendMessage(session.groupId, { text: anuncioEfeitos });

    const dummyDealer = { name: "Dealer" };
    await notificarVezDoJogador(session, sock, jogadorDaVez, dummyDealer);

    if (jogadorDaVez.id.includes('@cpu.bot')) {
        await dispararAcaoBot(session, sock);
    }
}

async function processarJogada(m, session, sock) {
    const { gameState } = session;
    const playerId = m.key.participant || m.key.remoteJid;
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const jogadorAtual = gameState.jogadores[gameState.jogadorDaVezIndex];

    if (!jogadorAtual || jogadorAtual.id !== playerId) {
        if (!playerId.includes('@cpu.bot')) { return sock.sendMessage(m.key.remoteJid, { text: "Opa, não é a sua vez de jogar!" }, { quoted: m }); }
        return;
    }
    const commandArgs = body.trim().split(/\s+/);
    const numeroCarta = parseInt(commandArgs[1]);
    if (isNaN(numeroCarta) || numeroCarta < 1 || numeroCarta > jogadorAtual.mao.length) {
        if (!playerId.includes('@cpu.bot')) { return sock.sendMessage(m.key.remoteJid, { text: `Número de carta inválido.` }, { quoted: m }); }
        return;
    }
    const indexCarta = numeroCarta - 1;
    const cartaJogada = jogadorAtual.mao[indexCarta];

    const { efeitoAcumulado } = gameState;
    if (efeitoAcumulado.quantidade > 0) {
        if (cartaJogada.valor !== efeitoAcumulado.tipo) {
            return sock.sendMessage(m.key.remoteJid, { text: `Você deve responder com uma carta *${efeitoAcumulado.tipo}* ou usar \`!comprar\`.` }, { quoted: m });
        }
    } else {
        const podeJogar = cartaJogada.cor === 'preto' || cartaJogada.cor === gameState.corAtual || cartaJogada.valor === gameState.cartaAtual.valor;
        if (!podeJogar) {
            if (!playerId.includes('@cpu.bot')) { return sock.sendMessage(m.key.remoteJid, { text: `Jogada inválida!` }, { quoted: m }); }
            return;
        }
    }
    
    if (cartaJogada.cor === 'preto') {
        const corEscolhida = commandArgs[2]?.toLowerCase();
        const coresValidas = ['vermelho', 'amarelo', 'verde', 'azul'];
        if (!corEscolhida || !coresValidas.includes(corEscolhida)) {
            return sock.sendMessage(m.key.remoteJid, { text: `Essa é uma carta coringa! Use: \`!jogar ${numeroCarta} <cor>\`` }, { quoted: m });
        }
        gameState.corAtual = corEscolhida;
    } else {
        gameState.corAtual = cartaJogada.cor;
    }

    jogadorAtual.mao.splice(indexCarta, 1);
    gameState.pilhaDescarte.push(cartaJogada);
    gameState.cartaAtual = cartaJogada;

    try {
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const tempCardPath = path.join(tempDir, `played_card_${Date.now()}.png`);

        await renderizarCartaUnica(cartaJogada, tempCardPath);
        
        let legendaAnuncio = `*${jogadorAtual.name}* jogou:`;
        if (cartaJogada.cor === 'preto') {
            legendaAnuncio += `\nE escolheu a cor *${gameState.corAtual.toUpperCase()}*!`;
        }

        await sock.sendMessage(session.groupId, { image: { url: tempCardPath }, caption: legendaAnuncio });
        fs.unlinkSync(tempCardPath);

    } catch (error) {
        console.error('[UNO] Falha ao anunciar jogada com imagem, usando fallback de texto.', error);
        const corEmoji = { 'vermelho': '🟥', 'amarelo': '🟨', 'verde': '🟩', 'azul': '🟦', 'preto': '🎨' };
        let anuncioJogada = `*${jogadorAtual.name}* jogou: *${corEmoji[cartaJogada.cor]} ${cartaJogada.valor}*`;
        if (cartaJogada.cor === 'preto') {
            anuncioJogada += ` e escolheu a cor *${gameState.corAtual.toUpperCase()}*!`;
        }
        await sock.sendMessage(session.groupId, { text: anuncioJogada });
    }

    if (!jogadorAtual.id.includes('@cpu.bot')) {
        await enviarMaoGrafica(jogadorAtual, sock, `Você jogou a carta. Esta é sua nova mão:`);
    }

    if (jogadorAtual.mao.length === 0) {
        await sock.sendMessage(session.groupId, { text: `*FIM DE JOGO!* 🏆\n*${jogadorAtual.name}* venceu a partida!` });
        sessionManager.endSession(session.groupId);
        return;
    }
    if (jogadorAtual.mao.length === 1 && !gameState.disseUno.has(playerId)) {
        await sock.sendMessage(session.groupId, { text: `UNO! 🗣️\n*${jogadorAtual.name}* tem apenas uma carta!` });
        gameState.disseUno.add(playerId);
    }

    if (cartaJogada.valor === 'reverso') {
        if (gameState.jogadores.length > 2) {
            gameState.sentido *= -1;
            await sock.sendMessage(session.groupId, { text: 'O sentido do jogo foi invertido!' });
        }
    }
    
    if (cartaJogada.valor === '+2' || cartaJogada.valor === '+4') {
        const eraAcumulado = gameState.efeitoAcumulado.quantidade > 0;
        gameState.efeitoAcumulado.tipo = cartaJogada.valor;
        gameState.efeitoAcumulado.quantidade += (cartaJogada.valor === '+2' ? 2 : 4);
        if (eraAcumulado) {
            await sock.sendMessage(session.groupId, { text: `💥 Efeito acumulado! Próximo jogador deve comprar *${gameState.efeitoAcumulado.quantidade}* ou responder com outra carta *${cartaJogada.valor}*!` });
        }
    }

    const devePular = cartaJogada.valor === 'pular' || (cartaJogada.valor === 'reverso' && gameState.jogadores.length === 2);
    
    await avancarTurno(session, sock, devePular);
}

// ... (Restante das funções adaptadas de forma similar)

async function notificarVezDoJogador(session, sock, jogadorDaVez, jogadorAnterior) {
    if (jogadorDaVez.id.includes('@cpu.bot')) return;
    const { gameState } = session;
    const corEmoji = { 'vermelho': '🟥', 'amarelo': '🟨', 'verde': '🟩', 'azul': '🟦', 'preto': '🎨' };
    const sentidoEmoji = gameState.sentido === 1 ? '➡️' : '⬅️';
    let notificacao = `Na mesa: *${corEmoji[gameState.corAtual]} ${gameState.cartaAtual.valor}* (${jogadorAnterior.name}) ${sentidoEmoji}\n*Sua vez!*`;
    if (gameState.efeitoAcumulado.quantidade > 0) {
        notificacao += `\n\n*ATENÇÃO!* Você deve jogar uma carta *${gameState.efeitoAcumulado.tipo}* ou usar \`!comprar\` para pegar *${gameState.efeitoAcumulado.quantidade}* cartas.`;
    }
    let commandLine = `\`!jogar <número>\` | \`!comprar\``;
    if (gameState.comprouNestaRodada) {
        commandLine += ` | \`!passar\``;
    }
    notificacao += `\n---\n${commandLine}`;
    await sock.sendMessage(jogadorDaVez.id, { text: notificacao });
}

async function avancarTurno(session, sock, pularProximo = false) {
    const { gameState } = session;
    const jogadorAnterior = gameState.jogadores[gameState.jogadorDaVezIndex];
    gameState.comprouNestaRodada = false;
    let proximoIndex = (gameState.jogadorDaVezIndex + gameState.sentido + gameState.jogadores.length) % gameState.jogadores.length;
    if (pularProximo) {
        const jogadorPulado = gameState.jogadores[proximoIndex];
        console.log(`[UNO] Ação pulou o turno de ${jogadorPulado.name}`);
        proximoIndex = (proximoIndex + gameState.sentido + gameState.jogadores.length) % gameState.jogadores.length;
    }
    gameState.jogadorDaVezIndex = proximoIndex;
    const jogadorDaVez = gameState.jogadores[gameState.jogadorDaVezIndex];
    await sock.sendMessage(session.groupId, { text: `É a vez de *${jogadorDaVez.name}*.` });
    await notificarVezDoJogador(session, sock, jogadorDaVez, jogadorAnterior);
    if (jogadorDaVez.id.includes('@cpu.bot')) {
        await dispararAcaoBot(session, sock);
    }
}

async function dispararAcaoBot(session, sock) {
    const { gameState } = session;
    const botId = gameState.jogadores[gameState.jogadorDaVezIndex].id;
    const botObject = gameState.jogadores.find(j => j.id === botId);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const comando = botPlayer.decideAction(gameState, botObject.mao);
    const fakeMessage = {
        key: { participant: botId, remoteJid: session.groupId },
        message: { conversation: comando }
    };
    if (comando.startsWith('!jogar')) {
        await processarJogada(fakeMessage, session, sock);
    } else if (comando === '!comprar') {
        await processarCompra(fakeMessage, session, sock);
    }
}

async function reembaralharPilha(session, sock) {
    const { gameState } = session;
    await sock.sendMessage(session.groupId, { text: "O baralho acabou! Reembaralhando as cartas da mesa...  shuffling" });
    const cartasParaEmbaralhar = gameState.pilhaDescarte.slice(0, -1);
    gameState.pilhaDescarte = [gameState.cartaAtual];
    gameState.baralho = cartasParaEmbaralhar;
    for (let i = gameState.baralho.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameState.baralho[i], gameState.baralho[j]] = [gameState.baralho[j], gameState.baralho[i]];
    }
}

async function processarEscolhaDeCor(m, session, sock) {
    const { gameState } = session;
    const playerId = m.key.participant || m.key.remoteJid;
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const jogadorAtual = gameState.jogadores[gameState.jogadorDaVezIndex];

    if (session.status !== 'aguardando_escolha_cor') return;
    if (jogadorAtual.id !== playerId) return sock.sendMessage(m.key.remoteJid, { text: "Não é sua vez de escolher a cor!" }, { quoted: m });

    const corEscolhida = body.split(' ')[1]?.toLowerCase();
    const coresValidas = ['vermelho', 'azul', 'verde', 'amarelo'];
    if (!coresValidas.includes(corEscolhida)) {
        return sock.sendMessage(m.key.remoteJid, { text: `Cor inválida! Escolha entre: ${coresValidas.join(', ')}.` }, { quoted: m });
    }

    gameState.corAtual = corEscolhida;
    session.status = 'em_jogo';

    const corEmoji = { 'vermelho': '🟥', 'amarelo': '🟨', 'verde': '🟩', 'azul': '🟦' };
    const msgGrupo = `*${jogadorAtual.name}* escolheu a cor *${corEmoji[corEscolhida]} ${corEscolhida.toUpperCase()}*!`;
    await sock.sendMessage(session.groupId, { text: msgGrupo });

    if (!jogadorAtual.id.includes('@cpu.bot')) {
        await sock.sendMessage(jogadorAtual.id, { text: `✅ Cor definida para *${corEscolhida.toUpperCase()}*!` });
    }

    gameState.disseUno.delete(playerId);
    const ultimaCarta = gameState.cartaAtual;
    const devePular = ultimaCarta.valor === 'pular' || (ultimaCarta.valor === 'reverso' && gameState.jogadores.length === 2);
    await avancarTurno(session, sock, devePular);
}

async function processarCompra(m, session, sock) {
    const { gameState } = session;
    const playerId = m.key.participant || m.key.remoteJid;
    const jogadorAtual = gameState.jogadores[gameState.jogadorDaVezIndex];

    if (jogadorAtual.id !== playerId) return;

    if (gameState.efeitoAcumulado.quantidade > 0) {
        const { quantidade, tipo } = gameState.efeitoAcumulado;
        const cartasCompradas = [];
        await sock.sendMessage(session.groupId, { text: `*${jogadorAtual.name}* não tinha uma carta *${tipo}* e comprou *${quantidade}* cartas!` });
        for (let i = 0; i < quantidade; i++) {
            if (gameState.baralho.length === 0) await reembaralharPilha(session, sock);
            const carta = gameState.baralho.pop();
            jogadorAtual.mao.push(carta);
            cartasCompradas.push(carta);
        }
        if (!jogadorAtual.id.includes('@cpu.bot')) {
            const legenda = `Você comprou ${cartasCompradas.length} cartas. Esta é sua nova mão:`;
            await enviarMaoGrafica(jogadorAtual, sock, legenda);
        }
        gameState.efeitoAcumulado = { tipo: null, quantidade: 0 };
        await avancarTurno(session, sock);

    } else {
        if (gameState.comprouNestaRodada) {
            return sock.sendMessage(m.key.remoteJid, { text: "Você já comprou uma carta nesta rodada." }, { quoted: m });
        }
        if (gameState.baralho.length === 0) await reembaralharPilha(session, sock);
        
        const cartaComprada = gameState.baralho.pop();
        jogadorAtual.mao.push(cartaComprada);
        gameState.comprouNestaRodada = true;
        gameState.disseUno.delete(playerId);

        await sock.sendMessage(session.groupId, { text: `*${jogadorAtual.name}* comprou uma carta.` });

        if (jogadorAtual.id.includes('@cpu.bot')) {
            const podeJogar = cartaComprada.cor === 'preto' || cartaComprada.cor === gameState.corAtual || cartaComprada.valor === gameState.cartaAtual.valor;
            await new Promise(resolve => setTimeout(resolve, 1500));
            if (podeJogar) {
                const numeroDaCarta = jogadorAtual.mao.length;
                let comandoBot = `!jogar ${numeroDaCarta}`;
                if (cartaComprada.cor === 'preto') {
                    const cores = ['vermelho', 'amarelo', 'verde', 'azul'];
                    const corAleatoria = cores[Math.floor(Math.random() * cores.length)];
                    comandoBot += ` ${corAleatoria}`;
                }
                const fakeMessageJogar = { key: { participant: playerId, remoteJid: session.groupId }, message: { conversation: comandoBot } };
                await processarJogada(fakeMessageJogar, session, sock);
            } else {
                console.log(`[UnoBot] Carta comprada (${cartaComprada.cor} ${cartaComprada.valor}) não é jogável. O bot vai passar a vez.`);
                const fakeMessagePassar = { key: { participant: playerId, remoteJid: session.groupId }, message: { conversation: '!passar' } };
                await processarPasse(fakeMessagePassar, session, sock);
            }
        } else {
            const legenda = `Você comprou uma carta. Esta é sua nova mão:`;
            await enviarMaoGrafica(jogadorAtual, sock, legenda);
            const notificacaoAcao = `*Sua vez!*\n---\n\`!jogar <número>\` | \`!passar\``;
            await sock.sendMessage(jogadorAtual.id, { text: notificacaoAcao });
        }
    }
}

async function processarPasse(m, session, sock) {
    const { gameState } = session;
    const playerId = m.key.participant || m.key.remoteJid;
    const jogadorAtual = gameState.jogadores[gameState.jogadorDaVezIndex];

    if (!jogadorAtual || jogadorAtual.id !== playerId) {
        return sock.sendMessage(m.key.remoteJid, { text: "Opa, não é a sua vez de jogar!" }, { quoted: m });
    }
    if (!gameState.comprouNestaRodada) {
        return sock.sendMessage(m.key.remoteJid, { text: "Você só pode passar a vez depois de ter comprado uma carta." }, { quoted: m });
    }
    await sock.sendMessage(session.groupId, { text: `*${jogadorAtual.name}* passou a vez.` });
    await avancarTurno(session, sock);
}

async function enviarMaoGrafica(jogador, sock, legenda = '') {
    if (jogador.id.includes('@cpu.bot')) {
        console.log(`[UNO] Mão do Bot ${jogador.name}:`, jogador.mao.map(c => `${c.cor} ${c.valor}`).join(', '));
        return;
    }

    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const outputPath = path.join(tempDir, `${jogador.id}.png`);

    try {
        const imagePath = await renderizarMao(jogador.mao, outputPath);
        if (imagePath) {
            await sock.sendMessage(jogador.id, { image: { url: imagePath }, caption: legenda || 'Sua mão atual:' });
            fs.unlinkSync(imagePath);
        } else if (jogador.mao.length === 0) {
             await sock.sendMessage(jogador.id, { text: 'Você não tem mais cartas!' });
        }
    } catch (error) {
        console.error('[UNO] Erro ao renderizar ou enviar imagem da mão:', error);
        await sock.sendMessage(jogador.id, { text: formatarMaoJogador(jogador.mao, null) });
    }
}

module.exports = { 
    prepararJogo, 
    iniciarPartida, 
    processarJogada,
    processarEscolhaDeCor,
    processarCompra,
    processarPasse
};