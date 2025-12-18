<script lang="ts">
    import * as Avatar from '$lib/components/ui/avatar';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import logo from '$lib/assets/logo.png'; // Caminho da sua imagem
    import { layoutState } from "$lib/state/layoutState.svelte";
    
    import { 
        House, Users, FileUser, Container, 
        EllipsisVertical, LogOut, User, Settings,
        Star, ExternalLink, ChevronRight
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
                { title: 'Fornecedores', href: '/supplies/suppliers' },
                { title: 'Listas', href: '/supplies/lists' }
            ]
        },
    ];

    // 2. Favoritos (Placeholder para banco de dados futuro)
    let favorites = [
        { title: 'Google', href: 'https://google.com', internal: false },
        { title: 'Relatório Trimestral', href: '/reports/q3', internal: true }
    ];

</script>

<aside
    class="border-r bg-card flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out"
    style="width: {layoutState.collapsed ? "80px" : "288px"};"
>
    <div class="h-16 flex items-center px-6 border-b overflow-hidden whitespace-nowrap">
        <div class="flex items-center gap-3">
            <img src="{logo}" alt="logo" class="size-8 object-contain rounded">
            {#if !layoutState.collapsed}
                <span class="font-bold text-xl tracking-tight text-primary transition-opacity">
                    Eletricca
                </span>
            {/if}
        </div>
    </div>

    <nav class="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
        <p class="text-[10px] font-bold text-muted-foreground px-2 pb-2 uppercase tracking-widest">
            {layoutState.collapsed? '...' : 'Menus'}
        </p>

        {#each menus as item}
            {#if item.dropdown}
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger class="w-full">
                        <div class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                            text-muted-foreground hover:bg-muted hover:text-primary transition-colors
                            cursor-pointer min-w-max
                            "
                        >
                            <item.icon size={18}/>
                            {#if !layoutState.collapsed}
                                <span class="flex-1 text-left">{item.title}</span>
                                <ChevronRight size={14} class="opacity-50"/>
                            {/if}
                        </div>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Content side="right" align="start" class="w-48">
                        <DropdownMenu.Label>{item.title}</DropdownMenu.Label>
                        <DropdownMenu.Separator/>
                        {#each item.dropdown as sub}
                            <DropdownMenu.Item>
                                <a href="{sub.href}" class="w-full">{sub.title}</a>
                            </DropdownMenu.Item>
                        {/each}
                    </DropdownMenu.Content>

                </DropdownMenu.Root>
            
            {:else}

                <a 
                    href={item.href}
                    class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                        text-muted-foreground hover:bg-muted hover:text-primary 
                        transition-colors min-w-max"
                >
                    <item.icon size={18}/>
                    {#if !layoutState.collapsed}
                        <span>{item.title}</span>
                    {/if}
                </a>
            {/if}
        {/each}

        <div class="pt-4 mt-4 border-t border-muted/50">
            <p class="text-[10px] font-bold text-muted-foreground px-2 pb-2 uppercase tracking-widest">
                {layoutState.collapsed? '*' : 'Favoritos'}
            </p>
            {#each favorites as fav}
                <a 
                    href={fav.href}
                    target={fav.internal ? '_self' : '_blank'}
                    class="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground/80 hover:bg-muted transition-colors min-w-max"
                >
                    <Star size={16} class={fav.internal ? 'text-yellow-500' : 'text-blue-400'}/>
                    {#if !layoutState.collapsed}
                        <span class="truncate w-40">{fav.title}</span>
                        {#if !fav.internal}
                            <ExternalLink size={12} class="opacity-30"/>
                        {/if}
                    {/if}
                </a>
            {/each}
        </div>
    </nav>

    <div class="p-4 border-t mt-auto bg-card/50">
        <DropdownMenu.Root>
            <DropdownMenu.Trigger class="w-full outline-none">
                <div class="flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-all text-left w-full overflow-hidden">
                    <Avatar.Root class="h-9 w-9 border shrink-0">
                        <Avatar.Fallback class="bg-primary text-primary-foreground text-xs font-bold uppercase">
                            {userData.first_name[0]} {userData.last_name[0]}
                        </Avatar.Fallback>
                    </Avatar.Root>

                    {#if !layoutState.collapsed}
                        <div class="flex-1 min-w-0 transition-opacity">
                            <p class="text-sm font-semibold truncate text-primary">
                                {userData.first_name} {userData.last_name}
                            </p>
                            <p class="text-xs text-muted-foreground truncate">
                                {userData.email}
                            </p>
                        </div>
                        <EllipsisVertical size={16} class="text-muted-foreground shrink-0"/>
                    {/if}
                </div>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content>
                <DropdownMenu.Label>Minha Conta</DropdownMenu.Label>

                <DropdownMenu.Separator />

                <DropdownMenu.Item class="cursor-pointer">
                    <User size={16} class="mr-2"/> Perfil
                </DropdownMenu.Item>


                <DropdownMenu.Item class="cursor-pointer">
                    <Settings size={16} class="mr-2"/> Configurações
                </DropdownMenu.Item>

                <DropdownMenu.Separator />

                <DropdownMenu.Item class="text-destructive cursor-pointer">
                    <LogOut size={16} class="mr-2"/> Sair
                </DropdownMenu.Item>


            </DropdownMenu.Content>
        </DropdownMenu.Root>
    </div>
</aside>