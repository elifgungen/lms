"use client"

import React, { createContext, useContext, useEffect, useState } from "react";
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
    // Default to "tr" if localStorage is empty
    const [locale, setLocaleState] = useState<Locale>(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("locale") as Locale;
            if (stored && (stored === "en" || stored === "tr")) {
                return stored;
            }
        }
        return "tr";
    });

    useEffect(() => {
        // Sync with localStorage on mount
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("locale") as Locale;
            if (stored && (stored === "en" || stored === "tr")) {
                setLocaleState(stored);
            } else {
                // Ensure default is set in localStorage
                localStorage.setItem("locale", "tr");
            }
        }
    }, []);

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem("locale", newLocale);
    };

    const t = (key: keyof Messages) => {
        return messages[locale][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ locale, setLocale, t }}>
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
