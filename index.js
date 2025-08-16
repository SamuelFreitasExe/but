const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const axios = require('axios');
require('dotenv').config();

let qrCodeImage = null; // QR gerado temporariamente

// Configuração do Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Função para buscar sessão
const getSessionFromSupabase = async () => {
  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .select('session_data')
    .eq('id', 'default_session')
    .single();

  if (error) {
    console.error('Erro ao buscar sessão:', error.message);
    return null;
  }

  if (!data?.session_data) {
    console.log('Nenhuma sessão encontrada no Supabase. Será necessário escanear o QR Code.');
    return null;
  }

  return JSON.parse(data.session_data);
};

// Função para salvar sessão
const saveSessionToSupabase = async (session) => {
  if (!session || Object.keys(session).length === 0) return;
  const { error } = await supabase
    .from('whatsapp_sessions')
    .upsert({
      id: 'default_session',
      session_data: JSON.stringify(session),
      updated_at: new Date().toISOString(),
    });
  if (error) console.error('Erro ao salvar sessão no Supabase:', error.message);
  else console.log('Sessão salva com sucesso no Supabase!');
};

// Função para enviar QR por e-mail
const sendEmailWithQRCode = async (qrImage) => {
  try {
    const base64Image = qrImage.split(',')[1];
    const emailData = {
      sender: { email: process.env.EMAIL_FROM, name: 'Bot Assistente' },
      to: [{ email: process.env.EMAIL_TO, name: 'Usuário' }],
      subject: 'QR Code para conectar o bot',
      htmlContent: `<p>Escaneie o QR Code para conectar o bot ao WhatsApp:</p><img src="data:image/png;base64,${base64Image}" alt="QR Code">`,
      attachments: [{ name: 'qrcode.png', content: base64Image }],
    };
    await axios.post('https://api.brevo.com/v3/smtp/email', emailData, {
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
    });
    console.log('QR Code enviado por e-mail com sucesso!');
  } catch (error) {
    console.error('Erro ao enviar QR Code por e-mail:', error.response?.data || error.message);
  }
};

// Inicializa o cliente WhatsApp
const initializeWhatsAppClient = async () => {
  const sessionData = await getSessionFromSupabase();

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: "default" }),
    session: sessionData || undefined,
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
  });

  client.on('qr', async (qr) => {
    console.log('QR Code gerado, escaneie para conectar:');
    qrcodeTerminal.generate(qr, { small: true });
    qrCodeImage = await qrcode.toDataURL(qr);
    await sendEmailWithQRCode(qrCodeImage);
  });

  client.on('authenticated', async (session) => {
    console.log('Sessão autenticada!');
    await saveSessionToSupabase(session);
    qrCodeImage = null;
  });

  client.on('ready', () => {
    console.log('Bot pronto e conectado!');
    qrCodeImage = null;
  });

  client.on('disconnected', (reason) => {
    console.log('Cliente desconectado:', reason);
    qrCodeImage = null;
  });

  // Mensagens automáticas
  client.on('message', async (msg) => {
    const text = msg.body.trim().toLowerCase();
    const chat = await msg.getChat();

    if (/^(menu|bom dia|boa tarde|boa noite|oi|olá|ola)$/i.test(msg.body)) {
      const contact = await msg.getContact();
      const name = contact.pushname || 'Usuário';
      await client.sendMessage(
        msg.from,
        `Olá, ${name.split(' ')[0]}! Sou o assistente virtual. Como posso ajudar?\n1 - Como funciona\n2 - Planos\n3 - Benefícios`
      );
    }

    if (text === '1') {
      await chat.sendStateTyping();
      await client.sendMessage(msg.from, 'Nosso serviço oferece consultas médicas 24h por dia...');
      await client.sendMessage(msg.from, 'COMO FUNCIONA?\n1. Cadastro\n2. Pagamento\n3. Uso imediato');
      await client.sendMessage(msg.from, 'Link para cadastro: https://site.com');
    }

    if (text === '2') {
      await chat.sendStateTyping();
      await client.sendMessage(msg.from, 'Planos disponíveis:\nIndividual: R$22,50/mês\nFamília: R$39,90/mês');
      await client.sendMessage(msg.from, 'Mais detalhes: https://site.com');
    }
  });

  client.initialize();
};

// Servidor Express
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('O bot está funcionando! 🚀'));
app.get('/health', (req, res) => res.json({ status: 'ok', message: 'Bot ativo e saudável' }));

app.get('/qr', (req, res) => {
  if (qrCodeImage) {
    res.send(`
      <html>
        <body style="text-align:center;font-family:sans-serif;">
          <h2>Escaneie o QR Code para conectar o bot</h2>
          <img src="${qrCodeImage}" />
        </body>
      </html>
    `);
  } else {
    res.send('<h3>✅ Nenhum QR disponível no momento. Bot já conectado.</h3>');
  }
});

(async () => {
  await initializeWhatsAppClient();
  app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
})();
