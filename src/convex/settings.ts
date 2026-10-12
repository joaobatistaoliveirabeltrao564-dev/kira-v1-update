import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  DEFAULT_MODEL,
  DEFAULT_SETTINGS,
  type KiraUserSettings,
} from "../lib/kira";
import { internalQuery, mutation, query } from "./_generated/server";

/**
 * Status do provedor de IA para a tela de configurações.
 * Não expõe a chave — apenas se ela está configurada e qual modelo será usado.
 */
export const aiStatus = query({
  args: {},
  handler: async () => {
    try {
      const hasKey = Boolean(process.env.OPENROUTER_API_KEY);
      return {
        configured: hasKey,
        provider: hasKey ? "OpenRouter" : "Gateway do Freebuff (fallback)",
        model: process.env.KIRA_MODEL || DEFAULT_MODEL,
      };
    } catch {
      return {
        configured: false,
        provider: "—",
        model: DEFAULT_MODEL,
      };
    }
  },
});

export { DEFAULT_SETTINGS };
export type KiraSettingsDoc = KiraUserSettings;

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .unique();
    // Pode ser null na primeira execução — o frontend aplica DEFAULT_SETTINGS
    // e qualquer mutation cria o documento sob demanda.
    return settings;
  },
});

export const update = mutation({
  args: {
    personality: v.optional(v.string()),
    responseLength: v.optional(v.string()),
    ttsRate: v.optional(v.number()),
    ttsVoice: v.optional(v.string()),
    autoSpeak: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Não autenticado.");
    let settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .unique();
    const now = Date.now();
    if (!settings) {
      const id = await ctx.db.insert("settings", {
        userId: userId as string,
        ...DEFAULT_SETTINGS,
        createdAt: now,
        updatedAt: now,
      });
      settings = (await ctx.db.get(id))!;
    }
    const patch: Record<string, unknown> = { updatedAt: now };
    if (args.personality !== undefined) patch.personality = args.personality;
    if (args.responseLength !== undefined)
      patch.responseLength = args.responseLength;
    if (args.ttsRate !== undefined)
      patch.ttsRate = Math.min(2, Math.max(0.5, args.ttsRate));
    if (args.ttsVoice !== undefined) patch.ttsVoice = args.ttsVoice;
    if (args.autoSpeak !== undefined) patch.autoSpeak = args.autoSpeak;
    await ctx.db.patch(settings._id, patch);
  },
});

export const setScript = mutation({
  args: { script: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Não autenticado.");
    let settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .unique();
    if (!settings) {
      const now = Date.now();
      const id = await ctx.db.insert("settings", {
        userId: userId as string,
        ...DEFAULT_SETTINGS,
        createdAt: now,
        updatedAt: now,
      });
      settings = (await ctx.db.get(id))!;
    }
    const script = args.script.trim().slice(0, 4000);
    await ctx.db.patch(settings._id, { script, updatedAt: Date.now() });
  },
});

export const resetScript = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Não autenticado.");
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .unique();
    if (!settings) return;
    await ctx.db.patch(settings._id, { script: "", updatedAt: Date.now() });
  },
});

/** Uso interno (action de chat): preferências com defaults aplicados. */
export const internalGet = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!settings) return DEFAULT_SETTINGS;
    return {
      personality: settings.personality,
      responseLength: settings.responseLength,
      ttsRate: settings.ttsRate,
      ttsVoice: settings.ttsVoice,
      autoSpeak: settings.autoSpeak,
      script: settings.script,
    };
  },
});
