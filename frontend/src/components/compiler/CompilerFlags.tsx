import useTranslation from "next-translate/useTranslation"

import * as api from "../../lib/api"

import { Checkbox, FlagSet, FlagOption } from "./CompilerOpts"

export const NO_TRANSLATION = "NO_TRANSLATION"

export interface Props {
    schema: api.Flag[]
}

export default function CompilerFlags({ schema }: Props) {
    const compilersTranslation = useTranslation("compilers")

    return <>
        {schema.map(flag => {
            if (flag.type === "checkbox") {
                return <Checkbox key={flag.id} flag={flag.flag} description={compilersTranslation.t(flag.id)} />
            } else if (flag.type === "flagset") {
                return <FlagSet key={flag.id} name={compilersTranslation.t(flag.id)}>
                    {flag.flags.map(f => <FlagOption key={f} flag={f} description={
                        compilersTranslation.t(flag.id + "." + f, null, { default: NO_TRANSLATION })
                    } />)}
                </FlagSet>
            }
        })}
    </>
}
