// controllers/musicaHandler.js

const playdl = require('play-dl');

// 1. A assinatura da função é atualizada para o padrão do Baileys
async function handleMusica(sock, m, query) {
    const chatId = m.key.remoteJid;

    if (!query) {
        // 2. Todas as chamadas de 'reply' são convertidas para 'sock.sendMessage'
        return await sock.sendMessage(chatId, { text: '❌ Para buscar uma música, use: `!musica <nome da música>`' }, { quoted: m });
    }

    await sock.sendMessage(chatId, { text: `🎵 Procurando o link para: *${query}*...` }, { quoted: m });

    try {
        const videos = await playdl.search(query, { limit: 1, source: { youtube: "video" } });
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { text: '❌ Nenhum resultado encontrado no YouTube.' }, { quoted: m });
        }

        const video = videos[0];

        if (!video || !video.id) {
            return await sock.sendMessage(chatId, { text: '❌ Ocorreu um erro ao obter os detalhes do vídeo.' }, { quoted: m });
        }

        // 3. A URL do vídeo é corrigida para usar o formato padrão do YouTube
        const videoUrl = video.url;
        
        const replyMessage = `✅ Aqui está seu link:\n\n*${video.title}*\n${videoUrl}`;
        
        await sock.sendMessage(chatId, { text: replyMessage }, { quoted: m });

    } catch (err) {
        console.error('Erro ao buscar link da música:', err);
        await sock.sendMessage(chatId, { text: '❌ Desculpe, ocorreu um erro inesperado ao tentar buscar o link.' }, { quoted: m });
    }
}

module.exports = handleMusica;