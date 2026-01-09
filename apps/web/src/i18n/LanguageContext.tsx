"use client"

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import en from "./messages/en.json";
import tr from "./messages/tr.json";

type Locale = "en" | "tr";
type Messages = typeof en;

const messages: Record<Locale, Messages> = {
    en,
    tr,
};

interface LanguageContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: keyof Messages) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const getInitialLocale = (): Locale => {
        if (typeof window === "undefined") return "tr";
        const stored = localStorage.getItem("locale") as Locale | null;
        if (stored === "en" || stored === "tr") return stored;
        return "tr";
    };

    const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

    useEffect(() => {
        if (typeof window === "undefined") return;
        localStorage.setItem("locale", locale);
        document.documentElement.lang = locale;
    }, [locale]);

    useEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            if (event.key === "locale" && (event.newValue === "en" || event.newValue === "tr")) {
                setLocaleState(event.newValue);
            }
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale);
    };

    const value = useMemo(
        () => ({
            locale,
            setLocale,
            t: (key: keyof Messages) => messages[locale][key] || key,
        }),
        [locale],
    );

    return (
        <LanguageContext.Provider key={locale} value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useTranslation must be used within a LanguageProvider");
    }
    return context;
}
