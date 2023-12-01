import { ReactNode } from "react"

import Link from "next/link"

import Frog from "@/components/Nav/frog.svg"

const subtitle = "mt-8 text-xl font-semibold tracking-tight text-gray-11"

function FaqLink({ children, href }: { children: ReactNode, href?: string }) {
    return <Link href={href} className="hover:underline active:translate-y-px">
        {children}
    </Link>
}

export const metadata = {
    title: "Frequently Asked Questions",
}

export default function Page() {
    return <main className="mx-auto max-w-prose p-4 pb-2 text-justify text-base leading-normal">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-12 md:text-3xl">
            Frequently Asked Questions
        </h1>

        <h2 className={subtitle}>What is decomp.me?</h2>
        <p className="my-4">
            decomp.me is an interactive web-based platform where users can collaboratively decompile assembly code snippets by writing matching code.
        </p>
        <p className="my-4">
            It is an <FaqLink href="https://www.github.com/decomp.me">open source project</FaqLink> run by volunteers in their free time.
        </p>

        <h2 className={subtitle}>What do you mean by 'matching'?</h2>
        <p className="my-4">
            decomp.me is designed for users who are working on matching decompilation projects, where the goal is to produce high-level code like C or C++ that perfectly replicates the original assembly upon compilation.
        </p>
        <p className="my-4">
            This is a time and labor-intensive process. To produce matching assembly, one usually needs the original compiler, assembler, and flags that were used to produce the original binary.
            Most importantly, the code has to be written in such a way that the compiler will generate assembly that is identical to what is being compared against.
            Writing matching code is a skill that takes time to learn, but it can be very rewarding and addictive.
        </p>

        <h2 className={subtitle}>What's a scratch?</h2>
        <p className="my-4">
            A scratch is a workspace for exploring a compiler's codegen.
            A scratch consists of the target assembly, input source code, and input context code, as well as additional settings and metadata.
            Most scratches contain a single function - i.e. the function that you are trying to match.
            Each scratch has a unique link that can be shared with others. Scratches have a 'family' of forks, which are copies of the original scratch.
        </p>

        <h2 className={subtitle}>What's the context for?</h2>
        <p className="my-4">
            The context is a separate section of code that usually contains definitions and declarations, such as structs, externs, function declarations, and things of that nature.
            The context is passed to the compiler along with the code, so it's a good way to organize a scratch's functional code from its definitions and macros.
        </p>

        <p className="my-4">
            Context is also given to the decompiler to assist with typing information and more accurate decompilation.
        </p>

        <h2 className={subtitle}>How does decomp.me work?</h2>
        <p className="my-4">
            The code from your scratch is submitted to the decomp.me server where it is compiled, run through objdump, and then compared against the target assembly.
            As you modify your code in the editor, the changes will be sent to the backend and compiled, so you'll see the results of your change in near real-time.
            The similarity between the compiled code's assembly and the target assembly is represented by a score, which is displayed in the editor.
        </p>

        <p className="my-4">
            The score is calculated by comparing the assembly instructions in the compiled code to the target assembly, and a penalty of different size is applied based on the kind of difference present among assembly instructions.
        </p>

        <h2 className={subtitle}>Where do I start?</h2>
        <p className="my-4">
            Currently, this website is meant to be used as a supplementary tool along with an existing decompilation project.
            Eventually, we hope to make the website a little more friendly to complete newcomers who aren't involved with any specific project.
            In the meantime, feel free to explore recent scratches and get a feel for how matching decomp works!
        </p>

        <h2 className={subtitle}>Someone sent me a scratch. What do I do?</h2>
        <p className="my-4">
            Any scratch on the site can be played with. If you save a scratch that you don't own, your scratch will become a "fork" of the original.
            If you match the scratch, the original scratch will display a banner to notify visitors that the code is matched.
        </p>
        <p className="my-4">
            If you want to start your own scratch, you will need the assembly code for the function you are targetting in GNU assembly format.
        </p>

        <h2 className={subtitle}>Can you add a preset for a game I'm working on?</h2>
        <p className="my-4">
            Absolutely we can, either raise a <FaqLink href="https://github.com/decompme/decomp.me/issues">GitHub issue</FaqLink> or drop us a message in the Discord server.
        </p>

        <h2 className={subtitle}>Can you add a compiler for a game I'm working on?</h2>
        <p className="my-4">
            This is something that you are able to do yourself.
            The compilers used by decomp.me can be found in our <FaqLink href="https://github.com/decompme/compilers">compilers repository</FaqLink>.
            Once the compiler has been added to that repo, it is very simple to add it to decomp.me, see <FaqLink href="https://github.com/decompme/decomp.me/pull/910">this PR</FaqLink> for an example.
        </p>

        <h2 className={subtitle}>Can you add 'X' platform, e.g. PlayStation 3?</h2>
        <p className="my-4">
            The platforms that decomp.me supports are driven by the support for those platforms in the underlying tools that make up decomp.me.
            If these tools support the architecture for the new platform, and you have the compiler available, it is a straightforward process to add it to decomp.me.
        </p>

        <h2 className={subtitle}>How do I report a bug?</h2>
        <p className="my-4">
            If you come across a bug, please reach out to us on our Discord server and/or raise a <FaqLink href="https://github.com/decompme/decomp.me/issues">GitHub issue</FaqLink> containing the steps necessary to replicate the bug.
            We will gladly accept bug-squashing PRs if you are able to fix the issue yourself!
        </p>

        <h2 className={subtitle}>Why frog?</h2>
        <p className="my-4">
            <Frog className="h-7 w-7" aria-label="Purple frog" />
        </p>

    </main>
}
