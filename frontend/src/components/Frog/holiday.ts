interface HolidayTheme {
    primary: string;
    secondary: string;
    message: string;
}

export function getHolidayTheme(today = new Date()): HolidayTheme {
    const month = today.getUTCMonth();
    const date = today.getUTCDate();

    if (month === 1 && date === 14)
        return {
            primary: "#e6396f",
            secondary: "#f7a1c4",
            message: "❤️ Happy Valentine's Day! ❤️",
        };
    if (month === 2 && date === 17)
        return {
            primary: "#2a9d34",
            secondary: "#7fd28d",
            message: "🍀 Happy St Patrick's Day! 🍀",
        };
    if (month === 9 && date === 31)
        return {
            primary: "#d96516",
            secondary: "#20150aff",
            message: "🎃 Happy Halloween! 🎃",
        };

    if (month === 10) {
        // Thanksgiving (4th Thursday of November)
        const firstDay = new Date(today.getFullYear(), 10, 1);
        const firstThursday = 1 + ((4 - firstDay.getDay() + 7) % 7);
        const fourthThursday = firstThursday + 21;
        if (date === fourthThursday)
            return {
                primary: "#9e682a",
                secondary: "#d2a679",
                message: "🦃 Happy Thanksgiving! 🦃",
            };
    }

    if (month === 11 && date === 25)
        return {
            primary: "#E61A1A",
            secondary: "#F8BFBF",
            message: "🎅 Merry Christmas! 🎅",
        };

    // Default
    return {
        primary: "#951fd9",
        secondary: "#cc87f4",
        message: "Happy Decomping!",
    };
}
