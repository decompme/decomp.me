"use client";

import { useEffect } from "react";

import { useSearchParams } from "next/navigation";
import { Boarding, type BoardingSteps } from "boarding.js";

type TourStep = BoardingSteps[number];

const SELECTOR = {
    toolbar: '[data-tour="scratch-toolbar"]',
    scratchView: '[data-tour="scratch-view"]',
    tourHelp: '[data-tour="scratch-tour-help"]',
    compileButton: '[data-tour="scratch-action-compile"]',
    saveButton: '[data-tour="scratch-action-save"]',
    forkButton: '[data-tour="scratch-action-fork"]',
    decompileButton: '[data-tour="scratch-action-decompile"]',
    exportButton: '[data-tour="scratch-action-export"]',
    aboutTab: '[data-tour="scratch-tab-about"]',
    aboutPanel: '[data-tour="scratch-about-panel"]',
    familyTab: '[data-tour="scratch-tab-family"]',
    familyPanel: '[data-tour="scratch-family-panel"]',
    sourceTab: '[data-tour="scratch-tab-source"]',
    sourcePanel: '[data-tour="scratch-tab-source-panel"]',
    contextTab: '[data-tour="scratch-tab-context"]',
    contextPanel: '[data-tour="scratch-tab-context-panel"]',
    optionsTab: '[data-tour="scratch-tab-options"]',
    optionsPanel: '[data-tour="scratch-tab-options-panel"]',
    optionsCompiler: '[data-tour="scratch-options-compiler"]',
    optionsDiff: '[data-tour="scratch-options-diff"]',
    optionsOther: '[data-tour="scratch-options-other"]',
    compilationTab: '[data-tour="scratch-tab-compilation"]',
    compilationPanel: '[data-tour="scratch-tab-compilation-panel"]',
    targetColumn: '[data-tour="scratch-diff-column-base"]',
    currentColumn: '[data-tour="scratch-diff-column-current"]',
    thirdColumn: '[data-tour="scratch-diff-column-previous"]',
    targetToggle: '[data-tour="scratch-diff-toggle-target"]',
    currentToggle: '[data-tour="scratch-diff-toggle-current"]',
    threeWayToggle: '[data-tour="scratch-diff-toggle-three-way"]',
    compressionToggle: '[data-tour="scratch-diff-toggle-compression"]',
    objdiffTab: '[data-tour="scratch-tab-objdiff"]',
    objdiffPanel: '[data-tour="scratch-tab-objdiff-panel"]',
    problemsTab: '[data-tour="scratch-tab-problems"]',
    problemsPanel: '[data-tour="scratch-problems-panel"]',
    decompileTab: '[data-tour="scratch-tab-decompilation"]',
    decompilePanel: '[data-tour="scratch-decompile-panel"]',
};

function element(selector: string) {
    return document.querySelector<HTMLElement>(selector);
}

function elementExists(selector: string) {
    return !!element(selector);
}

function isElementVisible(selector: string) {
    const el = element(selector);
    if (!el) return false;

    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
}

function afterReactPaint(callback: () => void) {
    requestAnimationFrame(() => {
        requestAnimationFrame(callback);
    });
}

function makeStep(
    selector: string,
    title: string,
    description: string,
    preferredSide: TourStep["popover"]["preferredSide"] = "bottom",
): TourStep {
    return {
        element: selector,
        popover: {
            title,
            description,
            preferredSide,
        },
    };
}

function makeClickToContinueStep({
    boarding,
    selector,
    waitForSelector,
    isComplete,
    title,
    description,
    preferredSide = "bottom",
}: {
    boarding: Boarding;
    selector: string;
    waitForSelector?: string;
    isComplete?: () => boolean;
    title: string;
    description: string;
    preferredSide?: TourStep["popover"]["preferredSide"];
}): TourStep {
    let removeClickListener: (() => void) | undefined;
    let clicked = false;
    const isStepComplete = () =>
        clicked ||
        isComplete?.() ||
        (waitForSelector ? isElementVisible(waitForSelector) : false);

    return {
        element: selector,
        strictClickHandling: true,
        onHighlighted: () => {
            const onClick = (event: MouseEvent) => {
                const target = event.target;
                if (!(target instanceof Element)) return;
                if (!target.closest(selector)) return;

                clicked = true;
                afterReactPaint(() => {
                    boarding.clearMovePrevented();
                    boarding.next();
                });
            };

            document.addEventListener("click", onClick, { capture: true });
            removeClickListener = () => {
                document.removeEventListener("click", onClick, {
                    capture: true,
                });
            };
        },
        onDeselected: () => {
            removeClickListener?.();
            removeClickListener = undefined;
        },
        onNext: () => {
            if (isStepComplete()) return;

            boarding.preventMove();
        },
        popover: {
            title,
            description,
            preferredSide,
            showButtons: ["close", "previous"],
        },
    };
}

function isToggleEnabled(selector: string) {
    return element(selector)?.getAttribute("aria-pressed") === "true";
}

function resetBoarding(boarding: Boarding) {
    if (!boarding.isActivated && !boarding.hasHighlightedElement()) return;

    try {
        boarding.reset(true, "cancel");
    } catch (error) {
        if (
            !(error instanceof Error) ||
            error.message !== "No SVG found to unmount"
        ) {
            throw error;
        }
    }
}

function addIfPresent(steps: TourStep[], step: TourStep) {
    if (elementExists(step.element as string)) {
        steps.push(step);
    }
}

function addTabSection({
    steps,
    boarding,
    tabSelector,
    panelSelector,
    tabTitle,
    tabDescription,
    panelTitle,
    panelDescription,
    panelPreferredSide = "right",
}: {
    steps: TourStep[];
    boarding: Boarding;
    tabSelector: string;
    panelSelector: string;
    tabTitle: string;
    tabDescription: string;
    panelTitle: string;
    panelDescription: string;
    panelPreferredSide?: TourStep["popover"]["preferredSide"];
}) {
    if (!elementExists(tabSelector)) return;

    steps.push(
        makeClickToContinueStep({
            boarding,
            selector: tabSelector,
            waitForSelector: panelSelector,
            title: tabTitle,
            description: tabDescription,
        }),
    );

    steps.push(
        makeStep(
            panelSelector,
            panelTitle,
            panelDescription,
            panelPreferredSide,
        ),
    );
}

function buildTourSteps(boarding: Boarding): TourStep[] {
    const steps: TourStep[] = [];

    addIfPresent(
        steps,
        makeStep(
            SELECTOR.scratchView,
            "Scratch tour",
            "This tour highlights the main parts of a scratch. Use <strong>Next</strong> and <strong>Back</strong> to move through it. When a step says <strong>Click</strong> a tab or button, the tour will wait for you to do that before continuing.",
        ),
    );

    addIfPresent(
        steps,
        makeStep(
            SELECTOR.toolbar,
            "Scratch overview",
            "A scratch is a shareable workspace for matching a function. If you own the scratch you can rename it by clicking on its name and making your changes.",
        ),
    );

    addIfPresent(
        steps,
        makeStep(
            SELECTOR.saveButton,
            "Save",
            "Hitting Save will save your changes.",
        ),
    );
    addIfPresent(
        steps,
        makeStep(
            SELECTOR.forkButton,
            "Fork",
            "Forking a scratch creates your own editable copy, this is how you can save your changes.",
        ),
    );
    addIfPresent(
        steps,
        makeStep(
            SELECTOR.compileButton,
            "Compile",
            "Clicking Compile will send your scratch to the backend to be compiled and diffed against the target assembly.",
        ),
    );
    addIfPresent(
        steps,
        makeStep(
            SELECTOR.decompileButton,
            "Decompile",
            "When the platform supports it, Decompile can generate a starting point from the target assembly.",
        ),
    );
    addIfPresent(
        steps,
        makeStep(
            SELECTOR.exportButton,
            "Export",
            "The Export button creates & downloads a zip of the current scratch, allowing you to inspect them locally.",
        ),
    );

    addTabSection({
        steps,
        boarding,
        tabSelector: SELECTOR.aboutTab,
        panelSelector: SELECTOR.aboutPanel,
        tabTitle: "About tab",
        tabDescription:
            "Click <strong>About</strong> to switch to the About tab where you will find the scratch metadata.",
        panelTitle: "About",
        panelDescription:
            "The About tab shows the score, owner, platform, preset, timestamps, parent scratch, and any notes attached to the scratch.",
    });

    addTabSection({
        steps,
        boarding,
        tabSelector: SELECTOR.familyTab,
        panelSelector: SELECTOR.familyPanel,
        tabTitle: "Family tab",
        tabDescription:
            "Click <strong>Family</strong> to switch to the Family tab to see related forks.",
        panelTitle: "Scratch family",
        panelDescription:
            "Forks let people collaborate on the same target function. The family tab helps find related work and improvements.",
    });

    addTabSection({
        steps,
        boarding,
        tabSelector: SELECTOR.sourceTab,
        panelSelector: SELECTOR.sourcePanel,
        tabTitle: "Source code tab",
        tabDescription:
            "Click <strong>Source code</strong> to return to the main editor.",
        panelTitle: "Source code",
        panelDescription:
            "Most of the matching loop happens here: edit code, compile, inspect the diff, and repeat.",
    });

    addTabSection({
        steps,
        boarding,
        tabSelector: SELECTOR.contextTab,
        panelSelector: SELECTOR.contextPanel,
        tabTitle: "Context tab",
        tabDescription:
            "Click <strong>Context</strong> to see supporting declarations.",
        panelTitle: "Context",
        panelDescription:
            "Use this space for shared typedefs, symbols, function definitions, etc., that are used by the function you are trying to match.",
    });

    addTabSection({
        steps,
        boarding,
        tabSelector: SELECTOR.optionsTab,
        panelSelector: SELECTOR.optionsPanel,
        tabTitle: "Options tab",
        tabDescription:
            "Click <strong>Options</strong> to open compiler and diff settings.",
        panelTitle: "Options",
        panelDescription:
            "Options control how your source is compiled and compared. Most scratches will have compiler flags set via preset.",
    });
    steps.push(
        makeStep(
            SELECTOR.optionsCompiler,
            "Compiler options",
            "Compiler options choose the compiler and flags used to build your source.",
        ),
    );
    steps.push(
        makeStep(
            SELECTOR.optionsDiff,
            "Diff options",
            "Diff options control how the generated object is compared against the target.",
        ),
    );
    steps.push(
        makeStep(
            SELECTOR.optionsOther,
            "Other options",
            "Match override lets an owner mark a scratch as effectively matching even when naming or symbol details leave a tiny mismatch.",
        ),
    );

    addTabSection({
        steps,
        boarding,
        tabSelector: SELECTOR.compilationTab,
        panelSelector: SELECTOR.compilationPanel,
        tabTitle: "Compilation tab",
        tabDescription:
            "Click <strong>Compilation</strong> to inspect the current diff.",
        panelTitle: "Compilation",
        panelDescription:
            "The Compilation panel shows the current assembly diff and compiler output. A score of 0 means the generated output matches the target.",
        panelPreferredSide: "left",
    });
    addIfPresent(
        steps,
        makeStep(
            SELECTOR.targetColumn,
            "Target column",
            "Target shows the assembly you are trying to match.",
        ),
    );
    addIfPresent(
        steps,
        makeStep(
            SELECTOR.currentColumn,
            "Current column",
            "Current show what the result of your compiled source code.",
        ),
    );
    addIfPresent(
        steps,
        makeStep(
            SELECTOR.targetToggle,
            "Column toggles",
            "The T and C buttons hide or show the Target and Current columns when you need more room.",
        ),
    );

    if (elementExists(SELECTOR.threeWayToggle)) {
        steps.push(
            makeClickToContinueStep({
                boarding,
                selector: SELECTOR.threeWayToggle,
                isComplete: () => isToggleEnabled(SELECTOR.threeWayToggle),
                waitForSelector: SELECTOR.thirdColumn,
                title: "3-way diff",
                description:
                    "Click <strong>3</strong> to add a third column comparing against your saved version or previous compile, depending on your editor setting.",
            }),
        );
        steps.push(
            makeStep(
                SELECTOR.thirdColumn,
                "Third diff column",
                "This extra column gives you another baseline while you compare changes.",
            ),
        );
        steps.push({
            ...makeClickToContinueStep({
                boarding,
                selector: SELECTOR.threeWayToggle,
                isComplete: () =>
                    !isToggleEnabled(SELECTOR.threeWayToggle) &&
                    !isElementVisible(SELECTOR.thirdColumn),
                title: "Turn 3-way off",
                description:
                    "Click <strong>3 again</strong> to return to the normal two-column diff.",
            }),
        });
    }

    if (elementExists(SELECTOR.compressionToggle)) {
        steps.push(
            makeStep(
                SELECTOR.compressionToggle,
                "Compress diff",
                "The fold button collapses long unchanged stretches so you can focus on the differences. You can toggle it whenever the full diff has too much noise.",
            ),
        );
    }

    addTabSection({
        steps,
        boarding,
        tabSelector: SELECTOR.objdiffTab,
        panelSelector: SELECTOR.objdiffPanel,
        tabTitle: "objdiff tab",
        tabDescription:
            "Click <strong>objdiff</strong> to see another view of the comparison.",
        panelTitle: "objdiff",
        panelDescription:
            "objdiff provides an object-level comparison view that can be useful when inspecting data in addition to and instruction differences.",
        panelPreferredSide: "left",
    });

    if (elementExists(SELECTOR.problemsTab)) {
        addTabSection({
            steps,
            boarding,
            tabSelector: SELECTOR.problemsTab,
            panelSelector: SELECTOR.problemsPanel,
            tabTitle: "Problems tab",
            tabDescription:
                "Click <strong>Problems</strong> to see compiler output.",
            panelTitle: "Problems",
            panelDescription:
                "Any compiler errors and warnings will be shown here.",
        });
    }

    if (elementExists(SELECTOR.decompileButton)) {
        steps.push(
            makeClickToContinueStep({
                boarding,
                selector: SELECTOR.decompileButton,
                waitForSelector: SELECTOR.decompilePanel,
                title: "Open decompilation",
                description:
                    "Click <strong>Decompile</strong> to open the decompiler panel for this scratch.",
            }),
        );
        steps.push(
            makeStep(
                SELECTOR.decompilePanel,
                "Decompilation",
                "Decompilation is a helper for generating a starting point. It can save time, but the result still needs review and editing.",
                "left",
            ),
        );
    }

    addIfPresent(
        steps,
        makeStep(
            SELECTOR.scratchView,
            "The matching loop",
            "The usual loop is edit source, context, or options; inspect the diff; and repeat. By default, changes are compiled automatically, and you can configure that behavior in your editor settings.",
        ),
    );
    addIfPresent(
        steps,
        makeStep(
            SELECTOR.tourHelp,
            "More help",
            'If you have more questions, the <a href="/faq">FAQ</a> is a good next stop, or feel free to join the <a href="https://discord.gg/sutqNShRRs" target="_blank" rel="noreferrer">decomp.me Discord server</a>, where people ask for help, share scratches, and discuss decompilation in a collaborative environment.',
        ),
    );

    return steps;
}

export default function ScratchTour(): null {
    const searchParams = useSearchParams();
    const tourEnabled = searchParams.get("tour") === "1";

    useEffect(() => {
        const boarding = new Boarding({
            allowClose: true,
            className: "scratch-tour-popover",
            keyboardControl: true,
            nextBtnText: "Next",
            prevBtnText: "Back",
            doneBtnText: "Finish",
            overlayClickNext: false,
            padding: 8,
            radius: 4,
            strictClickHandling: true,
            scrollIntoViewOptions: { block: "center", inline: "center" },
        });

        const startTour = () => {
            resetBoarding(boarding);
            const steps = buildTourSteps(boarding);
            if (steps.length === 0) return;

            boarding.defineSteps(steps);
            boarding.start();
        };

        const timeout = tourEnabled
            ? window.setTimeout(startTour, 300)
            : undefined;

        window.addEventListener("scratch-tour:start", startTour);

        return () => {
            if (timeout) window.clearTimeout(timeout);
            window.removeEventListener("scratch-tour:start", startTour);
            resetBoarding(boarding);
        };
    }, [tourEnabled]);

    return null;
}
