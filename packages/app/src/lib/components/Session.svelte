<!--

    Session state component.

    Displays the user's avatar and name.

-->

<script lang="ts">
    const promise = fetch("https://decomp.me/api/user",{
        credentials: "include",
        headers: {
            "Accept": "application/json",
        },
    }).then(res => res.json())
</script>

{#await promise}
	<p>...waiting</p> <!-- TODO loading spinner -->
{:then user}
    <!-- TODO: avatar -->
	<p>{user.username}</p>
{:catch error}
	<p style="color: red">{error.message}</p>
{/await}
