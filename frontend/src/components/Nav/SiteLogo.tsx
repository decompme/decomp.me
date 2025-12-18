import clsx from "clsx";
import HolidayFrog from "../Frog/HolidayFrog";
import styles from "./SiteLogo.module.scss";

export default function SiteLogo() {
    return (
        <div
            className={clsx(
                "inline-flex items-center space-x-2",
                styles.blinkingEyes,
            )}
            aria-label="decomp.me logo"
        >
            <HolidayFrog />
            <span className="font-semibold text-xl leading-6 tracking-tight">
                decomp.me
            </span>
        </div>
    );
}
