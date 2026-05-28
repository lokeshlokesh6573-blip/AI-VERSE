'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

export class VoiceAssistant {
  private recognition: any;
  private synthesis: SpeechSynthesis;
  private isSupported: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
       const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
       if (SpeechRecognition) {
          this.recognition = new SpeechRecognition();
          this.recognition.continuous = false;
          this.recognition.interimResults = false;
          this.isSupported = true;
       }
       this.synthesis = window.speechSynthesis;
    } else {
       this.synthesis = {} as SpeechSynthesis;
    }
  }

  public listen(onResult: (text: string) => void, onError: (err: any) => void) {
    if (!this.isSupported) {
       onError("Speech recognition not supported in this browser.");
       return;
    }

    this.recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      onResult(text);
    };

    this.recognition.onerror = (event: any) => onError(event.error);
    this.recognition.start();
  }

  public speak(text: string, lang: string = 'en-US') {
     this.synthesis.cancel(); // Stop current speech
     const utterance = new SpeechSynthesisUtterance(text);
     
     // Auto-detect Telugu characters (Unicode range \u0c00-\u0c7f)
     const hasTelugu = /[\u0c00-\u0c7f]/.test(text);
     const speechLang = hasTelugu ? 'te-IN' : lang;
     
     // Peter Parker style voice parameters
     utterance.lang = speechLang;
     utterance.pitch = 1.05; // Slightly higher/younger
     utterance.rate = 0.95;
     utterance.volume = 1.0;

     // Try to find a language-specific voice
     const voices = this.synthesis.getVoices();
     const preferredVoice = voices.find(v => v.lang.toLowerCase() === speechLang.toLowerCase())
                        || voices.find(v => v.lang.startsWith(speechLang.split('-')[0]))
                        || voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha')) 
                        || voices[0];
     
     if (preferredVoice) utterance.voice = preferredVoice;
     
     this.synthesis.speak(utterance);
  }

  public stopSpeaking() {
     this.synthesis.cancel();
  }
}

export const useVoice = () => {
   return new VoiceAssistant();
};
