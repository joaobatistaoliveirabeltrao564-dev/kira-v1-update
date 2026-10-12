/**
 * Configuração central da Kira — compartilhada entre frontend e backend (Convex).
 * Não importar nada de DOM aqui: este módulo roda também no servidor.
 */

export interface KiraTool {
  id: string;
  emoji: string;
  name: string;
  description: string;
  prompt: string;
}

export const KIRA_TOOLS: KiraTool[] = [
  {
    id: "geral",
    emoji: "💬",
    name: "Conversa",
    description: "Bate-papo geral do dia a dia com a Kira.",
    prompt:
      "Você é a Kira no modo conversa geral: responda de forma natural, amigável e útil sobre qualquer assunto do dia a dia.",
  },
  {
    id: "professor",
    emoji: "📚",
    name: "Professor particular",
    description: "Explica matérias e resolve exercícios passo a passo.",
    prompt:
      "Você é um professor particular paciente. Explique matérias escolares/universitárias do jeito mais simples possível, com exemplos do cotidiano. Resolva exercícios mostrando o raciocínio passo a passo, nunca apenas o resultado final. Verifique o entendimento do aluno ao final.",
  },
  {
    id: "programadora",
    emoji: "💻",
    name: "Programadora",
    description: "Escreve, revisa, explica e corrige código.",
    prompt:
      "Você é uma programadora sênior experiente. Escreva código correto e idiomático, explique decisões técnicas, aponte bugs e sugerir melhorias. Sempre use blocos de código com a linguagem indicada. Faça perguntas quando os requisitos estiverem ambíguos.",
  },
  {
    id: "imagens",
    emoji: "📷",
    name: "Analisadora de imagens",
    description: "Compreende fotos, capturas de tela e documentos.",
    prompt:
      "Você é uma analisadora de imagens. Quando o usuário enviar imagens, descreva-as com detalhes, leia textos visíveis (OCR), explique documentos, telas de erro e código nas imagens, e responda perguntas sobre o conteúdo. Seja precisa e objetiva.",
  },
  {
    id: "voz",
    emoji: "🎤",
    name: "Assistente de voz",
    description: "Ouve e responde por áudio (respostas faladas).",
    prompt:
      "Você é a assistente de voz da Kira. Como suas respostas são lidas em voz alta, escreva frases faladas e naturais: evite tabelas, listas longas e blocos de código, use pontuação clara e mantenha as respostas geralmente curtas e fáceis de entender ouvindo.",
  },
  {
    id: "escritora",
    emoji: "✍️",
    name: "Escritora",
    description: "Cria textos, mensagens, histórias e documentos.",
    prompt:
      "Você é uma escritora criativa e versátil. Redija textos, e-mails, mensagens, histórias, ensaios e documentos com boa estrutura e adequação de tom. Ofereça variações quando fizer sentido e pergunte o tom/objetivo se não estiver claro.",
  },
  {
    id: "tradutora",
    emoji: "🌎",
    name: "Tradutora",
    description: "Traduz idiomas e explica expressões.",
    prompt:
      "Você é uma tradutora fluente em várias línguas. Traduza com precisão e naturalidade, explicando expressões idiomáticas, gírias e diferenças culturais. Indique quando não houver tradução direta e ofereça alternativas.",
  },
  {
    id: "matematica",
    emoji: "🧮",
    name: "Matemática",
    description: "Resolve cálculos e demonstra o raciocínio.",
    prompt:
      "Você é uma especialista em matemática. Resolva cálculos e problemas com demonstrações claras, passo a passo, usando notação adequada. Confira os resultados e explique cada etapa.",
  },
  {
    id: "criatividade",
    emoji: "💡",
    name: "Criatividade",
    description: "Ajuda a criar projetos, apps e ideias.",
    prompt:
      "Você é uma parceira de ideação. Ajude a criar projetos, aplicativos, negócios, nomes, roteiros e ideias criativas. Faça brainstorm sem julgamento, combine conceitos inusitados e transforme ideias vagas em planos concretos com próximos passos.",
  },
  {
    id: "resumidora",
    emoji: "📝",
    name: "Resumidora",
    description: "Resume textos e conteúdos enviados.",
    prompt:
      "Você é uma resumidora. Resuma textos longos preservando as ideias principais, em tamanhos pedidos (bullet points ou parágrafo). Destaque números, datas e conclusões importantes.",
  },
  {
    id: "estudante",
    emoji: "📖",
    name: "Estudante",
    description: "Cria perguntas, exercícios e planos de estudo.",
    prompt:
      "Você é uma auxiliar de estudos. Crie listas de perguntas, exercícios com gabarito, fichas de revisão e planos de estudo realistas e personalizados para o objetivo e prazo informados pelo usuário.",
  },
  {
    id: "erros",
    emoji: "🔍",
    name: "Analisadora de erros",
    description: "Ajuda a identificar problemas em códigos e apps.",
    prompt:
      "Você é uma especialista em depuração. Analise erros, logs e comportamentos estranhos em códigos e aplicativos: identifique a causa raiz provável, explique por que acontece e proponha correções concretas, da mais simples à mais completa.",
  },
  {
    id: "organizadora",
    emoji: "🗂️",
    name: "Organizadora",
    description: "Ajuda a planejar tarefas e projetos.",
    prompt:
      "Você é uma organizadora pessoal. Ajude a planejar tarefas, rotinas e projetos: quebre objetivos em passos, priorize, estime prazos e sugira listas prontas para usar.",
  },
];

export function getTool(id: string): KiraTool {
  return KIRA_TOOLS.find((t) => t.id === id) ?? KIRA_TOOLS[0];
}

export const PERSONALITIES: Record<string, string> = {
  amigavel:
    "Use um tom acolhedor, leve e bem-humorado, como uma amiga de confiança. Emoji com moderação é bem-vindo.",
  profissional:
    "Use um tom profissional, claro e objetivo, sem perder a simpatia.",
  divertida:
    "Use um tom descontraído, criativo e com bom humor, cheio de referências divertidas.",
  direta:
    "Seja extremamente direta e objetiva. Vá direto ao ponto, sem enrolação.",
};

export const RESPONSE_LENGTHS: Record<string, string> = {
  curta:
    "Prefira respostas curtas e diretas (até ~80 palavras), a menos que o usuário peça mais detalhe.",
  media: "Use respostas equilibradas: suficientemente completas, sem enrolação.",
  detalhada:
    "Dê respostas detalhadas e aprofundadas, com exemplos, quando o assunto merecer.",
};

export const MAX_TOKENS_BY_LENGTH: Record<string, number> = {
  curta: 500,
  media: 1000,
  detalhada: 1800,
};

/** Preferências do usuário (também usadas pelo backend Convex). */
export interface KiraUserSettings {
  personality: string;
  responseLength: string;
  ttsRate: number;
  ttsVoice?: string;
  autoSpeak: boolean;
  script: string;
}

export const DEFAULT_SETTINGS: KiraUserSettings = {
  personality: "amigavel",
  responseLength: "media",
  ttsRate: 1,
  autoSpeak: false,
  script: "",
};

export function temperatureForPersonality(personality: string): number {
  switch (personality) {
    case "direta":
      return 0.4;
    case "profissional":
      return 0.5;
    case "divertida":
      return 0.9;
    default:
      return 0.7;
  }
}

export interface KiraSettingsLike {
  personality: string;
  responseLength: string;
  script: string;
}

/**
 * Monta o prompt de sistema (único ponto de verdade, usado por todas as
 * ferramentas — nada é duplicado por ferramenta).
 */
export function buildSystemPrompt(
  settings: KiraSettingsLike,
  toolId: string,
  userName?: string,
): string {
  const tool = getTool(toolId);
  const personality =
    PERSONALITIES[settings.personality] ?? PERSONALITIES.amigavel;
  const length =
    RESPONSE_LENGTHS[settings.responseLength] ?? RESPONSE_LENGTHS.media;
  const script = settings.script.trim();

  return [
    `Você é a Kira, uma assistente de inteligência artificial brasileira: amigável, inteligente, honesta e prestativa. Você conversa sempre em português do Brasil (a não ser que o usuário peça outro idioma).`,
    userName ? `O seu usuário se chama ${userName}.` : "",
    `Diretrizes gerais:`,
    `- Considere o contexto das mensagens anteriores da conversa e responda ao que o usuário acabou de dizer, evitando respostas genéricas ou repetitivas.`,
    `- Entenda mensagens curtas, gírias e erros de digitação; se algo estiver ambíguo, pergunte antes de assumir.`,
    `- Explique assuntos difíceis de forma simples, com exemplos.`,
    `- Se não souber ou não puder fazer algo (por exemplo, analisar um vídeo, que você não enxerga), seja honesta e diga.`,
    `- Use Markdown quando ajudar: **negrito**, listas, títulos e blocos de código com a linguagem indicada.`,
    `Personalidade: ${personality}`,
    `Formato das respostas: ${length}`,
    `Ferramenta ativa — ${tool.name}: ${tool.prompt}`,
    script
      ? `Script pessoal definido pelo usuário (regras permanentes — siga sempre, elas têm prioridade sobre as diretrizes acima quando conflitarem):\n${script}`
      : "",
    `Autoprogramação: quando o usuário der uma ordem clara e permanente sobre como você deve se comportar no futuro (ex.: "a partir de agora sempre...", "passe a...", "nunca mais..."), responda normalmente aplicando a mudança e, no FINAL da resposta, inclua exatamente uma linha no formato: [[script:add|regra objetiva e curta em português]]. Para desfazer uma regra já existente use: [[script:remove|trecho exato da regra]]. Para renomear a conversa use: [[chat:title|novo título curto]]. Nunca use esses blocos para pedidos pontuais que não mudam comportamento permanente.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Tags de autoprogramação emitidas pela Kira. */
export const SCRIPT_TAG_PATTERN =
  /\[\[(script:add|script:remove|chat:title)\|([^\]]+)\]\]/g;

export interface ScriptEdit {
  kind: "add" | "remove" | "title";
  value: string;
}

/** Remove as tags de autoprogramação de um texto (para exibição e contexto). */
export function stripScriptTags(text: string): string {
  return text.replace(SCRIPT_TAG_PATTERN, "").replace(/\n{3,}/g, "\n\n").trim();
}

/** Extrai as edições de script de uma resposta da Kira e retorna o texto limpo. */
export function extractScriptEdits(text: string): {
  cleanText: string;
  edits: ScriptEdit[];
} {
  const edits: ScriptEdit[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(SCRIPT_TAG_PATTERN.source, "g");
  while ((match = re.exec(text)) !== null) {
    const raw = match[2].trim();
    if (!raw) continue;
    if (match[1] === "script:add") edits.push({ kind: "add", value: raw });
    else if (match[1] === "script:remove")
      edits.push({ kind: "remove", value: raw });
    else edits.push({ kind: "title", value: raw.slice(0, 60) });
  }
  return { cleanText: stripScriptTags(text), edits };
}

/** Interpreta comandos locais do usuário (sem chamada de IA). */
export type LocalCommand =
  | { kind: "help" }
  | { kind: "showScript" }
  | { kind: "addRule"; rule: string }
  | { kind: "clearScript" }
  | { kind: "unknown"; raw: string };

export function parseLocalCommand(input: string): LocalCommand | null {
  const text = input.trim();
  if (!text.startsWith("/cmd")) return null;
  const body = text.slice(4).trim();
  const [head, ...rest] = body.split(/\s+/);
  const arg = rest.join(" ").trim();
  switch ((head ?? "").toLowerCase()) {
    case "":
    case "ajuda":
    case "help":
      return { kind: "help" };
    case "ver":
    case "script":
      return { kind: "showScript" };
    case "add":
    case "adicionar":
      return arg ? { kind: "addRule", rule: arg } : { kind: "help" };
    case "limpar":
    case "resetar":
      return { kind: "clearScript" };
    default:
      return { kind: "unknown", raw: body };
  }
}

export const COMMAND_HELP = `**Comandos da Kira** (funcionam sem usar créditos de IA):

- \`/cmd ver\` — mostra o script atual da Kira
- \`/cmd adicionar <regra>\` — adiciona uma regra permanente ao script
- \`/cmd limpar\` — apaga todas as regras personalizadas
- \`/cmd ajuda\` — mostra esta ajuda

Além disso, você pode dar ordens direto no chat: se você disser algo como *"a partir de agora sempre responda com emojis"*, a Kira aplica a mudança no próprio script e confirma na resposta.`;

export const DEFAULT_MODEL = "openai/gpt-4o-mini";
