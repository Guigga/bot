const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Tenta se conectar ao banco usando a URI do arquivo .env
        const conn = await mongoose.connect(process.env.MONGO_URI);
        
        console.log(`[MongoDB] Conectado com sucesso: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[MongoDB] Erro ao conectar: ${error.message}`);
        process.exit(1); // Encerra o processo com falha
    }
};

module.exports = connectDB;