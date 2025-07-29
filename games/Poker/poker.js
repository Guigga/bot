// games/Poker/poker.js

// 1. IMPORTAÇÕES ATUALIZADAS (sem 'whatsapp-web.js')
const fs = require('fs');
const path = require('path');
const { gerarBaralho, gerarImagemCartas } = require('../baralhoUtils');
const { avaliarMaos } = require('./avaliadorPoker');
const chipManager = require('../../economy/chipManager');
const sessionManager = require('../../sessions/sessionManager');
const { getFormattedId } = require('./pokerValidators');
const botPlayer = require('./botPlayer');

// --- CONSTANTES (sem alterações) ---
const INITIAL_SMALL_BLIND = 50;
const INITIAL_BIG_BLIND = 100;
const BLIND_INCREASE_ROUNDS = 3;

// --- FUNÇÕES DE LÓGICA (sem alterações na lógica interna) ---

function formatarCartasArray(cartas) {
    const valorMap = { 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A' };
    const naipeMap = { 's': '♠️', 'h': '♥️', 'd': '♦️', 'c': '♣️' };
    if (!Array.isArray(cartas) || cartas.length === 0) return [];
    return cartas.map(carta => {
        if (!carta || carta.length !== 2) return '??';
        const valor = valorMap[carta[0]] || carta[0];
        const naipe = naipeMap[carta[1]] || '?';
        return `${valor}${naipe}`;
    });
}

function initializeGameState(session) {
    session.gameState = { deck: [], mesa: [], etapa: 'inicio', ativos: [], maosPrivadas: {}, iniciou: false, dealer: null, sb: null, bb: null, currentPlayerIndex: 0, apostaAtual: 0, pote: 0, smallBlindValue: INITIAL_SMALL_BLIND, bigBlindValue: INITIAL_BIG_BLIND, roundCounter: 0, apostasRodada: {}, ultimoApostador: null, numRaises: 0, playersWhoActed: new Set(), minRaiseAmount: 0, playersAllIn: new Set() };
}

// 2. ASSINATURA DA FUNÇÃO ATUALIZADA (client -> sock)
async function iniciarRodada(session, sock) {
    if (!session.gameState) {
        initializeGameState(session);
    }
    if (session.players.length < 2) {
        session.gameState.iniciou = false;
        return;
    }

    session.gameState.roundCounter++;
    await enviarMensagemPreRodada(session, sock); // Passa 'sock'
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (session.gameState.roundCounter > 1 && session.gameState.roundCounter % BLIND_INCREASE_ROUNDS === 0) {
        session.gameState.smallBlindValue *= 2;
        session.gameState.bigBlindValue *= 2;
        // 3. ENVIO DE MENSAGEM ATUALIZADO
        await sock.sendMessage(session.groupId, { text: `🚨 Atenção! Os blinds aumentaram para SB: ${session.gameState.smallBlindValue}, BB: ${session.gameState.bigBlindValue}!` });
    }

    // Lógica de setup da rodada (sem alterações)
    session.gameState.deck = gerarBaralho();
    session.gameState.mesa = [];
    session.gameState.etapa = 'pre-flop';
    session.gameState.ativos = session.players.filter(p => chipManager.getPlayerChips(p.id) > 0).map(p => p.id);
    
    if (session.gameState.ativos.length < 2) {
        await sock.sendMessage(session.groupId, { text: 'Não há jogadores suficientes com fichas para iniciar uma nova rodada. Jogo encerrado!' });
        sessionManager.endSession(session.groupId);
        return;
    }

    session.gameState.maosPrivadas = {};
    session.gameState.apostaAtual = 0;
    session.gameState.pote = 0;
    session.gameState.apostasRodada = {};
    session.gameState.ultimoApostador = null;
    session.gameState.numRaises = 0;
    session.gameState.playersWhoActed = new Set();
    session.gameState.minRaiseAmount = session.gameState.bigBlindValue;
    session.gameState.playersAllIn = new Set();
    const currentActivePlayerIds = session.gameState.ativos;
    if (!session.gameState.dealer || !currentActivePlayerIds.includes(session.gameState.dealer)) {
        session.gameState.dealer = currentActivePlayerIds[0];
    } else {
        const currentIdx = currentActivePlayerIds.indexOf(session.gameState.dealer);
        session.gameState.dealer = currentActivePlayerIds[(currentIdx + 1) % currentActivePlayerIds.length];
    }
    const dealerIdx = currentActivePlayerIds.indexOf(session.gameState.dealer);
    if (currentActivePlayerIds.length === 2) {
        session.gameState.sb = currentActivePlayerIds[dealerIdx];
        session.gameState.bb = currentActivePlayerIds[(dealerIdx + 1) % currentActivePlayerIds.length];
        session.gameState.currentPlayerIndex = dealerIdx;
    } else {
        session.gameState.sb = currentActivePlayerIds[(dealerIdx + 1) % currentActivePlayerIds.length];
        session.gameState.bb = currentActivePlayerIds[(dealerIdx + 2) % currentActivePlayerIds.length];
        const bbIndex = currentActivePlayerIds.indexOf(session.gameState.bb);
        session.gameState.currentPlayerIndex = (bbIndex + 1) % currentActivePlayerIds.length;
    }
    const sbPlayerId = session.gameState.sb;
    const bbPlayerId = session.gameState.bb;
    const sbChips = chipManager.getPlayerChips(sbPlayerId);
    const bbChips = chipManager.getPlayerChips(bbPlayerId);
    const actualSBbet = Math.min(sbChips, session.gameState.smallBlindValue);
    const actualBBbet = Math.min(bbChips, session.gameState.bigBlindValue);
    if (actualSBbet > 0) {
        chipManager.deductChips(sbPlayerId, actualSBbet);
        session.gameState.pote += actualSBbet;
        session.gameState.apostasRodada[sbPlayerId] = actualSBbet;
        if (sbChips <= session.gameState.smallBlindValue) session.gameState.playersAllIn.add(sbPlayerId);
    }
    if (actualBBbet > 0) {
        chipManager.deductChips(bbPlayerId, actualBBbet);
        session.gameState.pote += actualBBbet;
        session.gameState.apostasRodada[bbPlayerId] = actualBBbet;
        session.gameState.apostaAtual = actualBBbet;
        if (bbChips <= session.gameState.bigBlindValue) session.gameState.playersAllIn.add(bbPlayerId);
    }

    await enviarMensagemDeEtapa(session, sock); // Passa 'sock'
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    for (const jogadorId of session.gameState.ativos) {
        const cartas = [session.gameState.deck.pop(), session.gameState.deck.pop()];
        session.gameState.maosPrivadas[jogadorId] = cartas;

        if (jogadorId !== botPlayer.BOT_ID) {
            const imagePath = await gerarImagemCartas(cartas);
            if (imagePath) {
                // 4. ENVIO DE MÍDIA ATUALIZADO
                const caption = `*Sua mão na rodada #${session.gameState.roundCounter}*`;
                await sock.sendMessage(jogadorId, { image: { url: imagePath }, caption: caption });
                fs.unlinkSync(imagePath); // Limpa o arquivo temporário
            } else {
                await sock.sendMessage(jogadorId, { text: '⚠️ Houve um erro ao gerar a imagem das suas cartas.' });
            }
        } else {
            const valorMap = {'T':'10','J':'J','Q':'Q','K':'K','A':'A'};
            const naipeMap = {'s':'♠️','h':'♥️','d':'♦️','c':'♣️'};
            const cartasFormatadas = cartas.map(c => (valorMap[c[0]]||c[0]) + (naipeMap[c[1]]||c[1]));
            console.log(`[Game] Cartas do BOT: ${cartasFormatadas.join(', ')}`);
        }
    }

    const firstPlayerId = session.gameState.ativos[session.gameState.currentPlayerIndex];
    if (firstPlayerId === botPlayer.BOT_ID) {
        await avancarTurnoApostas(session, sock);
    } else {
        await enviarMensagemDeTurno(session, sock);
    }
}

async function avancarEtapa(session, sock) {
    const gameState = session.gameState;
    const etapas = ['pre-flop', 'flop', 'turn', 'river', 'fim'];
    const etapaAtualIdx = etapas.indexOf(gameState.etapa);
    const proximaEtapa = (etapaAtualIdx >= etapas.length - 2) ? 'fim' : etapas[etapaAtualIdx + 1];
    gameState.etapa = proximaEtapa;

    if (gameState.etapa === 'fim') {
        const jogadoresAtivos = gameState.ativos.filter(pId => gameState.maosPrivadas[pId]);
        
        if (jogadoresAtivos.length <= 1) {
            const winnerId = jogadoresAtivos[0];
            if (winnerId) {
                chipManager.addChips(winnerId, gameState.pote);
                await sock.sendMessage(session.groupId, { text: `🎉 ${getPlayerNameById(winnerId, session.players)} venceu e ganhou ${gameState.pote} fichas!` });
            }
        } else {
            const maosPrivadasParaAvaliar = jogadoresAtivos.map(j => gameState.maosPrivadas[j]);
            const resultado = avaliarMaos(jogadoresAtivos, maosPrivadasParaAvaliar, gameState.mesa);
            let showdownMessage = "*Showdown! Revelando as cartas:*\n";
            resultado.ranking.forEach(playerResult => {
                const playerName = getFormattedId(playerResult.jogador, session);
                const playerHand = formatarCartasArray(gameState.maosPrivadas[playerResult.jogador]); 
                showdownMessage += `\n*${playerName}:* ${playerHand.join(' ')} -> *${playerResult.descricao}*`;
            });
            await sock.sendMessage(session.groupId, { text: showdownMessage });
            await new Promise(resolve => setTimeout(resolve, 2500));
            const winnerName = getFormattedId(resultado.vencedor.jogador, session);
            chipManager.addChips(resultado.vencedor.jogador, gameState.pote);
            await sock.sendMessage(session.groupId, { text: `🎉 *${winnerName}* venceu com *${resultado.vencedor.descricao}* e ganhou ${gameState.pote} fichas!` });
        }
        await iniciarRodada(session, sock);
        return;

    } else {
        gameState.apostaAtual = 0;
        gameState.apostasRodada = {};
        gameState.ultimoApostador = null;
        gameState.numRaises = 0;
        gameState.playersWhoActed = new Set();
        gameState.minRaiseAmount = gameState.bigBlindValue;

        if (gameState.etapa === 'flop') {
            gameState.mesa.push(...[gameState.deck.pop(), gameState.deck.pop(), gameState.deck.pop()]);
        } else if (gameState.etapa === 'turn' || gameState.etapa === 'river') {
            gameState.mesa.push(gameState.deck.pop());
        }

        await enviarMensagemDeEtapa(session, sock);
        await new Promise(resolve => setTimeout(resolve, 1500));

        const playersAbleToBet = gameState.ativos.filter(pId => !gameState.playersAllIn.has(pId));
        if (playersAbleToBet.length < 2) {
            console.log(`[Flow] Apenas ${playersAbleToBet.length} jogador(es) pode(m) apostar. Pulando...`);
            await sock.sendMessage(session.groupId, { text: 'Não há mais ações possíveis. Revelando as próximas cartas...' });
            await new Promise(resolve => setTimeout(resolve, 2000));
            await avancarEtapa(session, sock);
            return;
        }
        
        const allPlayersInOrder = session.players.map(p => p.id);
        const sortedActivePlayers = allPlayersInOrder.filter(pId => gameState.ativos.includes(pId));
        const dealerIdx = sortedActivePlayers.indexOf(gameState.dealer);
        let startIndex = -1;

        for (let i = 1; i <= sortedActivePlayers.length; i++) {
            const potentialPlayerId = sortedActivePlayers[(dealerIdx + i) % sortedActivePlayers.length];
            if (!gameState.playersAllIn.has(potentialPlayerId)) {
                startIndex = gameState.ativos.indexOf(potentialPlayerId);
                break;
            }
        }

        if (startIndex === -1) {
            await avancarEtapa(session, sock);
            return;
        }

        gameState.currentPlayerIndex = startIndex;
        const firstPlayerId = gameState.ativos[startIndex];

        if (firstPlayerId === botPlayer.BOT_ID) {
            await avancarTurnoApostas(session, sock, null);
        } else {
            await enviarMensagemDeTurno(session, sock);
        }
    }
}

async function avancarTurnoApostas(session, sock, lastPlayerId) {
    const gameState = session.gameState;
    const playersAbleToAct = gameState.ativos.filter(pId => !gameState.playersAllIn.has(pId));
    if (playersAbleToAct.length < 2 && gameState.apostaAtual > 0) {
        await sock.sendMessage(session.groupId, { text: 'Rodada de apostas encerrada! 💰' });
        await avancarEtapa(session, sock);
        return;
    }

    const playersToAct = gameState.ativos.filter(pId => !gameState.playersAllIn.has(pId));
    
    const roundIsOver = playersToAct.length > 0 && playersToAct.every(pId =>
        gameState.playersWhoActed.has(pId) &&
        (gameState.apostasRodada[pId] || 0) === gameState.apostaAtual
    );
    
    if (gameState.ativos.length <= 1 || roundIsOver) {
        if (roundIsOver) await sock.sendMessage(session.groupId, { text: 'Rodada de apostas encerrada! 💰' });
        await avancarEtapa(session, sock);
        return;
    }
    
    const playerOrder = session.players.map(p => p.id);
    const lastPlayerIndex = playerOrder.indexOf(lastPlayerId || gameState.ativos[gameState.currentPlayerIndex]);

    for (let i = 1; i <= playerOrder.length * 2; i++) {
        const nextPlayerId = playerOrder[(lastPlayerIndex + i) % playerOrder.length];
        if (gameState.ativos.includes(nextPlayerId) && !gameState.playersAllIn.has(nextPlayerId)) {
            if (!gameState.playersWhoActed.has(nextPlayerId) || (gameState.apostasRodada[nextPlayerId] || 0) < gameState.apostaAtual) {
                gameState.currentPlayerIndex = gameState.ativos.indexOf(nextPlayerId);
                
                if (nextPlayerId === botPlayer.BOT_ID) {
                    await sock.sendMessage(session.groupId, { text: `Vez de *${getPlayerNameById(nextPlayerId, session.players)}* 🤖` });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    const commandText = botPlayer.decideAction(session);
                    const fakeMessage = {
                        key: { remoteJid: session.groupId, participant: botPlayer.BOT_ID },
                        message: { conversation: commandText }
                    };
                    const playerActions = require('./playerActions');
                    await playerActions.handleGameCommand(fakeMessage, session, sock);

                } else {
                    await enviarMensagemDeTurno(session, sock);
                }
                return;
            }
        }
    }

    console.log('[DEBUG] ERRO: O loop terminou. Forçando avanço.');
    await sock.sendMessage(session.groupId, { text: 'Rodada de apostas encerrada (fallback)!' });
    await avancarEtapa(session, sock);
}


// --- FUNÇÕES DE AÇÃO DO JOGADOR ---

async function handleCheck(session, playerId, sock, m) {
    const gameState = session.gameState;
    if (gameState.apostaAtual > (gameState.apostasRodada[playerId] || 0)) {
        if (playerId !== botPlayer.BOT_ID) {
            await sock.sendMessage(playerId, { text: `❌ Não é possível dar !mesa. Você precisa !pagar ou !aumentar.` });
        }
        return false;
    }
    gameState.playersWhoActed.add(playerId);
    await sock.sendMessage(session.groupId, { text: `*${getPlayerNameById(playerId, session.players)}* foi de !mesa.` }, { quoted: m });
    await avancarTurnoApostas(session, sock, playerId);
    return true;
}

async function handleCall(session, playerId, sock, m) {
    const gameState = session.gameState;
    const playerChips = chipManager.getPlayerChips(playerId);
    const amountToCall = gameState.apostaAtual - (gameState.apostasRodada[playerId] || 0);

    if (amountToCall <= 0) {
        if (playerId !== botPlayer.BOT_ID) await sock.sendMessage(playerId, { text: `❌ Não há aposta para pagar. Use !mesa para passar a vez.` });
        return false;
    }
    if (playerChips < amountToCall) {
        return await handleAllIn(session, playerId, sock, m);
    }
    chipManager.deductChips(playerId, amountToCall);
    gameState.pote += amountToCall;
    gameState.apostasRodada[playerId] = gameState.apostaAtual;
    gameState.playersWhoActed.add(playerId);
    await sock.sendMessage(session.groupId, { text: `${getPlayerNameById(playerId, session.players)} pagou (${amountToCall} fichas)✅` }, { quoted: m });
    await avancarTurnoApostas(session, sock, playerId);
    return true;
}

async function handleBet(session, playerId, amount, sock, m) {
    const gameState = session.gameState;
    const playerChips = chipManager.getPlayerChips(playerId);
    if (gameState.apostaAtual > 0) {
        if (playerId !== botPlayer.BOT_ID) await sock.sendMessage(playerId, { text: `❌ Já existe uma aposta. Use !pagar ou !aumentar.` });
        return false;
    }
    if (amount < gameState.bigBlindValue) {
        if (playerId !== botPlayer.BOT_ID) await sock.sendMessage(playerId, { text: `❌ A aposta mínima é de ${gameState.bigBlindValue} fichas.` });
        return false;
    }
    if (playerChips < amount) {
        if (playerId !== botPlayer.BOT_ID) await sock.sendMessage(playerId, { text: `❌ Você não tem fichas suficientes. Considere !allin.` });
        return false;
    }
    chipManager.deductChips(playerId, amount);
    gameState.pote += amount;
    gameState.apostasRodada[playerId] = amount;
    gameState.apostaAtual = amount;
    gameState.ultimoApostador = playerId;
    gameState.playersWhoActed = new Set([playerId]);
    await sock.sendMessage(session.groupId, { text: `💵 ${getPlayerNameById(playerId, session.players)} apostou ${amount} fichas.` }, { quoted: m });
    await avancarTurnoApostas(session, sock, playerId);
    return true;
}

async function handleRaise(session, playerId, amount, sock, m) {
    const gameState = session.gameState;
    const playerChips = chipManager.getPlayerChips(playerId);
    const playerBetInRound = gameState.apostasRodada[playerId] || 0;
    const currentBet = gameState.apostaAtual;
    if (currentBet === 0) {
        if (playerId !== botPlayer.BOT_ID) await sock.sendMessage(playerId, { text: `❌ Não há aposta para aumentar. Use !apostar.` });
        return false;
    }
    if (amount <= currentBet) {
        if (playerId !== botPlayer.BOT_ID) await sock.sendMessage(playerId, { text: `❌ O valor do aumento (${amount}) deve ser maior que a aposta atual (${currentBet}).` });
        return false;
    }
    const raiseAmount = amount - currentBet;
    if (raiseAmount < gameState.minRaiseAmount) {
        if (playerId !== botPlayer.BOT_ID) await sock.sendMessage(playerId, { text: `❌ O aumento deve ser de pelo menos ${gameState.minRaiseAmount} fichas.` });
        return false;
    }
    const chipsNeeded = amount - playerBetInRound;
    if (playerChips < chipsNeeded) {
        if (playerId !== botPlayer.BOT_ID) await sock.sendMessage(playerId, { text: `❌ Você não tem fichas para aumentar para ${amount}.` });
        return false;
    }
    chipManager.deductChips(playerId, chipsNeeded);
    gameState.pote += chipsNeeded;
    gameState.apostasRodada[playerId] = amount;
    gameState.apostaAtual = amount;
    gameState.ultimoApostador = playerId;
    gameState.numRaises++;
    gameState.minRaiseAmount = raiseAmount;
    gameState.playersWhoActed = new Set([playerId]);
    await sock.sendMessage(session.groupId, { text: `${getPlayerNameById(playerId, session.players)} aumentou para ${amount} fichas ⬆️` }, { quoted: m });
    await avancarTurnoApostas(session, sock, playerId);
    return true;
}

async function handleAllIn(session, playerId, sock, m) {
    const gameState = session.gameState;
    const playerChips = chipManager.getPlayerChips(playerId);
    if (playerChips <= 0) {
        if (playerId !== botPlayer.BOT_ID) await sock.sendMessage(playerId, { text: `❌ Você não tem fichas para ir !allin.` });
        return false;
    }
    const totalBetForPlayer = (gameState.apostasRodada[playerId] || 0) + playerChips;
    chipManager.deductChips(playerId, playerChips);
    gameState.pote += playerChips;
    gameState.apostasRodada[playerId] = totalBetForPlayer;
    gameState.playersAllIn.add(playerId);

    let actionMessage;
    if (totalBetForPlayer > gameState.apostaAtual) {
        gameState.minRaiseAmount = totalBetForPlayer - gameState.apostaAtual;
        gameState.apostaAtual = totalBetForPlayer;
        gameState.ultimoApostador = playerId;
        gameState.playersWhoActed = new Set();
        actionMessage = `🔥 ${getPlayerNameById(playerId, session.players)} foi de !allin, aumentando para ${totalBetForPlayer} fichas!`;
    } else {
        actionMessage = `🔥 ${getPlayerNameById(playerId, session.players)} foi de !allin com ${playerChips} fichas.`;
    }
    gameState.playersWhoActed.add(playerId);
    await sock.sendMessage(session.groupId, { text: actionMessage }, { quoted: m });
    await avancarTurnoApostas(session, sock, playerId);
    return true;
}


// --- FUNÇÕES DE MENSAGEM ---

function getPlayerNameById(playerId, playersArray) {
    const player = playersArray.find(p => p.id === playerId);
    return player ? player.name : playerId.split('@')[0];
}

function getComandosDisponiveis(session) {
    const gameState = session.gameState;
    const playerId = gameState.ativos[gameState.currentPlayerIndex];
    const playerBetInRound = gameState.apostasRodada[playerId] || 0;
    const currentBet = gameState.apostaAtual;
    let comandos = [];
    if (currentBet > playerBetInRound) {
        comandos.push('!pagar', '!aumentar <valor>');
    } else {
        comandos.push('!mesa', '!apostar <valor>');
    }
    comandos.push('!allin', '!correr', '!ajuda');
    return comandos.join(' | ');
}

async function enviarMensagemPreRodada(session, sock) {
    const round = session.gameState.roundCounter;
    let message = `*Rodada #${round}* 🎲\n\n*Jogadores na mesa:*\n`;
    session.players.forEach((player, index) => {
        const chips = chipManager.getPlayerChips(player.id);
        message += `${index + 1}. ${player.name} - *${chips} fichas*\n`;
    });
    await sock.sendMessage(session.groupId, { text: message });
}

async function enviarMensagemDeEtapa(session, sock) {
    const gameState = session.gameState;
    const nomeEtapa = gameState.etapa.toUpperCase().replace('-', ' ');

    if (gameState.etapa === 'pre-flop') {
        let message = `*--- ${nomeEtapa} ---*\n\n`;
        message += `Mesa: X    X    X    X    X\n\n`;
        const sbPlayer = session.players.find(p => p.id === gameState.sb);
        const bbPlayer = session.players.find(p => p.id === gameState.bb);
        if (sbPlayer && bbPlayer) {
            message += `SB: ${sbPlayer.name} (-${gameState.smallBlindValue} fichas)\n`;
            message += `BB: ${bbPlayer.name} (-${gameState.bigBlindValue} fichas)\n\n`;
        }
        message += `*Pote Total: ${gameState.pote} fichas*`;
        await sock.sendMessage(session.groupId, { text: message });
    } else {
        let caption = `*--- ${nomeEtapa} ---*\n\n*Pote Total: ${gameState.pote} fichas*`;
        const imagePath = await gerarImagemCartas(gameState.mesa);
        if (imagePath) {
            await sock.sendMessage(session.groupId, { image: { url: imagePath }, caption: caption });
            fs.unlinkSync(imagePath);
        } else {
            await sock.sendMessage(session.groupId, { text: caption + '\n\n(Erro ao gerar imagem da mesa)' });
        }
    }
}

async function enviarMensagemDeTurno(session, sock) {
    const gameState = session.gameState;
    const currentPlayerId = gameState.ativos[gameState.currentPlayerIndex];
    if (currentPlayerId === botPlayer.BOT_ID) return;

    const player = session.players.find(p => p.id === currentPlayerId);
    if (!player) return;

    const currentBet = gameState.apostaAtual;
    const playerBetInRound = gameState.apostasRodada[currentPlayerId] || 0;
    const amountToCall = currentBet - playerBetInRound;
    
    let line1 = `*${player.name}*!`;
    let line2 = amountToCall > 0
        ? `Aposta atual: *${currentBet}* | Para pagar: *${amountToCall}*`
        : `Aposta atual: *0* (Pode dar \`!mesa\` ou \`!apostar\`)`;
    
    const commands = getComandosDisponiveis(session);
    const line3 = `\`\`\`${commands}\`\`\``;
    const finalMessage = `${line1}\n${line2}\n\n${line3}`;

    await sock.sendMessage(session.groupId, { text: finalMessage });
}

const STARTING_CHIPS = 5000;
function prepararJogo(session) {
    session.players.forEach(player => {
        chipManager.initializePlayerChips(player.id, STARTING_CHIPS);
    });
    console.log('[Game] Fichas iniciais distribuídas.');
}

function getBotPosition(session) {
    // ... (esta função não precisa de alterações)
    const { ativos, dealer, sb, bb } = session.gameState;
    const botId = botPlayer.BOT_ID;
    const numPlayers = ativos.length;
    if (!session.players || session.players.length === 0) return 'UNKNOWN';
    if (botId === sb) return 'SB';
    if (botId === bb) return 'BB';
    const playerOrder = session.players.map(p => p.id);
    const botSeatIndex = playerOrder.indexOf(botId);
    const dealerSeatIndex = playerOrder.indexOf(dealer);
    if (botSeatIndex === -1 || dealerSeatIndex === -1) return 'UNKNOWN';
    const relativePosition = (botSeatIndex - dealerSeatIndex + numPlayers) % numPlayers;
    if (numPlayers > 6) { // Full Ring
        if (relativePosition <= 2) return 'EARLY';
        if (relativePosition < numPlayers - 1) return 'MIDDLE';
        return 'LATE';
    } else { // 6-max
        if (relativePosition <= 1) return 'EARLY';
        if (relativePosition < numPlayers - 1) return 'MIDDLE';
        return 'LATE';
    }
}

// --- EXPORTAÇÕES ---

module.exports = {
    initializeGameState,
    iniciarRodada,
    avancarEtapa,
    handleCheck,
    handleCall,
    handleBet,
    handleRaise,
    handleAllIn,
    avancarTurnoApostas,
    prepararJogo
};