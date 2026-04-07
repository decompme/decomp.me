import { useContext, useState, useEffect, useCallback } from "react";

import { useDebounce } from "use-debounce";

import { OptsContext } from "./OptsContext";

import styles from "./CompilerOpts.module.css";

const isHex = (val: string) => /^0x[0-9a-fA-F]+$/.test(val);

const isInteger = (val: string) => {
    const num = Number(val);
    return Number.isInteger(num);
};

const normalize = (val: string, allowNegative: boolean) => {
    const trimmed = val.trim();
    if (trimmed === "") return null;

    if (!allowNegative && trimmed.startsWith("-")) return null;

    const unsigned = trimmed.startsWith("-") ? trimmed.slice(1) : trimmed;

    return { val: trimmed, unsigned };
};

type ParameterFlagProps = {
    flag: string;
    name: string;
    value: string;

    validate: (val: string) => boolean;
    inputMode?: React.HTMLInputTypeAttribute;
    placeholder?: string;
};

function ParameterFlag({
    flag,
    name,
    value,
    validate,
    inputMode = "text",
    placeholder,
}: ParameterFlagProps) {
    const { setFlags } = useContext(OptsContext);

    const [inputValue, setInputValue] = useState(value ?? "");
    const [debouncedValue] = useDebounce(inputValue, 300);

    useEffect(() => {
        const val = debouncedValue;

        const removeEdit = { flag, value: false };

        if (validate(val)) {
            const addEdit = {
                flag: `${flag}=${val}`,
                value: true,
            };
            setFlags([removeEdit, addEdit]);
        } else {
            setFlags([removeEdit]);
        }
    }, [debouncedValue]);

    return (
        <div className={styles.diffLabel}>
            <label>{name}</label>
            <input
                type={inputMode}
                className={styles.textbox}
                value={inputValue}
                placeholder={placeholder}
                onChange={(e) => setInputValue(e.target.value)}
            />
        </div>
    );
}

type StringParameterFlagProps = {
    flag: string;
    name: string;
    value: string;
};

export function StringParameterFlag(props: StringParameterFlagProps) {
    return (
        <ParameterFlag
            {...props}
            validate={() => true}
            placeholder="e.g. Foo"
        />
    );
}

type IntegerParameterFlagProps = {
    flag: string;
    name: string;
    value: string;
    allowNegative?: boolean;
};

export function IntegerParameterFlag(props: IntegerParameterFlagProps) {
    const { allowNegative = false } = props;

    const validate = useCallback(
        (val: string) => {
            const parsed = normalize(val, allowNegative);
            if (!parsed) return false;

            return isInteger(parsed.val);
        },
        [allowNegative],
    );

    return (
        <ParameterFlag
            {...props}
            validate={validate}
            inputMode="number"
            placeholder="e.g. 0"
        />
    );
}

export function HexParameterFlag(props: IntegerParameterFlagProps) {
    const { allowNegative = false } = props;

    const validate = useCallback(
        (val: string) => {
            const parsed = normalize(val, allowNegative);
            if (!parsed) return false;

            return isHex(parsed.unsigned);
        },
        [allowNegative],
    );

    return (
        <ParameterFlag
            {...props}
            validate={validate}
            inputMode="text"
            placeholder="e.g. 0x0"
        />
    );
}

export function IntOrHexParameterFlag(props: IntegerParameterFlagProps) {
    const { allowNegative = false } = props;

    const validate = useCallback(
        (val: string) => {
            const parsed = normalize(val, allowNegative);
            if (!parsed) return false;

            return isHex(parsed.unsigned) || isInteger(parsed.val);
        },
        [allowNegative],
    );

    return (
        <ParameterFlag
            {...props}
            validate={validate}
            placeholder="e.g. 4096 or 0x1000"
        />
    );
}
