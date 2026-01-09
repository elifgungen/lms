import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { I18nextProvider } from 'react-i18next';

import i18n, { supportedLanguages } from '@/i18n/config';

type LocalizationContextValue = {
  language: string;
  setLanguage: (code: string) => void;
  languages: typeof supportedLanguages;
};

const LocalizationContext = createContext<LocalizationContextValue | undefined>(undefined);

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState(i18n.language);

  const setLanguage = useCallback((code: string) => {
    i18n.changeLanguage(code);
    setLanguageState(code);
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      languages: supportedLanguages,
    }),
    [language, setLanguage],
  );

  return (
    <LocalizationContext.Provider value={value}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const ctx = useContext(LocalizationContext);
  if (!ctx) throw new Error('useLocalization must be used within LocalizationProvider');
  return ctx;
}
