import { useCallback, useEffect, useRef, useState } from 'react';

/* ==========================================================================
   SPEECH INPUT

   Ask by voice, through the browser's own speech recognition. Nothing is
   loaded for it and no key is involved; where the API does not exist the
   control is simply not rendered, rather than offered and then refused.

   Two lessons carried over from Ultra News, which shipped the same feature
   and found both the hard way:

     · The site's Permissions-Policy header must allow the microphone for
       our own origin. `microphone=()` disables it for first-party pages too,
       and recognition then fails instantly with "not-allowed" — which looks
       exactly like the visitor refusing the prompt. vercel.json now says
       `microphone=(self)`.
     · Recognition errors are explained, not swallowed. "not-allowed",
       "no-speech" and "audio-capture" mean three different things to do.
   ========================================================================== */

interface RecognitionResultList {
  length: number;
  [index: number]: { isFinal: boolean; 0: { transcript: string } };
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { resultIndex: number; results: RecognitionResultList }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERROR_TEXT: Record<string, string> = {
  'not-allowed': 'microphone blocked — allow it for this site in the browser, or type instead.',
  'service-not-allowed': 'voice input is switched off in this browser — type instead.',
  'audio-capture': 'no microphone found.',
  'no-speech': "didn't catch that — try again, a little closer.",
  network: 'voice input needs a connection in this browser.',
};

export interface SpeechInput {
  supported: boolean;
  listening: boolean;
  error: string | null;
  start: () => void;
  stop: () => void;
}

/**
 * @param onText   called with the running transcript as words are recognised
 * @param onFinal  called once with the final transcript when speech ends
 */
export function useSpeechInput(onText: (text: string) => void, onFinal: (text: string) => void): SpeechInput {
  const [supported] = useState(() => recognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);

  // Held in refs so a recognition session that outlives a render still calls
  // the newest handlers rather than the ones captured when it started.
  const onTextRef = useRef(onText);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onTextRef.current = onText;
    onFinalRef.current = onFinal;
  }, [onText, onFinal]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor || recognitionRef.current) return;

    const recognition = new Ctor();
    recognition.lang = navigator.language || 'en-GB';
    recognition.interimResults = true;
    recognition.continuous = false;

    let finalText = '';
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      onTextRef.current((finalText + interim).trim());
    };
    recognition.onerror = (event) => {
      // "aborted" is us calling abort(); not worth a sentence.
      if (event.error !== 'aborted') setError(ERROR_TEXT[event.error] ?? `voice input failed (${event.error}).`);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      const text = finalText.trim();
      if (text) onFinalRef.current(text);
    };

    setError(null);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setError('voice input could not start.');
    }
  }, []);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { supported, listening, error, start, stop };
}
