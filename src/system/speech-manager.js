export class SpeechManager {
  constructor() {
    this._currentUtterance = null;
  }

  /**
   * Check if Speech Synthesis is supported by the browser
   * @returns {boolean}
   */
  isSupported() {
    return !!window.speechSynthesis;
  }

  /**
   * Get available TTS voices
   * @returns {SpeechSynthesisVoice[]}
   */
  getVoices() {
    if (!this.isSupported()) return [];
    return window.speechSynthesis.getVoices();
  }

  /**
   * Get a default voice based on system availability and preferences
   * @returns {SpeechSynthesisVoice|null}
   */
  getDefaultVoice() {
    const voices = this.getVoices();
    if (voices.length === 0) return null;

    // Filter for English voices
    const englishVoices = voices.filter((v) => v.lang.startsWith("en"));
    if (englishVoices.length === 0) return voices[0];

    // Prioritize male-sounding voices by common name patterns (preferred for Clippy context)
    let defaultVoice = englishVoices.find(
      (v) =>
        v.name.toLowerCase().includes("male") ||
        v.name.toLowerCase().includes("david") ||
        v.name.toLowerCase().includes("alex") ||
        v.name.toLowerCase().includes("fred") ||
        v.name.toLowerCase().includes("daniel") ||
        v.name.toLowerCase().includes("george") ||
        v.name.toLowerCase().includes("paul") ||
        v.name.toLowerCase().includes("tom") ||
        v.name.toLowerCase().includes("mark") ||
        v.name.toLowerCase().includes("james") ||
        v.name.toLowerCase().includes("michael"),
    );

    if (defaultVoice) return defaultVoice;

    // If no specifically "male" voice found, prefer voices that are NOT obviously female
    const femaleNames = [
      "zira",
      "hazel",
      "samantha",
      "susan",
      "karen",
      "sara",
      "emma",
      "lucy",
      "anna",
    ];
    const nonFemaleVoices = englishVoices.filter(
      (v) =>
        !femaleNames.some((name) => v.name.toLowerCase().includes(name)) &&
        !v.name.toLowerCase().includes("female"),
    );

    if (nonFemaleVoices.length > 0) {
      return nonFemaleVoices[0];
    }

    // Ultimate fallback to first available English voice
    return englishVoices[0];
  }

  /**
   * Speak text using Web Speech API
   * @param {string} text - The text to speak
   * @param {Object} options - Speech options
   * @param {SpeechSynthesisVoice} [options.voice] - Voice to use
   * @param {number} [options.rate=1.0] - Speech rate (0.1 to 10)
   * @param {number} [options.pitch=1.0] - Speech pitch (0 to 2)
   * @param {number} [options.volume=1.0] - Speech volume (0 to 1)
   * @param {Function} [options.onBoundary] - Fired on word/sentence boundaries
   * @param {Function} [options.onEnd] - Fired when speech completes
   * @returns {SpeechSynthesisUtterance|void}
   */
  speak(text, options = {}) {
    if (!this.isSupported() || !text) {
      if (options.onEnd) options.onEnd();
      return;
    }

    // Stop any current speech
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;
    utterance.volume = options.volume ?? 1.0;

    if (options.voice) {
      utterance.voice = options.voice;
    }

    // Set up events
    utterance.onboundary = (event) => {
      if (options.onBoundary) options.onBoundary(event);
    };

    utterance.onend = () => {
      this._currentUtterance = null;
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = (event) => {
      // Don't warn if it was an intentional cancellation
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        console.warn("SpeechManager TTS Error:", event.error);
      }
      this._currentUtterance = null;
      if (options.onEnd) options.onEnd();
    };

    this._currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    return utterance;
  }

  /**
   * Stop all current speech synthesis
   */
  stop() {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
      this._currentUtterance = null;
    }
  }
}
