import React from "react";
import Frog from "./Frog";

interface HolidayFrogProps {
    today?: Date;
    className?: string;
}

export default function HolidayFrog({
    today = new Date(),
    className = "size-7",
}: HolidayFrogProps) {
    const month = today.getUTCMonth();
    const date = today.getUTCDate();

    // TODO: special handling for frug

    // Defaults
    let primary = "#951fd9";
    let secondary = "#cc87f4";
    let message = "Happy Decomping!";

    if (month === 1 && date === 14) {
        primary = "#e6396f";
        secondary = "#f7a1c4";
        message = "❤️ Happy Valentine's Day! ❤️";
    }
    if (month === 2 && date === 17) {
        primary = "#2a9d34";
        secondary = "#7fd28d";
        message = "🍀 Happy St Patrick's Day! 🍀";
    }
    if (month === 9 && date === 31) {
        primary = "#d96516";
        secondary = "#20150aff";
        message = "🎃 Happy Halloween! 🎃";
    }

    if (month === 10) {
        // Thanksgiving (4th Thursday of November)
        const firstDay = new Date(today.getFullYear(), 10, 1);
        const firstThursday = 1 + ((4 - firstDay.getDay() + 7) % 7);
        const fourthThursday = firstThursday + 21;
        if (date === fourthThursday) {
            primary = "#9e682a";
            secondary = "#d2a679";
            message = "🦃 Happy Thanksgiving! 🦃";
        }
    }

    if (month === 11 && date === 25) {
        primary = "#E61A1A";
        secondary = "#F8BFBF";
        message = "🎅 Merry Christmas! 🎅";
    }

    return (
        <Frog
            className={className}
            aria-label="Purple frog"
            primary={primary}
            secondary={secondary}
            title={message}
        />
    );
}
