<script>
	// @ts-nocheck

	import { onMount } from 'svelte';
	import { LogOut } from '@lucide/svelte';
	import { CircleUserRound, Search } from '@lucide/svelte';
	import {ChevronDown} from '@lucide/svelte';
	import { userName } from '../stores/stores';

	function goToProfile() {
		window.location.href = '/profile.html';
	}
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
	let menuOpen = false;
	function toggleDropDown() {
		menuOpen = !menuOpen;
	}
	let announcement = {};

	onMount(async () => {
		announcement = await loadAnnouncement();
	});
</script>

<header class="app-header-wrapper">
	<div class="flexbox-vertical" id="header-left">
		<div id="logo-wrapper">
			<a href="http://eletricca.com.br"
				><img id="logo" src="http://10.242.241.230/public/imgs/icone.png" alt="Logo" /></a
			>
		</div>
		<div id="company-name">ELETRICCA</div>
	</div>

	<div id="annun-wrapper">
		<span id="announcement">{announcement.message}</span>
	</div>

	<div id="header-right" class="flexbox-vertical">
		<div id="header-search">
			<Search id='header-search-icon'/>
		</div>
		<div id="header-barrier"></div> 
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div aria-roledescription="profile-menu-button" id="profile-menu" onclick="{toggleDropDown}">
			<div id="profile-button" class="flexbox-vertical">
				<img src="" alt="" />
				<div class="user-name-wrapper">
					<span id="user-name">{$userName}</span>
				</div>
				<span class="header-dropbox-arrow">
					<ChevronDown id="header-arrow-down"/>
				</span>
			</div>
			<ul id="profile-menu-dropdown" class="dropdown header-dropbox" class:hidden={!menuOpen}>
				<li id="profile-button" class="profile-menu-dropdown-item">
					<button type="button" onclick={goToProfile}>
						<CircleUserRound class='dropbox-icons'/>
						<span>Perfil</span>
					</button>
				</li>
				<li class="profile-menu-dropdown-item">
					<button id="logout-button" type="button" onclick={logOut}>
						<LogOut class='dropbox-icons' />
						<span>logout</span>
					</button>
				</li>
			</ul>
		</div>
	</div>
</header>
