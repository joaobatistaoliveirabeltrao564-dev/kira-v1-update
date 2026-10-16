import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import {
  speakText,
  speechSupported,
  stopSpeaking,
  useVoices,
} from "@/hooks/use-voice";
import {
  DEFAULT_SETTINGS,
  PERSONALITIES,
  RESPONSE_LENGTHS,
} from "@/lib/kira";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2,
  Moon,
  Play,
  RotateCcw,
  Save,
  Sun,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PERSONALITY_LABELS: Record<string, string> = {
  amigavel: "Amigável",
  profissional: "Profissional",
  divertida: "Divertida",
  direta: "Direta",
};

const LENGTH_LABELS: Record<string, string> = {
  curta: "Curta",
  media: "Média",
  detalhada: "Detalhada",
};

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  aiStatus,
  onUpdate,
  onSetScript,
  onResetScript,
  onClearHistory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Doc<"settings"> | null | undefined;
  aiStatus: { configured: boolean; provider: string; model: string } | undefined;
  onUpdate: (patch: {
    personality?: string;
    responseLength?: string;
    ttsRate?: number;
    ttsVoice?: string;
    autoSpeak?: boolean;
  }) => Promise<unknown>;
  onSetScript: (script: string) => Promise<unknown>;
  onResetScript: () => Promise<unknown>;
  onClearHistory: () => Promise<unknown>;
}) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const voices = useVoices();
  const serverScript = settings?.script ?? "";
  const [script, setScript] = useState(serverScript);
  const [savingScript, setSavingScript] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Sincroniza o rascunho com o script do servidor quando o diálogo abre ou
  // o servidor envia uma nova versão — ajuste durante o render (padrão
  // "adjusting state when props change"), sem efeito.
  const [prevServerScript, setPrevServerScript] = useState(serverScript);
  if (serverScript !== prevServerScript) {
    setPrevServerScript(serverScript);
    if (open) setScript(serverScript);
  }
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setScript(serverScript);
  }

  const value = <K extends keyof typeof DEFAULT_SETTINGS>(
    key: K,
  ): (typeof DEFAULT_SETTINGS)[K] =>
    (settings?.[key] ?? DEFAULT_SETTINGS[key]) as (typeof DEFAULT_SETTINGS)[K];

  const wrap = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não deu certo. Tenta de novo.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] gap-0 overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="tracking-tight font-bold">
            Configurações da Kira
          </DialogTitle>
          <DialogDescription>
            Personalize minhas respostas, minha voz e o meu script.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-6 pb-2">
          {/* Respostas */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Respostas</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.keys(PERSONALITIES).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => void wrap(() => onUpdate({ personality: key }))}
                  className={cn(
                    "cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                    value("personality") === key
                      ? "border-primary/70 bg-primary/10 text-primary"
                      : "border-border/70 hover:bg-accent",
                  )}
                >
                  {PERSONALITY_LABELS[key] ?? key}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(RESPONSE_LENGTHS).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    void wrap(() => onUpdate({ responseLength: key }))
                  }
                  className={cn(
                    "cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                    value("responseLength") === key
                      ? "border-primary/70 bg-primary/10 text-primary"
                      : "border-border/70 hover:bg-accent",
                  )}
                >
                  {LENGTH_LABELS[key] ?? key}
                </button>
              ))}
            </div>
          </section>

          {/* Voz */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Voz</h3>
            {!speechSupported() ? (
              <p className="text-xs text-muted-foreground">
                A leitura em voz alta não está disponível neste navegador. No
                celular, use o Chrome.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-speak" className="text-sm">
                    Ler minhas respostas em voz alta
                  </Label>
                  <Switch
                    id="auto-speak"
                    checked={value("autoSpeak") as boolean}
                    onCheckedChange={(checked) =>
                      void wrap(async () => {
                        if (!checked) stopSpeaking();
                        await onUpdate({ autoSpeak: checked });
                      })
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="voice-select" className="text-sm">
                    Voz
                  </Label>
                  <select
                    id="voice-select"
                    value={value("ttsVoice") as string | undefined}
                    onChange={(event) =>
                      void wrap(() => onUpdate({ ttsVoice: event.target.value }))
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-ring"
                  >
                    <option value="">Automática (pt-BR)</option>
                    {voices.map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} — {voice.lang}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm">
                      Velocidade da fala:{" "}
                      {(value("ttsRate") as number).toFixed(1)}×
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer gap-1.5"
                      title="Ouvir um exemplo com a voz escolhida (grátis, sem IA)"
                      onClick={() => {
                        stopSpeaking();
                        const ok = speakText(
                          "Oi, eu sou a Kira! É assim que vou falar com você.",
                          {
                            rate: value("ttsRate") as number,
                            voiceName: value("ttsVoice") as string | undefined,
                          },
                        );
                        if (!ok) {
                          toast.error(
                            "A leitura em voz alta não está disponível neste navegador.",
                          );
                        }
                      }}
                    >
                      <Play className="size-3.5" />
                      Testar voz
                    </Button>
                  </div>
                  <Slider
                    value={[value("ttsRate") as number]}
                    min={0.5}
                    max={2}
                    step={0.1}
                    onValueChange={([rate]) =>
                      void wrap(() => onUpdate({ ttsRate: rate }))
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Dica: no chat você pode digitar{" "}
                  <code className="rounded bg-muted px-1 font-mono">/voz</code>{" "}
                  para listar as vozes e{" "}
                  <code className="rounded bg-muted px-1 font-mono">/voz 2</code>{" "}
                  para trocar — tudo pelo celular, sem gastar créditos de IA.
                </p>
              </>
            )}
          </section>

          {/* Aparência */}
          <section className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Aparência</h3>
              <p className="text-xs text-muted-foreground">
                Tema {theme === "dark" ? "escuro" : "claro"} do aplicativo.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer gap-2"
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
              {theme === "dark" ? "Claro" : "Escuro"}
            </Button>
          </section>

          {/* Script */}
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Script da Kira</h3>
            <p className="text-xs leading-5 text-muted-foreground">
              Regras permanentes que eu sigo em todas as conversas. Você pode
              mudá-las por aqui ou me dando ordens no chat (ex.: “a partir de
              agora sempre responda com exemplos”) — ou com{" "}
              <code className="rounded bg-muted px-1 font-mono">/cmd adicionar</code>.
            </p>
            <Textarea
              value={script}
              onChange={(event) => setScript(event.target.value)}
              rows={4}
              placeholder="- Sempre use exemplos do dia a dia\n- Responda com emojis com moderação"
              className="resize-y text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="cursor-pointer gap-1.5"
                disabled={savingScript}
                onClick={() =>
                  void wrap(async () => {
                    setSavingScript(true);
                    try {
                      await onSetScript(script);
                      toast.success("Script atualizado! ✨");
                    } finally {
                      setSavingScript(false);
                    }
                  })
                }
              >
                {savingScript ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Salvar script
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer gap-1.5"
                onClick={() =>
                  void wrap(async () => {
                    await onResetScript();
                    setScript("");
                    toast.success("Script resetado ao padrão.");
                  })
                }
              >
                <RotateCcw className="size-3.5" />
                Restaurar padrão
              </Button>
            </div>
          </section>

          {/* IA */}
          <section className="flex flex-col gap-1 rounded-xl border border-border/70 p-3">
            <h3 className="text-sm font-semibold">Sobre a inteligência</h3>
            {aiStatus === undefined ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> verificando…
              </div>
            ) : (
              <p className="text-xs leading-5 text-muted-foreground">
                Provedor: <strong>{aiStatus.provider}</strong> · Modelo:{" "}
                <code className="rounded bg-muted px-1 font-mono">
                  {aiStatus.model}
                </code>
                .<br />
                {aiStatus.configured
                  ? "Conectada de verdade: cada resposta vem de um modelo de IA real, com o histórico limitado ao necessário para economizar créditos."
                  : "⚠️ Nenhuma chave configurada no servidor — a Kira vai responder com instruções de configuração em vez de IA."}
              </p>
            )}
          </section>

          {/* Dados e conta */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Dados e conta</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer justify-start gap-2 text-destructive"
              disabled={clearing}
              onClick={() =>
                void wrap(async () => {
                  setClearing(true);
                  try {
                    await onClearHistory();
                    toast.success("Histórico apagado.");
                  } finally {
                    setClearing(false);
                  }
                })
              }
            >
              {clearing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Apagar todas as conversas
            </Button>
            <p className="text-xs text-muted-foreground">
              Conta: {user?.email ?? "convidado(a)"}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="cursor-pointer justify-start"
              onClick={() => void signOut()}
            >
              Sair da conta
            </Button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
