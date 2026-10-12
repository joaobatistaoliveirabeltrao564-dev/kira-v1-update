import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // ── Kira: conversas e mensagens do chat ──────────────────────────
    conversations: defineTable({
      userId: v.string(),
      title: v.string(),
      tool: v.string(), // id da ferramenta/modo ativo (ver src/lib/kira.ts)
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_user", ["userId", "updatedAt"]),

    messages: defineTable({
      conversationId: v.id("conversations"),
      userId: v.string(),
      role: v.union(v.literal("user"), v.literal("assistant")),
      text: v.string(),
      attachments: v.optional(
        v.array(
          v.object({
            storageId: v.id("_storage"),
            kind: v.union(v.literal("image"), v.literal("video")),
            name: v.string(),
            mimeType: v.string(),
          }),
        ),
      ),
      status: v.union(
        v.literal("streaming"),
        v.literal("done"),
        v.literal("error"),
      ),
      error: v.optional(v.string()),
      stopRequested: v.optional(v.boolean()),
      createdAt: v.number(),
    }).index("by_conversation", ["conversationId", "createdAt"]),

    // ── Kira: preferências e "script" (regras que o usuário muda por comando) ──
    settings: defineTable({
      userId: v.string(),
      personality: v.string(), // amigavel | profissional | divertida | direta
      responseLength: v.string(), // curta | media | detalhada
      ttsRate: v.number(),
      ttsVoice: v.optional(v.string()),
      autoSpeak: v.boolean(),
      script: v.string(), // regras persistentes definidas pelo usuário
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
