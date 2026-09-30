import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Sparkles, Mic, MicOff, AlertCircle } from 'lucide-react';
import { Product } from '../types';
import { useLanguage } from '../i18n';
import { cleanVoiceQuery, isSpeechRecognitionSupported } from '../utils/voiceSearchUtils';
import { vibrateFeedback, vibrateSuccess } from '../utils/haptics';

interface SearchBarProps {
  query?: string;
  onQueryChange?: (query: string) => void;
  // Support both prop naming conventions gracefully
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
  products?: Product[];
  onSelectProduct?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  cartItemCounts?: Record<string, number>;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onQueryChange,
  searchQuery,
  onSearchChange,
  products = [],
  onSelectProduct,
  onAddToCart,
  cartItemCounts = {},
}) => {
  const { t, localizeCategoryName, currentLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Safely resolve active query string
  const activeQuery = (query ?? searchQuery ?? '') || '';

  const handleTextChange = useCallback((val: string) => {
    if (onQueryChange) onQueryChange(val);
    if (onSearchChange) onSearchChange(val);
  }, [onQueryChange, onSearchChange]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, []);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Web Speech API Voice Search Handler
  const handleToggleVoiceSearch = () => {
    vibrateFeedback();
    setVoiceError(null);

    // If already listening, stop
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      setInterimTranscript('');
      return;
    }

    // Check browser support
    if (!isSpeechRecognitionSupported()) {
      setVoiceError(t('search.voiceNotSupported'));
      setTimeout(() => setVoiceError(null), 4000);
      return;
    }

    try {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;

      // Configure speech recognition based on current language
      recognition.lang = currentLanguage === 'kn' ? 'kn-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
        setVoiceError(null);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptSegment = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptSegment;
          } else {
            interim += transcriptSegment;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (finalTranscript) {
          vibrateSuccess();
          const cleaned = cleanVoiceQuery(finalTranscript);
          handleTextChange(cleaned);
          setInterimTranscript('');
          setIsOpen(true);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setInterimTranscript('');

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceError(t('search.voicePermissionDenied'));
        } else if (event.error === 'no-speech') {
          setVoiceError(t('search.voiceNoSpeech'));
        } else if (event.error !== 'aborted') {
          setVoiceError(`Voice recognition error: ${event.error}`);
        }

        setTimeout(() => setVoiceError(null), 4500);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      setVoiceError(t('search.voiceNotSupported'));
      setTimeout(() => setVoiceError(null), 4000);
    }
  };

  const trimmedQuery = activeQuery.trim().toLowerCase();
  const safeProducts = Array.isArray(products) ? products.filter(Boolean) : [];
  const filtered = trimmedQuery === ''
    ? []
    : safeProducts.filter(
        (p) =>
          (p && p.name && p.name.toLowerCase().includes(trimmedQuery)) ||
          (p && p.category && p.category.toLowerCase().includes(trimmedQuery)) ||
          (p && p.brand && p.brand.toLowerCase().includes(trimmedQuery))
      );

  return (
    <div ref={searchRef} className="px-4 py-2 bg-white relative z-20">
      <div className="relative max-w-xl mx-auto">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-emerald-700 pointer-events-none stroke-[2.5]" />
          <input
            id="home-search-input"
            type="text"
            value={activeQuery}
            onChange={(e) => {
              handleTextChange(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={isListening ? (t('search.listening') || 'Listening... Speak now') : t('search.placeholder')}
            className={`w-full bg-[#f3f7f4] text-gray-800 text-xs sm:text-sm pl-10 pr-20 py-2.5 rounded-xl border transition-all placeholder:text-gray-400 font-medium ${
              isListening
                ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-300 animate-pulse'
                : 'border-emerald-100/80 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200/50'
            }`}
          />

          {/* Right Action Icons (Clear + Voice Search Mic) */}
          <div className="absolute right-2.5 flex items-center gap-1">
            {activeQuery.length > 0 && (
              <button
                id="clear-search-btn"
                onClick={() => {
                  handleTextChange('');
                  setIsOpen(false);
                }}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label={t('search.clearSearch')}
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Voice Search Button with Web Speech API */}
            <button
              id="voice-search-btn"
              type="button"
              onClick={handleToggleVoiceSearch}
              className={`p-1.5 rounded-xl transition-all flex items-center justify-center cursor-pointer relative ${
                isListening
                  ? 'bg-red-500 text-white shadow-md ring-2 ring-red-300 scale-110'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-[#064e3b] border border-emerald-200/70 hover:scale-105 active:scale-95'
              }`}
              title={isListening ? t('search.tapToStop') : t('search.voiceSearch')}
              aria-label={isListening ? t('search.tapToStop') : t('search.voiceSearch')}
            >
              {isListening ? (
                <>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
                  <Mic className="w-4 h-4 stroke-[2.5]" />
                </>
              ) : (
                <Mic className="w-4 h-4 stroke-[2.2]" />
              )}
            </button>
          </div>
        </div>

        {/* Live Voice-to-Text Listening Banner */}
        {isListening && (
          <div className="mt-2 p-2.5 bg-gradient-to-r from-emerald-900 to-[#064e3b] text-white rounded-2xl shadow-lg border border-emerald-700 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/90 text-white text-[10px] font-black shrink-0">
                <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
                <span>REC</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black truncate text-white">
                  {interimTranscript ? `“${interimTranscript}”` : t('search.listeningInLakkavalli')}
                </p>
                <p className="text-[10px] text-emerald-200 truncate">
                  {t('search.voiceSearchPrompt')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleVoiceSearch}
              className="px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[11px] font-extrabold shrink-0 cursor-pointer transition-colors active:scale-95"
            >
              {t('common.cancel')}
            </button>
          </div>
        )}

        {/* Voice Search Error Alert */}
        {voiceError && (
          <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-medium text-[11px] leading-tight">{voiceError}</span>
            </div>
            <button
              onClick={() => setVoiceError(null)}
              className="text-amber-700 hover:text-amber-950 text-xs font-bold p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Live Search Suggestion Popup */}
        {isOpen && trimmedQuery.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-80 overflow-y-auto z-40 animate-in fade-in slide-in-from-top-1 duration-150">
            {filtered.length > 0 ? (
              <div className="p-2 divide-y divide-gray-50">
                <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{t('search.foundProducts', { count: filtered.length })}</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {t('search.tenMinDeliveryBadge')}
                  </span>
                </div>
                {filtered.map((product) => {
                  const qty = cartItemCounts[product.id] || 0;
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-2 hover:bg-emerald-50/50 rounded-xl transition-colors cursor-pointer group"
                      onClick={() => {
                        onSelectProduct?.(product);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 object-contain rounded-lg border border-gray-100 shrink-0 bg-white p-0.5"
                        />
                        <div>
                          <div className="font-bold text-sm text-gray-900 group-hover:text-emerald-800 transition-colors">
                            {product.name}
                          </div>
                          <div className="text-[11px] text-gray-500 font-medium">
                            {product.quantity} • {localizeCategoryName(product.category)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="text-right">
                          <span className="font-extrabold text-sm text-emerald-950">₹{product.price}</span>
                          {product.mrp > product.price && (
                            <span className="block text-[10px] text-gray-400 line-through">₹{product.mrp}</span>
                          )}
                        </div>
                        {onAddToCart && (
                          <button
                            onClick={() => onAddToCart(product)}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              qty > 0
                                ? 'bg-emerald-700 text-white'
                                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-200'
                            }`}
                          >
                            {qty > 0 ? `${qty} in cart` : t('common.add')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <p className="text-sm font-medium">{t('search.noProductsFound')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('search.noProductsDesc')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
