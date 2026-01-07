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
    import { Badge } from '$lib/components/ui/badge/index.js';
    
    // Ícones
    import { 
        Plus, Search, EllipsisVertical, Trash, 
        ChevronLeft, ChevronRight, Package, LoaderCircle, Pencil, Layers
    } from '@lucide/svelte';

    // Recebe dados do servidor
    let { data } = $props();

    // Estado Derivado (Svelte 5)
    // Nota: O backend de permissões retorna um objeto 'pagination' aninhado
    let modules = $derived(data.modules);
    let totalItems = $derived(data.pagination.totalItems);
    let currentPage = $derived(data.pagination.page);
    let limit = $derived(data.pagination.limit);
    
    // Estado Local
    let searchTimeout: ReturnType<typeof setTimeout>;
    let isLoading = $derived(!!navigating.to); 

    // Formata data para exibição
    function formatDate(dateString: string | Date) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: '2-digit'
        });
    }

    // Mapa de formulários (Chave é string pois o ID do módulo é o nome)
    let deleteForms: Record<string, HTMLFormElement> = $state({});

    // --- AÇÕES ---

    // Debounce na busca
    function handleSearchInput(e: Event) {
        const target = e.target as HTMLInputElement;
        const value = target.value;

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const url = new URL(page.url);
            url.searchParams.set('search', value);
            url.searchParams.set('page', '1'); 
            
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
            <h2 class="text-2xl font-bold tracking-tight text-primary">Módulos & Permissões</h2>
            <p class="text-muted-foreground">Gerencie os grupos de acesso do sistema.</p>
        </div>

        <div class="flex w-full items-center gap-2 sm:w-auto">
            <Button variant="default" onclick={() => goto('/settings/permissions/add')}>
                <Plus class="mr-2 size-4" /> Nova Permissão
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
                        placeholder="Buscar módulo..."
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
                            <Table.Head>Módulo</Table.Head>
                            <Table.Head>Qtd. Regras</Table.Head>
                            <Table.Head>Última Atualização</Table.Head>
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
                        {:else if modules.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={4} class="h-24 text-center text-muted-foreground">
                                    Nenhum módulo encontrado.
                                </Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each modules as mod (mod.name)}
                                <Table.Row>
                                    
                                    <Table.Cell>
                                        <div class="flex items-center gap-2">
                                            <div class="bg-primary/10 p-1.5 rounded-full">
                                                <Layers class="size-4 text-primary" />
                                            </div>
                                            <span class="font-medium capitalize">
                                                {mod.name || 'Geral'}
                                            </span>
                                        </div>
                                    </Table.Cell>

                                    <Table.Cell>
                                        <Badge variant="secondary" class="font-mono text-xs">
                                            {mod.permission_count}
                                        </Badge>
                                    </Table.Cell>

                                    <Table.Cell class="text-muted-foreground text-sm">
                                        {formatDate(mod.last_created_at)}
                                    </Table.Cell>

                                    <Table.Cell class="text-right">
                                        <form 
                                            action="?/deleteModule" 
                                            method="POST"
                                            use:enhance
                                            bind:this={deleteForms[mod.name]}
                                            class="hidden"
                                        >   
                                            <input type="hidden" name="module_name" value={mod.name} />
                                        </form>

                                        <DropdownMenu.Root>
                                            <DropdownMenu.Trigger class={buttonVariants({ variant: "ghost", size: "icon"}) + " size-8"}>
                                                <EllipsisVertical class="size-4" />
                                                <span class="sr-only">Opções</span>
                                            </DropdownMenu.Trigger>

                                            <DropdownMenu.Content align="end">
                                                <DropdownMenu.Item onclick={() => goto(`/settings/permissions/${encodeURIComponent(mod.name)}`)}>
                                                    <Pencil class="mr-2 size-4"/> Editar
                                                </DropdownMenu.Item>
                                                
                                                <DropdownMenu.Item 
                                                    class="text-destructive focus:text-destructive cursor-pointer"
                                                    onclick={() => {
                                                        // Confirmação extra pois apaga várias permissões de uma vez
                                                        if(confirm(`Tem certeza? Isso apagará TODAS as permissões do módulo "${mod.name}".`)) {
                                                            deleteForms[mod.name]?.requestSubmit()
                                                        }
                                                    }}
                                                >
                                                    <Trash class="mr-2 size-4" /> Excluir
                                                </DropdownMenu.Item>    
                                            </DropdownMenu.Content>
                                        </DropdownMenu.Root>
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