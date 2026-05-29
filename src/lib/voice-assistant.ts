'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Global singleton instance
let voiceSingleton: VoiceAssistant | null = null;

export class VoiceAssistant {
  private recognition: any;
  private synthesis: SpeechSynthesis;
  private isSupported: boolean = false;
  private activeUtterance: SpeechSynthesisUtterance | null = null;

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
       
       // Stop anything playing when instantiated just in case
       this.stopSpeaking();
    } else {
       this.synthesis = {} as SpeechSynthesis;
    }
  }

  public listen(onResult: (text: string) => void, onError: (err: any) => void) {
    if (!this.isSupported) {
       onError("Speech recognition not supported in this browser.");
       return;
    }

    // Stop speaking immediately if we start listening (prevent feedback loop)
    this.stopSpeaking();

    this.recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      onResult(text);
    };

    this.recognition.onerror = (event: any) => onError(event.error);
    this.recognition.start();
  }

  public speak(text: string, lang: string = 'en-US') {
     // STRICT GUARD: Immediately cancel existing speech before starting new one
     this.stopSpeaking();
     
     if (!this.synthesis) return;
     
     // Remove markdown bold/italic tags and code blocks for cleaner speech
     const cleanText = text
         .replace(/```[\s\S]*?```/g, "Code block omitted.") // remove code blocks
         .replace(/[*_~`]/g, "") // remove formatting
         .replace(/\[GENERATE_IMAGE:.*?\]/g, "") // remove image tags
         .replace(/\[REQUEST_PDF\]/g, ""); // remove pdf tags

     if (!cleanText.trim()) return;

     const utterance = new SpeechSynthesisUtterance(cleanText);
     this.activeUtterance = utterance;
     
     // Auto-detect Multilingual Characters
     const hasTelugu = /[\u0c00-\u0c7f]/.test(cleanText);
     const hasHindi = /[\u0900-\u097F]/.test(cleanText);
     const hasJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(cleanText);
     const hasSpanish = /[áéíóúñÁÉÍÓÚÑ]/.test(cleanText);
     
     let speechLang = lang;
     if (hasTelugu) speechLang = 'te-IN';
     else if (hasHindi) speechLang = 'hi-IN';
     else if (hasJapanese) speechLang = 'ja-JP';
     else if (hasSpanish) speechLang = 'es-ES';
     
     // Default voice parameters
     utterance.lang = speechLang;
     utterance.pitch = 1.0; 
     utterance.rate = 1.0;
     utterance.volume = 1.0;

     // Try to find a language-specific or primary voice
     const voices = this.synthesis.getVoices();
     const preferredVoice = voices.find(v => v.lang.toLowerCase() === speechLang.toLowerCase())
                        || voices.find(v => v.lang.startsWith(speechLang.split('-')[0]))
                        || voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha') || v.name.includes('Male')) 
                        || voices[0];
     
     if (preferredVoice) utterance.voice = preferredVoice;
     
     // Memory cleanup when done
     utterance.onend = () => {
         this.activeUtterance = null;
     };

     // Speak
     this.synthesis.speak(utterance);
  }

  public stopSpeaking() {
     if (this.synthesis) {
        this.synthesis.cancel();
     }
     if (this.activeUtterance) {
         this.activeUtterance = null;
     }
  }
}

// Ensure Singleton across the app to prevent overlapping instantiations
export const getVoiceAssistant = () => {
   if (!voiceSingleton) {
       voiceSingleton = new VoiceAssistant();
   }
   return voiceSingleton;
};
