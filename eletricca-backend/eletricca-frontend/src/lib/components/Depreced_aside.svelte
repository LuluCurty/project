<script>
	// @ts-nocheck
	import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from '@lucide/svelte';
	import { House, Container, Users, CardSim, FileUser } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { sideBarCollapsed, userName } from '../stores/stores';
	import { writable } from 'svelte/store';
	import '$lib/assets/styles/aside.css';

	function toggleColapse() {
		sideBarCollapsed.update((v) => !v);
	}
	let filteredTabs = []; // abas permitidas
	let groupedTabs = {}; // agrupar abas em funcionalidades
	let dropdownState = writable({}); // controlar quais dropdowns estao ativos no momento
	let BASE_URL = '';
	onMount(async () => {
		BASE_URL =  window.location.origin;
		try {
			const res = await fetch(`/api/users/me`, { credentials: 'include' });
			if (!res.ok) {
				throw new Error('Erro ao obter data');
			}
			const data = await res.json();
			console.log(data)
			userName.set(data.user.first_name);
			const filtered = data.allowed_tabs.filter(
				(tab) => tab !== 'supplies_variation' && tab !== 'profile'
			);
			filteredTabs = filtered;
			groupedTabs = groupTabs(filteredTabs);
		} catch (error) {
			console.log(error);
			//emitir uma caixa de dialogo para o usuario
		}
	});
	function groupTabs(filteredTabs) {
		const grouped = [];
		for (const tab of filteredTabs) {
			if (tab.includes('_')) {
				const [group, sub] = tab.split('_');
				if (!grouped[group]) {
					grouped[group] = [];
				}
				grouped[group].push(sub);
			} else {
				grouped[tab] = [];
			}
		}
		return grouped;
	}
	function toggleSideBarDropdownItem(group) {
		dropdownState.update((state) => ({
			...state,
			[group]: !state[group]
		}));
	}
	function getHref(filteredTabs, subTab = null) {
		return `${BASE_URL}/${filteredTabs}/${subTab}`;
	}
	function capitalizeStr(str = '') {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
</script>

<aside class="app-aside-wrapper" class:collapsed={$sideBarCollapsed}>
	<div class="menu-title-wrapper">
		<div class="flexbox-vertical aside-bars">
			<div id="side-bar-name" class:hidden={$sideBarCollapsed}>Menus</div>
			<button id="toggleSideBar" data-state="expanded" onclick={toggleColapse}>
				{#if !$sideBarCollapsed}
					<ChevronLeft />
				{:else}
					<ChevronRight />
				{/if}
			</button>
		</div>
	</div>
	<nav>
		<ul id="nav-tablist-nav" class="pl-0! ml-0!">
			{#each Object.entries(groupedTabs) as [group, subTabs]}
				<li
					class=" hover:bg-[#252933]! [*]:font-bold
				[*]:text-sm [*]:text-[#8F9FB2] [*]:leading-11 [*]:h-11 w-full"
				>
					{#if subTabs.length > 0}
						<!-- TRATAR PRIMEIRO O DROPDOWN-->
						<!-- DROPDOWN-->
						<button
							type="button"
							aria-label="submenu-dropdown"
							class="hover:bg-[#252933]! flex
									items-center pl-6"
							onclick={() => toggleSideBarDropdownItem(group)}
						>
							<Container class="pr-2" />
							<span class:hidden={$sideBarCollapsed}
								>{capitalizeStr(group === 'supplies' ? 'Materiais' : '')}</span
							>
							<div class:hidden={$sideBarCollapsed}>
								{#if !$dropdownState[group]}
									<ChevronDown size={16} />
								{:else}
									<ChevronUp size={16} />
								{/if}
							</div>
						</button>
						<ul class="pl-0! ml-0!" class:hidden={!$dropdownState[group]}>
							<a
								class=" flex items-center pl-6 hover:bg-[#252933]"
								aria-label="menu"
								href="{getHref(group, '')}"
							>
								<li class="ml-0! pl-6! hover:bg-[#252933]">
									<span class:hidden={$sideBarCollapsed}
										>{capitalizeStr(group === 'supplies' ? 'Materiais' : '')}</span
									>
								</li>
							</a>
							{#each subTabs as subs}
								<a class:hidden={$sideBarCollapsed} aria-label="submenu" href="{getHref(group, subs)}">
									<li class="ml-0! pl-12! hover:bg-[#252933]">
										<span>{capitalizeStr(subs)}</span>
									</li>
								</a>
							{/each}
						</ul>
					{:else}
						{#if group === 'inicio'}
							<a
								class=" flex items-center pl-6 hover:bg-[#252933]"
								aria-label="menu"
								href="/"
							>
								<House class="pr-2" />
								<span class:hidden={$sideBarCollapsed}>{capitalizeStr(group)}</span>
							</a>
						{/if}
						{#if group === 'users'}
							<a
								class=" flex items-center pl-6 hover:bg-[#252933]"
								aria-label="menu"
								href="#tab-list"
							>
								<Users class="pr-2" />
								<span class:hidden={$sideBarCollapsed}>{capitalizeStr('usuarios')}</span>
							</a>
						{/if}
						{#if group === 'services'}
							<a
								class="flex items-center pl-6 hover:bg-[#252933]"
								aria-label="menu"
								href="#tab-list"
							>
								<CardSim class="pr-2" />
								<span class:hidden={$sideBarCollapsed}>{capitalizeStr('serviços')}</span>
							</a>
						{/if}
						{#if group === 'clientes'}
							<a 
								href="/client"
								aria-label="menu"
								class="flex items-center pl-6 hover:bg-[#252933]"
							>
								<FileUser class="pr-2"/>
								<span class:hidden={$sideBarCollapsed}>
									{capitalizeStr(group)}
								</span>
							</a>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
	</nav>
</aside>
