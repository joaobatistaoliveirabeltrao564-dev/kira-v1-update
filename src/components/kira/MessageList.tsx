import { useEffect, useRef } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { MessageBubble } from "./MessageBubble";
import { Sparkles } from "lucide-react";
import logo from "@/assets/logo.svg";

const SUGGESTIONS = [
  { emoji: "📚", label: "Me ajuda a estudar pra prova de matemática" },
  { emoji: "💻", label: "Por que meu código está dando erro?" },
  { emoji: "✍️", label: "Escreva um e-mail educado pro meu chefe" },
  { emoji: "🌎", label: "Traduza isso pro inglês pra mim" },
  { emoji: "📷", label: "Manda uma foto que eu explico o que tem nela" },
  { emoji: "💡", label: "Me ajuda a criar um app incrível" },
];

export function MessageList({
  messages,
  isStreaming,
  aiConfigured,
  speakingMessageId,
  onSuggest,
  onRetry,
  onSpeak,
  onStopSpeak,
  onOpenImage,
}: {
  messages: Doc<"messages">[] | undefined;
  isStreaming: boolean;
  aiConfigured: boolean | undefined;
  speakingMessageId: string | null;
  onSuggest: (text: string) => void;
  onRetry: (messageId: Id<"messages">) => void;
  onSpeak: (messageId: string, text: string) => void;
  onStopSpeak: () => void;
  onOpenImage: (src: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stickToBottom = useRef(true);

  const lastMessage = messages?.[messages.length - 1];
  const lastTextLength = lastMessage?.text.length ?? 0;

  // Rola para o fim quando chega mensagem nova — mas não puxa a tela pra
  // baixo se o usuário rolou pra ler mensagens antigas.
  useEffect(() => {
    const container = containerRef.current;
    const bottom = bottomRef.current;
    if (!container || !bottom) return;
    if (stickToBottom.current) {
      bottom.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth" });
    }
  }, [messages?.length, lastTextLength, isStreaming]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const distance =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    stickToBottom.current = distance < 160;
  };

  const isEmpty = !messages || messages.length === 0;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="kira-scroll flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        {aiConfigured === false && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            ⚠️ A IA ainda não está configurada no servidor. Peça ao
            administrador para definir <code className="font-mono">OPENROUTER_API_KEY</code> nas
            variáveis de ambiente do Convex.
          </div>
        )}

        {isEmpty ? (
          <div className="flex flex-col items-center pt-8 pb-4 text-center sm:pt-14">
            <div className="relative mb-5">
              <div className="absolute inset-0 -z-10 animate-pulse rounded-full bg-primary/30 blur-2xl" />
              <img
                src={logo}
                alt="Kira"
                className="size-20 rounded-3xl border border-border/60"
              />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Oi! Eu sou a Kira ✨
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Sua assistente amiga: converso em português, leio suas fotos,
              escrevo, explico, traduzo e ainda posso mudar o meu próprio
              comportamento com comandos seus.
            </p>
            <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => onSuggest(suggestion.label)}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/50 hover:bg-accent"
                >
                  <span aria-hidden>{suggestion.emoji}</span>
                  <span className="leading-5">{suggestion.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Diga “a partir de sempre responda com emojis” e eu aplico no meu
              próprio script.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              isSpeaking={speakingMessageId === message._id}
              onSpeak={(text) => onSpeak(message._id, text)}
              onStopSpeak={onStopSpeak}
              onRetry={onRetry}
              onOpenImage={onOpenImage}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
