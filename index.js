const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const axios = require('axios');
require('dotenv').config();

let qrCodeImage = null; // 🔹 variável global para armazenar o QR gerado

// Configuração do Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Função para buscar a sessão no Supabase
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

  return data?.session_data || null;
};

// Função para salvar a sessão no Supabase
const saveSessionToSupabase = async (session) => {
  try {
    if (!session || Object.keys(session).length === 0) {
      console.error('Sessão inválida para salvar: objeto vazio.');
      return;
    }

    const { error } = await supabase
      .from('whatsapp_sessions')
      .upsert({
        id: 'default_session',
        session_data: JSON.stringify(session),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Erro ao salvar sessão no Supabase:', error.message);
    } else {
      console.log('Sessão salva no Supabase com sucesso!');
    }
  } catch (err) {
    console.error('Erro ao processar sessão para salvar:', err.message);
  }
};

// Função para enviar QR Code por e-mail via Brevo
const sendEmailWithQRCode = async (qrImage) => {
  try {
    const base64Image = qrImage.split(',')[1];
    const emailData = {
      sender: { email: process.env.EMAIL_FROM, name: 'Bot Assistente' },
      to: [{ email: process.env.EMAIL_TO, name: 'Usuário' }],
      subject: 'QR Code para conectar o bot',
      htmlContent: `<p>Escaneie o QR Code para conectar o bot ao WhatsApp:</p><img src="data:image/png;base64,${base64Image}" alt="QR Code">`,
      attachments: [
        {
          name: 'qrcode.png',
          content: base64Image,
        },
      ],
    };

    const response = await axios.post('https://api.brevo.com/v3/smtp/email', emailData, {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    console.log('QR Code enviado por e-mail com sucesso!', response.data);
  } catch (error) {
    console.error('Erro ao enviar QR Code por e-mail:', error.response?.data || error.message);
  }
};

// Inicializa o cliente do WhatsApp Web
const initializeWhatsAppClient = async () => {
  const sessionData = await getSessionFromSupabase();

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: "default" }),
    session: sessionData || undefined,
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });


  client.on('qr', async (qr) => {
    console.log('QR Code gerado, escaneie para conectar:');
    qrcodeTerminal.generate(qr, { small: true });

    try {
      qrCodeImage = await qrcode.toDataURL(qr); // 🔹 salva a imagem para servir na rota /qr
      await sendEmailWithQRCode(qrCodeImage);
    } catch (error) {
      console.error('Erro ao gerar ou enviar QR Code:', error.message);
    }
  });

  client.on('authenticated', async () => {
    console.log('Sessão autenticada com sucesso!');
    const authData = client.pupPage ? await client.pupPage.evaluate(() => localStorage) : {};
    await saveSessionToSupabase(authData);
  });

  client.on('ready', () => {
    console.log('Bot conectado e pronto para uso!');
    qrCodeImage = null; // 🔹 limpa a imagem do QR, não é mais necessária
  });

  client.on('disconnected', (reason) => {
    console.log('Cliente desconectado:', reason);
  });

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  client.on('message', async (msg) => {
    const text = msg.body.trim().toLowerCase();

    if (/^(menu|bom dia|boa tarde|boa noite|oi|olá|ola)$/i.test(msg.body)) {
      const contact = await msg.getContact();
      const name = contact.pushname || 'Usuário';

      await client.sendMessage(
        msg.from,
        `Olá, ${name.split(' ')[0]}! Sou o assistente virtual da empresa. Como posso ajudar?\n1 - Como funciona\n2 - Planos\n3 - Benefícios`
      );
    }

    if (text === '1') {
      const chat = await msg.getChat();
      await delay(2000);
      await chat.sendStateTyping();
      await delay(2000);
      await client.sendMessage(
        msg.from,
        'Nosso serviço oferece consultas médicas 24 horas por dia, 7 dias por semana, diretamente pelo WhatsApp. Sem carência e com benefícios ilimitados.'
      );
      await delay(2000);
      await client.sendMessage(
        msg.from,
        'COMO FUNCIONA?\n1. Faça seu cadastro.\n2. Efetue o pagamento.\n3. Comece a usar imediatamente!'
      );
      await delay(2000);
      await client.sendMessage(msg.from, 'Link para cadastro: https://site.com');
    }

    if (text === '2') {
      const chat = await msg.getChat();
      await delay(2000);
      await chat.sendStateTyping();
      await delay(2000);
      await client.sendMessage(
        msg.from,
        'Planos disponíveis:\n\nIndividual: R$22,50/mês\nFamília: R$39,90/mês (até 4 membros)\n\nPara mais detalhes, acesse: https://site.com'
      );
    }
  });

  client.initialize();
};

// Express para manter servidor rodando e endpoints básicos
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('O bot está funcionando! 🚀');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Bot ativo e saudável' });
});

// 🔹 Nova rota para visualizar QR no navegador
app.get('/qr', (req, res) => {
  if (qrCodeImage) {
    res.send(`
      <html>
        <body style="text-align:center; font-family:sans-serif;">
          <h2>Escaneie o QR Code para conectar o bot</h2>
          <img src="${qrCodeImage}" />
        </body>
      </html>
    `);
  } else {
    res.send('<h3>✅ Nenhum QR disponível no momento. Bot já conectado ou aguardando gerar QR...</h3>');
  }
});

(async () => {
  await initializeWhatsAppClient();

  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
})();
