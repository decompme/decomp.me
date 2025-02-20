"use client";

import type { ReactNode } from "react";
import { AiProvider, AiModel, useAiSettings } from "@/lib/settings";
import RadioList from "@/app/(navfooter)/settings/RadioList";
import Section from "@/app/(navfooter)/settings/Section";
import TextField from "@/app/(navfooter)/settings/TextField";

const providerOptions: Record<AiProvider, { label: ReactNode }> = {
    [AiProvider.OPENAI]: {
        label: <div>OpenAI</div>,
    },
    [AiProvider.DEEPSEEK]: {
        label: <div>DeepSeek</div>,
    },
};

type AiModelOption = Partial<Record<AiModel, { label: ReactNode }>>;

const openAiModels: AiModelOption = {
    [AiModel.O1_PREVIEW]: {
        label: <div>o1-preview (recommended)</div>,
    },
    [AiModel.GPT_3_5_TURBO]: {
        label: <div>GPT 3.5 Turbo</div>,
    },
};

const deepSeekAiModels: AiModelOption = {
    [AiModel.DEEPSEEK_REASONER]: {
        label: <div>deepseek-reasoner (recommended)</div>,
    },
    [AiModel.DEEPSEEK_CHAT]: {
        label: <div>deepseek-chat</div>,
    },
};

const aiProviderModels: Record<AiProvider, AiModelOption> = {
    [AiProvider.OPENAI]: openAiModels,
    [AiProvider.DEEPSEEK]: deepSeekAiModels,
};

const providerPricingPageUrls: Record<AiProvider, string> = {
    [AiProvider.OPENAI]: "https://openai.com/api/pricing",
    [AiProvider.DEEPSEEK]: "https://api-docs.deepseek.com/quick_start/pricing",
};

export default function AiSettings() {
    const {
        aiProvider,
        aiModel,
        aiApiKey,
        setAiProvider,
        setAiModel,
        setAiApiKey,
    } = useAiSettings();

    return (
        <>
            <Section title="Provider">
                <RadioList
                    value={aiProvider}
                    onChange={(value) => setAiProvider(value as AiProvider)}
                    options={providerOptions}
                />

                <TextField
                    label="API Key"
                    description="Your key will be stored only in this browser."
                    value={aiApiKey}
                    onChange={setAiApiKey}
                    type="password"
                />
            </Section>

            <Section title="Model">
                <div className="mt-1 text-gray-11 text-sm">
                    We recommend reasoning models because they are best suited
                    for decompilation. However, be mindful of{" "}
                    <a
                        href={providerPricingPageUrls[aiProvider]}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                    >
                        pricing
                    </a>
                    .
                </div>

                <RadioList
                    value={aiModel}
                    onChange={(value) => setAiModel(value as AiModel)}
                    options={aiProviderModels[aiProvider]}
                />
            </Section>
        </>
    );
}
