<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { toast } from 'svelte-sonner';
    import type { PageData, ActionData } from './$types';

    import * as Card from '$lib/components/ui/card';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Button } from '$lib/components/ui/button';
    import { Textarea } from '$lib/components/ui/textarea';
    import { ChevronLeft, Save, LoaderCircle, Package, X, Search, Plus } from '@lucide/svelte';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let isSubmitting = $state(false);

    // Supplier autocomplete
    type Supplier = { id: number; supplier_name: string; supplier_legal_name: string };
    type SupplierMode = 'none' | 'existing' | 'new';
    let supplierMode    = $state<SupplierMode>('none');
    let supplierQuery   = $state('');
    let suggestions     = $state<Supplier[]>([]);
    let showSuggestions = $state(false);
    let selectedId      = $state<number | null>(null);
    let selectedName    = $state('');
    let selectedLegal   = $state('');
    let newName         = $state('');
    let debounceTimer: ReturnType<typeof setTimeout>;

    function handleSupplierSearch() {
        clearTimeout(debounceTimer);
        if (supplierQuery.length < 2) { suggestions = []; showSuggestions = false; return; }
        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/apiv2/suppliers/search?q=${encodeURIComponent(supplierQuery)}`);
                if (res.ok) {
                    suggestions = await res.json();
                    showSuggestions = true;
                }
            } catch { /* ignore */ }
        }, 300);
    }

    function selectExisting(s: Supplier) {
        selectedId      = s.id;
        selectedName    = s.supplier_name;
        selectedLegal   = s.supplier_legal_name;
        supplierMode    = 'existing';
        showSuggestions = false;
    }

    function startCreate() {
        newName         = supplierQuery.trim();
        supplierMode    = 'new';
        showSuggestions = false;
    }

    function clearSupplier() {
        supplierMode    = 'none';
        supplierQuery   = '';
        selectedId      = null;
        selectedName    = '';
        selectedLegal   = '';
        newName         = '';
        suggestions     = [];
    }

    function handleKeydown(e: KeyboardEvent) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            (document.querySelector<HTMLButtonElement>('button[type="submit"]'))?.click();
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="mx-auto max-w-2xl space-y-4 p-4">

    <div class="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="icon" onclick={() => goto('/supplies')}>
            <ChevronLeft class="size-5" />
        </Button>
        <h1 class="text-2xl font-bold tracking-tight">Novo Material</h1>
    </div>

    <Card.Root>
        <Card.Header>
            <div class="flex items-center gap-2">
                <div class="rounded-full bg-primary/10 p-2 text-primary">
                    <Package class="size-5" />
                </div>
                <div>
                    <Card.Title>Dados do Material</Card.Title>
                    <Card.Description>Preencha as informações do novo item.</Card.Description>
                </div>
            </div>
        </Card.Header>

        <Card.Content class="pt-4">
            <form method="POST"
                use:enhance={() => {
                    isSubmitting = true;
                    return async ({ result, update }) => {
                        isSubmitting = false;
                        if (result.type === 'failure') {
                            toast.error(String((result.data as any)?.error) || 'Erro ao salvar.');
                        } else if (result.type === 'redirect') {
                            toast.success('Material criado com sucesso!');
                        }
                        await update();
                    };
                }}
                class="space-y-5"
            >
                <!-- Nome -->
                <div class="space-y-2">
                    <Label for="supply_name">Nome do Material *</Label>
                    <Input id="supply_name" name="supply_name"
                        placeholder="Ex: Cabo Flexível 2.5mm" required />
                </div>

                <!-- Quantidade -->
                <div class="space-y-2">
                    <Label for="quantity">Quantidade em Estoque</Label>
                    <Input id="quantity" name="quantity" type="number" min="0" value="0" />
                </div>

                <!-- Fornecedor Padrão (autocomplete) -->
                <div class="space-y-2">
                    <Label>Fornecedor Padrão</Label>

                    {#if supplierMode === 'none' || supplierMode === 'searching'}
                        <div class="relative">
                            <Search class="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                            <Input
                                bind:value={supplierQuery}
                                oninput={handleSupplierSearch}
                                onfocus={() => { if (suggestions.length > 0) showSuggestions = true; }}
                                onblur={() => setTimeout(() => { showSuggestions = false; }, 150)}
                                placeholder="Buscar ou criar fornecedor..."
                                class="pl-9"
                                autocomplete="off"
                            />
                            {#if showSuggestions}
                                <div class="absolute z-10 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                                    {#each suggestions as s}
                                        <button type="button"
                                            class="w-full px-3 py-2 text-left hover:bg-accent"
                                            onmousedown={(e) => { e.preventDefault(); selectExisting(s); }}
                                        >
                                            <p class="text-sm font-medium">{s.supplier_name}</p>
                                            {#if s.supplier_legal_name && s.supplier_legal_name !== s.supplier_name}
                                                <p class="text-xs text-muted-foreground">{s.supplier_legal_name}</p>
                                            {/if}
                                        </button>
                                    {/each}
                                    {#if supplierQuery.trim().length >= 2}
                                        <button type="button"
                                            class="flex w-full items-center gap-1.5 border-t px-3 py-2 text-left text-sm text-primary hover:bg-accent"
                                            onmousedown={(e) => { e.preventDefault(); startCreate(); }}
                                        >
                                            <Plus class="size-3" /> Criar "{supplierQuery.trim()}"
                                        </button>
                                    {/if}
                                    {#if suggestions.length === 0 && supplierQuery.length >= 2}
                                        <p class="px-3 py-2 text-xs text-muted-foreground">
                                            Nenhum resultado. Clique em "Criar" para adicionar.
                                        </p>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                        <p class="text-xs text-muted-foreground">Digite para buscar fornecedores existentes ou criar um novo.</p>

                    {:else if supplierMode === 'existing'}
                        <div class="flex items-center justify-between rounded-md border px-3 py-2">
                            <div>
                                <p class="text-sm font-medium">{selectedName}</p>
                                {#if selectedLegal && selectedLegal !== selectedName}
                                    <p class="text-xs text-muted-foreground">{selectedLegal}</p>
                                {/if}
                            </div>
                            <Button type="button" variant="ghost" size="icon" class="size-6" onclick={clearSupplier}>
                                <X class="size-3.5" />
                            </Button>
                        </div>
                        <input type="hidden" name="supplier_id" value={selectedId} />

                    {:else if supplierMode === 'new'}
                        <div class="space-y-3 rounded-lg border bg-muted/30 p-3">
                            <div class="flex items-center justify-between">
                                <p class="text-xs font-semibold uppercase tracking-wide text-primary">Novo Fornecedor</p>
                                <Button type="button" variant="ghost" size="icon" class="size-6" onclick={clearSupplier}>
                                    <X class="size-3.5" />
                                </Button>
                            </div>
                            <div class="space-y-1.5">
                                <Label class="text-xs">Nome *</Label>
                                <Input name="new_supplier_name" value={newName} required placeholder="Nome comercial" />
                            </div>
                            <div class="space-y-1.5">
                                <Label class="text-xs">Razão Social</Label>
                                <Input name="new_supplier_legal_name" placeholder="Igual ao nome se não informado" />
                            </div>
                            <div class="space-y-1.5">
                                <Label class="text-xs">CNPJ *</Label>
                                <Input name="new_supplier_cnpj" required placeholder="00.000.000/0000-00" />
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- Preço (visível quando fornecedor selecionado/criado) -->
                {#if supplierMode === 'existing' || supplierMode === 'new'}
                    <div class="space-y-2">
                        <Label for="price">Preço Unitário (R$)</Label>
                        <Input id="price" name="price" type="number" step="0.01" placeholder="0,00" />
                    </div>
                {/if}

                <!-- Detalhes -->
                <div class="space-y-2">
                    <Label for="details">Detalhes / Descrição</Label>
                    <Textarea id="details" name="details" class="h-24 resize-none"
                        placeholder="Marca, especificações técnicas..." />
                </div>

                {#if form?.error}
                    <p class="text-sm text-destructive">{form.error}</p>
                {/if}

                <div class="flex justify-end gap-3 border-t pt-4">
                    <Button type="button" variant="outline" onclick={() => goto('/supplies')}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {#if isSubmitting}
                            <LoaderCircle class="mr-2 size-4 animate-spin" /> Salvando...
                        {:else}
                            <Save class="mr-2 size-4" /> Criar Material
                            <span class="ml-2 border-l border-white/20 pl-2 text-xs font-normal opacity-50">Ctrl S</span>
                        {/if}
                    </Button>
                </div>
            </form>
        </Card.Content>
    </Card.Root>
</div>
