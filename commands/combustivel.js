const Abastecimento = require('../models/Abastecimento');
const Transacao = require('../models/Transacao');
const { nanoid } = require('nanoid');

module.exports = {
    name: '!combustivel',
    category: 'financas',
    description: 'Registra um abastecimento (gasolina ou etanol) e calcula a eficiência.',
    aliases: ['!gasolina', '!etanol'],

    async execute(sock, m, command, body) {
        try {
            const tipoCombustivel = command.substring(1);
            const categoriaGasto = tipoCombustivel.charAt(0).toUpperCase() + tipoCombustivel.slice(1);

            const senderId = m.key.participant || m.key.remoteJid;
            const userId = senderId.split('@')[0];
            
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

            const ultimoAbastecimento = await Abastecimento.findOne({ userId: userId }).sort({ createdAt: -1 });

            const novoAbastecimento = new Abastecimento({
                userId,
                odometro: odometroAtual,
                litros,
                precoPorLitro,
                valorTotal,
                tipoCombustivel
            });
            await novoAbastecimento.save();

            const novaTransacao = new Transacao({
                shortId: nanoid(6),
                userId,
                tipo: 'gasto',
                valor: valorTotal,
                categoria: categoriaGasto,
                descricao: `${litros.toFixed(2)}L de ${tipoCombustivel} a R$ ${precoPorLitro.toFixed(2)}/L`
            });
            await novaTransacao.save();

            let responseText = `⛽ Abastecimento de ${categoriaGasto} (R$ ${valorTotal.toFixed(2)}) registrado com sucesso!\n\nEste gasto já foi adicionado ao seu controle financeiro.`;

            if (ultimoAbastecimento) {
                if (odometroAtual <= ultimoAbastecimento.odometro) {
                    responseText += '\n\n⚠️ *Atenção:* A quilometragem atual é menor ou igual à anterior.';
                } else {
                    const kmsRodados = odometroAtual - ultimoAbastecimento.odometro;
                    const eficiencia = kmsRodados / litros; 
                    const custoPorKm = valorTotal / kmsRodados;

                    responseText += `\n\n*--- Análise do Último Tanque ---* 🚗\n` +
                                    `*Distância percorrida:* ${kmsRodados.toFixed(1)} km\n` +
                                    `*Eficiência:* ${eficiencia.toFixed(2)} km/L\n` +
                                    `*Custo por Km:* R$ ${custoPorKm.toFixed(2)}`;
                }
            } else {
                responseText += `\n\nEste é o seu primeiro registro. Os cálculos de eficiência aparecerão no seu próximo abastecimento!`;
            }

            const ultimos10Abastecimentos = await Abastecimento.find({ userId: userId }).sort({ createdAt: -1 }).limit(10);

            if (ultimos10Abastecimentos.length >= 2) {
                const odometroMaisRecente = ultimos10Abastecimentos[0].odometro;
                const odometroMaisAntigo = ultimos10Abastecimentos[ultimos10Abastecimentos.length - 1].odometro;

                let totalLitrosConsumidos = 0;
                let totalGasto = 0;
                
                for (let i = 0; i < ultimos10Abastecimentos.length - 1; i++) {
                    totalLitrosConsumidos += ultimos10Abastecimentos[i].litros;
                    totalGasto += ultimos10Abastecimentos[i].valorTotal;
                }

                const totalKmsRodados = odometroMaisRecente - odometroMaisAntigo;

                if (totalKmsRodados > 0 && totalLitrosConsumidos > 0) {
                    const mediaKmL = totalKmsRodados / totalLitrosConsumidos;
                    const mediaCustoKm = totalGasto / totalKmsRodados;

                    responseText += `\n\n*--- Média dos Últimos ${ultimos10Abastecimentos.length} Tanques ---* 📈\n` +
                                    `*Eficiência Média:* ${mediaKmL.toFixed(2)} km/L\n` +
                                    `*Custo Médio por Km:* R$ ${mediaCustoKm.toFixed(2)}`;
                }
            }
            // --- FIM DA NOVA LÓGICA ---

            await sock.sendMessage(m.key.remoteJid, { text: responseText }, { quoted: m });

        } catch (error) {
            console.error("Erro no comando !combustivel:", error);
            await sock.sendMessage(m.key.remoteJid, { text: '❌ Ocorreu um erro ao processar seu abastecimento.' }, { quoted: m });
        }
    }
};