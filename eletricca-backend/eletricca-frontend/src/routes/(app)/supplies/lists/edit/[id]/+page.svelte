<script lang="ts">
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { Plus, X, Trash2, Save, ChevronLeft, Search, Loader2, PackageOpen, History } from '@lucide/svelte';

    // UI Components
    import * as Card from '$lib/components/ui/card';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Button } from '$lib/components/ui/button';
    import { Textarea } from '$lib/components/ui/textarea';
    import * as Tabs from "$lib/components/ui/tabs";
    import * as Table from "$lib/components/ui/table";
    import { Badge } from "$lib/components/ui/badge";
    import * as Select from '$lib/components/ui/select';
    
    // --- TIPAGEM ---
    interface Client { id: number; client_first_name: string; client_last_name: string; client_email: string; }
    interface Supply { id: number; supply_name: string; }
    interface Supplier { id: number; supplier_name: string; price?: number; }
    
    interface ListItem {
        id?: number;
        supply: Supply;
        supplier: Supplier;
        quantity: number;
        price: number;
    }

    // --- ESTADO ---
    let listId = page.params.id;
    let isLoadingData = $state(true);
    let isSaving = $state(false);
    let formError = $state(''); 

    // Dados da Lista
    let listData = $state({
        name: '',
        description: '',
        priority: 'medium',
        status: 'pending', // Novo campo
        client: null as Client | null
    });

    // Novo Item
    let newItem = $state({
        supply: null as Supply | null,
        supplier: null as Supplier | null,
        quantity: 1,
        price: 0
    });

    let listItems = $state<ListItem[]>([]);
    
    let totalValue = $derived(
        listItems.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    );

    // --- BUSCA (Reuse logic) ---
    let search = $state({ client: '', supply: '', supplier: '' });
    let suggestions = $state({ client: [] as Client[], supply: [] as Supply[], supplier: [] as Supplier[] });
    let showSuggestions = $state({ client: false, supply: false, supplier: false });
    let searchTimeout: ReturnType<typeof setTimeout>;

    // --- CARREGAR DADOS INICIAIS ---
    onMount(async () => {
        try {
            const res = await fetch(`/api/suplist/${listId}`);
            if (!res.ok) throw new Error('Lista não encontrada');
            
            const data = await res.json();
            
            // 1. Preencher Cabeçalho
            listData.name = data.list_name;
            listData.description = data.description || '';
            listData.priority = data.priority;
            listData.status = data.list_status;
            
            // Preencher Cliente (se existir)
            if (data.client_id) {
                listData.client = {
                    id: data.client_id,
                    client_first_name: data.client_first_name,
                    client_last_name: data.client_last_name,
                    client_email: data.client_email
                };
            }

            // 2. Preencher Itens (Converter do formato SQL para o formato Frontend)
            listItems = data.items.map((item: any) => ({
                id: item.id,
                quantity: item.quantity,
                price: Number(item.price),
                supply: {
                    id: item.supply_id,
                    supply_name: item.supply_name
                },
                supplier: {
                    id: item.supplier_id,
                    supplier_name: item.supplier_name
                }
            }));

        } catch (error) {
            console.error(error);
            alert('Erro ao carregar lista.');
            goto('/supplies/lists');
        } finally {
            isLoadingData = false;
        }
    });

    // --- FUNÇÕES DE BUSCA ---
    async function handleSearch(type: 'client' | 'supply' | 'supplier', query: string) {
        search[type] = query;
        clearTimeout(searchTimeout);
        if (query.length < 3) {
            suggestions[type] = []; showSuggestions[type] = false; return;
        }
        searchTimeout = setTimeout(async () => {
            try {
                let url = '';
                if (type === 'client') url = `/api/client/search?search=${encodeURIComponent(query)}`;
                if (type === 'supply') url = `/api/supplies/search?q=${encodeURIComponent(query)}`;
                if (type === 'supplier') url = `/api/supplier/search?search=${encodeURIComponent(query)}`;

                const res = await fetch(url, {
                    credentials: 'include'
                });
                if (res.ok) {
                    const data = await res.json();
                    suggestions[type] = data.rows || data.supplies || []; 
                    showSuggestions[type] = true;
                }
            } catch (e) { console.error(e); }
        }, 300);
    }

    function selectItem(type: 'client' | 'supply' | 'supplier', item: any) {
        if (type === 'client') listData.client = item;
        if (type === 'supply') newItem.supply = item;
        if (type === 'supplier') { newItem.supplier = item; if (item.price) newItem.price = item.price; }
        search[type] = ''; showSuggestions[type] = false;
    }

    function addItemToList() {
        formError = '';
        if (!newItem.supply || !newItem.supplier) { formError = 'Selecione material e fornecedor.'; return; }
        if (newItem.quantity <= 0) { formError = 'Qtd inválida.'; return; }

        listItems = [...listItems, {
            supply: newItem.supply,
            supplier: newItem.supplier,
            quantity: Number(newItem.quantity),
            price: Number(newItem.price)
        }];
        newItem.supply = null; newItem.supplier = null; newItem.quantity = 1; newItem.price = 0;
    }

    function removeItem(index: number) {
        listItems = listItems.filter((_, i) => i !== index);
    }

    // --- SALVAR (PUT) ---
    async function updateList() {
        if (!listData.name || !listData.client) { alert('Preencha Nome e Cliente.'); return; }
        if (listItems.length === 0) { alert('Lista vazia.'); return; }

        isSaving = true;
        try {
            const payload = {
                list_name: listData.name,
                client_id: listData.client.id,
                priority: listData.priority,
                list_status: listData.status, // Enviamos o status também
                description: listData.description,
                listItems: listItems.map(item => ({
                    supply_id: item.supply.id,
                    supplier_id: item.supplier.id,
                    quantity: item.quantity,
                    price: item.price
                }))
            };

            const res = await fetch(`/api/suplist/${listId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Lista atualizada com sucesso!');
                goto('/supplies/lists');
            } else {
                const data = await res.json();
                alert(data.message || 'Erro ao atualizar.');
            }
        } catch (error) {
            alert('Erro de conexão.');
        } finally {
            isSaving = false;
        }
    }
</script>

{#if isLoadingData}
    <div class="flex h-screen items-center justify-center">
        <Loader2 class="size-10 animate-spin text-primary" />
    </div>
{:else}
    <div class="max-w-6xl mx-auto p-4 space-y-6 pb-20">
        
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-center gap-2">
                <Button variant="ghost" size="icon" onclick={() => history.back()} class="shrink-0">
                    <ChevronLeft class="size-5" />
                </Button>
                <div>
                    <h1 class="text-xl sm:text-2xl font-bold tracking-tight">Editar Lista #{listId}</h1>
                    <div class="flex items-center gap-2 text-muted-foreground text-sm">
                        <History class="size-3" />
                        <span>Atualize o orçamento e itens</span>
                    </div>
                </div>
            </div>
            
            <div class="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" class="flex-1 sm:flex-none" onclick={() => history.back()}>Cancelar</Button>
                <Button class="flex-1 sm:flex-none" onclick={updateList} disabled={isSaving}>
                    {#if isSaving}
                        <Loader2 class="mr-2 size-4 animate-spin" /> Salvando...
                    {:else}
                        <Save class="mr-2 size-4" /> Atualizar
                    {/if}
                </Button>
            </div>
        </div>

        <Tabs.Root value="geral" class="w-full">
            <Tabs.List class="w-full sm:w-[400px] grid grid-cols-2">
                <Tabs.Trigger value="geral">Geral</Tabs.Trigger>
                <Tabs.Trigger value="materiais">Itens ({listItems.length})</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="geral" class="mt-4">
                <Card.Root>
                    <Card.Content class="pt-6 space-y-6">
                        <div class="space-y-2">
                            <Label for="name">Nome da Lista *</Label>
                            <Input id="name" bind:value={listData.name} />
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-2">
                                <Label>Status da Lista</Label>
                                <Select.Root type="single" bind:value={listData.status}>
                                    <Select.Trigger>
                                        {#if listData.status === 'approved'} <span class="text-green-600 font-medium">Aprovado</span>
                                        {:else if listData.status === 'denied'} <span class="text-red-600 font-medium">Recusado</span>
                                        {:else} <span class="text-yellow-600 font-medium">Pendente</span> {/if}
                                    </Select.Trigger>
                                    <Select.Content>
                                        <Select.Item value="pending" class="text-yellow-600">Pendente</Select.Item>
                                        <Select.Item value="approved" class="text-green-600">Aprovado</Select.Item>
                                        <Select.Item value="denied" class="text-red-600">Recusado</Select.Item>
                                    </Select.Content>
                                </Select.Root>
                            </div>

                            <div class="space-y-2">
                                <Label>Prioridade</Label>
                                <Select.Root type="single" bind:value={listData.priority}>
                                    <Select.Trigger>
                                        {#if listData.priority === 'low'}Baixa
                                        {:else if listData.priority === 'high'}Alta
                                        {:else}Média{/if}
                                    </Select.Trigger>
                                    <Select.Content>
                                        <Select.Item value="low">Baixa</Select.Item>
                                        <Select.Item value="medium">Média</Select.Item>
                                        <Select.Item value="high">Alta</Select.Item>
                                    </Select.Content>
                                </Select.Root>
                            </div>
                        </div>

                        <div class="space-y-2 relative">
                            <Label>Cliente *</Label>
                            {#if listData.client}
                                <div class="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                                    <div class="flex items-center gap-3">
                                        <div class="bg-primary/10 size-8 rounded-full flex items-center justify-center text-primary font-bold text-xs">
                                            {listData.client.client_first_name[0]}
                                        </div>
                                        <div>
                                            <p class="font-medium text-sm">{listData.client.client_first_name} {listData.client.client_last_name}</p>
                                            <p class="text-xs text-muted-foreground">{listData.client.client_email}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onclick={() => listData.client = null}>
                                        <X class="size-4" />
                                    </Button>
                                </div>
                            {:else}
                                <div class="relative">
                                    <Search class="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                                    <Input placeholder="Buscar cliente..." class="pl-9" bind:value={search.client} oninput={(e) => handleSearch('client', e.currentTarget.value)} />
                                    {#if showSuggestions.client && suggestions.client.length > 0}
                                        <div class="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                                            {#each suggestions.client as c}
                                                <button class="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm border-b last:border-0"
                                                    onclick={() => selectItem('client', c)}>
                                                    {c.client_first_name} {c.client_last_name}
                                                </button>
                                            {/each}
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        </div>

                        <div class="space-y-2">
                            <Label>Descrição</Label>
                            <Textarea class="h-24 resize-none" bind:value={listData.description} />
                        </div>
                    </Card.Content>
                </Card.Root>
            </Tabs.Content>

            <Tabs.Content value="materiais" class="mt-4">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-1 space-y-4">
                        <Card.Root>
                            <Card.Header class="pb-3"><Card.Title class="text-lg">Adicionar Item</Card.Title></Card.Header>
                            <Card.Content class="space-y-4">
                                <div class="space-y-2 relative">
                                    <Label>Material</Label>
                                    {#if newItem.supply}
                                        <div class="flex items-center justify-between p-2 border rounded bg-blue-50 border-blue-200">
                                            <span class="text-sm font-medium text-blue-800 truncate">{newItem.supply.supply_name}</span>
                                            <button onclick={() => newItem.supply = null} class="text-blue-500 hover:text-blue-700"><X class="size-4" /></button>
                                        </div>
                                    {:else}
                                        <Input placeholder="Buscar..." bind:value={search.supply} oninput={(e) => handleSearch('supply', e.currentTarget.value)} />
                                        {#if showSuggestions.supply && suggestions.supply.length > 0}
                                            <div class="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                                                {#each suggestions.supply as s}
                                                    <button class="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b" onclick={() => selectItem('supply', s)}>{s.supply_name}</button>
                                                {/each}
                                            </div>
                                        {/if}
                                    {/if}
                                </div>

                                <div class="space-y-2 relative">
                                    <Label>Fornecedor</Label>
                                    {#if newItem.supplier}
                                        <div class="flex items-center justify-between p-2 border rounded bg-green-50 border-green-200">
                                            <span class="text-sm font-medium text-green-800 truncate">{newItem.supplier.supplier_name}</span>
                                            <button onclick={() => newItem.supplier = null} class="text-green-500 hover:text-green-700"><X class="size-4" /></button>
                                        </div>
                                    {:else}
                                        <Input placeholder="Buscar..." bind:value={search.supplier} oninput={(e) => handleSearch('supplier', e.currentTarget.value)} disabled={!newItem.supply}/>
                                        {#if showSuggestions.supplier && suggestions.supplier.length > 0}
                                            <div class="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                                                {#each suggestions.supplier as s}
                                                    <button class="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b" onclick={() => selectItem('supplier', s)}>{s.supplier_name}</button>
                                                {/each}
                                            </div>
                                        {/if}
                                    {/if}
                                </div>

                                <div class="grid grid-cols-2 gap-3">
                                    <div class="space-y-2"><Label>Qtd</Label><Input type="number" min="1" bind:value={newItem.quantity} /></div>
                                    <div class="space-y-2"><Label>Preço</Label><Input type="number" step="0.01" bind:value={newItem.price} /></div>
                                </div>

                                {#if formError}<p class="text-xs text-red-500 font-medium">{formError}</p>{/if}
                                <Button class="w-full" onclick={addItemToList}><Plus class="mr-2 size-4" /> Adicionar</Button>
                            </Card.Content>
                        </Card.Root>
                    </div>

                    <div class="lg:col-span-2">
                        <Card.Root class="h-full">
                            <Card.Header class="pb-3 border-b">
                                <div class="flex items-center justify-between">
                                    <Card.Title class="text-lg">Itens na Lista</Card.Title>
                                    <Badge variant="secondary">{listItems.length} item(s)</Badge>
                                </div>
                            </Card.Header>
                            <Card.Content class="p-0">
                                <div class="w-full overflow-x-auto">
                                    <Table.Root>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head class="min-w-[150px]">Material</Table.Head>
                                                <Table.Head class="min-w-[120px]">Fornecedor</Table.Head>
                                                <Table.Head class="text-center w-[80px]">Qtd</Table.Head>
                                                <Table.Head class="text-right min-w-[100px]">Unit.</Table.Head>
                                                <Table.Head class="text-right min-w-[100px]">Total</Table.Head>
                                                <Table.Head class="w-[50px]"></Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {#each listItems as item, index}
                                                <Table.Row>
                                                    <Table.Cell class="font-medium">{item.supply.supply_name}</Table.Cell>
                                                    <Table.Cell class="text-xs text-muted-foreground">{item.supplier.supplier_name}</Table.Cell>
                                                    <Table.Cell class="text-center">{item.quantity}</Table.Cell>
                                                    <Table.Cell class="text-right">{item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Table.Cell>
                                                    <Table.Cell class="text-right font-medium">{(item.quantity * item.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Table.Cell>
                                                    <Table.Cell>
                                                        <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-red-500" onclick={() => removeItem(index)}>
                                                            <Trash2 class="size-4" />
                                                        </Button>
                                                    </Table.Cell>
                                                </Table.Row>
                                            {:else}
                                                <Table.Row><Table.Cell colspan={6} class="text-center h-32 text-muted-foreground"><PackageOpen class="size-8 opacity-20 mx-auto" /><p>Nenhum item.</p></Table.Cell></Table.Row>
                                            {/each}
                                        </Table.Body>
                                    </Table.Root>
                                </div>
                            </Card.Content>
                            {#if listItems.length > 0}
                                <Card.Footer class="bg-muted/10 border-t p-4 flex justify-end">
                                    <div class="text-right">
                                        <p class="text-sm text-muted-foreground">Total Estimado</p>
                                        <p class="text-2xl font-bold text-primary">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    </div>
                                </Card.Footer>
                            {/if}
                        </Card.Root>
                    </div>
                </div>
            </Tabs.Content>
        </Tabs.Root>
    </div>
{/if}
