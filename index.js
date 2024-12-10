const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const axios = require('axios');
require('dotenv').config();

// Configuração do Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Funções do Supabase e WhatsApp já implementadas
const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('whatsapp_sessions').select('*').limit(1);
    if (error) {
      console.error('Erro ao tentar conectar ao Supabase:', error.message);
      return false;
    }

    if (data && data.length > 0) {
      console.log('Conexão bem-sucedida com o Supabase. Dados retornados:', data);
      return true;
    } else {
      console.log('Conexão bem-sucedida com o Supabase, mas não há dados na tabela.');
      return true;
    }
  } catch (error) {
    console.error('Erro na conexão com o Supabase:', error.message);
    return false;
  }
};

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

  if (!data) {
    console.log('Nenhuma sessão encontrada, criando uma nova.');
    await createInitialSession();
    return null;
  }

  return JSON.parse(data.session_data);
};

const createInitialSession = async () => {
  const initialSessionData = {
    WABrowserId: "abc",
    WASecretBundle: "xyz",
    WAToken1: "123",
    WAToken2: "456"
  };

  const { error } = await supabase
    .from('whatsapp_sessions')
    .upsert({
      id: 'default_session',
      session_data: JSON.stringify(initialSessionData),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Erro ao criar sessão inicial:', error.message);
  } else {
    console.log('Sessão inicial criada no Supabase!');
  }
};

const saveSessionToSupabase = async (session) => {
  if (!session || !session.WABrowserId || !session.WASecretBundle || !session.WAToken1 || !session.WAToken2) {
    console.error('Sessão inválida. Dados de sessão incompletos.');
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
    console.error('Erro ao salvar sessão:', error.message);
  } else {
    console.log('Sessão salva no Supabase com sucesso!');
  }
};

const sendEmailWithQRCode = async (qrImage) => {
  try {
    const base64Image = qrImage.split(',')[1];
    const emailData = {
      sender: { email: process.env.EMAIL_FROM, name: 'Bot Assistente' },
      to: [{ email: process.env.EMAIL_TO, name: 'Usuário' }],
      subject: 'QR Code para Conectar o Bot',
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

const initializeWhatsAppClient = async () => {
  const sessionData = await getSessionFromSupabase();

  const client = new Client({
    session: sessionData,
  });

  client.on('qr', async (qr) => {
    console.log('QR Code gerado. Escaneie para conectar!');
    qrcodeTerminal.generate(qr, { small: true });

    try {
      const qrImage = await qrcode.toDataURL(qr);
      await sendEmailWithQRCode(qrImage);
    } catch (error) {
      console.error('Erro ao processar o QR Code:', error.message);
    }
  });

  client.on('authenticated', (session) => {
    console.log('Sessão autenticada:', session);
    saveSessionToSupabase(session);
  });

  client.on('ready', () => {
    console.log('Bot conectado e pronto para uso!');
  });

  client.on('disconnected', async (reason) => {
    console.log('Cliente desconectado:', reason);
    await supabase
      .from('whatsapp_sessions')
      .delete()
      .eq('id', 'default_session');
  });
   
    // **Evento: Mensagem recebida**
    client.on('message', async (msg) => {
      if (
        msg.body.match(/(menu|Menu|dia|tarde|noite|oi|Oi|Olá|olá|ola|Ola)/i) &&
        msg.from.endsWith('@c.us')
      ) {
        const chat = await msg.getChat();
        const contact = await msg.getContact();
        const name = contact.pushname;
  
        await client.sendMessage(
          msg.from,
          `Olá, ${name.split(' ')[0]}! Sou o assistente virtual da empresa. Como posso ajudar?\n1 - Como funciona\n2 - Planos\n3 - Benefícios`
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
    });
  
    // Inicializar cliente do WhatsApp
    client.initialize();
  };
  
// Inicialização do Express
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('O bot está funcionando! 🚀');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Bot ativo e saudável' });
});

(async () => {
  await initializeWhatsAppClient();

  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
})();
