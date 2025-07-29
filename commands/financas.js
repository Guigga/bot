// commands/financas.js (Agora é o comando de ajuda geral)

const Transacao = require('../models/Transacao');
const { nanoid } = require('nanoid');

module.exports = {
    // Manteremos !financas como o nome principal, mas poderia ser !ajuda
    name: '!financas',
    aliases: ['!gasto', '!g', '!ganho', '!r', '!ajuda', '!comandos', '!help'], // Adicionamos aliases de ajuda
    category: 'financas', // A categoria principal ainda é finanças
    description: 'Registra um ganho ou gasto e exibe a ajuda completa do bot.',

    async execute(sock, m, command, body, commands) {
        
        // Se o comando for um dos aliases de ajuda, mostra a mensagem completa
        if (['!financas', '!ajuda', '!comandos', '!help'].includes(command)) {
            
            // Usaremos objetos para agrupar os comandos por categoria
            const categories = {
                'financas': {
                    title: '*Módulo de Finanças Pessoais* 💸',
                    commands: new Set()
                },
                'agenda': {
                    title: '*Módulo de Agenda* 🗓️',
                    commands: new Set()
                },
                'compras': {
                    title: '*Módulo de Compras* 🛒',
                    commands: new Set()
                },
                'utilidades': {
                    title: '*Comandos Utilitários* ⚙️',
                    commands: new Set()
                }
            };

            // Itera sobre todos os comandos carregados
            for (const cmd of commands.values()) {
                // Adiciona o comando à sua respectiva categoria
                if (cmd.category && categories[cmd.category]) {
                    const commandInfo = `• \`${cmd.name}\` - ${cmd.description}\n` +
                                        (cmd.aliases ? `  _${'Apelidos: ' + cmd.aliases.join(', ')}_\n` : '');
                    categories[cmd.category].commands.add(commandInfo);
                }
            }

            // Monta a mensagem final, categoria por categoria
            let helpMessage = `*Bem-vindo ao Finanzap!* ✨\n\nAqui estão todos os comandos disponíveis:\n\n`;
            for (const key in categories) {
                const category = categories[key];
                if (category.commands.size > 0) {
                    helpMessage += `${category.title}\n`;
                    helpMessage += [...category.commands].join('');
                    helpMessage += '\n'; // Espaço entre as categorias
                }
            }
            
            await sock.sendMessage(m.key.remoteJid, { text: helpMessage }, { quoted: m });
            return;
        }

        // --- A lógica para registrar um ganho ou gasto continua a mesma ---
        const senderId = m.key.participant || m.key.remoteJid;
        const userId = senderId.split('@')[0];
        const args = body.split(' ');
        const isGasto = command === '!gasto' || command === '!g';
        const tipo = isGasto ? 'gasto' : 'ganho';
        const valor = parseFloat(args[1]?.replace(',', '.'));
        const categoria = args[2];
        const descricao = args.slice(3).join(' ');

        if (isNaN(valor) || !categoria) {
            return await sock.sendMessage(m.key.remoteJid, { text: `❌ Formato inválido! Use \`!ajuda\` para ver os exemplos.` }, { quoted: m });
        }

        try {
            const novaTransacao = new Transacao({
                shortId: nanoid(6),
                userId, tipo, valor, categoria, 
                descricao: descricao || null
            });
            await novaTransacao.save();

            const tipoCapitalized = tipo.charAt(0).toUpperCase() + tipo.slice(1);
            // Corrigido para não duplicar a linha de registro
            const responseText = `✅ *${tipoCapitalized} registrado para ${m.pushName}!* \n\n` +
                `*Valor:* R$ ${valor.toFixed(2)}\n` +
                `*Categoria:* ${categoria}` +
                `${descricao ? `\n*Descrição:* ${descricao}` : ''}`;

            await sock.sendMessage(m.key.remoteJid, { text: responseText }, { quoted: m });
        } catch (error) {
            console.error("Erro ao salvar transação:", error);
            await sock.sendMessage(m.key.remoteJid, { text: "❌ Ocorreu um erro ao salvar no banco de dados." }, { quoted: m });
        }
    }
};