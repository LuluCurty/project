<script>
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" />
	<style>
		h1 {
			color: blue;
		}
	</style>
</svelte:head>
{@render children?.()}