<script lang="ts">
	import '../../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Footer from '$lib/components/footer.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { Toaster } from '$lib/components/ui/sonner';

	import Aside from '$lib/components/Aside.svelte';
	import Header from '$lib/components/Header.svelte';
	// eu amo svelte :D

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<style>
		h1 {
			color: blue;
		}
	</style>
</svelte:head>

<Toaster/>

<div class="flex min-h-screen w-full bg-background">
	<Aside/>

	<div class="flex min-w-0 flex-1 flex-col transition-all duration-300">
		<Header announcement={data.announcement}/>
		<main class="flex-1 p-4 md:p-6 overflow-x-hidden">
			<Tooltip.Provider>
				{@render children?.()}
			</Tooltip.Provider>			
		</main>
		<Footer/>
	</div>
</div>