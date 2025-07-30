// Importações
const Ficha = require('../models/Ficha');
const ARQUETIPOS = require('./classes');
const RACAS = require('./racas.js');

const ATRIBUTO_LIMITES = {
    nome: { type: 'string', maxLength: 50 },
    classe: { type: 'string', maxLength: 50 },
    raca: { type: 'string', maxLength: 50 },
    nivel: { type: 'number', min: 1, max: 100 },
    hp_max: { type: 'number', min: 1, max: 9999 },
    hp_atual: { type: 'number', min: 0, max: 9999 },
    ca: { type: 'number', min: 1, max: 100 },
    forca: { type: 'number', min: 1, max: 100 },
    destreza: { type: 'number', min: 1, max: 100 },
    constituicao: { type: 'number', min: 1, max: 100 },
    inteligencia: { type: 'number', min: 1, max: 100 },
    sabedoria: { type: 'number', min: 1, max: 100 },
    carisma: { type: 'number', min: 1, max: 100 },
    idade: { type: 'string', maxLength: 30 },
    altura: { type: 'string', maxLength: 30 },
    peso: { type: 'string', maxLength: 30 },
    alinhamento: { type: 'string', maxLength: 50 },
    antecedente: { type: 'string', maxLength: 2048 },
    divindade: { type: 'string', maxLength: 50 },
    historia: { type: 'string', maxLength: 2048 },
};

// --- FUNÇÕES HELPER ---

function aplicarArquétipo(ficha, nomeClasse) {
    const arquétipo = ARQUETIPOS[nomeClasse.toLowerCase()];
    if (!arquétipo) return;
    Object.keys(arquétipo).forEach(key => {
        ficha[key] = arquétipo[key];
    });
    ficha.classe = nomeClasse.charAt(0).toUpperCase() + nomeClasse.slice(1);
    ficha.carga_maxima = (ficha.forca || 10) * 5;
}

function aplicarRaca(ficha, nomeRaca) {
    const raca = RACAS[nomeRaca.toLowerCase()];
    if (!raca || !raca.modificadores) return;
    Object.keys(raca.modificadores).forEach(key => {
        if (ficha[key] !== undefined) {
            ficha[key] += raca.modificadores[key];
        }
    });
    ficha.raca = nomeRaca.charAt(0).toUpperCase() + nomeRaca.slice(1);
    ficha.carga_maxima = (ficha.forca || 10) * 5;
}

function recalcularCarga(ficha) {
    let cargaTotal = 0;
    if (ficha.inventario && ficha.inventario.length > 0) {
        ficha.inventario.forEach(item => {
            cargaTotal += (item.peso || 0) * (item.quantidade || 0);
        });
    }
    ficha.carga_atual = parseFloat(cargaTotal.toFixed(2));
}

function formatarInventarioResumido(inventario) {
    if (!inventario || inventario.length === 0) {
        return "_Vazio_\n_Use !inventario para ver os detalhes._";
    }
    const ultimosItens = inventario.slice(-3);
    const itensFormatados = ultimosItens.map(item => `• ${item.nome} (x${item.quantidade})`).join('\n');
    return `${itensFormatados}\n_Use !inventario para ver os detalhes._`;
}

// --- FUNÇÕES DE COMANDO ---

async function handleCriarFicha(message) {
    const playerId = message.author || message.from;

    // 1. Verifica se o JOGADOR já tem uma ficha
    const fichaExistente = await Ficha.findOne({ playerId: playerId });
    if (fichaExistente) {
        return message.reply(`❌ Você já possui uma ficha com o nome *${fichaExistente.nome}*. Use \`!apagar-ficha\` para recomeçar.`);
    }
    
    // 2. Valida se um nome foi fornecido e o captura
    const nomePersonagem = message.body.split(' ').slice(1).join(' ').trim();
    if (!nomePersonagem) {
        return message.reply('❌ Formato inválido. Você precisa fornecer um nome. Use: `!criar-ficha <nome do personagem>`');
    }

    // 3. Verifica se o NOME do personagem já existe no banco de dados
    const nomeExistente = await Ficha.findOne({ nome: { $regex: new RegExp(`^${nomePersonagem}$`, 'i') } });
    if (nomeExistente) {
        return message.reply(`❌ Já existe um personagem com o nome "*${nomePersonagem}*". Por favor, escolha outro nome.`);
    }

    // Cria a ficha apenas com o nome, o resto usará os valores padrão do Schema
    const fichaData = {
        playerId: playerId,
        nome: nomePersonagem,
    };
    
    await Ficha.create(fichaData);
    await message.reply(`✅ Ficha para *${fichaData.nome}* criada com sucesso! Use o comando \`!set\` para definir classe, raça e outros atributos.`);
}

async function findFicha(message) {
    const args = message.body.split(' ').slice(1);
    const nomeBusca = args.join(' ').trim();

    if (nomeBusca) {
        // Busca por nome (case-insensitive)
        const ficha = await Ficha.findOne({ nome: { $regex: new RegExp(`^${nomeBusca}$`, 'i') } });
        if (!ficha) {
            await message.reply(`❌ Ficha com o nome "*${nomeBusca}*" não encontrada.`);
            return null;
        }
        return ficha;
    } else {
        // Busca pelo ID do jogador que enviou a mensagem
        const playerId = message.author || message.from;
        const ficha = await Ficha.findOne({ playerId: playerId });
        if (!ficha) {
            await message.reply('❌ Você ainda não tem uma ficha. Crie uma com `!criar-ficha <nome>`.');
            return null;
        }
        return ficha;
    }
}


async function handleSetAtributo(message) {
    const playerId = message.author || message.from;
    const ficha = await Ficha.findOne({ playerId: playerId });
    if (!ficha) return message.reply('Você ainda não tem uma ficha.');

    const args = message.body.split(' ').slice(1).join(' ');
    const parts = args.split('=');
    let chave = parts[0].trim().toLowerCase();
    const valor = parts.slice(1).join('=').trim();
    if (!chave || !valor) return message.reply('Formato inválido.');

    const alias = { for: 'forca', des: 'destreza', con: 'constituicao', int: 'inteligencia', sab: 'sabedoria', car: 'carisma' };
    if (alias[chave]) chave = alias[chave];

    if (chave === 'classe' || chave === 'raca') {
        if (chave === 'classe') {
            if (!ARQUETIPOS[valor.toLowerCase()]) return message.reply(`❌ Classe "*${valor}*" inválida.`);
            ficha.classe = valor.charAt(0).toUpperCase() + valor.slice(1).toLowerCase();
        }
        if (chave === 'raca') {
            if (!RACAS[valor.toLowerCase()]) return message.reply(`❌ Raça "*${valor}*" inválida.`);
            ficha.raca = valor.charAt(0).toUpperCase() + valor.slice(1).toLowerCase();
        }
        
        if (ficha.classe && ficha.classe !== 'N/A') aplicarArquétipo(ficha, ficha.classe);
        if (ficha.raca && ficha.raca !== 'N/A') aplicarRaca(ficha, ficha.raca);
        
        await ficha.save();
        return message.reply(`✅ Atributos recalculados para a nova ${chave}!`);
    }

    if (chave === 'forca') ficha.carga_maxima = (Number(valor) || 10) * 5;

    const limite = ATRIBUTO_LIMITES[chave];
    if (!limite) return message.reply(`❌ Atributo desconhecido: *${chave}*.`);

    if (limite.type === 'string') {
        if (valor.length > limite.maxLength) return message.reply(`❌ Valor muito longo.`);
        ficha[chave] = valor;
    } else if (limite.type === 'number') {
        const numero = Number(valor);
        if (isNaN(numero)) return message.reply(`❌ Valor deve ser um número.`);
        const maxVal = (chave === 'hp_atual') ? ficha.hp_max : limite.max;
        if (numero < limite.min || numero > maxVal) return message.reply(`❌ Valor fora dos limites.`);
        ficha[chave] = Math.floor(numero);
    }
    
    await ficha.save();
    await message.reply(`✅ Atributo *${chave}* atualizado!`);
}

async function handleVerFicha(message) {
    const ficha = await findFicha(message);
    if (!ficha) return;

    let resposta = `*--- ${ficha.nome} ---*\n`;
    resposta += `*Raça:* ${ficha.raca || 'N/A'} | *Classe:* ${ficha.classe || 'N/A'}\n`;
    resposta += `*Nível:* ${ficha.nivel}\n`;
    resposta += `*HP:* ${ficha.hp_atual}/${ficha.hp_max} ❤️\n`;
    resposta += `*CA:* ${ficha.ca} 🛡️\n\n`;
    resposta += `*Atributos:*\nFor: ${ficha.forca} | Des: ${ficha.destreza} | Con: ${ficha.constituicao}\n`;
    resposta += `Int: ${ficha.inteligencia} | Sab: ${ficha.sabedoria} | Car: ${ficha.carisma}\n\n`;
    resposta += `*Inventário (${ficha.carga_atual}/${ficha.carga_maxima} kg):*\n`;
    resposta += formatarInventarioResumido(ficha.inventario);
    
    resposta += `\n\n---\n_Para ajuda com os comandos, digite !rpg-help_`;

    await message.reply(resposta);
}

async function handleVerFichaCompleta(message) {
    const ficha = await findFicha(message);
    if (!ficha) return;

    let resposta = `*--- ${ficha.nome} ---*\n\n`;
    resposta += `*${ficha.classe || 'N/A'} | ${ficha.raca || 'N/A'}* - Nível ${ficha.nivel}\n`;
    resposta += `*Alinhamento:* ${ficha.alinhamento || 'N/A'}\n*Divindade:* ${ficha.divindade || 'N/A'}\n\n`;
    resposta += `*HP:* ${ficha.hp_atual}/${ficha.hp_max} ❤️ | *CA:* ${ficha.ca} 🛡️\n\n`;
    resposta += `*Atributos:*\nFor: ${ficha.forca} | Des: ${ficha.destreza} | Con: ${ficha.constituicao}\nInt: ${ficha.inteligencia}  | Sab: ${ficha.sabedoria} | Car: ${ficha.carisma}\n\n`;
    resposta += `*Ataques ⚔*\n${ficha.ataques && ficha.ataques.length > 0 ? `• ${ficha.ataques.join('\n• ')}` : "_Nenhum_"}\n\n`;
    resposta += `*Magias ✨*\n${ficha.magias && ficha.magias.length > 0 ? `• ${ficha.magias.join('\n• ')}` : "_Nenhuma_"}\n\n`;
    resposta += `*Habilidades* 💪\n${ficha.habilidades && ficha.habilidades.length > 0 ? `• ${ficha.habilidades.join('\n• ')}` : "_Nenhuma_"}\n\n`;
    resposta += `*Inventário (${ficha.carga_atual}/${ficha.carga_maxima} kg)* 🎒\n`;
    resposta += formatarInventarioResumido(ficha.inventario);
    resposta += `\n\n`;
    resposta += `*Detalhes Pessoais:* 👤\nIdade: ${ficha.idade || 'N/A'} | Altura: ${ficha.altura || 'N/A'} | Peso: ${ficha.peso || 'N/A'}\n\n`;
    resposta += `*Antecedente:* 📜 ${ficha.antecedente || 'N/A'}\n\n`;
    resposta += `*História* 📖 ${ficha.historia || 'N/A'}\n`;
    resposta += `\n_Para ajuda com os comandos, digite:_ \n!rpg-help`;

    await message.reply(resposta);
}

async function handleAddItem(message) {
    const playerId = message.author || message.from;
    const ficha = await Ficha.findOne({ playerId: playerId });
    if (!ficha) return message.reply('❌ Você não tem uma ficha.');

    const args = message.body.split(' ').slice(1).join(' ').split(',').map(arg => arg.trim());
    const nome = args[0];
    if (!nome) return message.reply('Formato inválido. Use `!add <nome>, [qtd], [peso], [desc]`');

    const quantidade = parseInt(args[1]) || 1;
    const peso = parseFloat(args[2]) || 0;
    const descricao = args[3] || 'N/A';

    const itemExistente = ficha.inventario.find(item => item.nome.toLowerCase() === nome.toLowerCase());

    if (itemExistente) {
        itemExistente.quantidade += quantidade;
    } else {
        if (ficha.inventario.length >= 50) return message.reply('❌ Inventário cheio (limite de 50 tipos de itens).');
        ficha.inventario.push({ nome, quantidade, peso, descricao });
    }

    recalcularCarga(ficha);
    await ficha.save();
    
    let resposta = `✅ *${quantidade}x ${nome}* adicionado(s).`;
    if (ficha.carga_atual > ficha.carga_maxima) {
        resposta += `\n⚠️ *Atenção: Você está sobrecarregado!* (${ficha.carga_atual}/${ficha.carga_maxima} kg)`;
    }
    await message.reply(resposta);
}

async function handleRemoveItem(message) {
    const playerId = message.author || message.from;
    const ficha = await Ficha.findOne({ playerId: playerId });
    if (!ficha || ficha.inventario.length === 0) return message.reply('❌ Seu inventário está vazio.');

    const args = message.body.split(' ').slice(1).join(' ').split(',').map(arg => arg.trim());
    const nome = args[0];
    if (!nome) return message.reply('Formato inválido. Use `!rmv <nome>, [qtd]`');

    const quantidadeRemover = parseInt(args[1]);
    const itemIndex = ficha.inventario.findIndex(item => item.nome.toLowerCase() === nome.toLowerCase());
    if (itemIndex === -1) return message.reply(`❌ Item "*${nome}*" não encontrado.`);

    const item = ficha.inventario[itemIndex];
    
    if (isNaN(quantidadeRemover) || quantidadeRemover >= item.quantidade) {
        ficha.inventario.splice(itemIndex, 1);
        await message.reply(`✅ Todos os itens "*${item.nome}*" foram removidos.`);
    } else {
        item.quantidade -= quantidadeRemover;
        await message.reply(`✅ *${quantidadeRemover}x ${item.nome}* removido(s). Restam: ${item.quantidade}.`);
    }

    recalcularCarga(ficha);
    await ficha.save();
}

async function handleVerInventario(message) {
    const playerId = message.author || message.from;
    const ficha = await Ficha.findOne({ playerId: playerId });
    if (!ficha) return message.reply('❌ Você não tem uma ficha.');

    let resposta = `*--- Inventário de ${ficha.nome} ---*\n`;
    resposta += `*Carga Total:* ${ficha.carga_atual} / ${ficha.carga_maxima} kg\n\n`;

    if (ficha.inventario.length === 0) {
        resposta += "_Vazio_";
    } else {
        ficha.inventario.forEach(item => {
            resposta += `*• ${item.nome} (x${item.quantidade})*\n`;
            resposta += `  _Peso: ${item.peso} kg | Desc: ${item.descricao}_\n`;
        });
    }
    
    if (ficha.carga_atual > ficha.carga_maxima) {
        resposta += `\n\n⚠️ *Atenção: Você está sobrecarregado!*`;
    }
    await message.reply(resposta);
}

async function gerenciarListaSimples(message, tipo) {
    const acao = message.body.startsWith('!add') ? 'add' : 'remove';
    const singular = tipo.slice(0, -1);
    const limite = { magias: 50, ataques: 10, habilidades: 20 }[tipo];

    const playerId = message.author || message.from;
    const ficha = await Ficha.findOne({ playerId: playerId });
    if (!ficha) return message.reply('❌ Você não tem uma ficha.');

    if (acao === 'remove' && (!ficha[tipo] || ficha[tipo].length === 0)) return message.reply(`❌ Você não tem ${tipo} para remover.`);

    const valor = message.body.split(' ').slice(1).join(' ').trim();
    if (!valor) return message.reply(`Formato inválido.`);

    if (acao === 'add') {
        const novosItens = valor.split(',').map(i => i.trim().substring(0, 100)).filter(i => i);
        if ((ficha[tipo].length + novosItens.length) > limite) return message.reply(`❌ Limite de ${limite} ${tipo} atingido.`);
        await Ficha.updateOne({ playerId: playerId }, { $push: { [tipo]: { $each: novosItens } } });
        await message.reply(`✅ ${singular}(s) adicionado(s): *${novosItens.join(', ')}*`);
    } else {
        const itemParaRemover = ficha[tipo].find(i => i.toLowerCase() === valor.toLowerCase());
        if (!itemParaRemover) return message.reply(`❌ ${singular} "*${valor}*" não encontrado.`);
        await Ficha.updateOne({ playerId: playerId }, { $pull: { [tipo]: itemParaRemover } });
        await message.reply(`✅ ${singular} "*${itemParaRemover}*" removido.`);
    }
}

const handleAddHabilidade = (message) => gerenciarListaSimples(message, 'habilidades');
const handleRmvHabilidade = (message) => gerenciarListaSimples(message, 'habilidades');
const handleAddAtaque = (message) => gerenciarListaSimples(message, 'ataques');
const handleRmvAtaque = (message) => gerenciarListaSimples(message, 'ataques');
const handleAddMagia = (message) => gerenciarListaSimples(message, 'magias');
const handleRmvMagia = (message) => gerenciarListaSimples(message, 'magias');

async function handleApagarFicha(message) {
    const playerId = message.author || message.from;
    const resultado = await Ficha.deleteOne({ playerId: playerId });
    if (resultado.deletedCount === 0) return message.reply('❌ Você não possui uma ficha para apagar.');
    await message.reply('✅ Sua ficha foi apagada com sucesso.');
}

async function handleVerClasses(message) {
    let resposta = "*Classes Disponíveis no BotZap RPG* ⚔️\n\n";
    for (const classe in ARQUETIPOS) {
        const data = ARQUETIPOS[classe];
        const nomeClasse = classe.charAt(0).toUpperCase() + classe.slice(1);
        resposta += `*${nomeClasse}*\nHP: ${data.hp_max} | CA: ${data.ca}\n`;
        resposta += `For:${data.forca}|Des:${data.destreza}|Con:${data.constituicao}|Int:${data.inteligencia}|Sab:${data.sabedoria}|Car:${data.carisma}\n\n`;
    }
    await message.reply(resposta);
}

async function handleVerRacas(message) {
    let resposta = "*Raças Disponíveis no BotZap RPG* 🌍\n\n";
    for (const raca in RACAS) {
        const data = RACAS[raca];
        const nomeRaca = raca.charAt(0).toUpperCase() + raca.slice(1);
        resposta += `*${nomeRaca}*: ${data.descricao}\n`;
        const mods = Object.entries(data.modificadores).map(([attr, val]) => `${attr.substring(0,3)}: ${val > 0 ? '+' : ''}${val}`).join(' | ');
        resposta += `_Modificadores: ${mods}_\n\n`;
    }
    await message.reply(resposta);
}

module.exports = {
    handleCriarFicha, handleVerFicha, handleVerFichaCompleta, handleSetAtributo, handleAddItem,
    handleRemoveItem, handleAddHabilidade, handleRmvHabilidade, handleAddAtaque,
    handleRmvAtaque, handleAddMagia, handleRmvMagia, handleApagarFicha,
    handleVerClasses, handleVerRacas, handleVerInventario
};