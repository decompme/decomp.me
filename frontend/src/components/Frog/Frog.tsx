import React from "react";

const Frog = ({
    primary = "#951fd9",
    secondary = "#cc87f4",
    pupil = "#000",
    eye = "#FFF",
    nose = "#505050",
    title = "",
    ...props
}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" {...props}>
        <title>{title}</title>
        <path
            fill={secondary}
            d="M36 22c0 7.456-8.059 12-18 12S0 29.456 0 22 8.059 7 18 7s18 7.544 18 15z"
        />
        <path
            fill={primary}
            d="M31.755 12.676C33.123 11.576 34 9.891 34 8c0-3.313-2.687-6-6-6-2.861 0-5.25 2.004-5.851 4.685-1.288-.483-2.683-.758-4.149-.758-1.465 0-2.861.275-4.149.758C13.25 4.004 10.861 2 8 2 4.687 2 2 4.687 2 8c0 1.891.877 3.576 2.245 4.676C1.6 15.356 0 18.685 0 22c0 7.456 8.059 1 18 1s18 6.456 18-1c0-3.315-1.6-6.644-4.245-9.324z"
        />
        <circle fill={eye} cx="7.5" cy="7.5" r="3.5" className="eyeL" />
        <circle fill={pupil} cx="7.5" cy="7.5" r="1.5" className="pupilL" />
        <circle fill={eye} cx="28.5" cy="7.5" r="3.5" className="eyeR" />
        <circle fill={pupil} cx="28.5" cy="7.5" r="1.5" className="pupilR" />
        <circle fill={nose} cx="14" cy="20" r="1" className="noseL" />
        <circle fill={nose} cx="22" cy="20" r="1" className="noseR" />
    </svg>
);

export default Frog;
