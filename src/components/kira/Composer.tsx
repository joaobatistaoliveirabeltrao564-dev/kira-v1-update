import { useEffect, useRef, useState } from "react";
import {
  MAX_ATTACHMENTS,
  compressImage,
  formatBytes,
  isImageFile,
  validateAttachment,
  type PendingAttachment,
} from "@/lib/media";
import { useDictation } from "@/hooks/use-voice";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowUp,
  Camera,
  Loader2,
  Mic,
  Paperclip,
  Send,
  Square,
  X,
} from "lucide-react";

export function Composer({
  onSend,
  onStop,
  isBusy,
  disabled,
  toolLabel,
}: {
  onSend: (text: string, attachments: PendingAttachment[]) => Promise<void>;
  onStop: () => void;
  /** Streaming ou upload em andamento. */
  isBusy: boolean;
  disabled: boolean;
  toolLabel: string;
}) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const dictation = useDictation({
    onFinal: (finalText) => {
      setText((current) => (current ? `${current} ${finalText}` : finalText));
      textareaRef.current?.focus();
    },
    onInterim: () => {
      // pré-visualização do interim fica por conta do campo; mantemos simples
    },
  });

  // Autogrow do textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  useEffect(() => {
    if (dictation.error) {
      toast.error(dictation.error);
      dictation.clearError();
    }
  }, [dictation]);

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: PendingAttachment[] = [];
    for (const file of Array.from(files)) {
      if (attachments.length + next.length >= MAX_ATTACHMENTS) {
        toast.info(`Máximo de ${MAX_ATTACHMENTS} anexos por mensagem.`);
        break;
      }
      const problem = validateAttachment(file);
      if (problem) {
        toast.error(problem);
        continue;
      }
      let compressed: Blob | undefined;
      if (isImageFile(file)) {
        try {
          compressed = await compressImage(file);
        } catch {
          toast.error(`Não consegui processar a imagem "${file.name}".`);
          continue;
        }
      }
      next.push({
        file,
        kind: isImageFile(file) ? "image" : "video",
        name: file.name,
        mimeType: isImageFile(file) ? "image/jpeg" : file.type,
        previewUrl: URL.createObjectURL(file),
        compressed,
      });
    }
    if (next.length) setAttachments((current) => [...current, ...next]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((current) => {
      const target = current[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((_, i) => i !== index);
    });
  };

  const submit = async () => {
    if (isBusy || isSending || disabled) return;
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    setIsSending(true);
    dictation.stop();
    try {
      await onSend(trimmed, attachments);
      attachments.forEach((attachment) =>
        URL.revokeObjectURL(attachment.previewUrl),
      );
      setAttachments([]);
      setText("");
    } catch {
      // O erro já foi avisado (toast); mantemos texto e anexos para tentar de novo.
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="border-t border-border/60 bg-background/95 px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        {attachments.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {attachments.map((attachment, index) => (
              <div
                key={`${attachment.name}-${index}`}
                className="relative flex shrink-0 items-center gap-2 rounded-xl border border-border/70 bg-card py-1.5 pr-7 pl-1.5"
              >
                {attachment.kind === "image" ? (
                  <img
                    src={attachment.previewUrl}
                    alt={attachment.name}
                    className="size-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-lg">
                    🎬
                  </div>
                )}
                <div className="max-w-40">
                  <p className="truncate text-xs font-medium">
                    {attachment.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatBytes(attachment.file.size)}
                    {attachment.kind === "image" ? " · será analisada pela Kira" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="absolute top-1 right-1 cursor-pointer rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Remover anexo"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5 rounded-2xl border border-border/70 bg-card px-2 py-1.5 transition-colors focus-within:border-primary/60">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={(event) => {
              void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(event) => {
              void addFiles(event.target.files);
              event.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="mb-0.5 cursor-pointer rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            title="Anexar imagem ou vídeo"
          >
            <Paperclip className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled}
            className="mb-0.5 hidden cursor-pointer rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 sm:block"
            title="Tirar uma foto com a câmera"
          >
            <Camera className="size-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void submit();
              }
            }}
            rows={1}
            disabled={disabled}
            placeholder={`Fala comigo… (${toolLabel})`}
            className="kira-scroll max-h-40 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />

          {dictation.supported ? (
            <button
              type="button"
              onClick={() =>
                dictation.listening ? dictation.stop() : dictation.start()
              }
              disabled={disabled}
              className={cn(
                "mb-0.5 cursor-pointer rounded-full p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                dictation.listening
                  ? "animate-pulse bg-destructive/15 text-destructive"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              title={
                dictation.listening ? "Parar de ouvir" : "Falar em vez de digitar"
              }
            >
              <Mic className="size-5" />
            </button>
          ) : null}

          {isBusy ? (
            <button
              type="button"
              onClick={onStop}
              className="mb-0.5 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-destructive text-white transition-transform hover:scale-105"
              title="Interromper a resposta"
            >
              <Square className="size-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void submit()}
              disabled={
                disabled || isSending || (!text.trim() && attachments.length === 0)
              }
              className="mb-0.5 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              title="Enviar mensagem"
            >
              {isSending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : text.trim() || attachments.length > 0 ? (
                <ArrowUp className="size-4" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          )}
        </div>

        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          Enter envia · Shift+Enter quebra linha
          {dictation.listening ? " · 🎤 ouvindo você…" : ""}
        </p>
      </div>
    </div>
  );
}
