<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { toast } from 'svelte-sonner';
    import * as Card from '$lib/components/ui/card';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Button } from '$lib/components/ui/button';
    import { Textarea } from '$lib/components/ui/textarea';
    import * as Tabs from '$lib/components/ui/tabs';
    import * as Table from '$lib/components/ui/table';
    import { Badge } from '$lib/components/ui/badge';
    import * as Select from '$lib/components/ui/select';
    import { Plus, X, Trash2, Save, ChevronLeft, Search, LoaderCircle, PackageOpen } from '@lucide/svelte';


    interface Client   { id: number; client_first_name: string; client_last_name: string; client_email: string; }
    interface Supply   { id: number; supply_name: string; }
    interface Supplier { id: number; supplier_name: string; supplier_legal_name?: string; price?: number; }
    interface ListItem { supply: Supply; supplier: Supplier | null; quantity: number; price: number; }

    // --- estado geral ---
    let isSubmitting = $state(false);
    let listName     = $state('');
    let priority     = $state('medium');
    let description  = $state('');
    let selectedClient = $state<Client | null>(null);
    let listItems    = $state<ListItem[]>([]);

    let totalValue = $derived(listItems.reduce((sum, i) => sum + i.quantity * i.price, 0));

    // --- item sendo adicionado ---
    let newItem = $state<{ supply: Supply | null; supplier: Supplier | null; quantity: number; price: number }>({
        supply: null, supplier: null, quantity: 1, price: 0
    });

    // --- autocomplete genérico ---
    let searchClient   = $state('');
    let searchSupply   = $state('');
    let searchSupplier = $state('');

    let suggestionsClient   = $state<Client[]>([]);
    let suggestionsSupply   = $state<Supply[]>([]);
    let suggestionsSupplier = $state<Supplier[]>([]);

    let showClient   = $state(false);
    let showSupply   = $state(false);
    let showSupplier = $state(false);

    let debounceTimer: ReturnType<typeof setTimeout>;

    async function search(type: 'client' | 'supply' | 'supplier', q: string) {
        clearTimeout(debounceTimer);
        if (q.length < 2) {
            if (type === 'client')   { suggestionsClient   = []; showClient   = false; }
            if (type === 'supply')   { suggestionsSupply   = []; showSupply   = false; }
            if (type === 'supplier') { suggestionsSupplier = []; showSupplier = false; }
            return;
        }
        debounceTimer = setTimeout(async () => {
            try {
                let url = '';
                if (type === 'client')   url = `/apiv2/clients/search?q=${encodeURIComponent(q)}`;
                if (type === 'supply')   url = `/apiv2/supplies/search?q=${encodeURIComponent(q)}`;
                // Busca todos os fornecedores (sem filtrar por material)
                if (type === 'supplier') url = `/apiv2/suppliers/search?q=${encodeURIComponent(q)}`;
                const res = await fetch(url);
                if (!res.ok) return;
                const rows = await res.json();
                if (type === 'client')   { suggestionsClient   = rows; showClient   = rows.length > 0; }
                if (type === 'supply')   { suggestionsSupply   = rows; showSupply   = rows.length > 0; }
                if (type === 'supplier') { suggestionsSupplier = rows; showSupplier = rows.length > 0; }
            } catch { /* silencioso */ }
        }, 300);
    }

    function pickClient(c: Client) {
        selectedClient = c;
        searchClient = '';
        showClient = false;
    }

    async function pickSupply(s: Supply) {
        newItem.supply   = s;
        newItem.supplier = null;
        searchSupply     = '';
        showSupply       = false;

        // Auto-seleciona o fornecedor padrão já cadastrado para este material
        try {
            const res = await fetch(`/apiv2/suppliers/search?supply_id=${s.id}`);
            if (res.ok) {
                const defaults: Supplier[] = await res.json();
                if (defaults.length > 0) pickSupplier(defaults[0]);
            }
        } catch { /* silencioso */ }
    }

    function pickSupplier(s: Supplier) {
        newItem.supplier = s;
        if (s.price != null) newItem.price = s.price;
        searchSupplier = '';
        showSupplier   = false;
    }

    function addItem() {
        if (!newItem.supply) { toast.error('Selecione um material.'); return; }
        if (newItem.quantity <= 0) { toast.error('A quantidade deve ser maior que zero.'); return; }

        const qty   = Number(newItem.quantity);
        const price = Number(newItem.price);

        const existing = listItems.findIndex(
            i => i.supply.id === newItem.supply!.id &&
                 (i.supplier?.id ?? null) === (newItem.supplier?.id ?? null)
        );

        if (existing !== -1) {
            listItems = listItems.map((item, idx) =>
                idx === existing ? { ...item, quantity: item.quantity + qty } : item
            );
            toast.success(`Quantidade de "${newItem.supply.supply_name}" atualizada.`);
        } else {
            listItems = [...listItems, {
                supply:   newItem.supply,
                supplier: newItem.supplier,
                quantity: qty,
                price,
            }];
        }

        newItem = { supply: null, supplier: null, quantity: 1, price: 0 };
    }

    function removeItem(i: number) {
        listItems = listItems.filter((_, idx) => idx !== i);
    }

    // JSON serializado para o hidden input
    let itemsJson = $derived(JSON.stringify(
        listItems.map(i => ({
            supply_id:   i.supply.id,
            supplier_id: i.supplier?.id ?? null,
            quantity:    i.quantity,
            price:       i.price
        }))
    ));
</script>

<div class="max-w-6xl mx-auto space-y-6 pb-20">

    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div class="flex items-center gap-2">
            <Button variant="ghost" size="icon" onclick={() => goto('/supplies/lists')}>
                <ChevronLeft class="size-5" />
            </Button>
            <div>
                <h1 class="text-xl sm:text-2xl font-bold tracking-tight">Nova Lista</h1>
                <p class="text-muted-foreground text-sm">Orçamento e Planejamento</p>
            </div>
        </div>
    </div>

    <form
        method="POST"
        use:enhance={() => {
            isSubmitting = true;
            return async ({ result, update }) => {
                if (result.type === 'failure') {
                    toast.error(String(result.data?.error) || 'Erro ao salvar lista.');
                    await update({ reset: false });
                } else {
                    await update();
                }
                isSubmitting = false;
            };
        }}
        class="space-y-6"
    >
        <!-- hidden inputs que carregam o estado Svelte -->
        <input type="hidden" name="client_id"   value={selectedClient?.id ?? ''} />
        <input type="hidden" name="priority"    value={priority} />
        <input type="hidden" name="items"       value={itemsJson} />

        <div class="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onclick={() => goto('/supplies/lists')}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
                {#if isSubmitting}
                    <LoaderCircle class="mr-2 size-4 animate-spin" /> Salvando...
                {:else}
                    <Save class="mr-2 size-4" /> Salvar
                {/if}
            </Button>
        </div>

        <Tabs.Root value="geral" class="w-full">
            <Tabs.List class="w-[400px] grid grid-cols-2">
                <Tabs.Trigger value="geral">Geral</Tabs.Trigger>
                <Tabs.Trigger value="itens">Itens ({listItems.length})</Tabs.Trigger>
            </Tabs.List>

            <!-- aba geral -->
            <Tabs.Content value="geral" class="mt-4">
                <Card.Root>
                    <Card.Content class="pt-6 space-y-6">

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-2">
                                <Label>Nome da Lista <span class="text-red-500">*</span></Label>
                                <Input name="list_name" bind:value={listName} placeholder="Ex: Obra da Cozinha" required />
                            </div>
                            <div class="space-y-2">
                                <Label>Prioridade</Label>
                                <Select.Root type="single" bind:value={priority}>
                                    <Select.Trigger>
                                        {#if priority === 'low'}Baixa
                                        {:else if priority === 'high'}Alta
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

                        <!-- cliente -->
                        <div class="space-y-2 relative">
                            <Label>Cliente</Label>
                            {#if selectedClient}
                                <div class="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                                    <div class="flex items-center gap-3">
                                        <div class="bg-primary/10 size-8 rounded-full flex items-center justify-center text-primary font-bold text-xs">
                                            {selectedClient.client_first_name[0]}
                                        </div>
                                        <div>
                                            <p class="font-medium text-sm">{selectedClient.client_first_name} {selectedClient.client_last_name}</p>
                                            <p class="text-xs text-muted-foreground">{selectedClient.client_email}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onclick={() => selectedClient = null}>
                                        <X class="size-4" />
                                    </Button>
                                </div>
                            {:else}
                                <div class="relative">
                                    <Search class="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                                    <Input
                                        class="pl-9"
                                        placeholder="Buscar cliente..."
                                        bind:value={searchClient}
                                        oninput={(e) => search('client', e.currentTarget.value)}
                                    />
                                    {#if showClient}
                                        <div class="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                                            {#each suggestionsClient as c}
                                                <button type="button" class="w-full text-left px-4 py-2 hover:bg-muted text-sm border-b last:border-0"
                                                    onclick={() => pickClient(c)}>
                                                    <span class="font-medium">{c.client_first_name} {c.client_last_name}</span>
                                                    <span class="text-muted-foreground ml-1 text-xs">{c.client_email}</span>
                                                </button>
                                            {/each}
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        </div>

                        <div class="space-y-2">
                            <Label>Descrição</Label>
                            <Textarea name="description" class="h-24 resize-none" bind:value={description} />
                        </div>

                    </Card.Content>
                </Card.Root>
            </Tabs.Content>

            <!-- aba itens -->
            <Tabs.Content value="itens" class="mt-4">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    <!-- painel de adição -->
                    <div class="lg:col-span-1">
                        <Card.Root>
                            <Card.Header class="pb-3">
                                <Card.Title class="text-lg">Adicionar Item</Card.Title>
                            </Card.Header>
                            <Card.Content class="space-y-4">

                                <!-- material -->
                                <div class="space-y-2 relative">
                                    <Label>Material</Label>
                                    {#if newItem.supply}
                                        <div class="flex items-center justify-between p-2 border rounded bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                                            <span class="text-sm font-medium truncate">{newItem.supply.supply_name}</span>
                                            <button type="button" onclick={() => { newItem.supply = null; newItem.supplier = null; }}>
                                                <X class="size-4 text-muted-foreground" />
                                            </button>
                                        </div>
                                    {:else}
                                        <Input
                                            placeholder="Buscar material..."
                                            bind:value={searchSupply}
                                            oninput={(e) => search('supply', e.currentTarget.value)}
                                        />
                                        {#if showSupply}
                                            <div class="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                                                {#each suggestionsSupply as s}
                                                    <button type="button" class="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b last:border-0"
                                                        onclick={() => pickSupply(s)}>{s.supply_name}</button>
                                                {/each}
                                            </div>
                                        {/if}
                                    {/if}
                                </div>

                                <!-- fornecedor -->
                                <div class="space-y-2 relative">
                                    <Label>Fornecedor</Label>
                                    {#if newItem.supplier}
                                        <div class="flex items-center justify-between p-2 border rounded bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                                            <span class="text-sm font-medium truncate">{newItem.supplier.supplier_name}</span>
                                            <button type="button" onclick={() => newItem.supplier = null}>
                                                <X class="size-4 text-muted-foreground" />
                                            </button>
                                        </div>
                                    {:else}
                                        <Input
                                            placeholder={newItem.supply ? 'Buscar fornecedor...' : 'Selecione um material antes'}
                                            disabled={!newItem.supply}
                                            bind:value={searchSupplier}
                                            oninput={(e) => search('supplier', e.currentTarget.value)}
                                        />
                                        {#if showSupplier}
                                            <div class="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                                                {#each suggestionsSupplier as s}
                                                    <button type="button" class="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b last:border-0"
                                                        onclick={() => pickSupplier(s)}>
                                                        <p class="font-medium">{s.supplier_name}</p>
                                                        {#if s.supplier_legal_name && s.supplier_legal_name !== s.supplier_name}
                                                            <p class="text-xs text-muted-foreground">{s.supplier_legal_name}</p>
                                                        {/if}
                                                    </button>
                                                {/each}
                                            </div>
                                        {/if}
                                    {/if}
                                </div>

                                <div class="grid grid-cols-2 gap-3">
                                    <div class="space-y-2">
                                        <Label>Qtd</Label>
                                        <Input type="number" min="1" bind:value={newItem.quantity} />
                                    </div>
                                    <div class="space-y-2">
                                        <Label>Preço (R$)</Label>
                                        <Input type="number" step="0.01" min="0" bind:value={newItem.price} />
                                    </div>
                                </div>

                                <Button type="button" class="w-full" onclick={addItem}>
                                    <Plus class="mr-2 size-4" /> Adicionar
                                </Button>

                            </Card.Content>
                        </Card.Root>
                    </div>

                    <!-- tabela de itens -->
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
                                                <Table.Head class="text-center w-[70px]">Qtd</Table.Head>
                                                <Table.Head class="text-right min-w-[90px]">Unit.</Table.Head>
                                                <Table.Head class="text-right min-w-[90px]">Total</Table.Head>
                                                <Table.Head class="w-[50px]"></Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {#each listItems as item, i}
                                                <Table.Row>
                                                    <Table.Cell class="font-medium">{item.supply.supply_name}</Table.Cell>
                                                    <Table.Cell class="text-xs text-muted-foreground">{item.supplier?.supplier_name ?? '—'}</Table.Cell>
                                                    <Table.Cell class="text-center">{item.quantity}</Table.Cell>
                                                    <Table.Cell class="text-right font-mono text-xs">
                                                        {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </Table.Cell>
                                                    <Table.Cell class="text-right font-medium">
                                                        {(item.quantity * item.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Button type="button" variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            onclick={() => removeItem(i)}>
                                                            <Trash2 class="size-4" />
                                                        </Button>
                                                    </Table.Cell>
                                                </Table.Row>
                                            {:else}
                                                <Table.Row>
                                                    <Table.Cell colspan={6} class="text-center h-32 text-muted-foreground">
                                                        <div class="flex flex-col items-center justify-center gap-2">
                                                            <PackageOpen class="size-8 opacity-20" />
                                                            <p>Nenhum item adicionado.</p>
                                                        </div>
                                                    </Table.Cell>
                                                </Table.Row>
                                            {/each}
                                        </Table.Body>
                                    </Table.Root>
                                </div>
                            </Card.Content>
                            {#if listItems.length > 0}
                                <Card.Footer class="bg-muted/10 border-t p-4 flex justify-end">
                                    <div class="text-right">
                                        <p class="text-sm text-muted-foreground">Total Estimado</p>
                                        <p class="text-2xl font-bold text-primary">
                                            {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </p>
                                    </div>
                                </Card.Footer>
                            {/if}
                        </Card.Root>
                    </div>

                </div>
            </Tabs.Content>
        </Tabs.Root>
    </form>
</div>
