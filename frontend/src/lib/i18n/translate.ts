// Implements a similar API to next-translate but works with app directory

import translations from "./locales/en/compilers.json"

export type Section = "compilers"

export default function useTranslation(section: Section) {
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
