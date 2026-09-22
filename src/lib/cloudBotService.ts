export const cloudBotService = {
  async triggerBot() {
    const owner = 'marcos9vinci-hash';
    const repo = 'IndicaAi-App';
    const token = import.meta.env.VITE_GITHUB_TOKEN || '';

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event_type: 'trigger-whatsapp-bot' })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("❌ GitHub Dispatch Error:", response.status, error);
      } else {
        console.log("🚀 SINAL ENVIADO PARA O GITHUB!");
      }
    } catch (err: any) {
      console.error("❌ Falha na conexão:", err.message);
    }
  }
};
