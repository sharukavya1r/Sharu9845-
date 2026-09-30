/**
 * Natural language cleaner for grocery voice search in English and Kannada.
 * Strips common conversational filler phrases like "search for", "i want", "buy", "order", "ದಯವಿಟ್ಟು", "ನನಗೆ ... ಬೇಕು".
 */
export function cleanVoiceQuery(transcript: string): string {
  if (!transcript) return '';

  let text = transcript.trim();

  // Remove common punctuation at ends
  text = text.replace(/^[.,?!'"\s]+|[.,?!'"\s]+$/g, '');

  // English command prefixes
  const englishPrefixes = [
    /^(please\s+)?(search\s+for|search|find\s+me|find|look\s+for|show\s+me|get\s+me|give\s+me|buy\s+me|buy|order\s+me|order|i\s+want\s+to\s+buy|i\s+want|i\s+need|can\s+you\s+find|can\s+you\s+show|add\s+to\s+basket|add\s+to\s+cart)\s+/i,
    /^(quickbasket|quick\s+basket)\s+/i,
    /^(deliver\s+to\s+lakkavalli|in\s+lakkavalli)\s+/i,
  ];

  for (const regex of englishPrefixes) {
    text = text.replace(regex, '');
  }

  // Kannada conversational prefixes and suffixes
  text = text.replace(/^(ದಯವಿಟ್ಟು|ನನಗೆ|ಸ್ವಲ್ಪ|ಕ್ವಿಕ್‌ಬಾಸ್ಕೆಟ್)\s+/gi, '');
  text = text.replace(/\s+(ಬೇಕು|ಕೊಡಿ|ಹುಡುಕಿ|ಹುಡುಕು|ತೋರಿಸಿ|ತರಿಸಿ|ಆರ್ಡರ್\s+ಮಾಡಿ)$/gi, '');

  // Clean remaining punctuation
  text = text.replace(/^[.,?!'"\s]+|[.,?!'"\s]+$/g, '').trim();

  return text || transcript.trim();
}

/**
 * Checks if Web Speech API (SpeechRecognition or webkitSpeechRecognition) is supported
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
      .SpeechRecognition ||
    (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
      .webkitSpeechRecognition
  );
}
