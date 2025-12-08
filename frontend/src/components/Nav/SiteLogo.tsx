import clsx from "clsx";
import Frog from "../Frog/Frog";
import { getHolidayTheme } from "../Frog/holiday";
import styles from "./SiteLogo.module.scss";

export default function SiteLogo() {
    const { primary, secondary, message } = getHolidayTheme();

    return (
        <div
            className={clsx(
                "inline-flex items-center space-x-2",
                styles.blinkingEyes,
            )}
            aria-label="decomp.me logo"
        >
            <Frog
                className="size-7"
                aria-label="Purple frog"
                primary={primary}
                secondary={secondary}
                title={message}
            />
            <span className="font-semibold text-xl leading-6 tracking-tight">
                decomp.me
            </span>
        </div>
    );
}
