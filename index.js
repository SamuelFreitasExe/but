const qrcodeTerminal = require('qrcode-terminal'); // Para gerar QR Code no terminal
const qrcode = require('qrcode'); // Para gerar QR Code em imagem
const { Client } = require('whatsapp-web.js'); // Biblioteca WhatsApp
const axios = require('axios');
require('dotenv').config();

// Configurar o cliente do WhatsApp
const client = new Client();

// Função para enviar o QR Code por e-mail
const sendEmailWithQRCode = async (qrImage) => {
  try {
    const base64Image = qrImage.split(',')[1]; // Remove o prefixo "data:image/png;base64,"

    // Dados do e-mail
    const emailData = {
      sender: { email: process.env.EMAIL_FROM, name: 'Seu Nome' }, // Remetente
      to: [{ email: process.env.EMAIL_TO, name: 'Destinatário' }], // Destinatário
      subject: 'QR Code para Conectar o Bot', // Assunto
      htmlContent: `
        <p>Por favor, escaneie o QR Code abaixo para conectar o bot ao WhatsApp!</p>
        <img src="data:image/png;base64,${base64Image}" alt="QR Code">
      `, // Inclui o QR Code embutido no e-mail
      attachments: [
        {
          name: 'qrcode.png', // Nome do arquivo
          content: base64Image, // Conteúdo do arquivo em base64
        },
      ],
    };

    // URL da API e chave de autenticação
    const url = 'https://api.brevo.com/v3/smtp/email';
    const BREVO_API_KEY = process.env.BREVO_API_KEY;

    // Enviar e-mail via Axios
    const response = await axios.post(url, emailData, {
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    console.log('QR Code enviado por e-mail com sucesso!', response.data);
  } catch (error) {
    console.error(
      'Erro ao enviar o QR Code por e-mail:',
      error.response ? error.response.data : error.message
    );
  }
};

// Quando o QR Code for gerado
client.on('qr', async (qr) => {
  console.log('QR Code gerado para o WhatsApp!');
  qrcodeTerminal.generate(qr, { small: true }); // Exibe o QR Code no terminal

  try {
    // Gerar QR Code em formato base64
    const qrImage = await qrcode.toDataURL(qr);
    await sendEmailWithQRCode(qrImage); // Enviar o QR Code por e-mail
  } catch (error) {
    console.error('Erro ao processar o QR Code:', error.message);
  }
});

// Quando o cliente estiver autenticado
client.on('authenticated', () => {
  console.log('Cliente autenticado no WhatsApp!');
});

// Quando o cliente estiver pronto
client.on('ready', () => {
  console.log('Tudo certo! WhatsApp conectado.');
});

// Quando o cliente for desconectado
client.on('disconnected', (reason) => {
  console.log('Cliente desconectado:', reason);
});

// Função para criar um delay
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Interações do bot com os usuários
client.on('message', async (msg) => {
  if (
    msg.body.match(/(menu|Menu|dia|tarde|noite|oi|Oi|Olá|olá|ola|Ola)/i) &&
    msg.from.endsWith('@c.us')
  ) {
    const chat = await msg.getChat();
    const contact = await msg.getContact();
    const name = contact.pushname;

    await delay(3000); // Simulando digitação
    await chat.sendStateTyping();
    await delay(3000);

    await client.sendMessage(
      msg.from,
      `Olá, ${name.split(' ')[0]}! Sou o assistente virtual da empresa tal. Como posso ajudá-lo hoje? Por favor, digite uma das opções abaixo:\n\n1 - Como funciona\n2 - Valores dos planos\n3 - Benefícios\n4 - Como aderir\n5 - Outras perguntas`
    );
  }

  if (msg.body === '1' && msg.from.endsWith('@c.us')) {
    const chat = await msg.getChat();

    await delay(3000);
    await chat.sendStateTyping();
    await delay(3000);

    await client.sendMessage(
      msg.from,
      'Nosso serviço oferece consultas médicas 24 horas por dia, 7 dias por semana, diretamente pelo WhatsApp. Sem carência e com benefícios ilimitados.'
    );
    await delay(3000);

    await client.sendMessage(
      msg.from,
      'COMO FUNCIONA?\n1. Faça seu cadastro.\n2. Efetue o pagamento.\n3. Comece a usar imediatamente!'
    );

    await delay(3000);
    await client.sendMessage(msg.from, 'Link para cadastro: https://site.com');
  }

  if (msg.body === '2' && msg.from.endsWith('@c.us')) {
    const chat = await msg.getChat();

    await delay(3000);
    await chat.sendStateTyping();
    await delay(3000);

    await client.sendMessage(
      msg.from,
      'Planos disponíveis:\n\nIndividual: R$22,50/mês\nFamília: R$39,90/mês (até 4 membros)\n\nPara mais detalhes, acesse: https://site.com'
    );
  }

  // Continue adicionando os demais casos como no seu código original...
});

// Inicializar o cliente do WhatsApp
client.initialize();
