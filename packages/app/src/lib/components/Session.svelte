<!--

    Session state component.

    Displays the user's avatar and name.

-->

<script lang="ts">
    import api from "@decompme/api"

    console.log(api)

    const promise = api.get("/user", {})
</script>

{#await promise}
	<p>...waiting</p> <!-- TODO loading spinner -->
{:then user}
    <!-- TODO: avatar -->
	<p>{user.username}</p>
{:catch error}
	<p style="color: red">{error.message}</p>
{/await}
