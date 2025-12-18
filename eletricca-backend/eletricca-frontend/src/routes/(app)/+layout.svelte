<script lang="ts">
	import '../../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Footer from '$lib/components/footer.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { sideBarCollapsed } from '$lib/stores/stores';

	import Aside from '$lib/components/Aside.svelte';
	import Header from '$lib/components/Header.svelte';
	// eu amo svelte :D

	let isAuthenticated = $state(false);

	onMount(async () => {
		try {
			const res = await fetch('/api/auth/check', {
				credentials: 'include'
			});

			if (!res.ok) {
				goto('/login');
			}

			const data = await res.json();
			isAuthenticated = data.authenticated;

			if (!isAuthenticated) {
				goto('/login');
			}

			isAuthenticated = true;
		} catch (e) {
			console.error(e);
		}
	});

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<style>
		h1 {
			color: blue;
		}
	</style>
</svelte:head>

	

<div class="flex min-h-screen w-full bg-background">
	<Aside/>

	<div class="flex flex-1 flex-col">
		<Header/>
		<main class="flex-1 p-6">
			<Tooltip.Provider>
				{@render children?.()}
			</Tooltip.Provider>			
		</main>
		<Footer/>
	</div>
</div>