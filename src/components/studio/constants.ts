export const PROMPTS = {
  EXTRACT_STYLE: `**Descrição:** Especialista em análise estética e extração técnica de estilo visual para geração de imagens com inteligência artificial. Sua função é analisar automaticamente qualquer imagem enviada pelo usuário e gerar um prompt técnico que permita replicar exclusivamente o estilo visual da imagem em outras criações.

**Instrução:**
O usuário não precisa escrever nenhuma instrução. Sempre que uma imagem for enviada, você deve automaticamente analisar e gerar o prompt seguindo todas as regras abaixo.

Regras obrigatórias:
Nunca descreva os elementos da imagem (personagens, objetos, cenário, narrativa, tema, símbolos ou qualquer conteúdo específico).
Foque exclusivamente nas características estilísticas.
Analise profundamente e descreva apenas aspectos técnicos como:
Tipo e direção da iluminação, Comportamento da luz e das sombras, Nível e controle de contraste, Estrutura tonal e gradação, Tipo de sombreamento, Tratamento de textura, Nitidez e comportamento de bordas, Construção de volume e tridimensionalidade, Sensação de profundidade, Tratamento de perspectiva, Profundidade de campo, Estética geral, Tratamento de cor ou ausência de cor, Atmosfera visual, Tipo de acabamento, Tratamento de fundo, Nível de detalhamento.

O prompt deve:
Ser escrito em um único parágrafo
Não conter quebras de linha
Não conter parâmetros técnicos (–ar, –v, etc.)
Não conter frases narrativas como “a imagem mostra”
Não mencionar elementos específicos da imagem

O prompt deve sempre começar com:
“Transform the style of the attached image into…”
Após o prompt em inglês, forneça a versão em português começando com:
“Transforme o estilo da imagem anexada em…”`,

  EXTRACT_CONTENT: `**Descrição:** Especialista em descrição visual detalhada para geração de imagens. Sua função é analisar a imagem e descrever exatamente o que está nela (objetos, personagens, cenário, ação) para que possa ser recriado.

**Instrução:**
Descreva detalhadamente o conteúdo da imagem. Foque no "O QUÊ" está na imagem.
- Personagens/Objetos principais
- Cenário e ambiente
- Cores e iluminação
- Composição e enquadramento

O prompt deve ser direto e descritivo, em inglês e português.`,

  EXTRACT_DRAWING: `transfira esse desenho que está na pele para um fundo branco, como se fosse um projeto de tattoo.
Quero que você remova a pele e o formato do corpo, e que mantenha a mesma ideia, cores e proporções.
Porém, como parte do desenho pode estar cortada pela anatomia da pessoa (braço, curva, etc), quero que você complete e amplie a imagem, mantendo o estilo original.
O resultado deve ser uma arte limpa, finalizada, no estilo realista, sem silhueta de braço ou corpo, parecendo um desenho para ser usado como referência de tatuagem, não uma foto de uma tatuagem feita.`,

  IMPROVE_QUALITY: `Regenerate this image in ultra-high definition while preserving the exact composition, subject identity, proportions, pose, and overall structure. Maintain the vertical full-leg framing, including the realistic tattoo placement on the leg, the wooden floor environment, the cabinet background, and the visible sneaker at the bottom. Enhance all details with razor-sharp texture clarity, especially the golden ornamental headdress, intricate jewelry, gemstone reflections, skin texture, and metallic elements. Improve dynamic range and contrast while keeping natural skin tones and warm golden color harmony. Refine lighting to create cinematic depth with realistic highlights, soft shadow gradients, and accurate light interaction on metallic and gemstone surfaces. Remove compression artifacts, blur, and noise while preserving realism. Increase micro-detail in the tattoo ink, gemstone transparency, reflective surfaces, and wood grain. Maintain photorealistic quality with professional color grading, balanced exposure, crisp focus, and high dynamic range, as if captured with a high-end full-frame camera and premium portrait lens.`,
  TECHNICAL_DECAL: `TECHNICAL DECAL FOR TATTOOS
Role: Visual engineering tool for tattoo artists, specifically for Realism and Photorealism.
Function: Topographic mapper that translates 3D volumes into 2D technical lines (stencil).
Identity: Neutral, precise, utility-focused mapping system.
Goal: Create a construction map (stencil) to guide pigment application, preserving highlights and ensuring correct transitions between 8 gray levels.
Technical Specifications:
- Background: Pure white.
- Colors: Exclusively RED lines, clean and precise. No fills, shadows, or gradients.
- Line Structure:
  - Continuous lines: For main contours and structural shapes.
  - Dotted lines: Exclusively to delimit the 8 value layers (from deepest shadow to maximum white).
- Light Mapping: Treat light as active information. Highlight areas must be delimited by dotted lines as "protection zones".
- Fidelity: Preserve proportions, volumes, and anatomical reading for skin application.
Output: Only the visual result of the technical decal. No metadata, captions, or text watermarks.`,
};

export const STYLES = [
  {
    id: 'realismo_pb_contraste',
    name: 'Realismo P&B Alto Contraste',
    shortName: 'P&B Contraste',
    color: 'from-zinc-900 to-zinc-500',
    iconStyle: 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] contrast-150',
    previewUrl: 'https://picsum.photos/seed/wolf-tattoo-realismo-pb/400/400',
    prompt: 'Transforme a imagem enviada para um estilo de realismo preto e cinza de alto contraste para tatuagem, com acabamento fotográfico intenso e leitura forte de volumes. Utilize exclusivamente tons de preto, cinza e branco, trabalhando contraste elevado, sombras profundas e luz bem definida para destacar musculatura, textura da pele e expressão. Aplique granulação suave e textura orgânica controlada, sem hachuras ilustrativas, mantendo transições realistas entre luz e sombra. Priorize impacto visual, profundidade tridimensional e leitura clara à distância, com fundo escuro ou neutro e composição limpa, preservando o enquadramento original e convertendo completamente o visual para esse estilo realista, dramático e pensado para aplicação direta em tatuagem.'
  },
  {
    id: 'realismo_cinematico_pb',
    name: 'Realismo Cinemático P&B',
    shortName: 'Cinemático P&B',
    color: 'from-slate-800 to-slate-500',
    iconStyle: 'text-slate-200 blur-[0.5px] opacity-90',
    previewUrl: 'https://picsum.photos/seed/wolf-tattoo-cinematic/400/400',
    prompt: 'Transforme a imagem enviada para um estilo de realismo cinematográfico em preto e branco, com texturas extremamente detalhadas, iluminação dramática e sombras suaves. Aplique acabamento hiper-realista, pele com microdetalhes, pelos e fios de cabelo bem definidos, profundidade nítida e contraste controlado. Utilize luz difusa lateral, criando volume tridimensional e atmosfera emocional. Inclua textura suave no fundo, desfoque sutil e um aspecto fotográfico de alta resolução. Converta o visual inteiro para esse estilo artístico realista, elegante, limpo e impactante, preservando apenas a estrutura e o tema original.'
  },
  {
    id: 'fotografia_artistica_pb',
    name: 'Fotografia Artística P&B',
    shortName: 'Foto P&B',
    color: 'from-black to-zinc-700',
    iconStyle: 'text-white grayscale brightness-75',
    previewUrl: 'https://picsum.photos/seed/wolf-tattoo-artistic-photo/400/400',
    prompt: 'Transforme a imagem enviada para um estilo de fotografia artística em preto e branco com alto contraste e atmosfera dramática. Utilize iluminação direcional forte, sombras profundas e fundo escuro minimalista. Priorize textura intensa, microdetalhes evidentes, aparência crua e realismo expressivo. Mantenha estética sóbria, emocional e impactante, with sensação de profundidade, granulação sutil e acabamento fotográfico autoral. O resultado deve transmitir peso visual, dramaticidade e caráter artístico contemporâneo.'
  },
  {
    id: 'realismo_chicano',
    name: 'Realismo Chicano',
    shortName: 'Chicano',
    color: 'from-stone-900 to-stone-600',
    iconStyle: 'text-stone-300 sepia-[0.2] contrast-125',
    previewUrl: 'https://picsum.photos/seed/wolf-tattoo-chicano/400/400',
    prompt: 'Transforme a imagem enviada em realismo cinematográfico em preto e branco, com acabamento hiper-realista, microtexturas extremamente detalhadas na pele envelhecida e nas mãos, rugas profundas bem definidas, poros visíveis e fios de cabelo nítidos, mantendo contraste controlado e sombras suaves. Aplique iluminação lateral difusa e dramática para criar forte volume tridimensional e atmosfera emocional intensa, preservando mantendo a dualidade visual entre superfície lisa e expressiva e textura orgânica envelhecida. Utilize fundo claro with textura suave e leve desfoque, aparência fotográfica premium, elegante, limpa e impactante, mantendo a composição original e refinando apenas luz, textura e profundidade.'
  },
  {
    id: 'realismo_colorido',
    name: 'Realismo Colorido Premium',
    shortName: 'Colorido Premium',
    color: 'from-blue-600 via-red-500 to-yellow-500',
    iconStyle: 'text-white saturate-150 drop-shadow-lg',
    previewUrl: 'https://picsum.photos/seed/wolf-tattoo-color-premium/400/400',
    prompt: 'Transforme a imagem enviada para um estilo de realismo cinematográfico colorido, com acabamento hiper-realista e aparência fotográfica premium. Utilize cores vibrantes porém equilibradas, pele with microtexturas suaves, superfícies bem polidas, materiais with resposta realista à luz e transições naturais entre luz e sombra. Aplique iluminação suave e difusa with leve direção lateral, criando profundidade tridimensional e volume elegante, mantendo sombras macias e contraste controlado. Inclua fundo desfocado with bokeh colorido sutil, atmosfera limpa, moderna e visualmente rica, preservando o enquadramento e a estrutura original enquanto converte completamente o visual para esse estilo realista, refinado e cinematográfico.'
  },
  {
    id: 'realismo_caricato',
    name: 'Realismo Caricato',
    shortName: 'Caricato',
    color: 'from-orange-600 to-yellow-400',
    iconStyle: 'text-white scale-110 rotate-3',
    previewUrl: 'https://picsum.photos/seed/wolf-tattoo-caricature/400/400',
    prompt: 'Transforme a imagem enviada para um estilo de realismo caricatural cinematográfico, combinando proporções faciais levemente exageradas with alto nível de detalhamento fotográfico. Destaque expressões intensas e traços marcantes do rosto, with volumes bem definidos e microtexturas visíveis na pele. Utilize iluminação quente e direcional, criando contraste suave porém dramático, with sombras profundas e highlights controlados para enfatizar emoção e profundidade tridimensional. Aplique paleta de cores rica e saturada, mantendo equilíbrio tonal e foco absoluto no rosto, with fundo desfocado ou ambiente suavemente iluminado. Preserve o enquadramento original e converta completamente o visual para esse estilo expressivo, impactante e cinematográfico.'
  },
  {
    id: 'estatua_realista',
    name: 'Estátua Pedra Viva',
    shortName: 'Estátua',
    color: 'from-gray-700 to-gray-300',
    iconStyle: 'text-gray-200 brightness-110 contrast-75',
    previewUrl: 'https://picsum.photos/seed/wolf-tattoo-statue/400/400',
    prompt: 'Transforme a imagem enviada para um estilo de escultura realista cinematográfica with aparência de pedra viva, combinando estética clássica with fantasia dark contemporânea. Utilize texturas altamente detalhadas que simulem mármore envelhecido, pedra rachada e superfícies desgastadas, integrando fissuras orgânicas luminosas sutis como elemento visual de contraste. Trabalhe iluminação dramática e direcional, with sombras profundas e highlights controlados para enfatizar volume, anatomia e expressão. Utilize paleta de cores fria e desaturada, with acentos luminosos pontuais, fundo escuro ou neutro e profundidade tridimensional intensa, preservando o enquadramento original e convertendo completamente o visual para esse estilo artístico poderoso, escultórico e cinematográfico.'
  },
  {
    id: 'pintura_barroca',
    name: 'Pintura Barroca',
    shortName: 'Barroco',
    color: 'from-amber-900 to-amber-600',
    iconStyle: 'text-amber-200 sepia brightness-90',
    previewUrl: 'https://picsum.photos/seed/wolf-tattoo-baroque/400/400',
    prompt: 'Transforme a imagem enviada para um estilo de pintura barroca with forte influência do caravaggismo, utilizando realismo clássico e iluminação dramática em chiaroscuro. Trabalhe luz direcional intensa incidindo sobre rostos, mãos e elementos centrais, contrastando with fundo escuro profundo quase totalmente negro. Construa volume através de transições suaves e naturais entre luz e sombra, sem uso de lines de contorno visíveis. Aplique textura pictórica de pintura a óleo, with pele realista, rugas marcadas, tecidos with dobras profundas e atmosfera íntima e contemplativa. Utilize paleta de cores quentes e terrosas, composição narrativa clássica e acabamento artístico refinado, convertendo completamente o visual para esse estilo pictórico barroco dramático e atemporal.'
  },
  {
    id: 'pintura_renascentista',
    name: 'Pintura Renascentista',
    shortName: 'Renascença',
    color: 'from-yellow-800 to-orange-300',
    iconStyle: 'text-yellow-100 sepia-[0.5] opacity-80',
    previewUrl: 'https://picsum.photos/seed/wolf-tattoo-renaissance/400/400',
    prompt: 'Transforme a imagem enviada para um estilo de pintura renascentista a óleo with influência barroca, utilizando realismo clássico, anatomia idealizada e iluminação dramática em chiaroscuro. Trabalhe luz direcional intensa contrastando with fundo escuro profundo, criando volume através de transições suaves entre luz e sombra, sem uso de lines de contorno visíveis. Aplique textura pictórica refinada, pele with acabamento macio, tecidos with dobras naturais e paleta de cores quentes e terrosas. Preserve atmosfera contemplativa, composition clássica e acabamento artístico polido, convertendo completamente o visual para esse estilo pictórico clássico e atemporal.'
  },
  {
    id: 'ilustracao_gta',
    name: 'Ilustração GTA V',
    shortName: 'GTA V',
    color: 'from-pink-600 via-purple-600 to-indigo-600',
    iconStyle: 'text-white drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]',
    previewUrl: 'https://picsum.photos/seed/wolf-tattoo-gta/400/400',
    prompt: 'Transforme a imagem enviada para um estilo de ilustração narrativa moderna with estética New School ilustrativa e acabamento de digital painting cinematográfico. Utilize personagens with anatomia estilizada e proporções levemente exageradas, mantendo leitura clara e impacto visual. Trabalhe volumes através de gradientes suaves e bem definidos, with luz quente de fim de tarde criando atmosfera dramática e sombras controladas. Aplique linha de contorno preta contínua e bem definida nos elementos principais da composição, como personagens e objetos em primeiro plano, with espessura intermediária para reforçar separação das formas e leitura gráfica. Utilize paleta de cores vibrante e harmoniosa, with contraste entre tons quentes e frios, acabamento polido, composição dinâmica e sensação de cena ilustrada, preservando o enquadramento original e convertendo completamente o visual para esse estilo ilustrativo expressivo, moderno e cinematográfico.'
  },
  {
    id: 'ilustracao_surreal',
    name: 'Ilustração Surreal',
    shortName: 'Surreal',
    color: 'from-green-600 via-blue-600 to-purple-600',
    iconStyle: 'text-white hue-rotate-90 scale-105',
    previewUrl: 'https://picsum.photos/seed/wolf-tattoo-surreal/400/400',
    prompt: 'Transforme a imagem enviada para um estilo de ilustração surreal contemporânea with realismo estilizado e composição gráfica fragmentada. Trabalhe rosto humano with expressão emocional intensa, olhos brilhantes e traços realistas suavemente idealizados. Construa volumes através de iluminação dramática contrastada, with luz quente e fria interagindo para criar profundidade e atmosfera. Integre elementos gráficos abstratos, cortes visuais e formas fragmentadas que atravessam a composição, criando sensação de movimento e ruptura visual. Utilize textura pictórica digital visível, acabamento artístico polido, fundo claro ou neutro with intervenções gráficas sutis, preservando o enquadramento original e convertendo completamente o visual para esse estilo artístico expressivo, moderno e conceitual.'
  },
  {
    id: '3d_estilizado',
    name: '3D Estilizado Urbano',
    shortName: '3D Urbano',
    color: 'from-cyan-500 via-blue-500 to-indigo-500',
    iconStyle: 'text-white drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]',
    previewUrl: 'https://picsum.photos/seed/wolf-tattoo-3d-urban/400/400',
    prompt: 'Transforme a imagem enviada para um estilo 3D estilizado urbano with estética street e fantasia contemporânea, combinando proporções levemente caricatas with alto nível de detalhamento. Utilize cores vibrantes e contrastantes, with predominância de tons neon e saturação elevada, mantendo controle de contraste e leitura clara. Aplique texturas ricas e expressivas em tecidos, acessórios e superfícies, with aparência desgastada, respingos de tinta e acabamento urbano. Trabalhe iluminação limpa e direta, with luz frontal bem definida e leve preenchimento lateral, criando profundidade tridimensional e destaque para olhos e expressão. Utilize fundo simples ou gradiente sólido, aparência polida e impacto visual forte, preservando o enquadramento original e convertendo completamente o visual para esse estilo estilizado, moderno e energético.'
  },
  {
    id: 'tattoo_ilustrativa',
    name: 'Tattoo Ilustrativa Colorida',
    shortName: 'Ilustrativa',
    color: 'from-emerald-500 to-teal-300',
    iconStyle: 'text-emerald-100 opacity-90',
    previewUrl: 'https://picsum.photos/seed/wolf-tattoo-illustrative/400/400',
    prompt: 'Transforme a imagem enviada para um estilo de tatuagem ilustrativa colorida with estética delicada e ornamental, utilizando traço limpo e bem definido, contornos suaves with variação sutil de espessura e acabamento manual refinado. Aplique coloração suave e harmoniosa, with paleta quente e natural, tons terrosos, alaranjados e rosados equilibrados with sombreamento leve e transições suaves de cor. Trabalhe volumes de forma ilustrativa, não realista, mantendo textura limpa, aparência aveludada e leitura clara para tatuagem. Integre elementos orgânicos decorativos de forma fluida à composição, utilize fundo branco ou negativo e preserve o enquadramento original enquanto converte totalmente o visual para esse estilo artístico, elegante e delicado.'
  },
  {
    id: 'neo_trad_moderno',
    name: 'Neo Trad Moderno',
    shortName: 'Neo Trad',
    color: 'from-red-600 via-orange-500 to-yellow-300',
    iconStyle: 'text-white saturate-200 brightness-110',
    previewUrl: 'https://picsum.photos/seed/wolf-tattoo-neo-trad/400/400',
    prompt: 'Transforme a imagem enviada para um estilo new school / neo tradicional moderno, with cores vibrantes e saturadas, sombras profundas e luzes suaves em aerógrafo. Aplique volumes exagerados, degradês limpos, brilho controlado e texturas suaves que lembram pintura digital. Utilize lineart grosso, sólido e bem marcado, with contornos expressivos e curvas fluidas. Mantenha o visual polido, with mistura de tons quentes e frios, destaque dramático nos olhos, pele with transições suaves e modelagem tridimensional estilizada. Inclua detalhes ornamentais curvos e dinâmicos ao redor da composição. Converta completamente o visual para esse estilo artístico moderno, intenso, colorido e estilizado, preservando apenas a estrutura do tema original.'
  },
  {
    id: 'neo_blackwork',
    name: 'Neo Blackwork Airbrush',
    shortName: 'Blackwork',
    color: 'from-zinc-900 to-zinc-700',
    iconStyle: 'text-white contrast-200',
    previewUrl: 'https://picsum.photos/seed/wolf-tattoo-blackwork/400/400',
    prompt: 'Transforme a imagem enviada para um estilo neo-anime elegante, with lineart grosso e limpo, traços precisos e contornos bem definidos. Aplique sombreamento suave estilo aerógrafo with transições delicadas, granulação leve (pepper shading) e textura sutil. Utilize alto contraste, combinando áreas intensamente pretas with tons de cinza macios. Adicione detalhes de brilho no cabelo e no rosto, mantendo expressão marcante e estética refinada. Inclua shapes decorativos fluidos ao redor da composição para criar movimento e enquadramento orgânico. Converta completamente o visual para esse estilo de tatuagem moderna, minimalista, estilizada e altamente polida, preservando apenas a estrutura do tema original.'
  },
  {
    id: 'wipshading',
    name: 'Wipshading (Light)',
    shortName: 'Wipshading',
    color: 'from-zinc-200 to-zinc-50',
    iconStyle: 'text-zinc-600 opacity-70',
    previewUrl: 'https://picsum.photos/seed/wolf-tattoo-wipshading/400/400',
    prompt: 'Transforme a imagem enviada para um estilo de ilustração em preto e branco utilizando wip shading with pontilhado rastelado como principal técnica de sombra. Construa sombras por meio de conjuntos de pontos extremamente finos, aplicados de forma irregular e progressiva, criando massas tonais suaves e sensação de profundidade. Combine o pontilhado with lines contínuas orgânicas, utilizando variação clara de espessura entre lines finas e mais grossas para definir contornos, planos e hierarquia visual. Mantenha aparência de processo visível, with sombreamento inacabado e áreas abertas, evitando acabamento polido ou contrastes agressivos. Utilize fundo claro ou neutro, composição fluida e leitura natural, preservando o enquadramento original e convertendo completamente o visual para esse estilo wip shading expressivo, técnico e processual.'
  }
];

export const MOCKUPS = [
  {
    id: 'mockup_braco',
    name: 'Fechamento de Braço',
    icon: 'Arm',
    description: 'Molde de Braço Realista',
    prompt: 'Create a full sleeve tattoo project covering the entire arm from shoulder to wrist. Use the attached reference images as the absolute visual and stylistic base, preserving their original art style, color palette, and technical execution (whether realistic, traditional, sketch, etc.). INTEGRATION LOGIC: If a photo of a specific arm is provided, apply the design directly onto that skin surface, following its unique anatomy. If no body photo is provided, generate a neutral, 3D anatomical arm mockup. ENSURE: Proper cylindrical wrapping, natural muscle flow integration, and seamless transitions between elements to avoid a collage effect. The final result must look like a professional, finished tattoo integrated into the skin. Aspect ratio 1:2.'
  },
  {
    id: 'mockup_perna',
    name: 'Fechamento de Perna',
    icon: 'Leg',
    description: 'Molde de Perna Realista',
    prompt: 'Create a full leg tattoo project covering the entire leg from thigh to ankle. Use the attached reference images as the absolute visual and stylistic base, preserving their original art style, color palette, and technical execution. INTEGRATION LOGIC: If a photo of a specific leg is provided, apply the design directly onto that skin surface, following its unique anatomy. If no body photo is provided, generate a neutral, 3D anatomical leg mockup. ENSURE: Proper cylindrical wrapping around the thigh and calf, natural muscle flow integration, and seamless transitions between elements to avoid a collage effect. The final result must look like a professional, finished tattoo integrated into the skin. Aspect ratio 1:2.'
  },
  {
    id: 'mockup_torso',
    name: 'Torso / Peito',
    icon: 'Torso',
    description: 'Molde de Peito/Abdômen',
    prompt: 'Create a full torso tattoo project covering the chest and abdomen. Use the attached reference images as the absolute visual and stylistic base, preserving their original art style, color palette, and technical execution. INTEGRATION LOGIC: If a photo of a specific torso/chest is provided, apply the design directly onto that skin surface, following the pectoral and abdominal contours. If no body photo is provided, generate a neutral, 3D anatomical torso mockup. ENSURE: Anatomical flow across the sternum and ribs, balanced negative space, and seamless transitions between elements to avoid a collage effect. The final result must look like a professional, finished tattoo integrated into the skin. Aspect ratio 3:4.'
  },
  {
    id: 'mockup_costas',
    name: 'Costas',
    icon: 'Back',
    description: 'Molde de Costas Realista',
    prompt: 'Create a full back tattoo project covering the entire back from the neck to the lower waist. Use the attached reference images as the absolute visual and stylistic base, preserving their original art style, color palette, and technical execution. INTEGRATION LOGIC: If a photo of a specific back is provided, apply the design directly onto that skin surface, following the scapula and spinal anatomy. If no body photo is provided, generate a neutral, 3D anatomical back mockup. ENSURE: Expansive composition, natural flow across the back muscles, and seamless transitions between elements to avoid a collage effect. The final result must look like a professional, finished tattoo integrated into the skin. Aspect ratio 3:4.'
  },
  {
    id: 'mockup_corpo_frente',
    name: 'Corpo Inteiro (Frente)',
    icon: 'BodyFront',
    description: 'Molde de Corpo Frontal',
    prompt: 'Create a full-body frontal tattoo project covering from the neck down to the ankles. Use the attached reference images as the absolute visual and stylistic base, preserving their original art style, color palette, and technical execution. INTEGRATION LOGIC: If a photo of a specific body is provided, apply the design directly onto that skin surface, maintaining a unified flow across the torso and legs. If no body photo is provided, generate a neutral, 3D anatomical full-body frontal mockup. ENSURE: A cohesive masterpiece that respects total body symmetry, anatomical flow, and seamless transitions to avoid a collage effect. The final result must look like a professional, finished tattoo integrated into the skin. Aspect ratio 1:3.'
  },
  {
    id: 'mockup_corpo_costas',
    name: 'Corpo Inteiro (Costas)',
    icon: 'BodyBack',
    description: 'Molde de Corpo Posterior',
    prompt: 'Create a full-body back tattoo project covering from the neck down to the heels. Use the attached reference images as the absolute visual and stylistic base, preserving their original art style, color palette, and technical execution. INTEGRATION LOGIC: If a photo of a specific body back is provided, apply the design directly onto that skin surface, following the entire posterior anatomy. If no body photo is provided, generate a neutral, 3D anatomical full-body back mockup. ENSURE: Unified flow from the upper back through the glutes down to the calves, with seamless transitions to avoid a collage effect. The final result must look like a professional, finished tattoo integrated into the skin. Aspect ratio 1:3.'
  }
];


