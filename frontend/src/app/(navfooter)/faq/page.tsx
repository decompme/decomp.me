import Link from "next/link"

import Frog from "../../../components/Nav/frog.svg"

const subtitle = "mt-8 text-xl font-semibold tracking-tight text-gray-11"

export const metadata = {
    title: "Frequently Asked Questions",
}

function FaqLink({children, href}: { children: ReactNode, href?: string }) {
    return <Link href={href} className="hover:underline active:translate-y-px">
        {children}
    </Link>
}

export default function Page() {
    return <main className="mx-auto max-w-prose p-4 pb-2 text-justify text-base leading-normal">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-12 md:text-3xl">
            Frequently Asked Questions
        </h1>

        <h2 className={subtitle}>What is decomp.me?</h2>
        <p className="my-4">
            decomp.me is a platform that allows users to upload assembly code snippets and write code in an attempt to match them, all within their browser.
        </p>
        <p className="my-4">
            It is an <FaqLink href="https://www.github.com/decomp.me">open source project</FaqLink> run by volunteers in their free time.
        </p>

        <h2 className={subtitle}>What do you mean by 'match them'?</h2>
        <p className="my-4">
            decomp.me is designed for users who are working on matching decompilation projects, where the goal is to write high level (e.g. C or C++) code that, when compiled, matches the original binary perfectly.
        </p>
        <p className="my-4">
            This is a time and labour intensive process and requires the correct compiler, assembler, with correct options selected in addition to the correct code!
        </p>

        <h2 className={subtitle}>What's a 'scratch'?</h2>
        <p className="my-4">
            A 'scratch' consists of the target assembly, input source code, and input context code.
            Most scratches contain a single function - i.e. the function that you are trying to match.
            Each scratch has a unique link that can be shared.
        </p>

        <h2 className={subtitle}>What's the 'context' for?</h2>
        <p className="my-4">
            The context is a separate section of code that is passed to the decompiler when your target assembly is uploaded.
            It's used to give context to the decompiler, for example adding variables, struct definitions, function signatures and type definitions.
        </p>

        <h2 className={subtitle}>How does decomp.me work?</h2>
        <p className="my-4">
            The code from your scratch is submitted to the decomp.me server where it is compiled, objdump'ed and then compared against the target assembly.
            As you modify your code in the editor, the changes will be sent to the backend and compiled, so you'll see the results of your change in near real-time.
        </p>

        <h2 className={subtitle}>Where do I start?</h2>
        <p className="my-4">
            You can work on existing scratches on the site, if you make progress you can save your scratch which will result in a 'fork' of the original.
            If you match the scratch, the original scratch will display a banner to notify visitors that the code is matched.
        </p>
        <p className="my-4">
            If you want to start your own scratch you will need the assembly code for a the function you are targetting in GNU assembly format.
        </p>

        <h2 className={subtitle}>Can you add 'X' platform? e.g. PlayStation 3</h2>
        <p className="my-4">
            The platforms that decomp.me supports are driven by the support for those platforms in the underlying tools that make up decomp.me.
            If these tools support the architecture for the new platform, and you have the compiler available, it is a straightforward process to add it to decomp.me.
        </p>

        <h2 className={subtitle}>How do I report bugs?</h2>
        <p className="my-4">
            If you come across a bug, please reach out to us on our Discord server and/or raise a <FaqLink href="https://github.com/decompme/decomp.me/issues">GitHub issue</FaqLink> containing the steps necessary to replicate the bug.
        </p>

        <h2 className={subtitle}>Why frog?</h2>
        <p className="my-4">
            <Frog className="h-7 w-7" aria-label="Purple frog" />
        </p>

    </main>
}
