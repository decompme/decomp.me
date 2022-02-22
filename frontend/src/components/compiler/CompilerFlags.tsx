import * as api from "../../lib/api"

import { Checkbox, FlagSet, FlagOption } from "./CompilerOpts"

export interface Props {
    schema: api.CompilerFlag[]
}

export default function CompilerFlags({ schema }: Props) {
    return <>
        {schema.map(flag => {
            if (flag.type === "checkbox") {
                return <Checkbox key={flag.id} flag={flag.flag} description={"Description"} />
            } else if (flag.type === "flagset") {
                return <FlagSet key={flag.id} name={"Set name"}>
                    {flag.flags.map(f => <FlagOption key={f} flag={f} description={"Description"} />)}
                </FlagSet>
            }
        })}
    </>
}
