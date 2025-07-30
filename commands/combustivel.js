const Abastecimento = require('../models/Abastecimento');
const Transacao = require('../models/Transacao');
const { nanoid } = require('nanoid');

module.exports = {
    name: '!combustivel',
    category: 'financas',
    description: 'Gerencia os abastecimentos do veículo.',
    // 1. ADICIONAMOS OS NOVOS COMANDOS AOS ALIASES
    aliases: ['!gasolina', '!etanol', '!abastecimentos', '!apagar-abastecimento'],

    async execute(sock, m, command, body) {
        const senderId = m.key.participant || m.key.remoteJid;
        const userId = senderId.split('@')[0];

        // --- LÓGICA PARA !GASOLINA E !ETANOL ---
        if (command === '!gasolina' || command === '!etanol') {
            try {
                const tipoCombustivel = command.substring(1);
                const categoriaGasto = tipoCombustivel.charAt(0).toUpperCase() + tipoCombustivel.slice(1);
                
                const args = body.split(' ').slice(1);
                if (args.length !== 3) {
                    return await sock.sendMessage(m.key.remoteJid, { text: `❌ Formato inválido!\nUse: \`!${tipoCombustivel} <litros> <preço/litro> <km_atual>\`` }, { quoted: m });
                }

                const litros = parseFloat(args[0].replace(',', '.'));
                const precoPorLitro = parseFloat(args[1].replace(',', '.'));
                const odometroAtual = parseInt(args[2], 10);

                if (isNaN(litros) || isNaN(precoPorLitro) || isNaN(odometroAtual)) {
                    return await sock.sendMessage(m.key.remoteJid, { text: '❌ Todos os valores devem ser números válidos.' }, { quoted: m });
                }

                const valorTotal = litros * precoPorLitro;

                // 2. PRIMEIRO, CRIAMOS A TRANSAÇÃO DE GASTO PARA OBTER SEU ID
                const novaTransacao = new Transacao({
                    shortId: nanoid(6),
                    userId,
                    tipo: 'gasto',
                    valor: valorTotal,
                    categoria: categoriaGasto,
                    descricao: `${litros.toFixed(2)}L de ${tipoCombustivel} a R$ ${precoPorLitro.toFixed(2)}/L`
                });
                await novaTransacao.save(); // Salvamos para que o _id seja gerado

                const ultimoAbastecimento = await Abastecimento.findOne({ userId: userId }).sort({ createdAt: -1 });

                // 3. AGORA, CRIAMOS O ABASTECIMENTO, LIGANDO-O À TRANSAÇÃO
                const novoAbastecimento = new Abastecimento({
                    shortId: nanoid(6), // Geramos um ID curto para o abastecimento também
                    userId,
                    odometro: odometroAtual,
                    litros,
                    precoPorLitro,
                    valorTotal,
                    tipoCombustivel,
                    transacaoId: novaTransacao._id // <-- O "LINK" MÁGICO
                });
                await novoAbastecimento.save();

                let responseText = `⛽ Abastecimento de ${categoriaGasto} (R$ ${valorTotal.toFixed(2)}) registrado com sucesso!\n\nEste gasto já foi adicionado ao seu controle financeiro.`;

                if (ultimoAbastecimento) {
                    // ... (lógica de cálculo de eficiência continua a mesma) ...
                } else {
                    responseText += `\n\nEste é o seu primeiro registro. Os cálculos de eficiência aparecerão no seu próximo abastecimento!`;
                }
                
                // ... (lógica da média dos últimos 10 continua a mesma) ...

                await sock.sendMessage(m.key.remoteJid, { text: responseText }, { quoted: m });

            } catch (error) {
                console.error("Erro no comando de abastecimento:", error);
                await sock.sendMessage(m.key.remoteJid, { text: '❌ Ocorreu um erro ao processar seu abastecimento.' }, { quoted: m });
            }
            return;
        }

        // --- NOVA LÓGICA PARA !ABASTECIMENTOS ---
        if (command === '!abastecimentos') {
            try {
                const abastecimentos = await Abastecimento.find({ userId: userId }).sort({ createdAt: -1 }).limit(10);

                if (abastecimentos.length === 0) {
                    return await sock.sendMessage(m.key.remoteJid, { text: 'Você ainda não registrou nenhum abastecimento.' }, { quoted: m });
                }

                let responseText = '*Seus últimos 10 abastecimentos:*\n\n';
                for (const ab of abastecimentos) {
                    const data = new Date(ab.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    responseText += `*ID: \`${ab.shortId}\`* ⛽ [${data}] - ${ab.litros}L de ${ab.tipoCombustivel} a R$ ${ab.precoPorLitro.toFixed(2)}/L\n`;
                }
                responseText += '\nPara apagar um registro, use `!apagar-abastecimento <ID>`';
                await sock.sendMessage(m.key.remoteJid, { text: responseText }, { quoted: m });

            } catch (error) {
                console.error("Erro ao listar abastecimentos:", error);
                await sock.sendMessage(m.key.remoteJid, { text: '❌ Ocorreu um erro ao buscar seus registros.' }, { quoted: m });
            }
            return;
        }

        // --- NOVA LÓGICA PARA !APAGAR-ABASTECIMENTO ---
        if (command === '!apagar-abastecimento') {
            try {
                const shortId = body.split(' ')[1];
                if (!shortId) {
                    return await sock.sendMessage(m.key.remoteJid, { text: '❌ Formato inválido. Use `!apagar-abastecimento <ID>`.' }, { quoted: m });
                }

                // Encontra o abastecimento para apagar
                const abastecimentoParaApagar = await Abastecimento.findOne({ shortId: shortId, userId: userId });

                if (!abastecimentoParaApagar) {
                    return await sock.sendMessage(m.key.remoteJid, { text: `❌ Nenhum registro de abastecimento encontrado com o ID \`${shortId}\`.` }, { quoted: m });
                }

                // Apaga o registro de abastecimento
                await Abastecimento.deleteOne({ _id: abastecimentoParaApagar._id });

                // Se houver uma transação ligada, apaga ela também
                if (abastecimentoParaApagar.transacaoId) {
                    await Transacao.deleteOne({ _id: abastecimentoParaApagar.transacaoId });
                }

                await sock.sendMessage(m.key.remoteJid, { text: `✅ Registro de abastecimento \`${shortId}\` e o gasto associado foram apagados com sucesso!` }, { quoted: m });

            } catch (error) {
                console.error("Erro ao apagar abastecimento:", error);
                await sock.sendMessage(m.key.remoteJid, { text: '❌ Ocorreu um erro ao tentar apagar o registro.' }, { quoted: m });
            }
            return;
        }
    }
};