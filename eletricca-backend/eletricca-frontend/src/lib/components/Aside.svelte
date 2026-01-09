<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import logo from '$lib/assets/logo.png'; //  
	import { layoutState } from '$lib/state/layoutState.svelte';
	import { enhance } from '$app/forms'; //
	import { page } from '$app/state';
	import AddFavoriteDialog from './AddFavoriteDialog.svelte';
	import { goto } from '$app/navigation';

	import {
		House,
		Users,
		FileUser,
		Container,
		EllipsisVertical,
		LogOut,
		User,
		Settings,
		Plus,
		Star,
		ExternalLink,
		ChevronRight
	} from '@lucide/svelte';
	import { Trash2 } from 'lucide-svelte';

	// 1b. Dados simulados conforme seu objeto real
	const user = $derived(page.data.user || {
		first_name: "Usuario",
		last_name: "Desconhecido",
		email: '...',
		initials: 'UD'
	})

	let defaultFavorites = [
		{ title: 'Google', url: 'https://google.com', is_internal: false },
		{ title: 'Relatório Trimestral', url: '/reports/q3', is_internal: true }
	];
	const favorites = $derived(page.data.favorites || defaultFavorites);
	let isFavoriteModalOpen = $state(false);
	console.log(page.data.user)

	function getInitials(f: string, l: string) {
		return (f?.[0] || '' + (l?.[0] || ''));
	}
	// Estrutura de menus organizada
	const menus = [
		{ title: 'Início', href: '/', icon: House },
		{ title: 'Usuários', href: '/users', icon: Users },
		{ title: 'Clientes', href: '/client', icon: FileUser },
		{
			title: 'Materiais',
			icon: Container,
			dropdown: [
				{ title: 'Lista Geral', href: '/supplies' },
				{ title: 'Fornecedores', href: '/suppliers' },
				{ title: 'Listas', href: '/supplies/lists' }
			]
		}
	];

	// Fechar quando clicar num link em mobileFirest 
	function handleLinkClick() {
		if (window.innerWidth < 768) {
			layoutState.closeMobile();
		}
	}
</script>

{#if layoutState.mobileOpen}
	<div 
		class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
		onclick={() => layoutState.closeMobile()}
		aria-hidden="true"
	>
	</div>
{/if}

<aside
	class="
		fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r bg-card  transition-all duration-300 ease-in-out
		md:sticky md:top-0 md:h-screen md:translate-x-0
		{layoutState.mobileOpen ? 'translate-x-0' : '-translate-x-full'}  
	"
	style="width: {layoutState.collapsed ? '80px' : '288px'};"
>
	<div class="flex h-16 items-center overflow-hidden border-b px-6 whitespace-nowrap">
		<div class="flex items-center gap-3">
			<img src={logo} alt="logo" class="size-8 rounded object-contain" />
			{#if !layoutState.collapsed}
				<span class="text-xl font-bold tracking-tight text-primary transition-opacity">
					Eletricca
				</span>
			{/if}
		</div>
	</div>

	<nav class="flex-1 space-y-2 overflow-x-hidden overflow-y-auto p-4">
		<p class="px-2 pb-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
			{layoutState.collapsed ? '...' : 'Menus'}
		</p>

		{#each menus as item}
			{#if item.dropdown}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger class="w-full">
						<div
							class="flex min-w-max cursor-pointer items-center gap-3 rounded-md px-3 py-2
                            text-sm font-medium text-muted-foreground transition-colors
                            hover:bg-muted hover:text-primary
                            "
						>
							<item.icon size={18} />
							{#if !layoutState.collapsed}
								<span class="flex-1 text-left">{item.title}</span>
								<ChevronRight size={14} class="opacity-50" />
							{/if}
						</div>
					</DropdownMenu.Trigger>

					<DropdownMenu.Content side="right" align="start" class="w-48">
						<DropdownMenu.Label>{item.title}</DropdownMenu.Label>
						<DropdownMenu.Separator />
						{#each item.dropdown as sub}
							<DropdownMenu.Item>
								<a href={sub.href} class="w-full">{sub.title}</a>
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{:else}
				<a
					href={item.href}
					class="flex min-w-max items-center gap-3 rounded-md px-3 py-2 text-sm
                        font-medium text-muted-foreground transition-colors
                        hover:bg-muted hover:text-primary"
				>
					<item.icon size={18} />
					{#if !layoutState.collapsed}
						<span>{item.title}</span>
					{/if}
				</a>
			{/if}
		{/each}

		<div class="mt-4 border-t border-muted/50 pt-4">
			<div class="flex items-center justify-between px-2 pb-2">
				<p class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
					{layoutState.collapsed ? '*' : 'Favoritos'}
				</p>
				{#if !layoutState.collapsed}
					<button
						onclick={() => isFavoriteModalOpen = true}
						title="Adicionar Favorito"
						class="text-muted-foreground hover:text-primary transition-colors p-1 rounded hover:bg-muted"
					>
						<Plus size={14}/>
					</button>
				{/if}
			</div>
			{#each favorites as fav}
				<div class="group relative flex items-center">
					<a
						href={fav.url}
						onclick={handleLinkClick}
						target={fav.is_internal ? '_self' : '_blank'}
						class="flex w-full min-w-max items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/80 transition-colors hover:bg-muted"
					>
						<Star size={16} class={fav.is_internal ? 'text-yellow-500' : 'text-blue-400'} />
						{#if !layoutState.collapsed}
							<span class="w-36 truncate" title={fav.title}>{fav.title}</span>
							{#if !fav.is_internal}
								<ExternalLink size={10} class="opacity-30 ml-1" />
							{/if}
						{/if}
					</a>

					{#if !layoutState.collapsed}
						<form
							action="/favorites?/delete"
							method="POST"
							use:enhance
							class="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity"
						>
							<input type="hidden" name="id" value={fav.id}>
							<button 
								type="submit"
								class="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive¹0 rounded-md transition-colors"
							>
								<Trash2 size={14}/>
							</button>
						</form>
					{/if}
				</div>
			{/each}
		</div>
	</nav>

	<div class="mt-auto border-t bg-card/50 p-4">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger class="w-full outline-none">
				<div
					class="flex w-full items-center gap-3 overflow-hidden rounded-md p-2 text-left transition-all hover:bg-muted"
				>
					<Avatar.Root class="h-9 w-9 shrink-0 border">
						<Avatar.Fallback class="bg-primary text-xs font-bold text-primary-foreground uppercase">
							{user.first_name[0]}
							{user.last_name[0]}
						</Avatar.Fallback>
					</Avatar.Root>

					{#if !layoutState.collapsed}
						<div class="min-w-0 flex-1 transition-opacity">
							<p class="truncate text-sm font-semibold text-primary">
								{user.first_name}
								{user.last_name}
							</p>
							<p class="truncate text-xs text-muted-foreground">
								{user.email}
							</p>
						</div>
						<EllipsisVertical size={16} class="shrink-0 text-muted-foreground" />
					{/if}
				</div>
			</DropdownMenu.Trigger>

			<DropdownMenu.Content>
				<DropdownMenu.Label>Minha Conta</DropdownMenu.Label>

				<DropdownMenu.Separator />

				<DropdownMenu.Item 
					class="cursor-pointer"
					onclick={() => goto('profile')}
				>
					<User size={16} class="mr-2" /> Perfil
				</DropdownMenu.Item>

				<DropdownMenu.Item 
					class="cursor-pointer"
					onclick={() => goto('/settings')}
				>
					<Settings size={16} class="mr-2" /> Configurações
				</DropdownMenu.Item>

				<DropdownMenu.Separator />

				<form action="/logout" method="POST" use:enhance class="w-full">
					<button type="submit" class="w-full text-left">
						<DropdownMenu.Item
							class="w-full cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
						>
							<LogOut size={16} class="mr-2" />
							Sair
						</DropdownMenu.Item>
					</button>
				</form>
                
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</aside>

<AddFavoriteDialog bind:open={isFavoriteModalOpen}/>

<style>
	@media (max-width: 768px) {
		aside {
			width: 18rem !important;
		}
	}
</style>