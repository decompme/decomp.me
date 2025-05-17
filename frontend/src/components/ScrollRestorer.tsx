import type React from "react";
import { useEffect, useRef } from "react";

interface ScrollRestorerProps {
    scrollPositionRef: React.RefObject<number>;
    children: React.ReactNode;
    className?: string;
}

const ScrollRestorer: React.FC<ScrollRestorerProps> = ({
    scrollPositionRef,
    children,
    className,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        // Restore scroll position on initial mount
        el.scrollTop = scrollPositionRef.current;

        // Save scroll position on scroll
        const handleScroll = () => {
            scrollPositionRef.current = el.scrollTop;
        };

        el.addEventListener("scroll", handleScroll);
        return () => {
            el.removeEventListener("scroll", handleScroll);
        };
    }, []);

    return (
        <div ref={containerRef} className={className}>
            {children}
        </div>
    );
};

export default ScrollRestorer;
