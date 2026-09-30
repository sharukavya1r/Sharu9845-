import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { en } from './en';
import { kn } from './kn';

export type Language = 'en' | 'kn';

export type TranslationDictionary = typeof en;

const STORAGE_KEY = 'quickbasket_app_language';

const translations: Record<Language, TranslationDictionary> = {
  en,
  kn,
};

export interface LanguageContextValue {
  currentLanguage: Language;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  localizeCategoryName: (name: string) => string;
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

// Category mapping helper
const CATEGORY_MAP: Record<string, { en: string; kn: string }> = {
  all: { en: 'All', kn: 'ಎಲ್ಲಾ' },
  vegetables: { en: 'Vegetables', kn: 'ತರಕಾರಿಗಳು' },
  fruits: { en: 'Fruits', kn: 'ಹಣ್ಣುಗಳು' },
  'milk & dairy': { en: 'Milk & Dairy', kn: 'ಹಾಲು ಮತ್ತು ಡೈರಿ' },
  'milk-dairy': { en: 'Milk & Dairy', kn: 'ಹಾಲು ಮತ್ತು ಡೈರಿ' },
  'rice & grains': { en: 'Rice & Grains', kn: 'ಅಕ್ಕಿ ಮತ್ತು ಧಾನ್ಯಗಳು' },
  'rice-grains': { en: 'Rice & Grains', kn: 'ಅಕ್ಕಿ ಮತ್ತು ಧಾನ್ಯಗಳು' },
  'atta & flour': { en: 'Atta & Flour', kn: 'ಹಿಟ್ಟುಗಳು' },
  'atta-flour': { en: 'Atta & Flour', kn: 'ಹಿಟ್ಟುಗಳು' },
  oils: { en: 'Oils', kn: 'ಅಡುಗೆ ಎಣ್ಣೆಗಳು' },
  snacks: { en: 'Snacks', kn: 'ತಿಂಡಿಗಳು' },
  beverages: { en: 'Beverages', kn: 'ಪಾನೀಯಗಳು' },
  'personal care': { en: 'Personal Care', kn: 'ವೈಯಕ್ತಿಕ ಆರೈಕೆ' },
  'personal-care': { en: 'Personal Care', kn: 'ವೈಯಕ್ತಿಕ ಆರೈಕೆ' },
  household: { en: 'Household', kn: 'ಮನೆಬಳಕೆ ಸಾಮಗ್ರಿಗಳು' },
  'baby care': { en: 'Baby Care', kn: 'ಮಕ್ಕಳ ಆರೈಕೆ' },
  'baby-care': { en: 'Baby Care', kn: 'ಮಕ್ಕಳ ಆರೈಕೆ' },
  spices: { en: 'Spices', kn: 'ಮಸಾಲೆಗಳು' },
  'meat & eggs': { en: 'Meat & Eggs', kn: 'ಮಾಂಸ ಮತ್ತು ಮೊಟ್ಟೆ' },
  'meat-eggs': { en: 'Meat & Eggs', kn: 'ಮಾಂಸ ಮತ್ತು ಮೊಟ್ಟೆ' },
  more: { en: 'More', kn: 'ಇನ್ನಷ್ಟು' },
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'kn' || saved === 'en') {
        return saved;
      }
    } catch {
      // Ignore localStorage read errors in restricted contexts
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    if (lang !== 'en' && lang !== 'kn') return;
    setCurrentLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore localStorage write errors
    }
  };

  const t = (path: string, params?: Record<string, string | number>): string => {
    const keys = path.split('.');
    
    // 1. Try current language
    let currentDict: any = translations[currentLanguage];
    let foundValue: any = currentDict;
    for (const key of keys) {
      if (foundValue && typeof foundValue === 'object' && key in foundValue) {
        foundValue = foundValue[key];
      } else {
        foundValue = undefined;
        break;
      }
    }

    // 2. Fallback to English if not found
    if (typeof foundValue !== 'string') {
      let fallbackDict: any = translations.en;
      foundValue = fallbackDict;
      for (const key of keys) {
        if (foundValue && typeof foundValue === 'object' && key in foundValue) {
          foundValue = foundValue[key];
        } else {
          foundValue = undefined;
          break;
        }
      }
    }

    if (typeof foundValue !== 'string') {
      return path;
    }

    // 3. Interpolate params: e.g. {count}, {amount}, {seconds}
    if (params) {
      return foundValue.replace(/\{(\w+)\}/g, (_, key) => {
        return params[key] !== undefined ? String(params[key]) : `{${key}}`;
      });
    }

    return foundValue;
  };

  const localizeCategoryName = (name: string): string => {
    if (!name) return name;
    if (currentLanguage === 'en') return name;

    const lower = name.trim().toLowerCase();
    const entry = CATEGORY_MAP[lower];
    if (entry) {
      return entry.kn;
    }
    return name;
  };

  const value = useMemo(
    () => ({
      currentLanguage,
      language: currentLanguage,
      setLanguage,
      t,
      localizeCategoryName,
    }),
    [currentLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export { en, kn };
