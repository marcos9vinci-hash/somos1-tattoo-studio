// Gerador Oficial de BR Code PIX (Padrão Banco Central do Brasil / EMV QRCPS)
// Gera o código PIX Copia e Cola e o QR Code oficial reconhecido por todos os bancos (Nubank, Inter, Itaú, Bradesco, etc.)

export interface PixPayloadParams {
  chave: string;
  nomeRecebedor: string;
  cidade: string;
  valor?: number;
  identificador?: string; // txid (opcional, padrão '***')
  descricao?: string;
}

/**
 * Calcula CRC16-CCITT (Polinômio 0x1021, valor inicial 0xFFFF)
 */
function crc16(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Formata um campo TLV (Tag-Length-Value)
 */
function formatTLV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Normaliza strings para o padrão ASCII (sem acentos) aceito pelo Banco Central
 */
function sanitizeString(str: string, maxLength: number): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, '') // apenas alfanuméricos e espaço
    .trim()
    .slice(0, maxLength);
}

export const DEFAULT_STUDIO_PIX = {
  chave: '860066de-bfce-4faf-afad-29c4e678e4e3',
  nomeRecebedor: 'MARCOS VINICIUS GOMES',
  cidade: 'SAO CAETANO D'
};

/**
 * Gera a string do PIX Copia e Cola Oficial (BR Code)
 */
export function generatePixCopiaECola({
  chave = DEFAULT_STUDIO_PIX.chave,
  nomeRecebedor = DEFAULT_STUDIO_PIX.nomeRecebedor,
  cidade = DEFAULT_STUDIO_PIX.cidade,
  valor,
  identificador = '***',
  descricao
}: PixPayloadParams): string {
  const cleanChave = chave.trim();
  const cleanNome = sanitizeString(nomeRecebedor || 'SOMOS 1 TATTOO', 25) || 'SOMOS 1 TATTOO';
  const cleanCidade = sanitizeString(cidade || 'SAO PAULO', 15) || 'SAO PAULO';
  const cleanTxId = sanitizeString(identificador || '***', 25) || '***';

  // ID 00: Payload Format Indicator
  let payload = formatTLV('00', '01');

  // ID 26: Merchant Account Information - GUI: br.gov.bcb.pix
  let merchantAccount = formatTLV('00', 'br.gov.bcb.pix');
  merchantAccount += formatTLV('01', cleanChave);
  if (descricao) {
    const cleanDesc = sanitizeString(descricao, 40);
    if (cleanDesc) {
      merchantAccount += formatTLV('02', cleanDesc);
    }
  }
  payload += formatTLV('26', merchantAccount);

  // ID 52: Merchant Category Code (0000)
  payload += formatTLV('52', '0000');

  // ID 53: Transaction Currency (986 = BRL)
  payload += formatTLV('53', '986');

  // ID 54: Transaction Amount (se houver valor > 0)
  if (valor && valor > 0) {
    payload += formatTLV('54', valor.toFixed(2));
  }

  // ID 58: Country Code (BR)
  payload += formatTLV('58', 'BR');

  // ID 59: Merchant Name
  payload += formatTLV('59', cleanNome);

  // ID 60: Merchant City
  payload += formatTLV('60', cleanCidade);

  // ID 62: Additional Data Field Template (TxID)
  const additionalData = formatTLV('05', cleanTxId);
  payload += formatTLV('62', additionalData);

  // ID 63: CRC16 (Tag + Tamanho 04 + valor calculado)
  payload += '6304';
  const checksum = crc16(payload);
  
  return `${payload}${checksum}`;
}

/**
 * Retorna a URL de imagem do QR Code para exibição em alta definição
 */
export function getPixQrCodeImageUrl(copiaEColaString: string, size = 320): string {
  // Serviço rápido e confiável de renderização QR Code sem limites de requisição
  const encoded = encodeURIComponent(copiaEColaString);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encoded}`;
}

/**
 * Monta o texto de cobrança pronto para envio direto no WhatsApp
 */
export function buildPixWhatsAppMessage({
  clienteNome,
  descricaoServico,
  valor,
  copiaECola
}: {
  clienteNome: string;
  descricaoServico?: string;
  valor: number;
  copiaECola: string;
}): string {
  const valorFmt = `R$ ${valor.toFixed(2).replace('.', ',')}`;
  return (
    `Olá, *${clienteNome}*! 🎨✨\n\n` +
    `Aqui está a chave e o código PIX para o pagamento do seu atendimento na *Somos 1 Tattoo Studio*:\n\n` +
    `💰 *Valor:* ${valorFmt}\n` +
    (descricaoServico ? `📋 *Serviço:* ${descricaoServico}\n\n` : '\n') +
    `👇 *PIX Copia e Cola (toque para copiar):*\n` +
    `\`\`\`${copiaECola}\`\`\`\n\n` +
    `_Basta copiar o código acima, abrir o app do seu banco e escolher a opção "PIX Copia e Cola". O valor e destinatário já aparecem automaticamente!_ 🚀\n\n` +
    `Assim que pagar, manda o comprovante por aqui que já confirmamos no sistema!`
  );
}
