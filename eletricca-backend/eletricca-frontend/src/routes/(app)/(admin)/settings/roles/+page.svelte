<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { navigating } from '$app/state';

    // Componentes UI (Shadcn)
    import * as Table from '$lib/components/ui/table/index.js';
    import * as Card from '$lib/components/ui/card/index.js';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import * as Pagination from "$lib/components/ui/pagination/index.js";
    import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
    import { Input } from '$lib/components/ui/input/';
    
    // Ícones
    import { 
        Plus, Search, EllipsisVertical, Trash, 
        ChevronLeft, ChevronRight, Shield, LoaderCircle, Pencil
    } from '@lucide/svelte';

    // Recebe dados do servidor
    let { data } = $props();

    // Estado Derivado (Svelte 5)
    // Sempre que o 'data' mudar (pela navegação), essas variáveis atualizam
    let roles = $derived(data.roles);
    let totalItems = $derived(data.totalItems);
    let currentPage = $derived(data.page);
    let limit = $derived(data.limit);
    
    // Estado Local
    let searchTimeout: ReturnType<typeof setTimeout>;
    // Se navigating for booleano no seu sveltekit version ou objeto
    let isLoading = $derived(!!navigating.to); 

    // Formata permissões para visualização
    function formatPermissions(perms: string[]) {
        if (!perms || perms.length === 0) return 'Nenhuma';
        const limit = 3;
        if (perms.length <= limit) return perms.join(', ');
        return `${perms.slice(0, limit).join(', ')} e +${perms.length - limit}`;
    }

    let deleteForms: Record<number, HTMLFormElement> = $state({});
    // --- AÇÕES ---

    // Debounce na busca (espera parar de digitar)
    function handleSearchInput(e: Event) {
        const target = e.target as HTMLInputElement;
        const value = target.value;

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const url = new URL(page.url);
            url.searchParams.set('search', value);
            url.searchParams.set('page', '1'); // Volta para pag 1 ao filtrar
            
            // O goto dispara o load do servidor novamente
            goto(url.toString(), { keepFocus: true, noScroll: true });
        }, 500);
    };

    function handlePageChange(newPage: number) {
        const url = new URL(page.url);
        url.searchParams.set('page', newPage.toString());
        goto(url.toString(), { keepFocus: true });
    };
</script>

<div class="space-y-4">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
            <h2 class="text-2xl font-bold tracking-tight text-primary">Cargos</h2>
            <p class="text-muted-foreground">Gerencie os perfis de acesso e suas permissões.</p>
        </div>

        <div class="flex w-full items-center gap-2 sm:w-auto">
            <Button variant="default" onclick={() => goto('/settings/roles/add')}>
                <Plus class="mr-2 size-4" /> Novo Cargo
            </Button>
        </div>
    </div>

    <Card.Root>
        <Card.Header class="pb-3">
            <div class="flex items-center gap-2">
                <div class="relative w-full max-w-sm">
                    <Search class="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar cargo..."
                        class="w-full pl-9"
                        oninput={handleSearchInput}
                        defaultValue={page.url.searchParams.get('search') || ''} 
                    />
                </div>
            </div>
        </Card.Header>

        <Card.Content>
            <div class="rounded-md border">
                <Table.Root>
                    <Table.Header>
                        <Table.Row class="bg-muted/50">
                            <Table.Head class="w-[50px]">ID</Table.Head>
                            <Table.Head class="w-[200px]">Cargo</Table.Head>
                            <Table.Head>Permissões</Table.Head>
                            <Table.Head class="text-right">Ações</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    
                    <Table.Body>
                        {#if isLoading}
                            <Table.Row>
                                <Table.Cell colspan={4} class="h-24 text-center">
                                    <div class="flex items-center justify-center gap-2">
                                        <LoaderCircle class="size-5 animate-spin text-primary" />
                                        <span class="text-muted-foreground">Carregando...</span>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        {:else if roles.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={4} class="h-24 text-center text-muted-foreground">
                                    Nenhum cargo encontrado.
                                </Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each roles as role (role.id)}
                                <Table.Row>
                                    <Table.Cell class="font-medium text-muted-foreground">
                                        #{role.id}
                                    </Table.Cell>
                                    
                                    <Table.Cell>
                                        <div class="font-medium">{role.name}</div>
                                        {#if role.description}
                                            <div class="text-xs text-muted-foreground truncate max-w-[200px]">
                                                {role.description}
                                            </div>
                                        {/if}
                                    </Table.Cell>

                                    <Table.Cell>
                                        <div class="flex items-center gap-2" title={role.permissions.join('\n')}>
                                            <Shield class="size-3 text-muted-foreground shrink-0" />
                                            <span class="text-sm text-muted-foreground">
												{#if role.id === 1}
													Todas
												{:else} 
                                                	{formatPermissions(role.permissions)}
												{/if}
                                            </span>
                                        </div>
                                    </Table.Cell>

                                    <Table.Cell class="text-right">
                                        {#if role.id !== 1} 
                                            <form 
                                                action="?/delete" 
                                                method="POST"
                                                use:enhance
                                                bind:this={deleteForms[role.id]}
                                                class="hidden"
                                            >	
                                                <input type="hidden" name="id" value={role.id} />
                                            </form>
                                            <DropdownMenu.Root>
                                                <DropdownMenu.Trigger class={buttonVariants({ variant: "ghost", size: "icon"}) + " size-8"}>
                                                    <EllipsisVertical class="size-4" />
                                                    <span class="sr-only">Opções</span>
                                                </DropdownMenu.Trigger>

                                                <DropdownMenu.Content align="end">
                                                    <DropdownMenu.Item onclick={() => goto(`/settings/roles/${role.id}`)}>
                                                        <Pencil class="mr-2 size-4"/> Editar
                                                    </DropdownMenu.Item>
                                                    
                                                    <DropdownMenu.Item 
														class="text-destructive focus:text-destructive cursor-pointer"
														onclick={() => deleteForms[role.id]?.requestSubmit()}
													>
                                                        <Trash class="mr-2 size-4" /> Excluir
                                                    </DropdownMenu.Item>    
                                                </DropdownMenu.Content>
                                            </DropdownMenu.Root>
                                        {/if}
                                    </Table.Cell>
                                </Table.Row>
                            {/each}
                        {/if}
                    </Table.Body>
                </Table.Root>
            </div>

            {#if totalItems > 0}
                <div class="mt-4">
                    <Pagination.Root count={totalItems} perPage={limit} page={currentPage}>
                        {#snippet children({ pages, currentPage })}
                            <Pagination.Content>
                                <Pagination.Item>
                                    <Pagination.PrevButton
                                        class="cursor-pointer"
                                        disabled={currentPage <= 1}
                                        onclick={() => handlePageChange(currentPage - 1)}
                                    >
                                        <ChevronLeft class="size-4"/>
                                        <span class="hidden sm:block">Anterior</span>
                                    </Pagination.PrevButton>
                                </Pagination.Item>

                                {#each pages as page (page.key)}
                                    {#if page.type === 'ellipsis'}
                                        <Pagination.Item>
                                            <Pagination.Ellipsis />
                                        </Pagination.Item>
                                    {:else}
                                        <Pagination.Item>
                                            <Pagination.Link 
                                                {page} 
                                                isActive={currentPage === page.value}
                                                onclick={(e)=> {
                                                    e.preventDefault();
                                                    handlePageChange(page.value)
                                                }}
                                            >
                                                {page.value}
                                            </Pagination.Link>
                                        </Pagination.Item>
                                    {/if}
                                {/each}
                                
                                <Pagination.Item>
                                    <Pagination.NextButton
                                        onclick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage * limit >= totalItems}
                                        class="cursor-pointer"
                                    >
                                        <span class="hidden sm:block">Próximo</span>
                                        <ChevronRight class="size-4" />
                                    </Pagination.NextButton>
                                </Pagination.Item>
                            </Pagination.Content>
                        {/snippet}
                    </Pagination.Root>
                </div>
            {/if}
        </Card.Content>
    </Card.Root>
</div>