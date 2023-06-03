<script lang="ts">
    import SiteNav from "$lib/components/SiteNav.svelte"
</script>

<SiteNav />

<main>
    <header class="w-full py-16">
        <!--<WelcomeInfo />-->
    </header>
    <div class="mx-auto flex w-full max-w-screen-xl flex-col gap-16 p-8 md:flex-row">
        <section class="md:w-1/2 lg:w-1/4">
            <h2 class="mb-2 text-lg">Your scratches</h2>
            <!--<YourScratchList
                item={SingleLineScratchItem}
            />-->
        </section>
        <section class="md:w-1/2 lg:w-3/4">
            <h2 class="mb-2 text-lg">Recently updated</h2>
            <!--<ScratchList url="/scratch?page_size=30" />-->
        </section>
    </div>
</main>
