<script lang="ts">
    import {
        Plus,
        Search,
        EllipsisVertical,
        Pencil,
        Trash,
        ChevronLeft,
        Loader2,
        ChevronRight,
        User
    } from '@lucide/svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';

    // Componentes UI (Shadcn)
    import * as Table from '$lib/components/ui/table/index.js';
    import * as Card from '$lib/components/ui/card/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
    import { Input } from '$lib/components/ui/input/';
    import * as Pagination from "$lib/components/ui/pagination/index.js";

    // --- TIPAGEM ---
    // Baseada no teu schema SQL
    interface Client {
        id: number;
        client_first_name: string;
        client_last_name: string;
        client_telephone: string;
        client_email: string;
        creation_date: string; // Vem como string ISO do JSON
    }

    interface ApiResponse {
        clients: Client[];
        limit: number;
        ok: boolean;
        page: number;
        totalItems: number;
        totalPages: number;
    }

    // --- ESTADO ---
    let clients = $state<Client[]>([]);
    let isLoading = $state<boolean>(true);

    // Params da URL
    let search = $derived(page.url.searchParams.get('search') || '');
    let currentPage = $derived(Number(page.url.searchParams.get('page')) || 1);
    
    let limit = $state<number>(10);
    let totalItems = $state<number>(0);
    let searchTimeout: ReturnType<typeof setTimeout>;

    // --- AÇÕES ---

    async function deleteClient(id: number, name: string) {
        if (!confirm(`Deseja remover o cliente ${name}?`)) {
            return;
        }

        try {
            // Ajustar rota para API de clientes
            const res = await fetch(`/api/client/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            })    

            if (res.ok) {
                clients = clients.filter(c => c.id !== id);
                // Opcional: recarregar a lista se quiser atualizar a paginação corretamente
                // getClients(); 
            } else {
                alert('Erro ao excluir o cliente');
            };

        } catch (e) {
            console.error(e);
            alert('Erro ao apagar o cliente');
        }
    }

    async function getClients() {
        try {
            isLoading = true;

            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: limit.toString(),
                search: search.toString()
            })

            const res = await fetch(`/api/client?${params.toString()}`, {
                credentials: 'include'
            });

            if(res.ok){
                const data: ApiResponse = await res.json();
                clients = data.clients || [];
                totalItems = data.totalItems;
            }
        } catch (error) {
            console.error("Erro ao buscar clientes", error);
        } finally {
            isLoading = false;
        }
    };

    // Reage a mudanças na URL (search ou page)
    $effect(() => {
        // Apenas para triggar a reatividade
        const _p = currentPage; 
        const _s = search;
        getClients();
    });

    // Debounce na busca para não spamar a API
    function handleSearchInput(e: Event) {
        const target = e.target as HTMLInputElement;
        const value = target.value;

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const url = new URL(page.url);
            url.searchParams.set('search', value);
            url.searchParams.set('page', '1'); // Volta para pag 1 ao filtrar
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
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };
</script>

<div class="space-y-4">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
            <h2 class="text-2xl font-bold tracking-tight text-primary">Clientes</h2>
            <p class="text-muted-foreground">Gerencie a sua base de clientes.</p>
        </div>

        <div class="flex w-full items-center gap-2 sm:w-auto">
            <Button onclick={() => goto('/client/add')}>
                <Plus class="mr-2 size-4" /> Novo Cliente
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
                        placeholder="Buscar por nome ou email..."
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
                            <Table.Head>Cliente</Table.Head>
                            <Table.Head>Email</Table.Head>
                            <Table.Head>Telefone</Table.Head>
                            <Table.Head>Cadastro</Table.Head>
                            <Table.Head class="text-right">Ações</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#if isLoading}
                            <Table.Row>
                                <Table.Cell colspan={6} class="h-24 text-center">
                                    <div class="flex items-center justify-center gap-2">
                                        <Loader2 class="size-5 animate-spin text-primary" />
                                        <span class="text-muted-foreground">Carregando...</span>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        {:else if clients.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={6} class="h-24 text-center text-muted-foreground">
                                    Nenhum cliente encontrado.
                                </Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each clients as client (client.id)}
                                <Table.Row>
                                    <Table.Cell class="font-medium text-muted-foreground">
                                        #{client.id}
                                    </Table.Cell>
                                    
                                    <Table.Cell>
                                        <div class="flex items-center gap-2">
                                            <div class="bg-primary/10 p-1.5 rounded-full">
                                                <User class="size-4 text-primary" />
                                            </div>
                                            <span class="font-medium">
                                                {client.client_first_name} {client.client_last_name}
                                            </span>
                                        </div>
                                    </Table.Cell>

                                    <Table.Cell>{client.client_email}</Table.Cell>
                                    
                                    <Table.Cell>
                                        <Badge variant="outline">{client.client_telephone}</Badge>
                                    </Table.Cell>

                                    <Table.Cell class="text-muted-foreground text-sm">
                                        {formatDate(client.creation_date)}
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
                                                    onclick={() => goto(`/client/edit/${client.id}`)}
                                                >
                                                    <Pencil class="mr-2 size-4"/> Editar
                                                </DropdownMenu.Item>
                                                
                                                <DropdownMenu.Item 
                                                    class="text-destructive focus:text-destructive"
                                                    onclick={() => deleteClient(client.id, client.client_first_name)}
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