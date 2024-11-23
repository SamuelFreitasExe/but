const qrcode = require('qrcode'); // Para gerar o QR Code
const nodemailer = require('nodemailer'); // Para enviar o QR Code por email
const { Client, LocalAuth } = require('whatsapp-web.js'); // WhatsApp client

// Configuração do cliente com autenticação persistente
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: '/persistent-data' // Caminho no Render
    })
});

// Serviço de leitura do QR Code
client.on('qr', async (qr) => {
    console.log('QR Code gerado!');

    // Gerar o QR Code como imagem base64
    const qrImage = await qrcode.toDataURL(qr);

    // Configurar o transporte do Nodemailer
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Use o serviço do seu email (pode ser Gmail, Outlook, etc.)
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

// Função de delay para criar pausas
const delay = ms => new Promise(res => setTimeout(res, ms));

// Funil de mensagens
client.on('message', async (msg) => {
    const chat = await msg.getChat();

    // Mensagem inicial de boas-vindas
    if (msg.body.match(/(menu|Menu|dia|tarde|noite|oi|Oi|Olá|olá|ola|Ola)/i) && msg.from.endsWith('@c.us')) {
        const contact = await msg.getContact();
        const name = contact.pushname;

        await delay(3000);
        await chat.sendStateTyping();
        await delay(3000);

        await client.sendMessage(
            msg.from,
            `Olá, ${name.split(" ")[0]}! Sou o assistente virtual da empresa tal. Como posso ajudá-lo hoje? Por favor, digite uma das opções abaixo:\n\n` +
            `1 - Como funciona\n2 - Valores dos planos\n3 - Benefícios\n4 - Como aderir\n5 - Outras perguntas`
        );
        return;
    }

    // Respostas baseadas na entrada do usuário
    switch (msg.body) {
        case '1': // Informações sobre funcionamento
            await delay(3000);
            await chat.sendStateTyping();
            await delay(3000);

            await client.sendMessage(
                msg.from,
                `Nosso serviço oferece consultas médicas 24 horas por dia, 7 dias por semana, diretamente pelo WhatsApp.\n` +
                `Não há carência, o que significa que você pode começar a usar nossos serviços imediatamente após a adesão.\n\n` +
                `COMO FUNCIONA?\n` +
                `1º Passo: Faça seu cadastro e escolha o plano desejado.\n` +
                `2º Passo: Após o pagamento, você já terá acesso à área exclusiva.\n` +
                `3º Passo: Use nossos serviços sempre que precisar!\n\n` +
                `Link para cadastro: https://site.com`
            );
            break;

        case '2': // Valores dos planos
            await delay(3000);
            await chat.sendStateTyping();
            await delay(3000);

            await client.sendMessage(
                msg.from,
                `*Planos disponíveis:*\n\n` +
                `*Individual:* R$22,50/mês\n` +
                `*Família:* R$39,90/mês (você + 3 dependentes)\n` +
                `*TOP Individual:* R$42,50/mês (benefícios adicionais)\n` +
                `*TOP Família:* R$79,90/mês (você + 3 dependentes)\n\n` +
                `Link para cadastro: https://site.com`
            );
            break;

        case '3': // Benefícios
            await delay(3000);
            await chat.sendStateTyping();
            await delay(3000);

            await client.sendMessage(
                msg.from,
                `*Benefícios oferecidos:*\n\n` +
                `- Atendimento médico ilimitado 24h por dia.\n` +
                `- Sorteio de prêmios todo ano.\n` +
                `- Receitas de medicamentos diretamente pelo WhatsApp.\n\n` +
                `Link para cadastro: https://site.com`
            );
            break;

        case '4': // Como aderir
            await delay(3000);
            await chat.sendStateTyping();
            await delay(3000);

            await client.sendMessage(
                msg.from,
                `Você pode aderir aos nossos planos diretamente pelo nosso site ou pelo WhatsApp.\n` +
                `Após a adesão, você terá acesso imediato aos serviços.\n\n` +
                `Link para cadastro: https://site.com`
            );
            break;

        case '5': // Outras perguntas
            await delay(3000);
            await chat.sendStateTyping();
            await delay(3000);

            await client.sendMessage(
                msg.from,
                `Se tiver outras dúvidas, fale aqui neste WhatsApp ou visite nosso site: https://site.com`
            );
            break;

        default: // Mensagem de erro para entradas inválidas
            if (msg.from.endsWith('@c.us')) {
                await delay(2000);
                await client.sendMessage(
                    msg.from,
                    `Desculpe, não entendi sua solicitação. Por favor, escolha uma opção válida:\n\n1 - Como funciona\n2 - Valores dos planos\n3 - Benefícios\n4 - Como aderir\n5 - Outras perguntas`
                );
            }
            break;
    }
});

// Tratamento de erros
client.on('error', (err) => {
    console.error('Erro detectado:', err);
});
