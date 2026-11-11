require('dotenv').config();

const express = require('express');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const messages = require('./messages');

const port = Number(process.env.PORT || 3000);
const lobbyGroupId = (process.env.LOBBY_GROUP_ID || '').trim();
const groupIds = new Set(
  (process.env.GROUP_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
);
if (lobbyGroupId) groupIds.add(lobbyGroupId);

const app = express();
app.get('/health', (_req, res) => res.status(200).send('Bot activo'));
app.listen(port, '0.0.0.0', () => console.log(`Estado: http://localhost:${port}/health`));

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'clan-bot',
    dataPath: process.env.WWEBJS_AUTH_PATH || '.wwebjs_auth',
  }),
  puppeteer: {
    headless: true,
    executablePath: process.env.CHROME_BIN || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', (qr) => {
  console.log('Escanea este QR desde WhatsApp > Dispositivos vinculados:');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => console.log('WhatsApp vinculado.'));
client.on('auth_failure', (message) => console.error('Falló la autenticación:', message));
client.on('disconnected', (reason) => console.warn('WhatsApp se desconectó:', reason));

client.on('ready', async () => {
  console.log('Bot conectado. Grupos configurados:', groupIds.size);
  if (!groupIds.size) {
    console.log('Aún no hay grupos configurados. Escribe !idgrupo en cada grupo para obtener su ID.');
  }
});

client.on('group_join', async (notification) => {
  try {
    const chat = await notification.getChat();
    if (chat.id._serialized !== lobbyGroupId) return;

    const joinedUsers = notification.recipientIds || [];
    for (const userId of joinedUsers) {
      const mention = `@${userId.split('@')[0]}`;
      await chat.sendMessage(`${messages.welcome(mention)}\n\n${messages.rules}\n\n${messages.form}`, {
        mentions: [userId],
      });
    }
  } catch (error) {
    console.error('No se pudo enviar la bienvenida:', error);
  }
});

async function isGroupAdmin(chat, userId) {
  const participants = await chat.participants;
  return participants.some((participant) =>
    participant.id._serialized === userId && (participant.isAdmin || participant.isSuperAdmin),
  );
}

async function handleCommand(message) {
  if (!(message.from || '').endsWith('@g.us')) return;

  const chat = await message.getChat();
  const groupId = chat.id._serialized;
  const body = (message.body || '').trim();

  if (body === '!idgrupo') {
    if (await isGroupAdmin(chat, message.author || client.info.wid._serialized)) {
      await chat.sendMessage(`ID de este grupo:\n${groupId}`);
    }
    return;
  }

  if (!groupIds.has(groupId)) return;
  if (!body.startsWith('!')) return;

  const senderId = message.fromMe
    ? client.info.wid._serialized
    : (message.author || message.from);
  if (!(await isGroupAdmin(chat, senderId))) return;

  if (body === '!cerrar') {
    await chat.setMessagesAdminsOnly(true);
    await chat.sendMessage('🔒 Grupo cerrado: solo los administradores pueden escribir.');
    return;
  }

  if (body === '!abrir') {
    await chat.setMessagesAdminsOnly(false);
    await chat.sendMessage('🔓 Grupo abierto: todos pueden escribir.');
    return;
  }

  if (body.startsWith('!anuncio ')) {
    const text = body.slice('!anuncio '.length).trim();
    if (!text) {
      await chat.sendMessage('Uso: !anuncio el mensaje que quieres enviar a los grupos configurados');
      return;
    }

    let sent = 0;
    for (const destinationId of groupIds) {
      try {
        const destination = await client.getChatById(destinationId);
        await destination.sendMessage(`📢 *ANUNCIO DEL CLAN*\n\n${text}`);
        sent += 1;
      } catch (error) {
        console.error(`No se pudo enviar el anuncio a ${destinationId}:`, error.message);
      }
    }
    await chat.sendMessage(`Anuncio enviado a ${sent} grupo(s).`);
    return;
  }

  if (body === '!ayuda') {
    await chat.sendMessage('⚙️ *Comandos de administrador*\n\n!cerrar — solo admins escriben\n!abrir — todos pueden escribir\n!anuncio <mensaje> — enviar a los grupos configurados\n!idgrupo — ver el ID del grupo');
  }
}

client.on('message_create', (message) => {
  handleCommand(message).catch((error) => console.error('Error procesando comando:', error));
});

client.initialize();
