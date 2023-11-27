// Implements a similar API to next-translate but works with app directory

import compilersTranslations from "./locales/en/compilers.json"
import librariesTranslations from "./locales/en/libraries.json"

const translationsBySection = {
    "compilers": compilersTranslations,
    "libraries": librariesTranslations,
}

export type Section = keyof typeof translationsBySection

export default function useTranslation(section: Section) {
    const translations = translationsBySection[section]
    return {
        t(key: string): string {
            if (key in translations) {
                return translations[key]
            }

            console.warn(`Missing '${section}' translation for key: ${key}`)
            return key
        },

        tWithDefault<T>(key: string, defaultValue: T): string | T {
            return translations[key] ?? defaultValue
        },
    }
}
