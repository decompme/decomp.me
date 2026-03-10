import type { ReactNode } from "react";

import Link from "next/link";

import Frog from "@/components/Frog/Frog";

function Title({ title }: { title: string }) {
    return (
        <>
            <h2 className="mt-8 font-bold text-2xl text-gray-11">{title}</h2>
            <div className="h-1 w-full bg-purple-9" />
        </>
    );
}

function slugify(text: string) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
}

function Question({ question }: { question: string }) {
    const id = slugify(question);
    return (
        <h3
            id={id}
            className="mt-8 font-semibold text-gray-11 text-xl tracking-tight"
        >
            <a href={`#${id}`} className="no-underline hover:underline">
                {question}
            </a>
        </h3>
    );
}

function FaqLink({ children, href }: { children: ReactNode; href: string }) {
    return (
        <Link
            href={href}
            className="text-blue-11 hover:underline active:translate-y-px"
        >
            {children}
        </Link>
    );
}

function DiscordLink() {
    return (
        <FaqLink href="https://discord.gg/sutqNShRRs">Discord Server</FaqLink>
    );
}

export const metadata = {
    title: "Frequently Asked Questions",
};

export default function Page() {
    return (
        <main className="mx-auto max-w-prose p-4 pb-2 text-justify text-base leading-normal">
            <h1 className="font-semibold text-2xl text-gray-12 tracking-tight md:text-3xl">
                Frequently Asked Questions
            </h1>

            <p className="my-4">
                This FAQ explains how decomp.me works and how it fits into
                decompilation workflows.
            </p>

            <Title title="Overview" />

            <Question question={"What is decomp.me?"} />
            <p className="my-4">
                decomp.me is an interactive web-based platform where users can
                collaboratively decompile assembly code snippets by writing
                matching source code.
            </p>
            <p className="my-4">
                It is an{" "}
                <FaqLink href="https://www.github.com/decomp.me">
                    open-source project
                </FaqLink>{" "}
                run by volunteers in their free time.
            </p>

            <Question question={'What do you mean by "matching"?'} />
            <p className="my-4">
                decomp.me is designed for <b>matching decompilation</b>{" "}
                projects, where the goal is to write high-level code (such as C
                or C++) that compiles to assembly identical to the original.
            </p>
            <p className="my-4">
                Achieving a match usually requires the same compiler, assembler,
                and flags used to build the original binary, as well as
                carefully written code that produces identical output.
            </p>
            <p className="my-4">
                Writing matching code is a skill that takes time and practice,
                but many people find the process rewarding.
            </p>

            <Question question={"Why does writing matching code matter?"} />
            <p className="my-4">
                A <b>byte-perfect</b> match ensures the function's behavior
                (including undefined behavior) is reproduced exactly.
                Verification becomes simple: either the assembly matches, or it
                doesn't.
            </p>
            <p className="my-4">
                Although symbol names, comments, and other source-level
                information are usually lost during compilation, matching
                guarantees the reconstructed function behaves exactly like it
                does in the original binary.
            </p>

            <Title title={"Using decomp.me"} />

            <Question question={"What's a scratch?"} />
            <p className="my-4">
                A scratch is a workspace for exploring a compiler's codegen,
                similar to{" "}
                <FaqLink href="https://godbolt.org/">Compiler Explorer</FaqLink>
                .
            </p>
            <p className="my-4">
                Each scratch contains the target assembly, input source code,
                optional context code, and various settings. Most scratches
                focus on a single function being matched.
            </p>
            <p className="my-4">
                Scratches have unique shareable links and can be forked to
                create independent copies.
            </p>

            <Question question={"How do I create a scratch?"} />
            <p className="my-4">
                To create a scratch, select the target <b>Platform</b> and paste
                assembly for a single function into the <b>Target Assembly</b>{" "}
                section of the{" "}
                <FaqLink href="https://decomp.me/new">New Scratch</FaqLink>{" "}
                page.
            </p>
            <p className="my-4">
                To do this, you will need assembly code in GNU assembly (GAS)
                syntax. Depending on the target architecture there are a number
                of tools that can help extract it. Examples include{" "}
                <FaqLink href="https://github.com/ethteck/splat">splat</FaqLink>{" "}
                and{" "}
                <FaqLink href="https://github.com/encounter/decomp-toolkit">
                    dtk
                </FaqLink>
                .
            </p>
            <p className="my-4">
                Additionally, tools such as{" "}
                <FaqLink href="https://github.com/encounter/objdiff">
                    objdiff
                </FaqLink>{" "}
                and the{" "}
                <FaqLink href="https://github.com/simonlindholm/decomp-permuter">
                    decomp-permuter
                </FaqLink>{" "}
                support scratch creation via the site's API.
            </p>

            <Question question={"What's the context for?"} />
            <p className="my-4">
                The context section typically contains definitions and
                declarations such as structs, externs, macros, and function
                prototypes.
            </p>
            <p className="my-4">
                It is compiled together with your main code, allowing you to
                separate functional code from supporting definitions.
            </p>
            <p className="my-4">
                The context is also provided to the decompiler to improve type
                information and decompilation accuracy.
            </p>

            <Question question={"How does decomp.me work?"} />
            <p className="my-4">
                Your scratch code is sent to the decomp.me server, where it is
                compiled, disassembled with objdump, and compared against the
                target assembly.
            </p>
            <p className="my-4">
                As you edit code, it is recompiled automatically and the results
                update in near real time.
            </p>
            <p className="my-4">
                The editor displays a score representing how closely the
                compiled assembly matches the target. The score is calculated by
                comparing instructions and applying penalties for differences.
                Lower scores indicate closer matches.
            </p>

            <Question
                question={"Does decomp.me automatically decompile assembly?"}
            />
            <p className="my-4">Sometimes.</p>
            <p className="my-4">
                decomp.me can run the{" "}
                <FaqLink href="https://github.com/matt-kempster/m2c">
                    m2c
                </FaqLink>{" "}
                decompiler to generate an initial C approximation of a function.
                At the time of writing, m2c supports several architectures
                including MIPS, PowerPC, and ARM.
            </p>
            <p className="my-4">
                This output is intended as a starting point and usually requires
                manual refinement before it will match the original assembly.
            </p>
            <p className="my-4">
                Support for additional architectures or decompilers may be added
                in the future. Contributions are welcome if you'd like to help
                integrate them.
            </p>

            <Title title={"Workflow"} />

            <Question
                question={
                    "How does decomp.me fit into a decompilation project?"
                }
            />
            <p className="my-4">
                decomp.me is often used as a scratch space for experimenting
                with individual functions during a decompilation project.
            </p>
            <p className="my-4">
                Contributors use it to test ideas, share matching attempts, and
                ask for help with difficult functions. Once a match is found,
                the resulting code is usually added back to the project's
                repository.
            </p>
            <p className="my-4">
                It can also be useful for investigating compiler behavior, such
                as testing different compilers or flags.
            </p>

            <Question question={"Where do I start?"} />
            <p className="my-4">
                decomp.me is typically used alongside existing decompilation
                projects.
            </p>
            <p className="my-4">
                If you're new, try browsing recent scratches to see how others
                approach matching and experiment with modifying them.
            </p>
            <p className="my-4">
                We hope to make the site more beginner-friendly in the future.
            </p>

            <Question
                question={"Do I need a decompilation project to use decomp.me?"}
            />
            <p className="my-4">
                No. Anyone can create scratches and experiment with matching
                assembly or exploring compiler behaviour.
            </p>
            <p className="my-4">
                Many scratches come from larger decompilation projects, but
                decomp.me itself is not required to start one.
            </p>

            <Question question={"Can I upload a full binary?"} />
            <p className="my-4">
                No. decomp.me works with individual functions, not entire
                binaries. To use it, you will first need to extract assembly for
                a specific function using a disassembler or other
                reverse-engineering tools.
            </p>
            <p className="my-4">
                The extracted assembly (or a corresponding object file) can then
                be used to create a scratch.
            </p>

            <Title title={"Collaboration"} />

            <Question
                question={"Why use decomp.me instead of matching locally?"}
            />
            <p className="my-4">
                Many people match functions locally using their own toolchains.
            </p>
            <p className="my-4">
                decomp.me focuses on collaboration. Scratches can be shared with
                a link, allowing others to view the target assembly, experiment
                with changes, and suggest alternative approaches.
            </p>
            <p className="my-4">
                This makes it easy to ask for help, compare ideas, and iterate
                together without requiring everyone to set up the same
                environment.
            </p>

            <Question question={"Someone sent me a scratch. What do I do?"} />
            <p className="my-4">
                Any scratch on the site can be edited. If you save changes to a
                scratch you do not own, your version becomes a fork of the
                original.
            </p>
            <p className="my-4">
                If your fork either achieves a match or improves on the parent
                scratch, the original scratch will display a banner indicating
                the improvement or matching solution exists.
            </p>

            <Question question={"Can you help me match a scratch?"} />
            <p className="my-4">
                You are welcome to ask for help in the #general-decompilation
                channel of our <DiscordLink />.
            </p>

            <Title title={"Platforms and Compilers"} />

            <Question
                question={"Can you add a preset for a game I'm working on?"}
            />
            <p className="my-4">
                Yes. You can request one by opening a{" "}
                <FaqLink href="https://github.com/decompme/decomp.me/issues">
                    GitHub Issue
                </FaqLink>{" "}
                or asking in our <DiscordLink />.
            </p>

            <Question
                question={"Can I add a compiler for a game I'm working on?"}
            />
            <p className="my-4">
                Yes. The compilers used by decomp.me are stored in the{" "}
                <FaqLink href="https://github.com/decompme/compilers">
                    compilers repository
                </FaqLink>
                . After adding the compiler there, it can easily be integrated
                into decomp.me. See{" "}
                <FaqLink href="https://github.com/decompme/decomp.me/pull/910">
                    this PR
                </FaqLink>{" "}
                for an example.
            </p>

            <Question
                question={
                    "Can I add support for a new platform, e.g. PlayStation 3?"
                }
            />
            <p className="my-4">
                Platform support depends on the underlying tools used by
                decomp.me. To add a platform, you need:
            </p>
            <ul className="ml-8 list-disc">
                <li>a working compiler toolchain</li>
                <li>
                    tools for assembling and disassembling code (e.g. GNU as and
                    objdump)
                </li>
                <li>support in the assembly diffing tools used by decomp.me</li>
            </ul>
            <p className="my-4">
                If these pieces exist and integrate cleanly, support can usually
                be added. Most new platforms are contributed by developers
                already working on decompilation projects for that system.
            </p>
            <p className="my-4">
                If you're interested in adding support, feel free to open a
                GitHub issue or submit a pull request.
            </p>

            <Title title={"Project Info"} />

            <Question
                question={"Can I programmatically access decomp.me data?"}
            />
            <p className="my-4">
                We occasionally provide database dumps on request - just ask in
                our <DiscordLink />. Please do not attempt to scrape the site.
            </p>

            <Question question={"How do I report a bug?"} />
            <p className="my-4">
                If you encounter a bug, please contact us on our <DiscordLink />{" "}
                or open a{" "}
                <FaqLink href="https://github.com/decompme/decomp.me/issues">
                    GitHub Issue
                </FaqLink>{" "}
                describing how to reproduce it.
            </p>
            <p className="my-4">Bug-fixing pull requests are always welcome.</p>

            <Question question={"What's with the purple frog?"} />
            <p className="my-4">
                <Frog className="inline size-7" aria-label="Purple frog" /> was
                originally just a temporary placeholder logo. People liked it
                more than we anticipated, and the purple frog stuck around!
            </p>
        </main>
    );
}
