// By: https://github.com/shyybi

const fetch = globalThis.fetch || require('node-fetch');

const webhookURL = "FEED";

async function sendToDiscord(username, message) {

  const content = username ? `**${username}**: ${message}` : message;
  
  const payload = {
    content: content,
    username: "Arena",
  };

  try {
    const res = await fetch(webhookURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return
    } else {
      console.error("[ERR] Erreur:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[ERR] Exception:", err);
  }
}

module.exports = { sendToDiscord };