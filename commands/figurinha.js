// commands/figurinha.js

// 1. Importamos as funções necessárias do Baileys no topo do arquivo
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: '!figurinha',
    aliases: ['!sticker'],
    // 2. Adicionamos a categoria para o comando de ajuda dinâmico
    category: 'utilidades',
    description: 'Cria uma figurinha a partir de uma imagem ou vídeo respondido.',
    
    // 3. Adaptamos a assinatura da função para o novo padrão
    async execute(sock, m, command, body) {
        const chatId = m.key.remoteJid;

        // 4. A lógica para encontrar a mensagem citada e a mídia muda completamente
        const quotedMsg = m.message.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quotedMsg) {
            return sock.sendMessage(chatId, { text: 'Para criar uma figurinha, responda a uma imagem ou vídeo com o comando `!figurinha`.' }, { quoted: m });
        }

        const isMedia = quotedMsg.imageMessage || quotedMsg.videoMessage;

        if (isMedia) {
            await sock.sendMessage(chatId, { text: "Criando sua figurinha, um momento... 🎨" }, { quoted: m });
            try {
                // 5. Usamos o 'downloadMediaMessage' para baixar a mídia como um buffer
                const buffer = await downloadMediaMessage(
                    {
                        key: m.message.extendedTextMessage.contextInfo.stanzaId,
                        message: quotedMsg
                    },
                    'buffer',
                    {}
                );

                // 6. Enviamos o buffer como um sticker
                await sock.sendMessage(chatId, { 
                    sticker: buffer,
                    // OBS: Os campos de autor e nome do sticker podem não ser suportados
                    // em todas as versões do WhatsApp da mesma forma que na biblioteca antiga.
                    // A forma mais garantida é enviar apenas o buffer.
                }, { quoted: m });

            } catch (error) {
                console.error("Erro ao criar figurinha:", error);
                await sock.sendMessage(chatId, { text: "❌ Ih, deu erro! Tente com outra imagem ou um vídeo mais curto." }, { quoted: m });
            }
        } else {
            await sock.sendMessage(chatId, { text: 'Você precisa responder a uma imagem ou vídeo para eu transformar em figurinha!' }, { quoted: m });
        }
    }
};