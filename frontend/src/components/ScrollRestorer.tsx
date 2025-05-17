import type React from "react";
import { useEffect, useRef } from "react";

interface ScrollRestorerProps {
    scrollPositionRef: React.MutableRefObject<number>;
    children: React.ReactNode;
    className?: string;
}

const ScrollRestorer: React.FC<ScrollRestorerProps> = ({
    scrollPositionRef,
    children,
    className,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Restore scroll on mount
    useEffect(() => {
        const el = containerRef.current;
        if (el) {
            el.scrollTop = scrollPositionRef.current;
        }
    }, []);

    // Track scroll without causing re-renders
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleScroll = () => {
            scrollPositionRef.current = el.scrollTop;
        };

        el.addEventListener("scroll", handleScroll);
        return () => {
            el.removeEventListener("scroll", handleScroll);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ overflowY: "auto", height: "100%" }}
        >
            {children}
        </div>
    );
};

export default ScrollRestorer;
