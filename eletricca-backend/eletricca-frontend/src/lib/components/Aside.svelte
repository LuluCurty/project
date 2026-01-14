<script lang="ts">
    import * as Avatar from '$lib/components/ui/avatar';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu'; // Usado apenas para o User Profile
    import logo from '$lib/assets/logo.png'; 
    import { layoutState } from '$lib/state/layoutState.svelte';
    import { enhance } from '$app/forms'; 
    import { page } from '$app/state';
    import AddFavoriteDialog from './AddFavoriteDialog.svelte';
    import { goto } from '$app/navigation';
    import { generateMenuFromRoutes } from '$lib/utils/menuGenerator'; // IMPORT DA LÓGICA
    import { slide } from 'svelte/transition'; // Para animação suave do dropdown

    import {
        EllipsisVertical,
        LogOut,
        User,
        Settings,
        Plus,
        Star,
        ExternalLink,
        ChevronRight,
        Trash2,
        ChevronDown
    } from '@lucide/svelte';

    // --- DADOS DO USUÁRIO ---
    const user = $derived(page.data.user || {
        first_name: "Usuario",
        last_name: "Desconhecido",
        email: '...',
    });

    // --- FAVORITOS ---
    let defaultFavorites = [
        { title: 'Google', url: 'https://google.com', is_internal: false },
    ];
    const favorites = $derived(page.data.favorites || defaultFavorites);
    let isFavoriteModalOpen = $state(false);

    // --- GERAÇÃO AUTOMÁTICA DE MENUS ---
    const menus = generateMenuFromRoutes();

    // Estado para controlar quais menus dropdown estão abertos
    // Ex: { 'Financeiro': true }
    let openMenus = $state<Record<string, boolean>>({});

    function toggleMenu(title: string) {
        if (layoutState.collapsed) return; // Não abre se o aside estiver fechado
        openMenus[title] = !openMenus[title];
    }

    // --- UTILITÁRIOS ---
    function handleLinkClick() {
        if (window.innerWidth < 768) {
            layoutState.closeMobile();
        }
    }

    // Verifica se a rota está ativa
    function isActive(href: string) {
        if (href === '/') return page.url.pathname === '/';
        return page.url.pathname.startsWith(href);
    }

    // Verifica se algum filho do dropdown está ativo para manter o menu aberto ou pintado
    function isParentActive(children: any[] | undefined) {
        return children?.some(c => isActive(c.href));
    }
</script>

{#if layoutState.mobileOpen}
    <div 
        class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
        onclick={() => layoutState.closeMobile()}
        aria-hidden="true"
    ></div>
{/if}

<aside
    class="
        fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r bg-card transition-all duration-300 ease-in-out
        md:sticky md:top-0 md:h-screen md:translate-x-0
        {layoutState.mobileOpen ? 'translate-x-0' : '-translate-x-full'}  
    "
    style="width: {layoutState.collapsed ? '80px' : '260px'};"
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

    <nav class="flex-1 space-y-1 overflow-x-hidden overflow-y-auto p-3 custom-scrollbar">
        <p class="px-3 pb-2 pt-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase opacity-70">
            {layoutState.collapsed ? '...' : 'Menu Principal'}
        </p>

        {#each menus as item}
            {#if item.type === 'dropdown'}
                <div>
                    <button
                        onclick={() => toggleMenu(item.title)}
                        class="group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors
                        {isParentActive(item.children) ? 'text-primary' : 'text-muted-foreground hover:bg-muted hover:text-primary'}
                        "
                    >
                        <div class="flex items-center gap-3">
                            <item.icon size={20}/>
                            {#if !layoutState.collapsed}
                                <span>{item.title}</span>
                            {/if}
                        </div>
                        
                        {#if !layoutState.collapsed}
                            <ChevronRight 
                                size={14} 
                                class="transition-transform duration-200 {openMenus[item.title] || isParentActive(item.children) ? 'rotate-90' : ''}" 
                            />
                        {/if}
                    </button>

                    {#if !layoutState.collapsed && (openMenus[item.title] || isParentActive(item.children))}
                        <div transition:slide={{ duration: 200 }} class="ml-9 mt-1 flex flex-col space-y-1 border-l pl-2">
                            {#each item.children as sub}
                                <a
                                    href={sub.href}
                                    onclick={handleLinkClick}
                                    class="block rounded-md px-3 py-1.5 text-sm transition-colors
                                    {isActive(sub.href) 
                                        ? 'bg-primary/10 text-primary font-semibold' 
                                        : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}"
                                >
                                    {sub.title}
                                </a>
                            {/each}
                        </div>
                    {/if}
                </div>

            {:else}
                <a
                    href={item.href}
                    onclick={handleLinkClick}
                    class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
                    {isActive(item.href) 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:bg-muted hover:text-primary'}"
                >
                    <item.icon size={20}/>
                    {#if !layoutState.collapsed}
                        <span>{item.title}</span>
                    {/if}
                </a>
            {/if}
        {/each}

        <div class="mt-6 border-t border-muted/50 pt-4">
            <div class="flex items-center justify-between px-3 pb-2">
                <p class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase opacity-70">
                    {layoutState.collapsed ? '*' : 'Atalhos'}
                </p>
                {#if !layoutState.collapsed}
                    <button onclick={() => isFavoriteModalOpen = true} class="text-muted-foreground hover:text-primary p-1 hover:bg-muted rounded">
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

    <div class="mt-auto border-t bg-card/50 p-3">
        <DropdownMenu.Root>
            <DropdownMenu.Trigger class="w-full outline-none">
                <div class="flex w-full items-center gap-3 rounded-md p-2 hover:bg-muted transition-colors">
                    <Avatar.Root class="h-8 w-8 rounded-lg border">
                        <Avatar.Fallback class="rounded-lg bg-primary/10 text-primary font-bold text-xs">
                            {user.first_name[0]}{user.last_name[0]}
                        </Avatar.Fallback>
                    </Avatar.Root>
                    {#if !layoutState.collapsed}
                        <div class="flex-1 text-left overflow-hidden">
                            <p class="truncate text-sm font-semibold">{user.first_name} {user.last_name}</p>
                            <p class="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <EllipsisVertical size={16} class="text-muted-foreground" />
                    {/if}
                </div>
            </DropdownMenu.Trigger>
            
            <DropdownMenu.Content class="w-56" align="end">
                 <DropdownMenu.Label>Minha Conta</DropdownMenu.Label>

                 <DropdownMenu.Separator />

                 <DropdownMenu.Item 
					class="cursor-pointer"
					onclick={() => goto('profile')}
				>
					<User size={16} class="mr-2" /> Perfil
				</DropdownMenu.Item>

                 <DropdownMenu.Item 
                    onclick={() => goto('/settings')}> <Settings size={14} class="mr-2"/> Configurações </DropdownMenu.Item>
                 <form action="/logout" method="POST" use:enhance>
                    <button type="submit" class="w-full">
                        <DropdownMenu.Item class="text-red-500 focus:text-red-500"> <LogOut size={14} class="mr-2"/> Sair </DropdownMenu.Item>
                    </button>
                 </form>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    </div>
</aside>

<AddFavoriteDialog bind:open={isFavoriteModalOpen}/>

<style>
    /* Estilização suave para scrollbar */
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--muted-foreground) / 0.2); border-radius: 4px; }
    .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: hsl(var(--muted-foreground) / 0.4); }

    @media (max-width: 768px) {
        aside { width: 18rem !important; }
    }
</style>