const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');
const Transacao = require('../models/Transacao');

// --- CONFIGURAÇÃO DE USUÁRIOS ---
// Mapeia apelidos para os IDs normalizados. Facilita o uso do comando.
const USER_MAP = {
    // Apelido: ID_NORMALIZADO
    'guiga': '5511963582414',
    'cassia': '5516992677349',
    // Adicione mais usuários aqui no futuro: 'apelido': 'numero'
};
// --- FIM DA CONFIGURAÇÃO ---

module.exports = {
    name: '!exportar',
    category: 'financas',
    description: 'Exporta as transações financeiras para um arquivo .csv.',

    async execute(sock, m, command, body) {
        try {
            const senderId = m.key.participant || m.key.remoteJid;
            const requesterId = senderId.split('@')[0];
            const args = body.split(' ').slice(1).map(arg => arg.toLowerCase());

            const adminIds = (process.env.ADMIN_WHATSAPP_ID || '').split(',').map(id => id.trim());
            const isRequesterAdmin = adminIds.includes(requesterId);

            let targetUserIds = [];
            let fileName = 'minhas_transacoes.csv';

            if (args.length === 0 || args[0] === 'eu') {
                targetUserIds.push(requesterId);
            } else if (args[0] === 'todos') {
                if (!isRequesterAdmin) {
                    return await sock.sendMessage(m.key.remoteJid, { text: '❌ Você não tem permissão para exportar os dados de todos os usuários.' }, { quoted: m });
                }
                targetUserIds = Object.values(USER_MAP);
                fileName = 'transacoes_todos.csv';
            } else {
                // Exportar por apelidos
                for (const apelido of args) {
                    const userId = USER_MAP[apelido];
                    if (userId) {
                        targetUserIds.push(userId);
                    } else {
                        return await sock.sendMessage(m.key.remoteJid, { text: `❌ Apelido "${apelido}" não encontrado.` }, { quoted: m });
                    }
                }
                fileName = `transacoes_${args.join('_')}.csv`;

                // Garante que um usuário não-admin só possa exportar seus próprios dados
                if (!isRequesterAdmin && (targetUserIds.length > 1 || targetUserIds[0] !== requesterId)) {
                     return await sock.sendMessage(m.key.remoteJid, { text: '❌ Você só tem permissão para exportar seus próprios dados.' }, { quoted: m });
                }
            }

            // Busca as transações no banco de dados para os usuários selecionados
            const transacoes = await Transacao.find({ userId: { $in: targetUserIds } }).sort({ createdAt: 1 }).lean();

            if (transacoes.length === 0) {
                return await sock.sendMessage(m.key.remoteJid, { text: '❌ Nenhuma transação encontrada para os usuários selecionados.' }, { quoted: m });
            }

            // Formata os dados para um CSV mais amigável
            const dadosFormatados = transacoes.map(t => {
                // Encontra o apelido do usuário a partir do ID
                const userNickname = Object.keys(USER_MAP).find(key => USER_MAP[key] === t.userId) || 'Desconhecido';
                return {
                    Data: new Date(t.createdAt).toLocaleDateString('pt-BR'),
                    Usuario: userNickname,
                    Tipo: t.tipo,
                    Valor: `R$ ${t.valor.toFixed(2).replace('.', ',')}`,
                    Categoria: t.categoria,
                    Descricao: t.descricao || '',
                    ID: t.shortId || t._id.toString().slice(-5)
                };
            });

            // Define as colunas do CSV
            const fields = ['Data', 'Usuario', 'Tipo', 'Valor', 'Categoria', 'Descricao', 'ID'];
            const json2csvParser = new Parser({ fields });
            const csv = json2csvParser.parse(dadosFormatados);

            // Salva o CSV em um arquivo temporário
            const filePath = path.join(__dirname, '..', fileName);
            fs.writeFileSync(filePath, csv);

            // Envia o arquivo para o usuário
            await sock.sendMessage(m.key.remoteJid, {
                document: { url: filePath },
                fileName: fileName,
                mimetype: 'text/csv'
            });

            // Apaga o arquivo temporário do servidor
            fs.unlinkSync(filePath);

        } catch (error) {
            console.error("Erro ao exportar dados:", error);
            await sock.sendMessage(m.key.remoteJid, { text: '❌ Ocorreu um erro ao gerar o arquivo de exportação.' }, { quoted: m });
        }
    }
};