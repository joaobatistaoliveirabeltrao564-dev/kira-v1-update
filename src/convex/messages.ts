import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

const attachmentValidator = v.object({
  storageId: v.id("_storage"),
  kind: v.union(v.literal("image"), v.literal("video")),
  name: v.string(),
  mimeType: v.string(),
});

async function assertConversationOwner(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
) {
  const userId = await getAuthUserId(ctx);
  const conv = await ctx.db.get(conversationId);
  if (!conv || !userId || conv.userId !== (userId as string)) {
    throw new Error("Conversa não encontrada.");
  }
  return { conv, userId: userId as string };
}

export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== (userId as string)) return [];
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .take(400);
    return messages;
  },
});

/** URL assinada (temporária) para exibir um anexo no chat. */
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Não autenticado.");
    return await ctx.storage.generateUploadUrl();
  },
});

export const addUserMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
    attachments: v.optional(v.array(attachmentValidator)),
  },
  handler: async (ctx, args) => {
    const { conv, userId } = await assertConversationOwner(
      ctx,
      args.conversationId,
    );
    const text = args.text.trim();
    if (!text && !(args.attachments?.length ?? 0)) {
      throw new Error("Mensagem vazia.");
    }
    // Título automático a partir da primeira mensagem (sem usar IA).
    if (conv.title === "Novo chat" && text) {
      await ctx.db.patch(args.conversationId, {
        title: text.length > 42 ? `${text.slice(0, 42)}…` : text,
      });
    }
    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });
    return await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId,
      role: "user",
      text,
      attachments: args.attachments,
      status: "done",
      createdAt: Date.now(),
    });
  },
});

/** Resposta local (sem IA) — usada pelos comandos /cmd. */
export const localReply = mutation({
  args: { conversationId: v.id("conversations"), text: v.string() },
  handler: async (ctx, args) => {
    const { conv, userId } = await assertConversationOwner(
      ctx,
      args.conversationId,
    );
    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });
    return await ctx.db.insert("messages", {
      conversationId: conv._id,
      userId,
      role: "assistant",
      text: args.text.trim(),
      status: "done",
      createdAt: Date.now(),
    });
  },
});

export const requestStop = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message || !userId || message.userId !== (userId as string)) {
      throw new Error("Mensagem não encontrada.");
    }
    await ctx.db.patch(args.messageId, { stopRequested: true });
  },
});

// ── Helpers internos (usados pela action de chat) ──────────────────────────

export const internalLastUser = internalQuery({
  args: { conversationId: v.id("conversations"), userId: v.string() },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .filter((q) => q.eq(q.field("role"), "user"))
      .first();
    if (!message || message.userId !== args.userId) return null;
    return message;
  },
});

export const internalHistory = internalQuery({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    before: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .filter((q) => q.lt(q.field("createdAt"), args.before))
      .order("desc")
      .take(args.limit ?? 16)
      .then((rows) => rows.reverse());
    return messages.filter(
      (m) => m.userId === args.userId && m.status !== "error",
    );
  },
});

/**
 * Cria (ou reaproveita, no caso de retry) a mensagem placeholder do
 * assistente com status "streaming".
 */
export const internalPrepareAssistant = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    retryMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    if (args.retryMessageId) {
      const existing = await ctx.db.get(args.retryMessageId);
      if (
        existing &&
        existing.conversationId === args.conversationId &&
        existing.userId === args.userId &&
        existing.role === "assistant"
      ) {
        await ctx.db.patch(args.retryMessageId, {
          text: "",
          status: "streaming",
          error: undefined,
          stopRequested: false,
        });
        return args.retryMessageId;
      }
    }
    const id = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: args.userId,
      role: "assistant",
      text: "",
      status: "streaming",
      createdAt: Date.now(),
    });
    return id;
  },
});

export const internalPatch = internalMutation({
  args: {
    messageId: v.id("messages"),
    text: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("streaming"), v.literal("done"), v.literal("error")),
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {};
    if (args.text !== undefined) patch.text = args.text;
    if (args.status !== undefined) patch.status = args.status;
    if (args.error !== undefined) patch.error = args.error;
    await ctx.db.patch(args.messageId, patch);
  },
});

export const internalGetStatus = internalQuery({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;
    return { stopRequested: message.stopRequested ?? false };
  },
});
