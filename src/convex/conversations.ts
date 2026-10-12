import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .order("desc")
      .take(200);
    return conversations;
  },
});

export const create = mutation({
  args: { tool: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Não autenticado.");
    const now = Date.now();
    return await ctx.db.insert("conversations", {
      userId: userId as string,
      title: "Novo chat",
      tool: args.tool ?? "geral",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const rename = mutation({
  args: { conversationId: v.id("conversations"), title: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== (userId as string | null)) {
      throw new Error("Conversa não encontrada.");
    }
    const title = args.title.trim().slice(0, 60) || conv.title;
    await ctx.db.patch(args.conversationId, { title, updatedAt: Date.now() });
  },
});

export const setTool = mutation({
  args: { conversationId: v.id("conversations"), tool: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== (userId as string | null)) {
      throw new Error("Conversa não encontrada.");
    }
    await ctx.db.patch(args.conversationId, {
      tool: args.tool,
      updatedAt: Date.now(),
    });
  },
});

/** Apaga uma conversa e todas as mídias anexadas (usado por remove/clearAll). */
async function deleteConversationData(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
) {
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q) =>
      q.eq("conversationId", conversationId),
    )
    .collect();
  for (const message of messages) {
    for (const attachment of message.attachments ?? []) {
      try {
        await ctx.storage.delete(attachment.storageId);
      } catch {
        // anexo já removido — ignora
      }
    }
    await ctx.db.delete(message._id);
  }
  await ctx.db.delete(conversationId);
}

export const remove = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== (userId as string | null)) {
      throw new Error("Conversa não encontrada.");
    }
    await deleteConversationData(ctx, args.conversationId);
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .collect();
    for (const conv of conversations) {
      await deleteConversationData(ctx, conv._id);
    }
    return conversations.length;
  },
});

/** Uso interno (action de chat): carrega a conversa validando o dono. */
export const internalGet = internalQuery({
  args: { conversationId: v.id("conversations"), userId: v.string() },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== args.userId) return null;
    return conv;
  },
});

/** Uso interno: atualiza o timestamp da conversa. */
export const internalTouch = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });
  },
});
