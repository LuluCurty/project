<script lang="ts">
    import {
        Plus,
        Search,
        EllipsisVertical,
        Pencil,
        Trash,
        ChevronLeft,
        ChevronRight,
        FileText,
        ArrowUp,
        ArrowRight,
        ArrowDown,
        LoaderCircle
    } from 'lucide-svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';

    // Componentes Shadcn
    import * as Table from '$lib/components/ui/table/index.js';
    import * as Card from '$lib/components/ui/card/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
    import { Input } from '$lib/components/ui/input/';
    import * as Pagination from "$lib/components/ui/pagination/index.js";

    // --- TIPAGEM ---
    type ListStatus = "denied" | "pending" | "approved";
    type Priority = "low" | "medium" | "high";

    interface SupplyList {
        id: number;
        list_name: string;
        list_status: ListStatus;
        priority: Priority;
        client_id: number;
        created_by: number;
        creation_date: string;
        // Campos vindos do JOIN
        client_first_name?: string;
        client_last_name?: string;
        creator_name?: string;
        creator_first_name?: string;
        creator_last_name?: string;
    }

    interface ApiResponse {
        lists: SupplyList[];
        limit: number;
        ok: boolean;
        page: number;
        totalItems: number;
        totalPages: number;
    }

    // --- ESTADO ---
    let lists = $state<SupplyList[]>([]);
    let isLoading = $state<boolean>(true);

    // Params da URL
    let search = $derived(page.url.searchParams.get('search') || '');
    let currentPage = $derived(Number(page.url.searchParams.get('page')) || 1);
    
    let limit = $state<number>(10);
    let totalItems = $state<number>(0);
    let searchTimeout: ReturnType<typeof setTimeout>;

    // --- AÇÕES ---

    async function deleteList(id: number, name: string) {
        if (!confirm(`Deseja apagar a lista "${name}" e todos os seus itens?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/suplist/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (res.ok) {
                lists = lists.filter(l => l.id !== id);
            } else {
                alert('Erro ao excluir a lista.');
            }
        } catch (e) {
            console.error(e);
            alert('Erro de conexão ao apagar.');
        }
    }

    async function getLists() {
        try {
            isLoading = true;
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: limit.toString(),
                search: search.toString()
            });

            const res = await fetch(`/api/suplist?${params.toString()}`, {
                credentials: 'include'
            });

            if (res.ok) {
                const data: ApiResponse = await res.json();
                console.log(data)
                lists = data.lists || [];
                totalItems = data.totalItems;
            }
        } catch (error) {
            console.error("Erro ao buscar listas", error);
        } finally {
            isLoading = false;
        }
    };

    // Reatividade
    $effect(() => {
        const _p = currentPage; 
        const _s = search;
        getLists();
    });

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
        }, 800);
    };

    function handlePageChange(newPage: string) {
        const url = new URL(page.url);
        url.searchParams.set('page', newPage.toString());
        goto(url.toString(), { keepFocus: true });
    };

    function formatDate(dateString: string) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    // --- Helpers Visuais ---
    function getStatusColor(status: ListStatus) {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800 hover:bg-green-100';
            case 'denied': return 'bg-red-100 text-red-800 hover:bg-red-100';
            default: return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
        }
    }

    function getStatusLabel(status: ListStatus) {
        switch (status) {
            case 'approved': return 'Aprovado';
            case 'denied': return 'Recusado';
            default: return 'Pendente';
        }
    }

    function getPriorityIcon(priority: Priority) {
        // Retorna um snippet de componente ou config
        return priority; 
    }
</script>

<div class="space-y-4">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
            <h2 class="text-2xl font-bold tracking-tight text-primary">Listas de Materiais</h2>
            <p class="text-muted-foreground">Gerencie orçamentos e listas de compras.</p>
        </div>

        <div class="flex w-full items-center gap-2 sm:w-auto">
            <Button onclick={() => goto('/supplies/lists/add')}>
                <Plus class="mr-2 size-4" /> Nova Lista
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
                        placeholder="Buscar por lista ou cliente..."
                        class="w-full pl-9"
                        oninput={handleSearchInput}
                        value={search} 
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
                            <Table.Head>Nome da Lista</Table.Head>
                            <Table.Head>Cliente</Table.Head>
                            <Table.Head>Status</Table.Head>
                            <Table.Head>Prioridade</Table.Head>
                            <Table.Head>Criado Em</Table.Head>
                            <Table.Head>Criado Por</Table.Head>
                            <Table.Head class="text-right">Ações</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#if isLoading}
                            <Table.Row>
                                <Table.Cell colspan={7} class="h-24 text-center">
                                    <div class="flex items-center justify-center gap-2">
                                        <LoaderCircle class="size-5 animate-spin text-primary" />
                                        <span class="text-muted-foreground">Carregando...</span>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        {:else if lists.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={7} class="h-24 text-center text-muted-foreground">
                                    Nenhuma lista encontrada.
                                </Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each lists as list (list.id)}
                                <Table.Row>
                                    <Table.Cell class="font-medium text-muted-foreground">
                                        #{list.id}
                                    </Table.Cell>
                                    
                                    <Table.Cell>
                                        <div class="flex items-center gap-2">
                                            <div class="bg-slate-100 p-1.5 rounded-md">
                                                <FileText class="size-4 text-slate-600" />
                                            </div>
                                            <span class="font-medium">{list.list_name}</span>
                                        </div>
                                    </Table.Cell>

                                    <Table.Cell>
                                        {#if list.client_first_name}
                                            {list.client_first_name} {list.client_last_name}
                                        {:else}
                                            <span class="text-muted-foreground italic">Sem cliente</span>
                                        {/if}
                                    </Table.Cell>
                                    
                                    <Table.Cell>
                                        <Badge variant="outline" class={getStatusColor(list.list_status)}>
                                            {getStatusLabel(list.list_status)}
                                        </Badge>
                                    </Table.Cell>

                                    <Table.Cell>
                                        <div class="flex items-center gap-1 text-sm">
                                            {#if list.priority === 'high'}
                                                <ArrowUp class="size-4 text-red-500" />
                                                <span class="text-red-600 font-medium">Alta</span>
                                            {:else if list.priority === 'medium'}
                                                <ArrowRight class="size-4 text-orange-500" />
                                                <span class="text-orange-600">Média</span>
                                            {:else}
                                                <ArrowDown class="size-4 text-slate-400" />
                                                <span class="text-slate-500">Baixa</span>
                                            {/if}
                                        </div>
                                    </Table.Cell>

                                    <Table.Cell class="text-muted-foreground text-xs">
                                        {formatDate(list.creation_date)}
                                    </Table.Cell>

                                    <Table.Cell>
                                        {list.creator_first_name} {list.creator_last_name}
                                    </Table.Cell>

                                    <Table.Cell class="text-right">
                                        <DropdownMenu.Root>
                                            <DropdownMenu.Trigger
                                                class={buttonVariants({ variant: "ghost", size: "icon"}) + " size-8"}
                                            >
                                                <EllipsisVertical class="size-4" />
                                                <span class="sr-only">Opções</span>
                                            </DropdownMenu.Trigger>

                                            <DropdownMenu.Content align="end">
                                                <DropdownMenu.Item
                                                    onclick={() => goto(`/supplies/lists/edit/${list.id}`)}
                                                >
                                                    <Pencil class="mr-2 size-4"/> Ver / Editar
                                                </DropdownMenu.Item>
                                                
                                                <DropdownMenu.Item 
                                                    class="text-destructive focus:text-destructive"
                                                    onclick={() => deleteList(list.id, list.list_name)}
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
                                        onclick={() => handlePageChange((currentPage - 1).toString())}
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
                                                    handlePageChange((page.value).toString())
                                                }}
                                            >
                                                {page.value}
                                            </Pagination.Link>
                                        </Pagination.Item>
                                    {/if}
                                {/each}
                                
                                <Pagination.Item>
                                    <Pagination.NextButton
                                        onclick={() => handlePageChange((currentPage + 1).toString())}
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