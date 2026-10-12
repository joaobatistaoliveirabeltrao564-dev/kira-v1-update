"use node";

/**
 * Ação de chat da Kira — roda 100% no servidor (nenhuma chave chega ao
 * frontend). Fluxo:
 *   1. valida o usuário e carrega conversa + preferências;
 *   2. monta contexto enxuto (últimas ~16 msgs, orçamento de caracteres);
 *   3. envia para o OpenRouter (streaming, suporte a imagens) — ou, se não
 *      houver chave configurada, usa o gateway VLY como fallback;
 *   4. faz patch da resposta parcial no banco de dados a cada ~250 ms, o que
 *      o frontend recebe reativamente (sensação de "tempo real");
 *   5. respeita o botão "parar" e finaliza com status done/erro.
 */

import {
  DEFAULT_MODEL,
  MAX_TOKENS_BY_LENGTH,
  buildSystemPrompt,
  stripScriptTags,
  temperatureForPersonality,
} from "../lib/kira";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

const MAX_CONTEXT_CHARS = 9000;
const MAX_IMAGES_PER_MESSAGE = 2;
const PATCH_INTERVAL_MS = 250;

type ChatMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | {
      role: "user";
      content: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
    };

/** Limita o histórico preservando as mensagens mais recentes. */
function trimHistory(
  messages: Array<{ role: string; text: string }>,
): Array<{ role: "user" | "assistant"; text: string }> {
  const cleaned = messages
    .filter((m) => m.text.trim().length > 0)
    .map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as
        | "user"
        | "assistant",
      text: stripScriptTags(m.text).slice(0, 4000),
    }))
    .slice(-16);
  let total = cleaned.reduce((sum, m) => sum + m.text.length, 0);
  while (cleaned.length > 2 && total > MAX_CONTEXT_CHARS) {
    total -= cleaned[0].text.length;
    cleaned.shift();
  }
  return cleaned;
}

async function blobToDataUrl(
  blob: Blob,
  mimeType: string,
): Promise<string> {
  const bytes = Buffer.from(await blob.arrayBuffer());
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

async function streamOpenRouter(opts: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature: number;
  onChunk: (text: string) => void;
  shouldStop: () => Promise<boolean>;
}): Promise<void> {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://freebuff.com",
        "X-Title": "Kira Assistente",
      },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        stream: true,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
      }),
    },
  );

  if (!response.ok || !response.body) {
    let detail = "";
    try {
      const bodyText = await response.text();
      const parsed = JSON.parse(bodyText) as {
        error?: { message?: string };
      };
      detail = parsed.error?.message ?? bodyText.slice(0, 300);
    } catch {
      detail = `HTTP ${response.status}`;
    }
    throw new Error(`O provedor de IA respondeu com erro (${response.status}): ${detail}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let stopped = false;
  let lastStopCheck = 0;

  while (!stopped) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          opts.onChunk(delta);
          const now = Date.now();
          if (now - lastStopCheck > 400) {
            lastStopCheck = now;
            if (await opts.shouldStop()) {
              stopped = true;
              break;
            }
          }
        }
      } catch {
        // fragmento parcial — ignora
      }
    }
  }

  try {
    await reader.cancel();
  } catch {
    // stream já encerrado
  }
}

export const respond = action({
  args: {
    conversationId: v.id("conversations"),
    retryMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const authUserId = identity?.subject;
    if (!authUserId) throw new Error("Não autenticado.");

    const conversation = await ctx.runQuery(
      internal.conversations.internalGet,
      { conversationId: args.conversationId, userId: authUserId },
    );
    if (!conversation) throw new Error("Conversa não encontrada.");

    const userMessage = await ctx.runQuery(internal.messages.internalLastUser, {
      conversationId: args.conversationId,
      userId: authUserId,
    });
    if (!userMessage) return;

    const settings = await ctx.runQuery(internal.settings.internalGet, {
      userId: authUserId,
    });

    // Mensagem do usuário e anexos
    const userText = stripScriptTags(userMessage.text) || "(o usuário enviou mídia sem texto)";
    const imageUrls: string[] = [];
    for (const attachment of userMessage.attachments ?? []) {
      if (attachment.kind !== "image") continue;
      if (imageUrls.length >= MAX_IMAGES_PER_MESSAGE) break;
      const blob = await ctx.storage.get(attachment.storageId);
      if (blob) imageUrls.push(await blobToDataUrl(blob, attachment.mimeType));
    }

    const assistantMessageId = await ctx.runMutation(
      internal.messages.internalPrepareAssistant,
      {
        conversationId: args.conversationId,
        userId: authUserId,
        retryMessageId: args.retryMessageId,
      },
    );

    // Contexto: histórico enxuto + mensagem atual (+ imagens)
    const history = await ctx.runQuery(internal.messages.internalHistory, {
      conversationId: args.conversationId,
      userId: authUserId,
      before: userMessage.createdAt,
    });
    const trimmed = trimHistory(history);

    const systemPrompt = buildSystemPrompt(
      settings,
      conversation.tool,
      identity.name as string | undefined,
    );

    const chatMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...trimmed.map(
        (m): ChatMessage => ({ role: m.role, content: m.text }),
      ),
    ];

    if (imageUrls.length > 0) {
      chatMessages.push({
        role: "user",
        content: [
          { type: "text", text: userText },
          ...imageUrls.map((url) => ({
            type: "image_url" as const,
            image_url: { url },
          })),
        ],
      });
    } else {
      chatMessages.push({ role: "user", content: userText });
    }

    const maxTokens =
      MAX_TOKENS_BY_LENGTH[settings.responseLength] ?? MAX_TOKENS_BY_LENGTH.media;
    const temperature = temperatureForPersonality(settings.personality);

    let accumulated = "";
    let lastPatch = 0;

    const flush = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastPatch < PATCH_INTERVAL_MS) return;
      lastPatch = now;
      await ctx.runMutation(internal.messages.internalPatch, {
        messageId: assistantMessageId,
        text: accumulated,
      });
    };

    const shouldStop = async (): Promise<boolean> => {
      const status = await ctx.runQuery(internal.messages.internalGetStatus, {
        messageId: assistantMessageId,
      });
      return status?.stopRequested ?? false;
    };

    try {
      const openRouterKey = process.env.OPENROUTER_API_KEY;

      if (openRouterKey) {
        await streamOpenRouter({
          apiKey: openRouterKey,
          model: process.env.KIRA_MODEL || DEFAULT_MODEL,
          messages: chatMessages,
          maxTokens,
          temperature,
          onChunk: (chunk) => {
            accumulated += chunk;
            void flush();
          },
          shouldStop,
        });
      } else {
        // Fallback: gateway VLY (texto apenas — não suporta imagens).
        // Import dinâmico: só instancia o gateway se realmente formos usá-lo.
        const { vly } = await import("../lib/vly-integrations");
        const textOnly: ChatMessage[] = chatMessages.map((m) =>
          m.role === "system"
            ? { role: "system", content: m.content as string }
            : Array.isArray(m.content)
              ? {
                  role: m.role as "user" | "assistant",
                  content: (m.content as Array<{ type: string; text?: string }>)
                    .filter((part) => part.type === "text")
                    .map((part) => part.text ?? "")
                    .join("\n"),
                }
              : { role: m.role as "user" | "assistant", content: m.content },
        );
        if (imageUrls.length > 0) {
          textOnly.push({
            role: "user",
            content: `[o usuário enviou ${imageUrls.length} imagem(ns); configure OPENROUTER_API_KEY no backend para que você possa analisá-las de verdade — não finja que as viu]`,
          });
        }
        type VlyCompletionFn = (req: {
          model?: string;
          messages: Array<{ role: string; content: string }>;
          temperature?: number;
          maxTokens?: number;
        }) => Promise<{
          success: boolean;
          data?: { choices?: Array<{ message?: { content?: string } }> };
          error?: string;
        }>;
        // Cobrimos os dois formatos documentados (vly.completion e
        // vly.com.completion) sem depender dos tipos do wrapper.
        const gateway = vly as unknown as {
          completion?: VlyCompletionFn;
          com?: { completion?: VlyCompletionFn };
        };
        const completion = gateway.completion ?? gateway.com?.completion;
        if (!completion) {
          throw new Error(
            "Nenhum provedor de IA disponível. Defina OPENROUTER_API_KEY nas variáveis de ambiente do Convex para ativar a Kira.",
          );
        }
        const result = await completion.call(gateway, {
          model: process.env.KIRA_MODEL || DEFAULT_MODEL,
          messages: textOnly.map((m) => ({
            role: m.role as "system" | "user" | "assistant",
            content: m.content as string,
          })),
          temperature,
          maxTokens,
        });
        const content = result.success
          ? result.data?.choices?.[0]?.message?.content
          : undefined;
        if (!content) {
          throw new Error(
            result.error ??
              "Nenhum provedor de IA configurado. Defina OPENROUTER_API_KEY nas variáveis de ambiente do Convex.",
          );
        }
        accumulated = content;
        await flush(true);
      }

      // Verifica pedido de parada e finaliza.
      if (await shouldStop()) {
        await ctx.runMutation(internal.messages.internalPatch, {
          messageId: assistantMessageId,
          text: accumulated || "⏹️ Resposta interrompida.",
          status: "done",
        });
        return;
      }

      await ctx.runMutation(internal.messages.internalPatch, {
        messageId: assistantMessageId,
        text: accumulated || "…",
        status: "done",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido na IA.";
      await ctx.runMutation(internal.messages.internalPatch, {
        messageId: assistantMessageId,
        text: accumulated,
        status: "error",
        error: message.slice(0, 600),
      });
    }
  },
});
