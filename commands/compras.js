// commands/compras.js

function parseIndicesComRanges(indicesStr) {
    const indices = new Set(); // Usamos um Set para evitar números duplicados automaticamente

    const parts = indicesStr.split(',');

    for (const part of parts) {
        const trimmedPart = part.trim();
        // Verifica se é um range (ex: "1-5")
        if (trimmedPart.includes('-')) {
            const [start, end] = trimmedPart.split('-').map(n => parseInt(n, 10));
            
            if (!isNaN(start) && !isNaN(end) && start <= end) {
                for (let i = start; i <= end; i++) {
                    indices.add(i - 1); // Adiciona o índice (base 0)
                }
            }
        } else {
            // Se não for um range, é um número único
            const num = parseInt(trimmedPart, 10);
            if (!isNaN(num)) {
                indices.add(num - 1); // Adiciona o índice (base 0)
            }
        }
    }

    // Converte o Set para um Array, filtra valores inválidos e ordena do maior para o menor
    // (para removermos do array da lista de compras sem bagunçar os índices)
    return Array.from(indices)
        .filter(n => n >= 0)
        .sort((a, b) => b - a);
}

const ListaCompras = require('../models/ListaCompras');
// 1. IMPORTAR O MODELO DE TRANSAÇÃO
const Transacao = require('../models/Transacao');
const { nanoid } = require('nanoid');

const LIST_ID = 'shared_shopping_list';

module.exports = {
    name: '!compras',
    aliases: ['!lista', '!check'],
    category: 'compras',
    description: 'Gerencia a lista de compras compartilhada.',

    async execute(sock, m, command, body) {
        const chatId = m.key.remoteJid;

        switch (command) {
            case '!compras': {
                const itemsText = body.substring(command.length).trim();
                if (!itemsText) {
                    return await sock.sendMessage(chatId, { text: '✍️ Formato inválido. Use: `!compras item 1, item 2, item 3`' }, { quoted: m });
                }

                const itemsToAdd = itemsText.split(',').map(item => item.trim()).filter(Boolean);

                if (itemsToAdd.length === 0) {
                    return await sock.sendMessage(chatId, { text: '✍️ Por favor, informe os itens que deseja adicionar.' }, { quoted: m });
                }

                try {
                    await ListaCompras.findOneAndUpdate(
                        { listId: LIST_ID },
                        { $push: { items: { $each: itemsToAdd } } },
                        { upsert: true, new: true }
                    );
                    await sock.sendMessage(chatId, { text: `✅ Itens adicionados à lista de compras!` }, { quoted: m });
                } catch (error) {
                    console.error("Erro ao adicionar itens:", error);
                    await sock.sendMessage(chatId, { text: '❌ Ocorreu um erro ao salvar os itens.' }, { quoted: m });
                }
                break;
            }

            case '!lista': {
                try {
                    const lista = await ListaCompras.findOne({ listId: LIST_ID });

                    if (!lista || lista.items.length === 0) {
                        return await sock.sendMessage(chatId, { text: '🎉 A lista de compras está vazia!' }, { quoted: m });
                    }

                    let responseText = '*🛒 Lista de Compras:*\n\n';
                    lista.items.forEach((item, index) => {
                        responseText += `${index + 1}. ${item}\n`;
                    });
                    responseText += '\nPara marcar um item, use `!check <número>`\nPara marcar e registrar um gasto, use `!check <número> <categoria> <valor>`';

                    await sock.sendMessage(chatId, { text: responseText }, { quoted: m });
                } catch (error) {
                    console.error("Erro ao buscar a lista:", error);
                    await sock.sendMessage(chatId, { text: '❌ Ocorreu um erro ao buscar a lista.' }, { quoted: m });
                }
                break;
            }

            // --- LÓGICA DO !CHECK ATUALIZADA ---
            case '!check': {
                const content = body.substring(command.length).trim();
                let indicesText = content;
                let categoriaGasto = null;
                let valorGasto = null;

                // Tenta encontrar o padrão "texto categoria valor" no final
                const financeMatch = content.match(/(.+?)\s+(\S+)\s+([\d,.]+)$/);

                if (financeMatch) {
                    indicesText = financeMatch[1].trim();
                    categoriaGasto = financeMatch[2];
                    valorGasto = parseFloat(financeMatch[3].replace(',', '.'));
                }

                if (!indicesText) {
                    return await sock.sendMessage(chatId, { text: '✍️ Formato inválido. Informe os números dos itens a serem marcados.' }, { quoted: m });
                }

                const indicesToRemove = parseIndicesComRanges(indicesText);

                if (indicesToRemove.length === 0) {
                    return await sock.sendMessage(chatId, { text: '✍️ Nenhum número de item válido foi informado.' }, { quoted: m });
                }
                
                try {
                    const lista = await ListaCompras.findOne({ listId: LIST_ID });
                    if (!lista || lista.items.length === 0) {
                        return await sock.sendMessage(chatId, { text: 'A lista já está vazia.' }, { quoted: m });
                    }
                    
                    const removedItems = [];
                    // Remove os itens da lista e guarda os nomes
                    for (const index of indicesToRemove) {
                        if (index < lista.items.length) {
                            // Adiciona o item removido no início do array para manter a ordem original
                            removedItems.unshift(lista.items.splice(index, 1)[0]);
                        }
                    }

                    if (removedItems.length === 0) {
                        return await sock.sendMessage(chatId, { text: 'Nenhum dos números informados corresponde a um item na lista.' }, { quoted: m });
                    }

                    // Salva a lista de compras atualizada
                    await lista.save();
                    
                    let confirmationText = `🛒 Item(s) removido(s): *${removedItems.join(', ')}*`;

                    // Se um gasto foi informado, cria a transação
                    if (categoriaGasto && !isNaN(valorGasto) && valorGasto > 0) {
                        const senderId = m.key.participant || m.key.remoteJid;
                        const userId = senderId.split('@')[0];
                        const descricao = `Compra de: ${removedItems.join(', ')}`;
                        
                        const novaTransacao = new Transacao({
                            shortId: nanoid(6),
                            userId,
                            tipo: 'gasto',
                            valor: valorGasto,
                            categoria: categoriaGasto,
                            descricao
                        });
                        await novaTransacao.save();
                        
                        confirmationText += `\n\n💸 Gasto de *R$ ${valorGasto.toFixed(2).replace('.', ',')}* registrado na categoria *${categoriaGasto}*!`;
                    }

                    await sock.sendMessage(chatId, { text: confirmationText }, { quoted: m });

                } catch (error) {
                    console.error("Erro ao processar !check:", error);
                    await sock.sendMessage(chatId, { text: '❌ Ocorreu um erro ao atualizar a lista e/ou registrar o gasto.' }, { quoted: m });
                }
                break;
            }
        }
    }
};