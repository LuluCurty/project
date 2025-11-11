<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/header.svelte';
	import Aside from '$lib/components/aside.svelte';
	import Footer from '$lib/components/footer.svelte';
	import { sideBarCollapsed } from '../lib/stores/stores'

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<style>h1{
		color: blue;
	}</style>
</svelte:head>

<div class="app-wrapper">
	<Header />

	<Aside />

	<main class="main-app-wrapper" class:collapsed={$sideBarCollapsed}>
		{@render children?.()}
	</main>

	<Footer />
</div>



