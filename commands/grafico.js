const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const Transacao = require('../models/Transacao');

// Configuração inicial para a renderização do gráfico
const width = 800; // largura da imagem
const height = 600; // altura da imagem
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: '#ffffff' });

module.exports = {
    name: '!grafico',
    category: 'financas',
    description: 'Gera um gráfico de gastos por categoria para um determinado mês.',
    aliases: ['!chart'],

    async execute(sock, m, command, body) {
        try {
            const senderId = m.key.participant || m.key.remoteJid;
            const userId = senderId.split('@')[0];
            const args = body.split(' ').slice(1);
            const periodo = args[0];

            let inicioPeriodo, fimPeriodo, tituloPeriodo;

            // Lógica para definir o período (reaproveitada do !relatorio)
            if (!periodo) {
                const hoje = new Date();
                inicioPeriodo = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                fimPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
                const nomeMes = hoje.toLocaleString('pt-BR', { month: 'long' });
                tituloPeriodo = `Gastos de ${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${hoje.getFullYear()}`;
            } else if (periodo.match(/^\d{2}\/\d{4}$/)) {
                const [mes, ano] = periodo.split('/');
                const mesNum = parseInt(mes) - 1;
                const anoNum = parseInt(ano);
                inicioPeriodo = new Date(anoNum, mesNum, 1);
                fimPeriodo = new Date(anoNum, mesNum + 1, 0, 23, 59, 59);
                const nomeMes = inicioPeriodo.toLocaleString('pt-BR', { month: 'long' });
                tituloPeriodo = `Gastos de ${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${anoNum}`;
            } else {
                return await sock.sendMessage(m.key.remoteJid, { text: '❌ Formato de período inválido. Use:\n`!grafico` (mês atual)\n`!grafico MM/AAAA`' }, { quoted: m });
            }

            // Busca apenas as transações de GASTO no período
            const transacoes = await Transacao.find({
                userId: userId,
                tipo: 'gasto',
                createdAt: { $gte: inicioPeriodo, $lte: fimPeriodo }
            });

            if (transacoes.length === 0) {
                return await sock.sendMessage(m.key.remoteJid, { text: `Você não possui nenhum gasto registrado no período para gerar um gráfico.` }, { quoted: m });
            }

            // Agrupa os gastos por categoria (reaproveitado do !relatorio)
            const gastosPorCategoria = {};
            transacoes.forEach(t => {
                const categoria = t.categoria.charAt(0).toUpperCase() + t.categoria.slice(1);
                gastosPorCategoria[categoria] = (gastosPorCategoria[categoria] || 0) + t.valor;
            });

            const labels = Object.keys(gastosPorCategoria);
            const data = Object.values(gastosPorCategoria);

            // Gera cores aleatórias para o gráfico ficar bonito
            const backgroundColors = labels.map(() => `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.7)`);

            // Configuração do gráfico
            const configuration = {
                type: 'pie', // Tipo de gráfico: pizza
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Gastos por Categoria',
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                        borderWidth: 1
                    }]
                },
                options: {
                    plugins: {
                        title: {
                            display: true,
                            text: tituloPeriodo,
                            font: {
                                size: 24
                            }
                        },
                        legend: {
                            position: 'top',
                        }
                    }
                }
            };

            // Renderiza o gráfico para uma imagem
            const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);

            // Envia a imagem do gráfico
            await sock.sendMessage(m.key.remoteJid, {
                image: imageBuffer,
                caption: `📊 Aqui está seu gráfico de gastos por categoria!`
            }, { quoted: m });

        } catch (error) {
            console.error("Erro ao gerar gráfico:", error);
            await sock.sendMessage(m.key.remoteJid, { text: "❌ Ocorreu um erro ao gerar o gráfico." }, { quoted: m });
        }
    }
};