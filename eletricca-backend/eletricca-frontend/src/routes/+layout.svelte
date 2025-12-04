<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { sideBarCollapsed } from '../lib/stores/stores'

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<style>h1{
		color: blue;
	}</style>
</svelte:head>

{@render children?.()}



