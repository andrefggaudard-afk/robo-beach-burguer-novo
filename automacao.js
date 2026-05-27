const { Client, LocalAuth } = require('whatsapp-web.js');
const { chromium } = require('playwright');

const CONTATO_NOME = 'Trabalho André Gaudard';

const mapeamentoItens = {
    'MATA FOME': 'Praia dos Anjos',
    'PRAIA DO LEME': 'Praia do Leme',
    'PRAIA DA FERRADURINHA': 'Praia da Ferradurinha',
    'COCA COLA 2L': 'Coca Cola 2L',
    'COCA COLA LATA': 'Coca Cola',
    'COCA COLA 1,5L': 'Coca Cola 1,5L',
    'COCA COLA ZERO 1,5L': 'Coca Cola Zero 1,5L'
};

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('ready', async () => {
    console.log('✅ WhatsApp conectado!');
    
    const chats = await client.getChats();
    const contato = chats.find(chat => chat.name === CONTATO_NOME);
    
    if (contato) {
        console.log(`🎯 Monitorando: "${CONTATO_NOME}"`);
        
        const messages = await contato.fetchMessages({ limit: 20 });
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const pedidoHoje = messages.find(msg => {
            const msgDate = new Date(msg.timestamp * 1000);
            return msgDate >= hoje && msg.body.includes('📋 PEDIDOS BEACH BURGUER');
        });
        
        if (pedidoHoje) {
            console.log('📦 Pedido encontrado!');
            await processarPedido(pedidoHoje.body);
        }
    }
    
    console.log('📡 Aguardando pedidos...');
});

client.on('message', async (message) => {
    const contact = await message.getContact();
    const name = contact.name || contact.pushname;
    
    if (name !== CONTATO_NOME) return;
    if (!message.body.includes('📋 PEDIDOS BEACH BURGUER')) return;
    
    console.log('📨 Novo pedido!');
    await processarPedido(message.body);
});

async function processarPedido(texto) {
    const pedidos = [];
    const blocos = texto.split('━━━━━━━━━━━━━━');
    
    for (const bloco of blocos) {
        const nomeMatch = bloco.match(/👤 (.+?)(?:\n|$)/);
        const setorMatch = bloco.match(/🏢 (.+?)(?:\n|$)/);
        
        if (!nomeMatch) continue;
        
        const nome = nomeMatch[1].trim();
        const setor = setorMatch ? setorMatch[1].trim() : 'SEM SETOR';
        
        const itemRegex = /(?:🍔|🥤) (\d+) UND - (.+?)(?:\n|$)/g;
        let match;
        
        while ((match = itemRegex.exec(bloco)) !== null) {
            const quantidade = parseInt(match[1]);
            const itemNome = match[2].trim();
            
            for (let i = 0; i < quantidade; i++) {
                pedidos.push({ nome, setor, item: itemNome });
            }
        }
    }
    
    if (pedidos.length > 0) {
        console.log(`📋 ${pedidos.length} itens`);
        await montarCarrinho(pedidos);
    }
}

async function montarCarrinho(pedidos) {
    console.log('🚀 Montando carrinho...');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.goto('https://app.cardapioweb.com/beach_burguer#promocoes');
    await page.waitForTimeout(5000);
    
    try {
        await page.locator('.z-30.flex.items-center.justify-between.p-4 > .MuiButtonBase-root').click();
    } catch(e) {}
    
    await page.getByText('Entrar/Cadastrar').click();
    await page.waitForTimeout(1000);
    await page.getByRole('textbox', { name: '(00) 90000-' }).fill('(22) 99876-8644');
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await page.waitForTimeout(4000);
    
    for (const pedido of pedidos) {
        const produtoSite = mapeamentoItens[pedido.item] || pedido.item;
        
        try {
            await page.locator(`h3:has-text("${produtoSite}")`).first().click();
            await page.waitForTimeout(2000);
            
            if (produtoSite.includes('Praia')) {
                try {
                    await page.locator('input[type="radio"]').first().check();
                    await page.waitForTimeout(1000);
                } catch(e) {}
            }
            
            await page.locator('textarea').fill(`${pedido.item}\n${pedido.nome}\n${pedido.setor}`);
            await page.waitForTimeout(500);
            await page.getByText('AdicionarR$').click();
            console.log(`✅ ${pedido.nome} - ${produtoSite}`);
            
        } catch(e) {
            console.log(`❌ Erro: ${e.message}`);
        }
        
        await page.waitForTimeout(2000);
    }
    
    console.log('✅ Carrinho montado!');
    await browser.close();
}

client.initialize();