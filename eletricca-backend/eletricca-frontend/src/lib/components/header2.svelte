<script>
	// @ts-nocheck

	import { onMount } from 'svelte';

    import { LucideLogOut } from '@lucide/svelte';
	//import lucide from 'lucide';

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
			<i data-lucide="search" id="header-search-icon"></i>
		</div>
		<div id="header-barrier"></div>
		<div id="profile-menu">
			<div id="profile-button" class="flexbox-vertical">
				<img src="" alt="" />
				<div class="user-name-wrapper">
					<span id="user-name">usuario</span>
				</div>
				<span class="header-dropbox-arrow">
					<i id="header-arrow-down" data-lucide="chevron-down"></i>
				</span>
			</div>
			<ul id="profile-menu-dropdown" class="dropdown header-dropbox hidden">
				<li id="profile-button" class="profile-menu-dropdown-item">
					<button type="button" onclick={goToProfile}>
						<i class="dropbox-icons" data-lucide="circle-user-round"></i>
						<span>Perfil</span>
					</button>
				</li>
				<li id="logout-button" class="profile-menu-dropdown-item">
					<button type="button" onclick={logOut}>
                        <Logout />
						<i class="dropbox-icons" data-lucide="log-out"></i>
						<span>logout</span>
					</button>
				</li>
			</ul>
		</div>
	</div>
</header>
