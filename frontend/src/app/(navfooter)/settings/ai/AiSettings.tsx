"use client";

import {
    AIProvider,
    AIModel,
    useAiProvider,
    useAiModel,
    useAiApiKey,
} from "@/lib/settings";
import RadioList from "@/app/(navfooter)/settings/RadioList";
import Section from "@/app/(navfooter)/settings/Section";
import TextField from "@/app/(navfooter)/settings/TextField";

const providerOptions = {
    [AIProvider.OPENAI]: {
        label: <div>OpenAI</div>,
    },
    [AIProvider.DEEPSEEK]: {
        label: <div>DeepSeek</div>,
    },
};

const openAIModels = {
    [AIModel.O1_PREVIEW]: {
        label: <div>o1-preview (recommended)</div>,
    },
    [AIModel.GPT_3_5_TURBO]: {
        label: <div>GPT 3.5 Turbo</div>,
    },
};
const openAIRecommendedModel = AIModel.O1_PREVIEW;

const deepSeekAIModels = {
    [AIModel.DEEPSEEK_REASONER]: {
        label: <div>deepseek-reasoner (recommended)</div>,
    },
    [AIModel.DEEPSEEK_CHAT]: {
        label: <div>deepseek-chat</div>,
    },
};
const deepSeekRecommendedModel = AIModel.DEEPSEEK_REASONER;

export default function AiSettings() {
    const [aiProvider, setAiProvider] = useAiProvider();
    const [aiModel, setAiModel] = useAiModel();
    const [aiApiKey, setAiApiKey] = useAiApiKey();

    const modelOptions =
        aiProvider === AIProvider.OPENAI ? openAIModels : deepSeekAIModels;

    return (
        <>
            <Section title="Provider">
                <RadioList
                    value={aiProvider}
                    onChange={(value) => {
                        setAiProvider(value as AIProvider);
                        setAiModel(
                            value === AIProvider.OPENAI
                                ? openAIRecommendedModel
                                : deepSeekRecommendedModel,
                        );
                    }}
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
                    It's recommended to use a reasoning model. It's pricey, but
                    they are the only ones that fulfill well on decompilation
                    tasks.
                </div>

                <RadioList
                    value={aiModel}
                    onChange={(value) => setAiModel(value as AIModel)}
                    options={modelOptions}
                />
            </Section>
        </>
    );
}
