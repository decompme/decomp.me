const isHex = (value: string) => /^0x[0-9a-fA-F]+$/.test(value);

const isInteger = (value: string) => {
    const number = Number(value);
    return Number.isInteger(number);
};

function normalizeParameterValue(value: string, allowNegative: boolean) {
    const trimmed = value.trim();
    if (trimmed === "") return null;

    if (!allowNegative && trimmed.startsWith("-")) return null;

    return {
        value: trimmed,
        unsignedValue: trimmed.startsWith("-") ? trimmed.slice(1) : trimmed,
    };
}

export function isValidIntegerParameterValue(
    value: string,
    allowNegative = false,
) {
    const parsed = normalizeParameterValue(value, allowNegative);
    if (!parsed) return false;

    return isInteger(parsed.value);
}

export function isValidHexParameterValue(value: string, allowNegative = false) {
    const parsed = normalizeParameterValue(value, allowNegative);
    if (!parsed) return false;

    return isHex(parsed.unsignedValue);
}

export function isValidIntOrHexParameterValue(
    value: string,
    allowNegative = false,
) {
    const parsed = normalizeParameterValue(value, allowNegative);
    if (!parsed) return false;

    return isHex(parsed.unsignedValue) || isInteger(parsed.value);
}
