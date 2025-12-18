<script>
	// @ts-nocheck

	import { onMount } from 'svelte';
	import { LogOut } from '@lucide/svelte';
	import { CircleUserRound, Search } from '@lucide/svelte';
	import { ChevronDown } from '@lucide/svelte';
	import { userName } from '../stores/stores';
	import * as Avatar from '$lib/components/ui/avatar/index';

	async function logOut() {
		try {
			const res = await fetch(`/api/auth/logout`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include'
			});

			const data = await res.json();
			if (data.ok) {
				console.log('Deslogado');
				// futaramente vai fazer um evento de deslogue antes de jogar para a pagina de login
			}
			window.location.href = window.location.origin;
		} catch (error) {
			console.error(error);
			// futuramente vai fazer um evento de erro de tela.
		}
	}
	async function loadAnnouncement() {
		try {
			const res = await fetch(`/api/ann`, {
				credentials: 'include'
			});
			if (!res.ok) return '';

			const announcement = await res.json();
			return announcement;
		} catch (error) {
			console.error(error);
			// futuramente vai fazer um evento de erro de tela.
		}
	}

	let announcement = {};

	onMount(async () => {
		announcement = await loadAnnouncement();
	});
</script>

<header class="app-header-wrapper">
	
	<div id="annun-wrapper">
		<span id="announcement">{announcement.message}</span>
	</div>


</header>
