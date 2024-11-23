const { Client } = require('whatsapp-web.js'); // WhatsApp client
const qrcode = require('qrcode'); // Para gerar o QR Code
const nodemailer = require('nodemailer'); // Para enviar o QR Code por email
const { createClient } = require('@supabase/supabase-js'); // Supabase client

// Configuração do Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const SESSION_TABLE = 'whatsapp_sessions'; // Nome da tabela no Supabase
const SESSION_ID = 'default'; // ID fixo para esta instância do bot

// Funções para persistência no Supabase
async function saveSessionData(sessionData) {
    const { data, error } = await supabase
        .from(SESSION_TABLE)
        .upsert({ id: SESSION_ID, data: JSON.stringify(sessionData) });

    if (error) {
        console.error('Erro ao salvar sessão no Supabase:', error);
        throw error;
    }
}

async function getSessionData() {
    const { data, error } = await supabase
        .from(SESSION_TABLE)
        .select('data')
        .eq('id', SESSION_ID)
        .single();

    if (error) {
        if (error.code !== 'PGRST116') {
            console.error('Erro ao recuperar sessão do Supabase:', error);
            throw error;
        }
        return null; // Sessão não encontrada
    }
    return JSON.parse(data.data);
}

// Cliente do WhatsApp com persistência personalizada
const client = new Client({
    authStrategy: {
        async saveAuthInfo(session) {
            await saveSessionData(session);
        },
        async loadAuthInfo() {
            return await getSessionData();
        },
        clearAuthInfo: async () => {
            await supabase
                .from(SESSION_TABLE)
                .delete()
                .eq('id', SESSION_ID);
        }
    }
});

// Serviço de leitura do QR Code
client.on('qr', async (qr) => {
    console.log('QR Code gerado!');

    // Gerar o QR Code como imagem base64
    const qrImage = await qrcode.toDataURL(qr);

    // Configurar o transporte do Nodemailer
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, // Email remetente
            pass: process.env.EMAIL_PASS  // Senha ou token de aplicativo
        }
    });

    // Configurar o email
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_DEST, // Destinatário
        subject: 'QR Code para Conectar o Bot',
        text: 'Por favor, escaneie o QR Code em anexo para conectar o bot.',
        attachments: [
            {
                filename: 'qrcode.png',
                content: qrImage.split(',')[1], // Remove o prefixo "data:image/png;base64,"
                encoding: 'base64'
            }
        ]
    };

    // Enviar o email
    try {
        await transporter.sendMail(mailOptions);
        console.log('QR Code enviado por email com sucesso!');
    } catch (error) {
        console.error('Erro ao enviar o QR Code por email:', error);
    }
});

// Quando o cliente está pronto
client.on('ready', () => {
    console.log('Tudo certo! WhatsApp conectado.');
});

// Inicializa o cliente
client.initialize();

// Funil de mensagens
client.on('message', async (msg) => {
    const chat = await msg.getChat();

    // Mensagem inicial de boas-vindas
    if (msg.body.match(/(menu|Menu|dia|tarde|noite|oi|Oi|Olá|olá|ola|Ola)/i) && msg.from.endsWith('@c.us')) {
        const contact = await msg.getContact();
        const name = contact.pushname;

        await chat.sendStateTyping();
        setTimeout(async () => {
            await client.sendMessage(
                msg.from,
                `Olá, ${name.split(" ")[0]}! Sou o assistente virtual da empresa tal. Como posso ajudá-lo hoje? Por favor, digite uma das opções abaixo:\n\n` +
                `1 - Como funciona\n2 - Valores dos planos\n3 - Benefícios\n4 - Como aderir\n5 - Outras perguntas`
            );
        }, 3000);
        return;
    }
});
