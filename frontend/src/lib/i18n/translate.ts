// Implements a similar API to next-translate but works with app directory

import compilersTranslations from "./locales/en/compilers.json";
import librariesTranslations from "./locales/en/libraries.json";
import decompilersTranslations from "./locales/en/decompilers.json";

const translationsBySection = {
    compilers: compilersTranslations,
    libraries: librariesTranslations,
    decompilers: decompilersTranslations,
};

export type Section = keyof typeof translationsBySection;

export default function getTranslation(...sections: Section[]) {
    // Merge translations from all sections
    const translations = Object.assign(
        {},
        ...sections.map((section) => translationsBySection[section])
    );
    return {
        t(key: string): string {
            if (key in translations) {
                return translations[key as keyof typeof translations];
            }

            console.warn(`Missing translation for key: ${key}`);
            return key;
        },

        tWithDefault<T>(key: string, defaultValue: T): string | T {
            return (
                translations[key as keyof typeof translations] ?? defaultValue
            );
        },
    };
}
