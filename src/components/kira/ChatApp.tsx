import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { speakText, stopSpeaking } from "@/hooks/use-voice";
import {
  COMMAND_HELP,
  DEFAULT_SETTINGS,
  extractScriptEdits,
  getTool,
  parseLocalCommand,
  type LocalCommand,
  type ScriptEdit,
} from "@/lib/kira";import type { PendingAttachment } from "@/lib/media";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { SettingsDialog } from "./SettingsDialog";
import { Sidebar } from "./Sidebar";
import { ToolsDialog } from "./ToolsDialog";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Loader2, Menu, MessageSquarePlus, Settings, Wrench } from "lucide-react";
import logo from "@/assets/logo.svg";

export function ChatApp() {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // ── Dados reativos (Convex) ──────────────────────────────────────────
  const conversations = useQuery(api.conversations.list);
  const settingsDoc = useQuery(api.settings.get);
  const aiStatus = useQuery(api.settings.aiStatus);
  const [activeId, setActiveId] = useState<Id<"conversations"> | null>(null);
  const messages = useQuery(
    api.messages.list,
    activeId ? { conversationId: activeId } : "skip",
  );

  const createConversation = useMutation(api.conversations.create);
  const removeConversation = useMutation(api.conversations.remove);
  const clearAllConversations = useMutation(api.conversations.clearAll);
  const renameConversation = useMutation(api.conversations.rename);
  const setConversationTool = useMutation(api.conversations.setTool);
  const addUserMessage = useMutation(api.messages.addUserMessage);
  const localReply = useMutation(api.messages.localReply);
  const requestStop = useMutation(api.messages.requestStop);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const updateSettings = useMutation(api.settings.update);
  const setScript = useMutation(api.settings.setScript);
  const resetScript = useMutation(api.settings.resetScript);
  const respond = useAction(api.chat.respond);

  // ── Estado local de UI ───────────────────────────────────────────────
  const [selectedTool, setSelectedTool] = useState("geral");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const speakingRef = useRef<string | null>(null);

  const activeConversation = useMemo(
    () => conversations?.find((c) => c._id === activeId) ?? null,
    [conversations, activeId],
  );
  const tool = getTool(activeConversation?.tool ?? selectedTool);
  const settings = { ...DEFAULT_SETTINGS, ...(settingsDoc ?? {}) };

  const lastMessage = messages?.[messages.length - 1];
  const isStreaming =
    lastMessage?.role === "assistant" && lastMessage.status === "streaming";

  // Seleciona a conversa mais recente automaticamente.
  useEffect(() => {
    if (activeId) return;
    if (conversations && conversations.length > 0) {
      setActiveId(conversations[0]._id);
    }
  }, [conversations, activeId]);

  // ── Voz (TTS) ────────────────────────────────────────────────────────
  const handleSpeak = useCallback(
    (messageId: string, text: string) => {
      if (speakingRef.current === messageId) {
        stopSpeaking();
        setSpeakingId(null);
        speakingRef.current = null;
        return;
      }
      const started = speakText(text, {
        rate: settings.ttsRate,
        voiceName: settings.ttsVoice,
        onEnd: () => {
          setSpeakingId(null);
          speakingRef.current = null;
        },
        onError: () => {
          setSpeakingId(null);
          speakingRef.current = null;
        },
      });
      if (started) {
        setSpeakingId(messageId);
        speakingRef.current = messageId;
      } else {
        toast.error("A leitura em voz alta não está disponível neste navegador.");
      }
    },
    [settings.ttsRate, settings.ttsVoice],
  );

  const handleStopSpeak = useCallback(() => {
    stopSpeaking();
    setSpeakingId(null);
    speakingRef.current = null;
  }, []);

  useEffect(() => () => stopSpeaking(), []);

  // Fala automaticamente a última resposta, se ativado nas configurações.
  const lastAutoSpokenRef = useRef<string | null>(null);
  const lastAutoSpeakConvRef = useRef<Id<"conversations"> | null>(null);
  useEffect(() => {
    if (!settings.autoSpeak || !messages) return;
    const last = [...messages]
      .reverse()
      .find((m) => m.role === "assistant" && m.status === "done" && m.text.trim());
    if (!last || lastAutoSpokenRef.current === last._id) return;
    // Ao trocar de conversa, não lemos mensagens antigas automaticamente.
    if (lastAutoSpeakConvRef.current !== activeId) {
      lastAutoSpeakConvRef.current = activeId;
      lastAutoSpokenRef.current = last._id;
      return;
    }
    if (last._id === lastMessage?._id) {
      lastAutoSpokenRef.current = last._id;
      speakingRef.current = last._id;
      setSpeakingId(last._id);
      speakText(last.text, {
        rate: settings.ttsRate,
        voiceName: settings.ttsVoice,
        onEnd: () => {
          setSpeakingId(null);
          speakingRef.current = null;
        },
      });
    }
  }, [messages, lastMessage, settings.autoSpeak, settings.ttsRate, settings.ttsVoice]);

  // ── Autoprogramação: aplica tags [[script:...]] / [[chat:title|...]] ──
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const mountedAtRef = useRef(Date.now());
  const applyScriptEdits = useCallback(
    async (edits: ScriptEdit[], conversationId: Id<"conversations">) => {
      let currentScript = settingsDoc?.script ?? "";
      for (const edit of edits) {
        if (edit.kind === "add") {
          if (currentScript.includes(edit.value)) continue;
          currentScript = currentScript.trim()
            ? `${currentScript.trim()}\n- ${edit.value}`
            : `- ${edit.value}`;
          await setScript({ script: currentScript });
          toast.success(`🛠️ Kira atualizou o próprio script: “${edit.value}”`);
        } else if (edit.kind === "remove") {
          currentScript = currentScript
            .split("\n")
            .filter((line) => !line.includes(edit.value))
            .join("\n")
            .trim();
          await setScript({ script: currentScript });
          toast.info(`🗑️ Kira removeu do script: “${edit.value}”`);
        } else {
          await renameConversation({ conversationId, title: edit.value });
          toast.success(`✏️ Conversa renomeada: “${edit.value}”`);
        }
      }
    },
    [settingsDoc?.script, setScript, renameConversation],
  );

  useEffect(() => {
    if (!messages) return;
    for (const message of messages) {
      if (message.role !== "assistant" || message.status !== "done") continue;
      if (processedMessagesRef.current.has(message._id)) continue;
      processedMessagesRef.current.add(message._id);
      // Não reaplica edições de mensagens antigas (criadas antes do app abrir).
      if (message._creationTime * 1000 < mountedAtRef.current) continue;
      const { edits } = extractScriptEdits(message.text);
      if (edits.length > 0) {
        void applyScriptEdits(edits, message.conversationId).catch(() =>
          toast.error("Não consegui aplicar a mudança no meu script."),
        );
      }
    }
  }, [messages, applyScriptEdits]);

  // ── Comandos locais /cmd (sem chamada de IA) ─────────────────────────
  const runLocalCommand = useCallback(
    async (
      conversationId: Id<"conversations">,
      command: LocalCommand,
      rawText: string,
    ) => {
      switch (command.kind) {
        case "help":
          await localReply({ conversationId, text: COMMAND_HELP });
          break;
        case "showScript": {
          const script = settingsDoc?.script?.trim();
          await localReply({
            conversationId,
            text: script
              ? `Meu script atual é:\n\n${script}`
              : "Meu script está vazio — sigo apenas o padrão. Use `/cmd adicionar <regra>` ou me dê uma ordem direta no chat (ex.: “a partir de agora sempre responda com exemplos”).",
          });
          break;
        }
        case "addRule": {
          const base = settingsDoc?.script?.trim() ?? "";
          if (base.includes(command.rule)) {
            await localReply({
              conversationId,
              text: `Essa regra já está no meu script: “${command.rule}”.`,
            });
            break;
          }
          const next = base ? `${base}\n- ${command.rule}` : `- ${command.rule}`;
          await setScript({ script: next });
          await localReply({
            conversationId,
            text: `✅ Pronto! Adicionei ao meu script e vou seguir essa regra em todas as conversas:\n\n- ${command.rule}`,
          });
          toast.success("🛠️ Script da Kira atualizado");
          break;
        }
        case "clearScript":
          await resetScript();
          await localReply({
            conversationId,
            text: "✅ Script restaurado ao padrão. Minhas regras personalizadas foram apagadas.",
          });
          toast.success("Script resetado");
          break;
        default:
          await localReply({
            conversationId,
            text: `Não conheço o comando \`${command.raw}\`. Digite \`/cmd ajuda\` para ver os disponíveis.`,
          });
      }
      void rawText;
    },
    [localReply, settingsDoc?.script, setScript, resetScript],
  );

  // ── Envio de mensagens ───────────────────────────────────────────────
  const [isSending, setIsSending] = useState(false);
  const handleSend = useCallback(
    async (text: string, pending: PendingAttachment[]) => {
      if (isStreaming || isSending) return;
      setIsSending(true);
      try {
        let conversationId = activeId;
        if (!conversationId) {
          conversationId = await createConversation({ tool: tool.id });
          setActiveId(conversationId);
        }

        // Comandos locais: resolvem sem gastar créditos de IA.
        const command = parseLocalCommand(text);
        if (command) {
          await addUserMessage({ conversationId, text });
          await runLocalCommand(conversationId, command, text);
          return;
        }

        // Anexos: upload direto pro storage do Convex.
        const attachments: {
          storageId: Id<"_storage">;
          kind: "image" | "video";
          name: string;
          mimeType: string;
        }[] = [];
        for (const item of pending) {
          const uploadUrl = await generateUploadUrl();
          const body =
            item.kind === "image" ? (item.compressed ?? item.file) : item.file;
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": item.mimeType },
            body,
          });
          if (!response.ok) {
            throw new Error(`Falha no envio de "${item.name}". Tente de novo.`);
          }
          const { storageId } = (await response.json()) as {
            storageId: Id<"_storage">;
          };
          attachments.push({
            storageId,
            kind: item.kind,
            name: item.name,
            mimeType: item.mimeType,
          });
        }

        await addUserMessage({
          conversationId,
          text: text.trim(),
          attachments: attachments.length > 0 ? attachments : undefined,
        });
        await respond({ conversationId });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não consegui enviar a mensagem.",
        );
        throw error; // o Composer mantém o texto/anexos para tentar de novo
      } finally {
        setIsSending(false);
      }
    },
    [activeId, createConversation, tool.id, addUserMessage, runLocalCommand, generateUploadUrl, respond, isStreaming, isSending],
  );

  const handleStop = useCallback(() => {
    if (lastMessage && lastMessage.role === "assistant") {
      void requestStop({ messageId: lastMessage._id }).catch(() =>
        toast.error("Não consegui interromper."),
      );
    }
  }, [lastMessage, requestStop]);

  const handleRetry = useCallback(
    (messageId: Id<"messages">) => {
      if (!activeId) return;
      void respond({ conversationId: activeId, retryMessageId: messageId });
    },
    [activeId, respond],
  );

  const handleNewChat = useCallback(() => {
    handleStopSpeak();
    setActiveId(null);
    setSidebarOpen(false);
  }, [handleStopSpeak]);

  const handleDelete = useCallback(
    (conversationId: Id<"conversations">) => {
      void removeConversation({ conversationId })
        .then(() => {
          if (activeId === conversationId) setActiveId(null);
        })
        .catch(() => toast.error("Não consegui apagar a conversa."));
    },
    [removeConversation, activeId],
  );

  const handleSelectTool = useCallback(
    (toolId: string) => {
      setSelectedTool(toolId);
      if (activeId) {
        void setConversationTool({ conversationId: activeId, tool: toolId });
      }
    },
    [activeId, setConversationTool],
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    window.location.assign("/");
  }, [signOut]);

  const sidebarProps = {
    conversations,
    activeId,
    activeTool: tool.id,
    theme,
    onSelect: (id: Id<"conversations">) => {
      handleStopSpeak();
      setActiveId(id);
      setSidebarOpen(false);
    },
    onNew: handleNewChat,
    onDelete: handleDelete,
    onOpenTools: () => setToolsOpen(true),
    onOpenSettings: () => setSettingsOpen(true),
    onToggleTheme: toggleTheme,
    onSignOut: handleSignOut,
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background text-foreground">
      {/* Sidebar fixa no desktop */}
      <div className="hidden lg:block">
        <Sidebar {...sidebarProps} />
      </div>

      {/* Sidebar em Sheet no celular */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Conversas da Kira</SheetTitle>
          <Sidebar {...sidebarProps} />
        </SheetContent>
      </Sheet>

      {/* Área principal */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
            title="Abrir conversas"
          >
            <Menu className="size-5" />
          </button>
          <img src={logo} alt="" className="size-7 rounded-lg lg:hidden" />
          <button
            type="button"
            onClick={() => setToolsOpen(true)}
            className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-1 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-accent"
            title="Trocar ferramenta"
          >
            <span aria-hidden>{tool.emoji}</span>
            <span className="truncate">{tool.name}</span>
            <Wrench className="size-3 text-muted-foreground" />
          </button>
          <div className="min-w-0 flex-1 truncate px-1 text-center text-sm font-medium text-muted-foreground">
            {activeConversation?.title && activeConversation.title !== "Novo chat"
              ? activeConversation.title
              : ""}
          </div>
          <button
            type="button"
            onClick={handleNewChat}
            className="cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Novo chat"
          >
            <MessageSquarePlus className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Configurações"
          >
            <Settings className="size-5" />
          </button>
        </header>

        {conversations === undefined || (activeId && messages === undefined) ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <MessageList
            messages={messages}
            isStreaming={isStreaming || isSending}
            aiConfigured={aiStatus?.configured}
            speakingMessageId={speakingId}
            onSuggest={(text) => void handleSend(text, [])}
            onRetry={handleRetry}
            onSpeak={handleSpeak}
            onStopSpeak={handleStopSpeak}
            onOpenImage={setLightboxSrc}
          />
        )}

        <Composer
          onSend={handleSend}
          onStop={handleStop}
          isBusy={Boolean(isStreaming) || isSending}
          disabled={false}
          toolLabel={tool.name}
        />
      </main>

      {/* Diálogos */}
      <ToolsDialog
        open={toolsOpen}
        onOpenChange={setToolsOpen}
        activeTool={tool.id}
        onSelect={handleSelectTool}
      />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settingsDoc}
        aiStatus={aiStatus}
        onUpdate={(patch) => updateSettings(patch)}
        onSetScript={(script) => setScript({ script })}
        onResetScript={() => resetScript()}
        onClearHistory={async () => {
          await clearAllConversations();
          setActiveId(null);
        }}
      />
      <Dialog open={lightboxSrc !== null} onOpenChange={(o) => !o && setLightboxSrc(null)}>
        <DialogContent className="max-w-4xl border-none bg-transparent p-2 shadow-none">
          <DialogTitle className="sr-only">Imagem ampliada</DialogTitle>
          {lightboxSrc && (
            <img
              src={lightboxSrc}
              alt="Imagem enviada"
              className="max-h-[85dvh] w-full rounded-xl object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
