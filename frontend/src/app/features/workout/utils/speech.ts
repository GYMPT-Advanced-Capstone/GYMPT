interface SpeakKoreanOptions {
  cancel?: boolean;
  onEnd?: () => void;
}

let selectedKoreanVoice: SpeechSynthesisVoice | null = null;

export function canUseSpeechSynthesis() {
  return (
    typeof window !== "undefined"
    && "speechSynthesis" in window
    && "SpeechSynthesisUtterance" in window
  );
}

function resolveKoreanVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = synth.getVoices();
  if (
    selectedKoreanVoice
    && voices.some((voice) => voice.voiceURI === selectedKoreanVoice?.voiceURI)
  ) {
    return selectedKoreanVoice;
  }

  selectedKoreanVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith("ko")) ?? null;
  return selectedKoreanVoice;
}

export function cancelSpeech() {
  if (canUseSpeechSynthesis()) {
    window.speechSynthesis.cancel();
  }
}

export function speakKorean(message: string, options: SpeakKoreanOptions = {}) {
  const { cancel = false, onEnd } = options;
  if (!canUseSpeechSynthesis()) {
    onEnd?.();
    return;
  }

  const synth = window.speechSynthesis;
  if (cancel) {
    synth.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(message);
  const voice = resolveKoreanVoice(synth);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "ko-KR";
  }
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  synth.speak(utterance);
}
