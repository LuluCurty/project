<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import logo from '$lib/assets/logo.png'; // Caminho da sua imagem
	import { layoutState } from '$lib/state/layoutState.svelte';
	import { enhance } from '$app/forms'; //

	import {
		House,
		Users,
		FileUser,
		Container,
		EllipsisVertical,
		LogOut,
		User,
		Settings,
		Star,
		ExternalLink,
		ChevronRight
	} from 'lucide-svelte';

	// 1b. Dados simulados conforme seu objeto real
	let userData = {
		first_name: 'Super',
		last_name: 'Admin',
		email: 'ti@eletricca.com.br'
	};

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

	// 2. Favoritos (Placeholder para banco de dados futuro)
	let favorites = [
		{ title: 'Google', href: 'https://google.com', internal: false },
		{ title: 'Relatório Trimestral', href: '/reports/q3', internal: true }
	];
</script>

<aside
	class="sticky top-0 flex h-screen flex-col border-r bg-card transition-all duration-300 ease-in-out"
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
			<p class="px-2 pb-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
				{layoutState.collapsed ? '*' : 'Favoritos'}
			</p>
			{#each favorites as fav}
				<a
					href={fav.href}
					target={fav.internal ? '_self' : '_blank'}
					class="flex min-w-max items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/80 transition-colors hover:bg-muted"
				>
					<Star size={16} class={fav.internal ? 'text-yellow-500' : 'text-blue-400'} />
					{#if !layoutState.collapsed}
						<span class="w-40 truncate">{fav.title}</span>
						{#if !fav.internal}
							<ExternalLink size={12} class="opacity-30" />
						{/if}
					{/if}
				</a>
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
							{userData.first_name[0]}
							{userData.last_name[0]}
						</Avatar.Fallback>
					</Avatar.Root>

					{#if !layoutState.collapsed}
						<div class="min-w-0 flex-1 transition-opacity">
							<p class="truncate text-sm font-semibold text-primary">
								{userData.first_name}
								{userData.last_name}
							</p>
							<p class="truncate text-xs text-muted-foreground">
								{userData.email}
							</p>
						</div>
						<EllipsisVertical size={16} class="shrink-0 text-muted-foreground" />
					{/if}
				</div>
			</DropdownMenu.Trigger>

			<DropdownMenu.Content>
				<DropdownMenu.Label>Minha Conta</DropdownMenu.Label>

				<DropdownMenu.Separator />

				<DropdownMenu.Item class="cursor-pointer">
					<User size={16} class="mr-2" /> Perfil
				</DropdownMenu.Item>

				<DropdownMenu.Item class="cursor-pointer">
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
