const Abastecimento = require('../models/Abastecimento');
const Transacao = require('../models/Transacao');
const { nanoid } = require('nanoid');
const sessionManager = require('../sessions/sessionManager');

function parseNumber(text) {
    if (!text) return null;
    const num = parseFloat(text.replace(',', '.'));
    return isNaN(num) || num <= 0 ? null : num;
}

async function finalizarRegistro(userId, dados, userAccessLevel) {
    const { litros, precoPorLitro, odometro, tipoCombustivel } = dados;
    const valorTotal = litros * precoPorLitro;
    const categoriaGasto = tipoCombustivel.charAt(0).toUpperCase() + tipoCombustivel.slice(1);

    const ultimoAbastecimento = await Abastecimento.findOne({ userId }).sort({ createdAt: -1 });

    await new Abastecimento({
        userId, odometro, litros, precoPorLitro, valorTotal, tipoCombustivel
    }).save();

    let responseText = `⛽ Abastecimento de ${categoriaGasto} (~${litros.toFixed(2)}L por R$ ${valorTotal.toFixed(2)}) registrado com sucesso!`;

    if (userAccessLevel === 'full') {
        await new Transacao({
            shortId: nanoid(6), userId, tipo: 'gasto', valor: valorTotal, categoria: categoriaGasto,
            descricao: `~${litros.toFixed(2)}L de ${tipoCombustivel} a R$ ${precoPorLitro.toFixed(2)}/L`
        }).save();
        responseText += `\n\nEste gasto já foi adicionado ao seu controle financeiro.`;
    }

    if (ultimoAbastecimento && odometro > ultimoAbastecimento.odometro) {
        const kmsRodados = odometro - ultimoAbastecimento.odometro;
        const eficiencia = kmsRodados / litros;
        const custoPorKm = valorTotal / kmsRodados;
        responseText += `\n\n*--- Análise do Último Tanque ---* 🚗\n` +
                        `*Distância percorrida:* ${kmsRodados.toFixed(1)} km\n` +
                        `*Eficiência:* ${eficiencia.toFixed(2)} km/L\n` +
                        `*Custo por Km:* R$ ${custoPorKm.toFixed(2)}`;
    }

    return responseText;
}

// --- LÓGICA PRINCIPAL DO COMANDO ---
module.exports = {
    name: '!combustivel',
    category: 'financas',
    description: 'Gerencia os abastecimentos do veículo.',
    aliases: ['!gasolina', '!etanol'],

    async execute(sock, m, command, body, commands, userAccessLevel, activeSession) {
        const senderId = m.key.participant || m.key.remoteJid;
        const chatId = m.key.remoteJid;
        const userId = senderId.split('@')[0];
        const messageText = body.trim();

        // --- FLUXO 1: COMANDO DIRETO COM "!" ---
        if (messageText.startsWith('!')) {
            try {
                const tipoCombustivel = command.substring(1); // gasolina ou etanol
                const args = messageText.split(' ').slice(1);

                if (args.length !== 3) {
                    return await sock.sendMessage(chatId, { text: `❌ Formato inválido!\nUse: \`!${tipoCombustivel} <preço/litro> <valor_total> <km_atual>\`` }, { quoted: m });
                }

                const precoPorLitro = parseNumber(args[0]);
                const valorTotal = parseNumber(args[1]);
                const odometro = parseNumber(args[2]);

                if (!precoPorLitro || !valorTotal || !odometro) {
                    return await sock.sendMessage(chatId, { text: '❌ Todos os valores devem ser números válidos.' }, { quoted: m });
                }

                const litros = valorTotal / precoPorLitro;
                const dados = { litros, precoPorLitro, odometro, tipoCombustivel };
                
                const responseText = await finalizarRegistro(userId, dados, userAccessLevel);
                await sock.sendMessage(chatId, { text: responseText }, { quoted: m });

            } catch (error) {
                console.error("Erro no comando direto de combustível:", error);
                await sock.sendMessage(chatId, { text: '❌ Ocorreu um erro ao processar seu abastecimento.' }, { quoted: m });
            }
            return;
        }

        // --- FLUXO 2: CONVERSA GUIADA (SEM "!") ---
        const userResponse = messageText.toLowerCase();

        if (activeSession) {
            const currentState = activeSession.gameState;
            
            try {
                switch (currentState.step) {
                    case 'ask_total': {
                        const valorTotal = parseNumber(userResponse);
                        if (!valorTotal) return await sock.sendMessage(chatId, { text: "Por favor, digite um valor total válido." }, { quoted: m });
                        
                        sessionManager.updateSession(chatId, { step: 'ask_preco', data: { ...currentState.data, valorTotal } });
                        await sock.sendMessage(chatId, { text: `Ok, R$ ${valorTotal.toFixed(2)}. E qual foi o preço por litro?` }, { quoted: m });
                        break;
                    }

                    case 'ask_preco': {
                        const precoPorLitro = parseNumber(userResponse);
                        if (!precoPorLitro) return await sock.sendMessage(chatId, { text: "Por favor, digite um preço válido por litro." }, { quoted: m });

                        sessionManager.updateSession(chatId, { step: 'ask_type', data: { ...currentState.data, precoPorLitro } });

                        await sock.sendMessage(chatId, { text: "Entendido. O combustível foi Gasolina ou Etanol?" }, { quoted: m });
                        break;
                    }
                    
                    case 'ask_type': {
                        let tipoCombustivel = null;

                        if (userResponse.includes('gaso')) {
                            tipoCombustivel = 'gasolina';
                        } else if (userResponse.includes('eta') || userResponse.includes('alc')) {
                            tipoCombustivel = 'etanol';
                        }

                        if (!tipoCombustivel) {
                            return await sock.sendMessage(chatId, { text: "Não entendi. Por favor, responda com 'gasolina' ou 'etanol'." }, { quoted: m });
                        }
                        
                        sessionManager.updateSession(chatId, { step: 'ask_odometro', data: { ...currentState.data, tipoCombustivel } });
                        const categoriaGasto = tipoCombustivel.charAt(0).toUpperCase() + tipoCombustivel.slice(1);
                        await sock.sendMessage(chatId, { text: `Certo, ${categoriaGasto}. Para finalizar, qual a quilometragem atual do veículo?` }, { quoted: m });
                        break;
                    }

                    case 'ask_odometro': {
                        const odometro = parseNumber(userResponse);
                        if (!odometro) return await sock.sendMessage(chatId, { text: "Por favor, digite uma quilometragem válida." }, { quoted: m });

                        await sock.sendMessage(chatId, { text: "Calculando e salvando... 🤖" }, { quoted: m });
                        
                        const finalData = { ...currentState.data, odometro };
                        finalData.litros = finalData.valorTotal / finalData.precoPorLitro;
                        
                        const responseText = await finalizarRegistro(userId, finalData, userAccessLevel);
                        await sock.sendMessage(chatId, { text: responseText }, { quoted: m });
                        
                        sessionManager.endSession(chatId);
                        break;
                    }
                }
            } catch (error) {
                 console.error("Erro na sessão de combustível:", error);
                 await sock.sendMessage(chatId, { text: '❌ Ocorreu um erro durante a conversa.' }, { quoted: m });
                 sessionManager.endSession(chatId);
            }

        } else {
            sessionManager.createSession(chatId, 'combustivel', senderId, { 
                step: 'ask_total', 
                data: {} 
            });
            await sock.sendMessage(chatId, { text: "Olá! Vamos registrar seu abastecimento. Quanto você pagou no total?" }, { quoted: m });
        }
    }
};