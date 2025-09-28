const mineflayer = require('mineflayer');
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');
const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType 
} = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const DISCORD_TOKEN = ' ';
const DISCORD_CHANNEL_ID = ' ';
const OWNER_ID = ' ';
const STAFF_TAGS = ["HELPER", "MOD", "SRMOD", "ADMIN", "SRADMIN", "MANAGER"];

const discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
let minecraftBot = null;
let panelMessage = null;
let botMode = "AFK";
let botConnectedAt = null;

// ===== UTILS =====
function escapeDisplayName(name) {
  if (!name) return "Inconnu";
  return String(name).replace(/§[0-9a-fklmnor]/gi, '');
}

function isStaff(name) {
  return STAFF_TAGS.some(tag => name.toUpperCase().includes(tag));
}

function getOnlineStaff(bot) {
  if (!bot.players) return [];
  return Object.values(bot.players)
    .map(p => escapeDisplayName(p.displayName || p.username))
    .filter(isStaff);
}

// ===== PANEL =====
async function updateBotPanel() {
  if (!panelMessage) return;

  const staffOnline = minecraftBot ? getOnlineStaff(minecraftBot) : [];
  const staffText = staffOnline.length ? staffOnline.join('\n') : 'Aucun modérateur en ligne';

  const connectedSince = botConnectedAt
    ? Math.floor((Date.now() - botConnectedAt) / 1000) + " secondes"
    : "—";

  const description = 
    `🧑 Pseudo : ${minecraftBot ? minecraftBot.username : '—'}\n` +
    `⏱️ Connecté depuis : ${connectedSince}\n` +
    `<:sugarCane:1419082553775882240> Mode actuel : ${botMode}\n` +
    `:police_officer: Modérateurs en ligne :\n\`\`\`\n${staffText}\n\`\`\``;

  const embed = new EmbedBuilder()
    .setTitle('📌 Méduse - SMP BOT PANEL')
    .setDescription(description)
    .setColor(0x5865F2)
    .setTimestamp();

  await panelMessage.edit({ embeds: [embed] });
}

async function sendBotPanel(channel) {
  const staffOnline = minecraftBot ? getOnlineStaff(minecraftBot) : [];
  const staffText = staffOnline.length ? staffOnline.join('\n') : 'Aucun modérateur en ligne';

  const connectedSince = botConnectedAt
    ? Math.floor((Date.now() - botConnectedAt) / 1000) + " secondes"
    : "—";

  const description = 
    `🧑 **Pseudo :** ${minecraftBot ? minecraftBot.username : '—'}\n` +
    `⏱️ **Connecté depuis :** ${connectedSince}\n` +
    `<:sugarCane:1419082553775882240> **Mode actuel :** ${botMode}\n` +
    `:police_officer: **Modérateurs en ligne :**\n\`\`\`\n${staffText}\n\`\`\``;

  const embed = new EmbedBuilder()
    .setTitle('📌 __PANEL DU BOT__')
    .setDescription(description)
    .setColor(0x5865F2)
    .setTimestamp();

  const commandButton = new ButtonBuilder()
    .setCustomId('bot_command')
    .setLabel('Commande')
    .setStyle(ButtonStyle.Primary);

  const tpaButton = new ButtonBuilder()
    .setCustomId('bot_tpa')
    .setLabel('/tpa')
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(commandButton, tpaButton);

  panelMessage = await channel.send({ embeds: [embed], components: [row] });

  setInterval(updateBotPanel, 30000);
}

// ===== INTERACTIONS =====
discordClient.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: '❌ Tu n’as pas la permission d’utiliser ce bouton.', ephemeral: true });
    }

    if (interaction.customId === 'bot_command') {
      const modal = new ModalBuilder()
        .setCustomId('bot_command_modal')
        .setTitle('Entrer une commande Minecraft');

      const commandInput = new TextInputBuilder()
        .setCustomId('command_input')
        .setLabel('Commande à exécuter')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('/tpa joueur')
        .setRequired(true);

      const row = new ActionRowBuilder().addComponents(commandInput);
      modal.addComponents(row);

      await interaction.showModal(modal);
    }

    if (interaction.customId === 'bot_tpa') {
      if (!minecraftBot) return interaction.reply({ content: '⚠️ Le bot Minecraft n’est pas connecté.', ephemeral: true });
      minecraftBot.chat('/tpa 9ck9ue46y87uc1');
      return interaction.reply({ content: '✅ Commande `/tpa` envoyée au bot.', ephemeral: true });
    }
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'bot_command_modal') {
    if (!minecraftBot) return interaction.reply({ content: '⚠️ Le bot Minecraft n’est pas connecté.', ephemeral: true });
    const command = interaction.fields.getTextInputValue('command_input');
    minecraftBot.chat(command);
    await interaction.reply({ content: `✅ Commande envoyée : \`${command}\``, ephemeral: true });
  }
});

// ===== DISCORD READY =====
discordClient.once('ready', async () => {
  console.log(`[DISCORD] Connecté en tant que ${discordClient.user.tag}`);
  const channel = await discordClient.channels.fetch(DISCORD_CHANNEL_ID);
  if (channel) {
    await sendBotPanel(channel);
  }
});

// ===== MINECRAFT BOT ======
function createBot() {
  const bot = mineflayer.createBot({
    host: 'donutsmp.net',
    username: ' ',
    auth: 'microsoft',
    version: '1.21.7'
  });

  minecraftBot = bot;

  bot.on('login', () => {
    console.log(`[MINECRAFT] Connecté en tant que ${bot.username}`);
    botConnectedAt = Date.now();
    try {
      mineflayerViewer(bot, { port: 3007, firstPerson: true });
      console.log(`[MINECRAFT] Vue POV: http://localhost:3007`);
    } catch (err) {
      console.log(`[WARN] Prismarine-viewer non dispo: ${err.message}`);
    }
  });

  bot.on('windowOpen', (window) => {
    console.log("[MENU] Fenêtre ouverte:", window.title || 'Menu sans titre');
    dumpWindow(window);
    findAndClickGreenGlass(window, bot);
  });

  bot.on('spawn', () => {
    console.log("[INFO] Bot spawné");
  });

  bot.on('end', () => {
    console.log('[MINECRAFT] Déconnecté, reconnexion...');
    setTimeout(() => createBot(), 5000);
  });

  bot.on('kicked', (reason) => {
    console.log('[MINECRAFT] Kick:', reason);
    setTimeout(() => createBot(), 10000);
  });

  return bot;
}

// ===== FONCTIONS UTILITAIRES =====
function dumpWindow(window) {
  console.log('-------- [DUMP MENU TELEPORTATION] --------');
  const title = stripFormatting(String(window.title || ''));
  console.log(`Titre: "${title}" | slots: ${window.slots.length}`);
  
  for (let i = 0; i < window.slots.length; i++) {
    const item = window.slots[i];
    if (!item) continue;
    const itemName = getItemName(item);
    const itemType = item.name || 'unknown';
    console.log(`[${i}] type="${itemType}" display="${itemName}"`);
  }
  console.log('-------------------------------------------');
}

function stripFormatting(text) {
  return text ? text.replace(/§[0-9a-fklmnor]/gi, '') : '';
}

function getItemName(item) {
  if (!item) return '';
  const displayName = item.displayName || item.customName;
  const nbtName = item?.nbt?.value?.display?.value?.Name?.value || item?.nbt?.value?.Name?.value;
  return stripFormatting(displayName || nbtName || item.name || '');
}

async function findAndClickGreenGlass(window, bot) {
  console.log("[INFO] Recherche du bloc de verre vert...");
  const acceptPatterns = ['accept', 'accepter', 'oui', 'yes', 'confirm', 'confirmer', 'vert', 'green', 'valider', 'validate'];
  const glassTypes = ['stained_glass', 'green_stained_glass', 'lime_stained_glass', 'glass', 'stained_glass_pane', 'green_stained_glass_pane'];

  for (let i = 0; i < window.slots.length; i++) {
    const item = window.slots[i];
    if (!item) continue;
    const itemName = getItemName(item).toLowerCase();
    const itemType = (item.name || '').toLowerCase();
    const isGlass = glassTypes.some(type => itemType.includes(type));
    const isAccept = acceptPatterns.some(pattern => itemName.includes(pattern));
    const isGreen = itemType.includes('green') || itemType.includes('lime') || itemName.includes('vert') || itemName.includes('green');

    if (isGlass && (isGreen || isAccept)) {
      console.log(`[INFO] Bloc de verre trouvé au slot ${i}: ${itemName}`);
      try {
        await bot.clickWindow(i, 0, 0);
        console.log(`[INFO] Clic réussi sur le bloc de verre (slot ${i})`);
        return true;
      } catch (error) {
        console.log(`[ERROR] Erreur lors du clic sur le slot ${i}: ${error.message}`);
      }
    }
  }

  console.log("[WARN] Aucun bloc de verre trouvé dans le menu");
  return false;
}

// ===== LANCEMENT =====
discordClient.login(DISCORD_TOKEN);
createBot();
