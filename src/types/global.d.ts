declare global {
  interface Window {
    /**
     * Navigate to the auth page with a custom redirect URL
     * @param redirectUrl - URL to redirect to after successful authentication
     */
    navigateToAuth: (redirectUrl: string) => void;
  }

  // Reconhecimento de voz (Web Speech API) — nem todos os navegadores expõem
  // tipos oficiais, então declaramos a superfície mínima que usamos.
  interface SpeechRecognitionAlternativeLike {
    transcript: string;
  }

  interface SpeechRecognitionResultLike {
    isFinal: boolean;
    0: SpeechRecognitionAlternativeLike;
  }

  interface SpeechRecognitionEventLike {
    resultIndex: number;
    results: {
      length: number;
      [index: number]: SpeechRecognitionResultLike;
    };
  }

  interface SpeechRecognitionLike {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: { error?: string }) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }

  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export {};
