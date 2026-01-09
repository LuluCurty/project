<script lang="ts">
    import {
        Plus,
        Search,
        EllipsisVertical,
        Pencil,
        Trash,
        ChevronLeft,
        LoaderCircle,
        ChevronRight,
        Truck, // Ícone de caminhão para fornecedores
        MapPin
    } from 'lucide-svelte';
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

    // --- TIPAGEM (Baseada no teu Schema de Supplier) ---
    interface Supplier {
        id: number;
        supplier_name: string;
        supplier_email: string;
        supplier_telephone: string;
        supplier_address: string;
    }

    interface ApiResponse {
        suppliers: Supplier[];
        limit: number;
        ok: boolean;
        page: number;
        totalItems: number;
        totalPages: number;
    }

    // --- ESTADO ---
    let suppliers = $state<Supplier[]>([]);
    let isLoading = $state<boolean>(true);

    // Params da URL (Reatividade via Runes)
    let search = $derived(page.url.searchParams.get('search') || '');
    let currentPage = $derived(Number(page.url.searchParams.get('page')) || 1);
    
    let limit = $state<number>(10);
    let totalItems = $state<number>(0);
    let searchTimeout: ReturnType<typeof setTimeout>;

    // --- AÇÕES ---

    async function deleteSupplier(id: number, name: string) {
        if (!confirm(`Deseja remover o fornecedor ${name}?`)) {
            return;
        }

        try {
            // Nota: Rota singular ou plural dependendo do teu backend (/api/supplier ou /api/suppliers)
            const res = await fetch(`/api/supplier/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            })    

            if (res.ok) {
                suppliers = suppliers.filter(s => s.id !== id);
            } else {
                alert('Erro ao excluir o fornecedor. Verifique se ele tem materiais vinculados.');
            };

        } catch (e) {
            console.error(e);
            alert('Erro de conexão ao apagar.');
        }
    }

    async function getSuppliers() {
        try {
            isLoading = true;
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: limit.toString(),
                search: search.toString()
            })

            const res = await fetch(`/api/supplier?${params.toString()}`, {
                credentials: 'include'
            });
            if(res.ok){
                const data: ApiResponse = await res.json();
                suppliers = data.suppliers || [];
                totalItems = data.totalItems;
            }
        } catch (error) {
            console.error("Erro ao buscar fornecedores", error);
        } finally {
            isLoading = false;
        }
    };

    // Reage a mudanças na URL (search ou page)
    $effect(() => {
        const _p = currentPage; 
        const _s = search;
        getSuppliers();
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

</script>

<div class="space-y-4">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
            <h2 class="text-2xl font-bold tracking-tight text-primary">Fornecedores</h2>
            <p class="text-muted-foreground">Gerencie os seus parceiros de negócio.</p>
        </div>

        <div class="flex w-full items-center gap-2 sm:w-auto">
            <Button onclick={() => goto('suppliers/add')}>
                <Plus class="mr-2 size-4" /> Novo Fornecedor
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
                            <Table.Head>Fornecedor</Table.Head>
                            <Table.Head>Email</Table.Head>
                            <Table.Head>Telefone</Table.Head>
                            <Table.Head>Endereço</Table.Head>
                            <Table.Head class="text-right">Ações</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#if isLoading}
                            <Table.Row>
                                <Table.Cell colspan={6} class="h-24 text-center">
                                    <div class="flex items-center justify-center gap-2">
                                        <LoaderCircle class="size-5 animate-spin text-primary" />
                                        <span class="text-muted-foreground">Carregando...</span>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        {:else if suppliers.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={6} class="h-24 text-center text-muted-foreground">
                                    Nenhum fornecedor encontrado.
                                </Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each suppliers as supplier (supplier.id)}
                                <Table.Row>
                                    <Table.Cell class="font-medium text-muted-foreground">
                                        #{supplier.id}
                                    </Table.Cell>
                                    
                                    <Table.Cell>
                                        <div class="flex items-center gap-2">
                                            <div class="bg-blue-100 p-1.5 rounded-full text-blue-600">
                                                <Truck class="size-4" />
                                            </div>
                                            <span class="font-medium">
                                                {supplier.supplier_name}
                                            </span>
                                        </div>
                                    </Table.Cell>

                                    <Table.Cell>{supplier.supplier_email}</Table.Cell>
                                    
                                    <Table.Cell>
                                        {#if supplier.supplier_telephone}
                                            <Badge variant="outline">{supplier.supplier_telephone}</Badge>
                                        {:else}
                                            <span class="text-muted-foreground">-</span>
                                        {/if}
                                    </Table.Cell>

                                    <Table.Cell class="max-w-[200px] truncate" title={supplier.supplier_address}>
                                        <div class="flex items-center gap-1 text-muted-foreground text-sm">
                                            {#if supplier.supplier_address}
                                                <MapPin class="size-3" />
                                                {supplier.supplier_address}
                                            {:else}
                                                -
                                            {/if}
                                        </div>
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
                                                    onclick={() => goto(`/suppliers/edit/${supplier.id}`)}
                                                >
                                                    <Pencil class="mr-2 size-4"/> Editar
                                                </DropdownMenu.Item>
                                                
                                                <DropdownMenu.Item 
                                                    class="text-destructive focus:text-destructive"
                                                    onclick={() => deleteSupplier(supplier.id, supplier.supplier_name)}
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