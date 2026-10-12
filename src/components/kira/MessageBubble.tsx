import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Markdown } from "@/lib/markdown";
import { extractScriptEdits } from "@/lib/kira";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import logo from "@/assets/logo.svg";

function AttachmentView({
  attachment,
  onOpenImage,
}: {
  attachment: NonNullable<Doc<"messages">["attachments"]>[number];
  onOpenImage: (src: string) => void;
}) {
  const url = useQuery(api.messages.getUrl, {
    storageId: attachment.storageId,
  });

  if (url === undefined) {
    return (
      <div className="h-24 w-32 animate-pulse rounded-xl bg-muted" aria-hidden />
    );
  }
  if (url === null) {
    return (
      <div className="text-xs text-muted-foreground">
        [mídia indisponível: {attachment.name}]
      </div>
    );
  }
  if (attachment.kind === "image") {
    return (
      <button
        type="button"
        onClick={() => onOpenImage(url)}
        className="group relative block max-w-[260px] cursor-pointer overflow-hidden rounded-xl border border-border/60 transition-opacity hover:opacity-90"
        title="Abrir imagem em tamanho cheio"
      >
        <img
          src={url}
          alt={attachment.name}
          loading="lazy"
          className="h-40 w-full object-cover"
        />
      </button>
    );
  }
  return (
    <video
      src={url}
      controls
      playsInline
      preload="metadata"
      className="max-h-64 w-[280px] max-w-full rounded-xl border border-border/60 bg-black"
    />
  );
}

export function MessageBubble({
  message,
  isSpeaking,
  onSpeak,
  onStopSpeak,
  onRetry,
  onOpenImage,
}: {
  message: Doc<"messages">;
  isSpeaking: boolean;
  onSpeak: (text: string) => void;
  onStopSpeak: () => void;
  onRetry: (messageId: Id<"messages">) => void;
  onOpenImage: (src: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";
  const hasError = message.status === "error";
  const { cleanText, edits } = extractScriptEdits(message.text);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cleanText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard indisponível
    }
  };

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-1">
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {message.attachments.map((attachment) => (
              <AttachmentView
                key={attachment.storageId}
                attachment={attachment}
                onOpenImage={onOpenImage}
              />
            ))}
          </div>
        )}
        {message.text.trim() && (
          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap text-primary-foreground sm:max-w-[75%]">
            {message.text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-card">
        <img src={logo} alt="Kira" className="size-6 rounded-full" />
      </div>
      <div className="min-w-0 flex-1">
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <AttachmentView
                key={attachment.storageId}
                attachment={attachment}
                onOpenImage={onOpenImage}
              />
            ))}
          </div>
        )}

        {isStreaming && !cleanText.trim() ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary" />
            </span>
            A Kira está pensando…
          </div>
        ) : (
          <Markdown text={cleanText} className="text-foreground" />
        )}

        {hasError && (
          <div className="mt-2 flex flex-col gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
            <div className="flex items-start gap-2 text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{message.error ?? "Algo deu errado ao gerar a resposta."}</span>
            </div>
            <button
              type="button"
              onClick={() => onRetry(message._id)}
              className="flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-destructive/40 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/15"
            >
              <RotateCcw className="size-3.5" />
              Tentar novamente
            </button>
          </div>
        )}

        {!isStreaming && !hasError && cleanText.trim() && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={copy}
              className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Copiar resposta"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
            <button
              type="button"
              onClick={() => (isSpeaking ? onStopSpeak() : onSpeak(cleanText))}
              className={cn(
                "flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-accent",
                isSpeaking
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title={isSpeaking ? "Parar áudio" : "Ouvir resposta"}
            >
              {isSpeaking ? (
                <VolumeX className="size-3.5" />
              ) : (
                <Volume2 className="size-3.5" />
              )}
              {isSpeaking ? "Parar" : "Ouvir"}
            </button>
            {edits.length > 0 && (
              <span className="rounded-md bg-accent px-1.5 py-1 text-[11px] text-accent-foreground">
                🛠️ Kira atualizou o próprio script
              </span>
            )}
          </div>
        )}

        {isStreaming && cleanText.trim() && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            gerando…
          </div>
        )}
      </div>
    </div>
  );
}
