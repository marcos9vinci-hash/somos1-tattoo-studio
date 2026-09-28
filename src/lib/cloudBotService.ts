// SERVIÇO DE DISPATCH EXTERNO DESATIVADO PERMANENTEMENTE POR SEGURANÇA
// Nenhuma chamada externa ou trigger em lote é permitida no sistema.
export const cloudBotService = {
  async triggerBot() {
    console.info("🔒 [Segurança] cloudBotService está permanentemente desativado. Nenhuma ação disparada.");
  }
};
