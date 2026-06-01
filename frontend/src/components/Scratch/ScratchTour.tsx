"use client";

import { useEffect } from "react";

import { useSearchParams } from "next/navigation";
import { Boarding, type BoardingSteps } from "boarding.js";

type TourStep = BoardingSteps[number];

const CLICK_TARGET_CLASS = "scratch-tour-click-target";

const SELECTOR = {
    toolbar: '[data-tour="scratch-toolbar"]',
    scratchView: '[data-tour="scratch-view"]',
    leftPane: '[data-tour="scratch-layout-left"]',
    rightPane: '[data-tour="scratch-layout-right"]',
    tourButton: '[data-tour="scratch-action-tour"]',
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
    targetColumn: '[data-tour="scratch-diff-column-base-full"]',
    currentColumn: '[data-tour="scratch-diff-column-current-full"]',
    thirdColumn: '[data-tour="scratch-diff-column-previous-full"]',
    diffToggles: '[data-tour="scratch-diff-toggles"]',
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
    decompileContent: '[data-tour="scratch-decompile-content"]',
};

function element(selector: string) {
    return document.querySelector<HTMLElement>(selector);
}

function elementExists(selector: string) {
    return !!element(selector);
}

function clearClickTargets() {
    const clickTargets = document.querySelectorAll(`.${CLICK_TARGET_CLASS}`);
    for (let i = 0; i < clickTargets.length; i++) {
        clickTargets[i].classList.remove(CLICK_TARGET_CLASS);
    }
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
            clearClickTargets();
            element(selector)?.classList.add(CLICK_TARGET_CLASS);

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
            element(selector)?.classList.remove(CLICK_TARGET_CLASS);
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
            showButtons: ["close", "previous", "next"],
            disableButtons: ["next"],
        },
    };
}

function isToggleEnabled(selector: string) {
    return element(selector)?.getAttribute("aria-pressed") === "true";
}

function resetBoarding(boarding: Boarding) {
    clearClickTargets();

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

function isTourViewportSupported() {
    return window.matchMedia("(min-width: 768px)").matches;
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

function addDecompilationInfoStep(steps: TourStep[], selector: string) {
    steps.push(
        makeStep(
            selector,
            "Decompilation",
            "When the platform supports it, this tab will show the results of running a decompiler against the target assembly and contents of the scratch context.",
        ),
    );
}

function buildTourSteps(boarding: Boarding): TourStep[] {
    const steps: TourStep[] = [];

    addIfPresent(
        steps,
        makeStep(
            SELECTOR.toolbar,
            "Scratch tour",
            "Welcome to the guided tour of the scratch editor. Use <strong>Next</strong> and <strong>Back</strong> to move through it. <br /><br />When a step says to <strong>Click</strong> a tab or button, the tour will wait for you to do that before continuing.",
            "bottom",
        ),
    );

    addIfPresent(
        steps,
        makeStep(
            SELECTOR.leftPane,
            "Editing area",
            "The left side of the scratch editor is where you make your changes: edit source code and context, tweak compiler options, and update scratch metadata.",
            "right",
        ),
    );

    addIfPresent(
        steps,
        makeStep(
            SELECTOR.rightPane,
            "Results area",
            "The right side is where you will see the results of your changes: assembly diff and any warnings or errors from the compiler.",
            "left",
        ),
    );

    addIfPresent(
        steps,
        makeStep(
            SELECTOR.toolbar,
            "Scratch toolbar",
            "The toolbar contains scratch-level actions such as saving, forking, exporting, decompiling. <br /><br /> If you own the scratch you can rename it by clicking on its name and making your changes.",
        ),
    );

    addIfPresent(
        steps,
        makeStep(
            SELECTOR.forkButton,
            "Fork to save",
            "Forking a scratch creates your own editable copy, this is how you can save your changes when you aren't the owner.",
        ),
    );

    addTabSection({
        steps,
        boarding,
        tabSelector: SELECTOR.sourceTab,
        panelSelector: SELECTOR.sourcePanel,
        tabTitle: "Source code tab",
        tabDescription:
            "Click the <strong>Source code</strong> tab to select the code editor.",
        panelTitle: "Source code",
        panelDescription:
            "The matching loop happens here: edit the code, compile, check the diff, repeat until the code matches. <br /><br /> By default, changes are compiled automatically after a short delay; you can configure this behavior in the editor settings found within the hamburger menu.",
    });

    addTabSection({
        steps,
        boarding,
        tabSelector: SELECTOR.contextTab,
        panelSelector: SELECTOR.contextPanel,
        tabTitle: "Context tab",
        tabDescription:
            "Now click the <strong>Context</strong> tab to see supporting declarations.",
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
            "Click the <strong>Options</strong> tab to open compiler and diff settings.",
        panelTitle: "Options",
        panelDescription:
            "Options control how your source is compiled and compared. Most scratches will have compiler flags set via a preset.",
    });
    steps.push(
        makeStep(
            SELECTOR.optionsCompiler,
            "Compiler options",
            "Compiler options allow you to change the compiler and tweak the flags used to build your source code.",
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
            "Match override lets an owner mark a scratch as matching even when naming or symbol details leave a mismatch.",
        ),
    );

    addTabSection({
        steps,
        boarding,
        tabSelector: SELECTOR.familyTab,
        panelSelector: SELECTOR.familyPanel,
        tabTitle: "Family tab",
        tabDescription:
            "Click <strong>Family</strong> to switch to the family tab to see related forks.",
        panelTitle: "Scratch family",
        panelDescription:
            "Forks let people collaborate on the same target function. The family tab helps find related work and improvements.",
    });

    addTabSection({
        steps,
        boarding,
        tabSelector: SELECTOR.aboutTab,
        panelSelector: SELECTOR.aboutPanel,
        tabTitle: "About tab",
        tabDescription: "Now click the <strong>About</strong> tab.",
        panelTitle: "About",
        panelDescription:
            "The about tab shows the score, owner, platform, preset, timestamps, parent scratch, and any notes attached to the scratch.",
    });

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
            "The compilation panel shows the current assembly diff and compiler output. The lower the score the better; a score of 0 means the generated output matches the target.",
        panelPreferredSide: "left",
    });
    addIfPresent(
        steps,
        makeStep(
            SELECTOR.targetColumn,
            "Target column",
            "The target column is the assembly that you are trying to match.",
        ),
    );
    addIfPresent(
        steps,
        makeStep(
            SELECTOR.currentColumn,
            "Current column",
            "The current column shows the result of your compiled source code.",
        ),
    );
    addIfPresent(
        steps,
        makeStep(
            SELECTOR.diffToggles,
            "Column toggles",
            "These controls hide or show diff columns, enable 3-way comparison, and collapse long unchanged diffs when you need more room.",
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
                    "Click the <strong>3</strong> to add a third column comparing against your saved version or previous compile, depending on your editor setting.",
            }),
        );
        steps.push(
            makeStep(
                SELECTOR.thirdColumn,
                "Third diff column",
                "This column allows you to better identify how your changes affect the diff.",
            ),
        );
        steps.push({
            ...makeClickToContinueStep({
                boarding,
                selector: SELECTOR.threeWayToggle,
                isComplete: () =>
                    !isToggleEnabled(SELECTOR.threeWayToggle) &&
                    !isElementVisible(SELECTOR.thirdColumn),
                title: "Turn 3-way diff off",
                description:
                    "Click <strong>3 again</strong> to return to the normal two-column diff.",
            }),
        });
    }

    if (elementExists(SELECTOR.compressionToggle)) {
        steps.push(
            makeStep(
                SELECTOR.compressionToggle,
                "Compress the diff",
                "The fold button collapses long matches so you can focus on the differences.",
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
            "Click the <strong>objdiff</strong> tab to switch from asm-differ to the objdiff backend.",
        panelTitle: "objdiff",
        panelDescription:
            "objdiff provides an object-level comparison view that can be useful when inspecting data in addition to any instruction differences.",
        panelPreferredSide: "left",
    });

    if (elementExists(SELECTOR.problemsTab)) {
        addTabSection({
            steps,
            boarding,
            tabSelector: SELECTOR.problemsTab,
            panelSelector: SELECTOR.problemsPanel,
            tabTitle: "Problems panel",
            tabDescription:
                "Click the <strong>Problems</strong> panel to see compiler output.",
            panelTitle: "Problems",
            panelDescription:
                "Any compiler errors and warnings will be shown here.",
        });
    }

    if (isElementVisible(SELECTOR.decompilePanel)) {
        addDecompilationInfoStep(
            steps,
            elementExists(SELECTOR.decompileContent)
                ? SELECTOR.decompileContent
                : SELECTOR.decompilePanel,
        );
    } else if (elementExists(SELECTOR.decompileTab)) {
        steps.push(
            makeClickToContinueStep({
                boarding,
                selector: SELECTOR.decompileTab,
                waitForSelector: SELECTOR.decompileContent,
                title: "Decompilation tab",
                description:
                    "Click the <strong>Decompilation</strong> tab to show the decompiler output.",
            }),
        );
        addDecompilationInfoStep(steps, SELECTOR.decompileContent);
    } else if (elementExists(SELECTOR.decompileButton)) {
        steps.push(
            makeClickToContinueStep({
                boarding,
                selector: SELECTOR.decompileButton,
                waitForSelector: SELECTOR.decompileContent,
                title: "Open decompilation panel",
                description:
                    "Click <strong>Decompile</strong> to open the decompilation panel for this scratch.",
            }),
        );
        addDecompilationInfoStep(steps, SELECTOR.decompileContent);
    }

    addIfPresent(
        steps,
        makeStep(
            SELECTOR.tourButton,
            "More help",
            'If you have more questions, the <a href="/faq">FAQ</a> is a good next stop, or feel free to join the <a href="https://discord.gg/sutqNShRRs" target="_blank" rel="noreferrer">decomp.me Discord server</a>, where people ask for help, share scratches, and discuss decompilation in a collaborative environment. <br /><br />You can start the tour again by clicking the <strong>Tour</strong> button.',
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
            if (!isTourViewportSupported()) return;

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
