// games/Truco/truco.js

// 1. IMPORTAÇÕES ATUALIZADAS (sem MessageMedia, com fs)
const sessionManager = require('../../sessions/sessionManager');
const baralhoUtils = require('../baralhoUtils');
const trucoBot = require('./botPlayer');
const fs = require('fs');

// --- CONSTANTES E FUNÇÕES DE LÓGICA (sem alterações) ---
const NAIPE_EMOJI = { 's': '♠️', 'h': '♥️', 'd': '♦️', 'c': '♣️' };
const ORDEM_FORCA_COMUM = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
const ORDEM_FORCA_NAIPE_MANILHA = { 'd': 1, 's': 2, 'h': 3, 'c': 4 };
const ORDEM_MANILHAS = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];

function getManilhaValor(vira) {
    const valorVira = vira[0];
    const indexVira = ORDEM_MANILHAS.indexOf(valorVira);
    const indexManilha = (indexVira + 1) % ORDEM_MANILHAS.length;
    return ORDEM_MANILHAS[indexManilha];
}

function formatarMaoParaMensagem(mao, manilhaValor) {
    // Esta função não precisa de alterações
    let textoMao = 'Sua mão:\n\n';
    let temCarta = false;
    mao.forEach((carta, index) => {
        if (carta) {
            temCarta = true;
            const valor = carta[0];
            const naipe = carta[1];
            textoMao += `${index + 1}. ${valor}${NAIPE_EMOJI[naipe]}\n`;
        }
    });
    textoMao += `\n*Manilha:* ${manilhaValor}\n\n`;
    if (!temCarta) {
        return 'Você não tem mais cartas para jogar.';
    }
    textoMao += '\nPara jogar, digite:\n`!carta <número>`\nou\n`!carta <número> hide` (para esconder)';
    return textoMao;
}

function getForcaCarta(carta, manilhaValor) {
    // Esta função não precisa de alterações
    const valor = carta[0];
    const naipe = carta[1];
    if (valor === manilhaValor) {
        return 100 + ORDEM_FORCA_NAIPE_MANILHA[naipe];
    }
    return ORDEM_FORCA_COMUM.indexOf(valor);
}

function prepararJogo(session) {
    // Esta função não precisa de alterações
    console.log(`[Truco] Preparando jogo para a sessão: ${session.groupId}`);
    session.gameState = { rodada: 1, placar: { time1: 0, time2: 0 }, valorDaMao: 1, turnosGanhos: { time1: 0, time2: 0 }, vencedorPrimeiroTurno: null, primeiroTurnoEmpatado: false, numeroDoTurno: 1, jogadores: session.players.map(p => ({ ...p, mao: [] })), baralho: [], vira: null, manilhaValor: null, cartasNaMesa: [], vezDoJogador: 0, maoDaVez: 0, status: 'aguardando_jogada', trucoState: null, actionLock: false, botActionId: null };
    session.status = 'em_jogo';
    console.log(`[Truco] Jogo preparado com ${session.gameState.jogadores.length} jogadores.`);
}

// 2. ASSINATURAS DAS FUNÇÕES ATUALIZADAS (client -> sock, message -> m)

async function iniciarRodada(session, sock) {
    console.log(`[Truco] Iniciando rodada para a sessão: ${session.groupId}`);
    const gameState = session.gameState;
    
    const baralho = baralhoUtils.gerarBaralhoTruco();
    const vira = baralho.pop();
    gameState.vira = vira;
    gameState.baralho = baralho;
    gameState.manilhaValor = getManilhaValor(vira);
    console.log(`[Truco] Vira: ${vira} | Manilha: ${gameState.manilhaValor}`);
    
    for (const jogador of gameState.jogadores) {
        jogador.mao = gameState.baralho.splice(0, 3);
    }
    
    for (const jogador of gameState.jogadores) {
        if (jogador.id === trucoBot.BOT_ID) {
            console.log(`[Truco] Mão do Bot ${jogador.name}: ${jogador.mao.join(', ')}`);
        } else {
            try {
                const imagePath = await baralhoUtils.gerarImagemCartas(jogador.mao);
                const textoMao = formatarMaoParaMensagem(jogador.mao, gameState.manilhaValor);

                if (imagePath) {
                    // 3. ENVIO DE MÍDIA ATUALIZADO
                    await sock.sendMessage(jogador.id, { image: { url: imagePath }, caption: textoMao });
                    fs.unlinkSync(imagePath);
                } else {
                    await sock.sendMessage(jogador.id, { text: textoMao });
                }
            } catch (error) {
                console.error(`[Truco] Falha ao enviar mão para ${jogador.id}. Erro:`, error);
                await sock.sendMessage(jogador.id, { text: `Sua mão: ${jogador.mao.join(', ')}` });
            }
        }
    }
    
    const jogadorDaVez = gameState.jogadores[gameState.vezDoJogador];
    try {
        const viraImagePath = await baralhoUtils.gerarImagemCartas([vira]);
        if (viraImagePath) {
            const caption = `*Rodada ${gameState.rodada} começando!* 🎴\n\nO *vira* é este. A manilha é *${gameState.manilhaValor}*.\n\nÉ a vez de *${jogadorDaVez.name}* jogar!`;
            await sock.sendMessage(session.groupId, { image: { url: viraImagePath }, caption: caption });
            fs.unlinkSync(viraImagePath);
        }
    } catch (error) {
        console.error('[Truco] Falha ao gerar imagem do vira. Enviando como texto. Erro:', error);
        await sock.sendMessage(session.groupId, { text: `*Rodada ${gameState.rodada} começando!* 🎴\n\nO *vira* é *${vira}*. A manilha é *${gameState.manilhaValor}*.\n\nÉ a vez de *${jogadorDaVez.name}* jogar!` });
    }

    gameState.status = 'aguardando_jogada';
    if (jogadorDaVez.id === trucoBot.BOT_ID) {
        await processarAcaoBot(session, sock);
    } else {
        gameState.actionLock = false;
    }
}

async function finalizarMao(session, sock, motivo = { tipo: 'vitoria_normal' }) {
    // ... (lógica interna não muda, apenas as chamadas de envio)
    const gameState = session.gameState;
    const { placar } = gameState;
    let mensagemResultado = '';

    switch (motivo.tipo) {
        case 'fuga':
            const nomeTimeVencedorFuga = motivo.timeVencedor === 'time1' ? 'Time Blue 🔵' : 'Time Red 🔴';
            const timeQueCorreu = motivo.timeVencedor === 'time1' ? 'Time Red 🔴' : 'Time Blue 🔵';
            mensagemResultado = `*${timeQueCorreu}* correu da aposta! 🏃‍♂️\n\n*${nomeTimeVencedorFuga}* marcou *${motivo.valor}* ponto(s).`;
            break;
        default:
            const { turnosGanhos, valorDaMao } = gameState;
            let timeVencedor = null;
            if (turnosGanhos.time1 > turnosGanhos.time2) {
                timeVencedor = 'time1';
                placar.time1 += valorDaMao;
            } else if (turnosGanhos.time2 > turnosGanhos.time1) {
                timeVencedor = 'time2';
                placar.time2 += valorDaMao;
            }
            if (timeVencedor) {
                const nomeTimeVencedor = timeVencedor === 'time1' ? 'Time Blue 🔵' : 'Time Red 🔴';
                mensagemResultado = `*${nomeTimeVencedor}* venceu a mão e marcou *${valorDaMao}* ponto(s).`;
            } else {
                mensagemResultado = `A mão empatou! Ninguém marcou pontos.`;
            }
            break;
    }

    const mensagemPlacar = `*Fim da mão!*\n\n${mensagemResultado}\n\n*Placar:*\nTime Blue 🔵: *${placar.time1}* \nTime Red 🔴: *${placar.time2}*`;
    await sock.sendMessage(session.groupId, { text: mensagemPlacar });

    if (placar.time1 >= 12 || placar.time2 >= 12) {
        const nomeTimeVencedor = placar.time1 >= 12 ? 'Time Blue 🔵' : 'Time Red 🔴';
        await sock.sendMessage(session.groupId, { text: `*O JOGO ACABOU!* 🏆\n\nParabéns ao *${nomeTimeVencedor}* pela vitória!` });
        sessionManager.endSession(session.groupId);
        return;
    }

    gameState.rodada++;
    gameState.numeroDoTurno = 1;
    gameState.valorDaMao = 1;
    gameState.turnosGanhos = { time1: 0, time2: 0 };
    gameState.primeiroTurnoEmpatado = false;
    gameState.cartasNaMesa = [];
    gameState.botActionId = null;
    gameState.vezDoJogador = (gameState.rodada - 1) % gameState.jogadores.length;

    await sock.sendMessage(session.groupId, { text: `--- Preparando a ${gameState.rodada}ª mão ---` });
    await iniciarRodada(session, sock);
}

async function finalizarTurno(session, sock) {
    // ... (lógica interna não muda, apenas as chamadas de envio)
    const gameState = session.gameState;
    let maiorForca = -1;
    let jogadaVencedora = null;
    for (const jogada of gameState.cartasNaMesa) {
        const forca = jogada.isHidden ? -1 : getForcaCarta(jogada.carta, gameState.manilhaValor);
        if (forca > maiorForca) {
            maiorForca = forca;
            jogadaVencedora = jogada;
        }
    }
    const vencedores = gameState.cartasNaMesa.filter(j => !j.isHidden && getForcaCarta(j.carta, gameState.manilhaValor) === maiorForca);
    let mensagemResultado = '';
    let aMaoAcabou = false;

    if (vencedores.length > 1) {
        mensagemResultado = 'O turno *empatou*!';
        if (gameState.numeroDoTurno === 1) {
            gameState.primeiroTurnoEmpatado = true;
            mensagemResultado += '\nQuem vencer o próximo turno, leva a mão!';
        } else {
            aMaoAcabou = true;
        }
    } else {
        const jogadorVencedor = gameState.jogadores.find(p => p.id === jogadaVencedora.jogadorId);
        const timeIndex = gameState.jogadores.findIndex(p => p.id === jogadorVencedor.id);
        const timeVencedorTurno = (timeIndex % 2 === 0) ? 'time1' : 'time2';
        gameState.turnosGanhos[timeVencedorTurno]++;
        if (gameState.numeroDoTurno === 1) {
            gameState.vencedorPrimeiroTurno = timeVencedorTurno;
        }
        mensagemResultado = `*${jogadorVencedor.name}* (${timeVencedorTurno === 'time1' ? '🔵' : '🔴'}) venceu o turno!`;
    }
    
    await sock.sendMessage(session.groupId, { text: mensagemResultado });

    const { turnosGanhos, numeroDoTurno, primeiroTurnoEmpatado } = gameState;
    if (aMaoAcabou || turnosGanhos.time1 === 2 || turnosGanhos.time2 === 2 || (primeiroTurnoEmpatado && numeroDoTurno === 2 && turnosGanhos.time1 !== turnosGanhos.time2) || numeroDoTurno === 3) {
        await finalizarMao(session, sock);
        return;
    }

    gameState.numeroDoTurno++;
    gameState.cartasNaMesa = [];
    
    let proximoJogadorIndex;
    if (vencedores.length > 1) {
        proximoJogadorIndex = gameState.maoDaVez;
    } else if (turnosGanhos.time1 === 1 && turnosGanhos.time2 === 1) {
        proximoJogadorIndex = gameState.jogadores.findIndex(p => {
            const timeDoJogador = (gameState.jogadores.findIndex(j => j.id === p.id) % 2 === 0) ? 'time1' : 'time2';
            return timeDoJogador === gameState.vencedorPrimeiroTurno;
        });
    } else {
        proximoJogadorIndex = gameState.jogadores.findIndex(p => p.id === jogadaVencedora.jogadorId);
    }
        
    gameState.vezDoJogador = proximoJogadorIndex;
    gameState.maoDaVez = proximoJogadorIndex; 
    
    const proximoJogador = gameState.jogadores[proximoJogadorIndex];
    await sock.sendMessage(session.groupId, { text: `--- ${gameState.numeroDoTurno}º Turno ---\nÉ a vez de *${proximoJogador.name}* jogar.` });
    
    if (proximoJogador.id === trucoBot.BOT_ID) {
        await processarAcaoBot(session, sock);
    } else {
        gameState.actionLock = false;
    }
}

async function jogarCarta(m, session, sock, isInternalCall = false) {
    const gameState = session.gameState;
    if (gameState.actionLock && !isInternalCall) {
        return console.log('[Truco] Ação ignorada: Jogo está processando outra ação.');
    }
    gameState.actionLock = true;

    try {
        const playerId = m.key.participant || m.key.remoteJid;
        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const jogadorAtualIndex = gameState.vezDoJogador;
        const jogador = gameState.jogadores[jogadorAtualIndex];

        if (gameState.status !== 'aguardando_jogada' || jogador.id !== playerId) {
            if (playerId !== trucoBot.BOT_ID) {
                sock.sendMessage(m.key.remoteJid, { text: "Calma, não é sua vez de jogar!" }, { quoted: m });
            }
            gameState.actionLock = false;
            return;
        }

        const args = body.split(' ');
        const numeroCarta = parseInt(args[1]);
        if (isNaN(numeroCarta) || numeroCarta < 1 || numeroCarta > 3 || !jogador.mao[numeroCarta - 1]) {
            sock.sendMessage(m.key.remoteJid, { text: `Carta inválida. Verifique os números disponíveis na sua mão.` }, { quoted: m });
            gameState.actionLock = false;
            return;
        }
        
        const isHidden = args[2]?.toLowerCase() === 'hide';
        const cartaJogada = jogador.mao[numeroCarta - 1];
        jogador.mao[numeroCarta - 1] = null;
        gameState.cartasNaMesa.push({ jogadorId: playerId, carta: cartaJogada, isHidden: isHidden });
        console.log(`[Truco] Jogador ${jogador.name} jogou ${cartaJogada}${isHidden ? ' (escondida)' : ''}`);

        if (isHidden) {
            await sock.sendMessage(session.groupId, { text: `*${jogador.name}* jogou uma carta virada para baixo. 🤫` });
        } else {
            const imagePath = await baralhoUtils.gerarImagemCartas([cartaJogada]);
            await sock.sendMessage(session.groupId, { image: { url: imagePath }, caption: `*${jogador.name}* jogou:` });
            fs.unlinkSync(imagePath);
        }

        if (jogador.id !== trucoBot.BOT_ID) {
            const maoRestante = jogador.mao.filter(c => c !== null);
            if (maoRestante.length > 0) {
                 const imagePathMao = await baralhoUtils.gerarImagemCartas(maoRestante);
                 const textoMao = formatarMaoParaMensagem(jogador.mao, gameState.manilhaValor);
                 await sock.sendMessage(jogador.id, { image: { url: imagePathMao }, caption: textoMao });
                 fs.unlinkSync(imagePathMao);
            } else {
                 await sock.sendMessage(jogador.id, { text: "Você jogou sua última carta!" });
            }
        }
        
        const totalJogadores = gameState.jogadores.length;
        if (gameState.cartasNaMesa.length === totalJogadores) {
            await finalizarTurno(session, sock);
        } else {
            gameState.vezDoJogador = (jogadorAtualIndex + 1) % totalJogadores;
            const proximoJogador = gameState.jogadores[gameState.vezDoJogador];
            await sock.sendMessage(session.groupId, { text: `É a vez de *${proximoJogador.name}*!` });

            if (proximoJogador.id === trucoBot.BOT_ID) {
                await processarAcaoBot(session, sock);
            } else {
                gameState.actionLock = false;
            }
        }
    } catch (error) {
        console.error("[Truco] Erro em jogarCarta:", error);
        gameState.actionLock = false;
    }
}

async function processarAcaoBot(session, sock) {
    // ... (lógica interna não muda, apenas a criação da fakeMessage)
    const gameState = session.gameState;
    const currentActionId = Date.now();
    gameState.botActionId = currentActionId;

    try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (gameState.botActionId !== currentActionId) {
            return; 
        }

        const comandoBot = trucoBot.decideAction(session);
        if (!comandoBot) {
            gameState.actionLock = false;
            return;
        }

        console.log(`[Truco Bot] Processando comando: "${comandoBot}"`);

        const fakeMessage = {
            key: { participant: trucoBot.BOT_ID, remoteJid: session.groupId },
            message: { conversation: comandoBot }
        };

        const command = comandoBot.split(' ')[0].toLowerCase();
        if (command === '!carta') {
            await jogarCarta(fakeMessage, session, sock, true);
        } else if (command === '!aceitar') {
            await aceitarTruco(fakeMessage, session, sock);
        } else if (command === '!correr') {
            await correrDoTruco(fakeMessage, session, sock);
        }
    } catch (error) {
        console.error("[Truco] Erro ao processar ação do bot:", error);
        gameState.actionLock = false;
    }
}

async function pedirTruco(m, session, sock) {
    const playerId = m.key.participant || m.key.remoteJid;
    const gameState = session.gameState;

    if (gameState.status !== 'aguardando_jogada') return;
    if (gameState.valorDaMao > 1) {
        return sock.sendMessage(m.key.remoteJid, { text: "Opa, alguém já pediu truco ou mais!" }, { quoted: m });
    }

    const playerIndex = gameState.jogadores.findIndex(p => p.id === playerId);
    const callingTeam = (playerIndex % 2 === 0) ? 'time1' : 'time2';
    const opponentTeam = (playerIndex % 2 === 0) ? 'time2' : 'time1';

    gameState.status = 'aguardando_resposta_truco';
    gameState.valorDaMao = 3;
    gameState.trucoState = { challengedBy: callingTeam, pendingResponseFrom: opponentTeam };
    
    const opponentTeamName = opponentTeam === 'time1' ? 'Time Blue 🔵' : 'Time Red 🔴';
    await sock.sendMessage(session.groupId, { text: `🗣️ *TRUCO!!!* \nA mão agora vale *3 pontos*! \n\nO ${opponentTeamName} deve responder com \`!aceitar\`, \`!correr\` ou \`!pede6\`.` });

    const botIndex = gameState.jogadores.findIndex(p => p.id === trucoBot.BOT_ID);
    if (botIndex !== -1) {
        const botTeam = (botIndex % 2 === 0) ? 'time1' : 'time2';
        if (botTeam === opponentTeam) {
            await processarAcaoBot(session, sock);
        }
    }
}

async function aceitarTruco(m, session, sock) {
    const playerId = m.key.participant || m.key.remoteJid;
    const gameState = session.gameState;

    if (gameState.status !== 'aguardando_resposta_truco') return;

    const playerIndex = gameState.jogadores.findIndex(p => p.id === playerId);
    const playerTeam = (playerIndex % 2 === 0) ? 'time1' : 'time2';

    if (playerTeam !== gameState.trucoState.pendingResponseFrom) {
        return sock.sendMessage(m.key.remoteJid, { text: "Calma, não é seu time que responde!" }, { quoted: m });
    }

    gameState.status = 'aguardando_jogada';
    gameState.trucoState = null;

    const jogadorDaVez = gameState.jogadores[gameState.vezDoJogador];
    await sock.sendMessage(session.groupId, { text: `✅ A aposta foi aceita! O jogo continua valendo *${gameState.valorDaMao}* pontos. \n\nÉ a vez de *${jogadorDaVez.name}* jogar.` });

    if (jogadorDaVez.id === trucoBot.BOT_ID) {
        await processarAcaoBot(session, sock);
    } else {
        gameState.actionLock = false;
    }
}

async function correrDoTruco(m, session, sock) {
    const playerId = m.key.participant || m.key.remoteJid;
    const gameState = session.gameState;
    
    if (gameState.status !== 'aguardando_resposta_truco') return;
    
    const playerIndex = gameState.jogadores.findIndex(p => p.id === playerId);
    const playerTeam = (playerIndex % 2 === 0) ? 'time1' : 'time2';
    if (playerTeam !== gameState.trucoState.pendingResponseFrom) return;

    const valorCorrido = gameState.valorDaMao === 3 ? 1 : (gameState.valorDaMao / 2);
    const timeVencedor = gameState.trucoState.challengedBy;
    
    gameState.placar[timeVencedor] += valorCorrido;

    await finalizarMao(session, sock, { 
        tipo: 'fuga', 
        timeVencedor: timeVencedor,
        valor: valorCorrido 
    });
}

async function aumentarAposta(m, session, sock) {
    const playerId = m.key.participant || m.key.remoteJid;
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const command = body.split(' ')[0].toLowerCase();
    const gameState = session.gameState;

    if (gameState.status !== 'aguardando_resposta_truco') return;
    
    const apostas = { '!pede6': 6, '!pede9': 9, '!pede12': 12 };
    const novoValor = apostas[command];

    if (!novoValor || novoValor <= gameState.valorDaMao) {
        return sock.sendMessage(m.key.remoteJid, { text: "Aposta inválida!" }, { quoted: m });
    }

    const playerIndex = gameState.jogadores.findIndex(p => p.id === playerId);
    const playerTeam = (playerIndex % 2 === 0) ? 'time1' : 'time2';
    
    if (playerTeam !== gameState.trucoState.pendingResponseFrom) return;

    const newOpponentTeam = gameState.trucoState.challengedBy;
    gameState.valorDaMao = novoValor;
    gameState.trucoState = { challengedBy: playerTeam, pendingResponseFrom: newOpponentTeam };
    
    const opponentTeamName = newOpponentTeam === 'time1' ? 'Time Blue 🔵' : 'Time Red 🔴';
    await sock.sendMessage(session.groupId, { text: `CHAMOU PRA BRIGA! A aposta subiu para *${novoValor} PONTOS*! 💥\n\nE agora, ${opponentTeamName}? \`!aceitar\` ou \`!correr\`?` });

    const botIndex = gameState.jogadores.findIndex(p => p.id === trucoBot.BOT_ID);
    if (botIndex !== -1) {
        const botTeam = (botIndex % 2 === 0) ? 'time1' : 'time2';
        if (botTeam === newOpponentTeam) {
            await processarAcaoBot(session, sock);
        }
    }
}

function limparTudo() {
    console.log('[Truco] Módulo de truco resetado.');
}

module.exports = {
    prepararJogo,
    iniciarRodada,
    jogarCarta,
    pedirTruco,
    aceitarTruco,
    correrDoTruco,
    aumentarAposta,
    getManilhaValor,
    limparTudo
};