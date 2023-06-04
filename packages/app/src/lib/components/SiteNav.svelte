<!--

    Site-wide navigation.
    Renders as a hamburger menu icon that expands a sidebar on click.

-->

<script lang="ts">
    import { MenuIcon, XIcon } from "svelte-feather-icons"

    import Logotype from "./Logotype.svelte"
    import Session from "./Session.svelte"

    let isSidebarOpen = false
</script>

<nav class="flex items-center p-4 gap-4">
    <button
        class="inline-block"
        aria-label="Open site navigation"
        on:click={() => isSidebarOpen = true}
    >
        <MenuIcon />
    </button>

    <a href="/">
        <Logotype />
    </a>

    <div class="flex-grow"></div>

    <div>
        <Session />
    </div>
</nav>

<nav
    class="fixed top-0 left-0 h-screen w-full bg-zinc-900 z-10 overflow-y-auto p-4 shadow sm:max-w-xs"
    class:hidden={!isSidebarOpen}
    aria-label="Site navigation"
>
    <div class="flex items-center gap-4">
        <button aria-label="Close site navigation" on:click={() => isSidebarOpen = false}>
            <XIcon />
        </button>
        <a href="/">
            <Logotype />
        </a>
    </div>
    <ul class="flex flex-col items-stretch gap-4 py-4">
        <li>
            <a href="/" class="hover:underline">
                Dashboard
            </a>
        </li>
        <!--<li>
            <a href="/" class="hover:underline">
                Search
            </a>
        </li>-->
        <li>
            <a href="/" class="hover:underline">
                New scratch
            </a>
        </li>
        <li>
            <a href="/" class="hover:underline">
                Settings
            </a>
        </li>
    </ul>
</nav>
