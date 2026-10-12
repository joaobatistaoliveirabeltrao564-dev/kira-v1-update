import { useCallback, useEffect, useRef, useState } from "react";

/** Remove Markdown/símbolos para que a fala soe natural. */
export function stripForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ", omiti um bloco de código, ")
    .replace(/[*_#>`~]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export interface SpeakOptions {
  rate?: number;
  voiceName?: string;
  onEnd?: () => void;
  onError?: () => void;
}

/** Lê um texto em voz alta (síntese de fala do navegador). */
export function speakText(text: string, opts: SpeakOptions = {}): boolean {
  if (!speechSupported()) return false;
  const clean = stripForSpeech(text);
  if (!clean) return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "pt-BR";
    utterance.rate = Math.min(2, Math.max(0.5, opts.rate ?? 1));
    const voices = window.speechSynthesis.getVoices();
    const chosen =
      (opts.voiceName && voices.find((v) => v.name === opts.voiceName)) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("pt")) ||
      voices[0];
    if (chosen) utterance.voice = chosen;
    utterance.onend = () => opts.onEnd?.();
    utterance.onerror = () => opts.onError?.();
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    opts.onError?.();
    return false;
  }
}

export function stopSpeaking() {
  if (speechSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignora
    }
  }
}

/** Lista as vozes disponíveis do dispositivo (carrega de forma assíncrona). */
export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!speechSupported()) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () =>
      window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, []);
  return voices;
}

export interface DictationOptions {
  onFinal: (text: string) => void;
  onInterim?: (text: string) => void;
}

/** Ditado por voz (fala → texto) com tratamento de permissões. */
export function useDictation({ onFinal, onInterim }: DictationOptions) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const supported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      // já parado
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!supported) {
      setError(
        "Reconhecimento de voz não está disponível neste navegador. Tente o Chrome ou Edge.",
      );
      return;
    }
    try {
      stopSpeaking(); // não ouvir a Kira enquanto ela escuta
      const SR =
        window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
      if (!SR) return;
      const rec = new SR();
      rec.lang = "pt-BR";
      rec.continuous = false;
      rec.interimResults = true;
      rec.onresult = (event) => {
        let interim = "";
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) finalText += result[0].transcript;
          else interim += result[0].transcript;
        }
        if (interim) onInterim?.(interim.trim());
        if (finalText.trim()) onFinal(finalText.trim());
      };
      rec.onerror = (event) => {
        const code = event.error;
        setError(
          code === "not-allowed" || code === "service-not-allowed"
            ? "Permissão de microfone negada. Libere o microfone nas configurações do navegador."
            : code === "no-speech"
              ? "Não ouvi nada. Tente falar de novo."
              : "Não foi possível reconhecer sua voz. Tente novamente.",
        );
        setListening(false);
      };
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
      setListening(true);
      setError(null);
    } catch {
      setError("Falha ao iniciar o reconhecimento de voz.");
      setListening(false);
    }
  }, [supported, onFinal, onInterim]);

  useEffect(
    () => () => {
      try {
        recRef.current?.abort();
      } catch {
        // ignora
      }
    },
    [],
  );

  return {
    supported,
    listening,
    start,
    stop,
    error,
    clearError: () => setError(null),
  };
}
