<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto, invalidateAll } from '$app/navigation';
    import { toast } from 'svelte-sonner';
    import type { PageData, ActionData } from './$types';

    import * as Card from '$lib/components/ui/card';
    import * as Table from '$lib/components/ui/table';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Button } from '$lib/components/ui/button';
    import { Textarea } from '$lib/components/ui/textarea';
    import { Badge } from '$lib/components/ui/badge';
    import {
        ChevronLeft, Save, LoaderCircle, Package,
        Plus, Trash2, Star, StarOff, X, Search,
    } from '@lucide/svelte';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let isSaving = $state(false);

    // Feedback das sub-actions
    $effect(() => {
        if (!form) return;
        const f = form as any;
        if (f.success) {
            if (f.action === 'update')        toast.success('Dados atualizados.');
            if (f.action === 'addPricing')    toast.success('Fornecedor vinculado.');
            if (f.action === 'removePricing') toast.success('Fornecedor removido.');
            if (f.action === 'setDefault')    toast.success('Fornecedor padrão definido.');
            if (f.action === 'createAndLink') toast.success('Fornecedor criado e vinculado.');
        } else if (f.error) {
            toast.error(f.error);
        }
    });

    // IDs já vinculados
    let linkedIds = $derived(new Set(data.pricing.map((p: any) => p.supplier_id.toString())));

    function fmt(v: number | null) {
        if (v == null) return '—';
        return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function handleKeydown(e: KeyboardEvent) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            (document.querySelector<HTMLButtonElement>('[data-save]'))?.click();
        }
    }

    // Supplier autocomplete for "Vincular Fornecedor"
    type Supplier = { id: number; supplier_name: string; supplier_legal_name: string };
    type LinkMode = 'none' | 'existing' | 'new';
    let linkMode         = $state<LinkMode>('none');
    let linkQuery        = $state('');
    let linkSuggestions  = $state<Supplier[]>([]);
    let showLinkDrop     = $state(false);
    let linkSelectedId   = $state<number | null>(null);
    let linkSelectedName = $state('');
    let linkSelectedLegal = $state('');
    let linkNewName      = $state('');
    let debounceTimer: ReturnType<typeof setTimeout>;

    function handleLinkSearch() {
        clearTimeout(debounceTimer);
        if (linkQuery.length < 2) { linkSuggestions = []; showLinkDrop = false; return; }
        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/apiv2/suppliers/search?q=${encodeURIComponent(linkQuery)}`);
                if (res.ok) {
                    const all: Supplier[] = await res.json();
                    linkSuggestions = all.filter(s => !linkedIds.has(s.id.toString()));
                    showLinkDrop = true;
                }
            } catch { /* ignore */ }
        }, 300);
    }

    function selectLinkExisting(s: Supplier) {
        linkSelectedId    = s.id;
        linkSelectedName  = s.supplier_name;
        linkSelectedLegal = s.supplier_legal_name;
        linkMode          = 'existing';
        showLinkDrop      = false;
    }

    function startLinkCreate() {
        linkNewName  = linkQuery.trim();
        linkMode     = 'new';
        showLinkDrop = false;
    }

    function clearLink() {
        linkMode          = 'none';
        linkQuery         = '';
        linkSelectedId    = null;
        linkSelectedName  = '';
        linkSelectedLegal = '';
        linkNewName       = '';
        linkSuggestions   = [];
    }

    // Determine which action to call based on linkMode
    let linkFormAction = $derived(linkMode === 'new' ? '?/createAndLink' : '?/addPricing');
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="mx-auto max-w-4xl space-y-6 p-4 pb-10">

    <div class="flex items-center gap-2">
        <Button variant="ghost" size="icon" onclick={() => goto('/supplies')}>
            <ChevronLeft class="size-5" />
        </Button>
        <h1 class="text-2xl font-bold tracking-tight">Editar Material</h1>
    </div>

    <!-- Dados básicos -->
    <Card.Root>
        <Card.Header>
            <div class="flex items-center gap-2">
                <div class="rounded-full bg-primary/10 p-2 text-primary">
                    <Package class="size-5" />
                </div>
                <div>
                    <Card.Title>Informações Principais</Card.Title>
                    <Card.Description>Material #{data.supply.id}</Card.Description>
                </div>
            </div>
        </Card.Header>

        <Card.Content>
            <form method="POST" action="?/update"
                use:enhance={() => {
                    isSaving = true;
                    return async ({ result, update }) => {
                        isSaving = false;
                        await update({ reset: false });
                    };
                }}
                class="space-y-5"
            >
                <div class="space-y-2">
                    <Label for="supply_name">Nome do Material *</Label>
                    <Input id="supply_name" name="supply_name"
                        value={data.supply.supply_name} required />
                </div>

                <div class="space-y-2">
                    <Label for="quantity">Quantidade em Estoque</Label>
                    <Input id="quantity" name="quantity" type="number" min="0"
                        value={data.supply.quantity} />
                </div>

                <div class="space-y-2">
                    <Label for="details">Detalhes / Descrição</Label>
                    <Textarea id="details" name="details" class="h-24 resize-none"
                        value={data.supply.details ?? ''} />
                </div>

                <div class="flex justify-end border-t pt-4">
                    <Button type="submit" data-save disabled={isSaving}>
                        {#if isSaving}
                            <LoaderCircle class="mr-2 size-4 animate-spin" /> Salvando...
                        {:else}
                            <Save class="mr-2 size-4" /> Salvar
                            <span class="ml-2 border-l border-white/20 pl-2 text-xs font-normal opacity-50">Ctrl S</span>
                        {/if}
                    </Button>
                </div>
            </form>
        </Card.Content>
    </Card.Root>

    <!-- Fornecedores e preços -->
    <Card.Root>
        <Card.Header>
            <Card.Title>Fornecedores e Preços</Card.Title>
            <Card.Description>A estrela indica o fornecedor preferencial para este material.</Card.Description>
        </Card.Header>

        <Card.Content class="space-y-4">

            <!-- Tabela de vínculos existentes -->
            <div class="rounded-md border">
                <Table.Root>
                    <Table.Header>
                        <Table.Row class="bg-muted/50">
                            <Table.Head class="w-14 text-center">Padrão</Table.Head>
                            <Table.Head>Fornecedor</Table.Head>
                            <Table.Head class="text-right">Preço</Table.Head>
                            <Table.Head class="text-right">Ações</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#if data.pricing.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={4} class="h-20 text-center text-muted-foreground">
                                    Nenhum fornecedor vinculado.
                                </Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each data.pricing as item (item.supplier_id)}
                                <Table.Row>
                                    <Table.Cell class="text-center">
                                        {#if item.is_default}
                                            <Star class="mx-auto size-5 fill-yellow-400 text-yellow-400" />
                                        {:else}
                                            <form method="POST" action="?/setDefault" use:enhance={() =>
                                                async ({ result, update }) => { await invalidateAll(); await update({ reset: false }); }
                                            }>
                                                <input type="hidden" name="supplier_id" value={item.supplier_id} />
                                                <Button type="submit" variant="ghost" size="icon" class="size-7"
                                                    title="Definir como padrão">
                                                    <StarOff class="size-4 text-muted-foreground hover:text-yellow-400" />
                                                </Button>
                                            </form>
                                        {/if}
                                    </Table.Cell>

                                    <Table.Cell class="font-medium">
                                        {item.supplier_name}
                                        {#if item.is_default}
                                            <Badge variant="secondary" class="ml-2 text-[10px]">PADRÃO</Badge>
                                        {/if}
                                    </Table.Cell>

                                    <Table.Cell class="text-right font-mono text-sm">
                                        {fmt(item.price)}
                                    </Table.Cell>

                                    <Table.Cell class="text-right">
                                        <form method="POST" action="?/removePricing" use:enhance={() =>
                                            async ({ result, update }) => { await invalidateAll(); await update({ reset: false }); }
                                        }>
                                            <input type="hidden" name="supplier_id" value={item.supplier_id} />
                                            <Button type="submit" variant="ghost" size="icon"
                                                class="size-8 text-muted-foreground hover:text-destructive">
                                                <Trash2 class="size-4" />
                                            </Button>
                                        </form>
                                    </Table.Cell>
                                </Table.Row>
                            {/each}
                        {/if}
                    </Table.Body>
                </Table.Root>
            </div>

            <!-- Vincular / Criar Fornecedor -->
            <form method="POST" action={linkFormAction}
                use:enhance={() => {
                    return async ({ result, update }) => {
                        if (result.type === 'success') clearLink();
                        await invalidateAll();
                        await update({ reset: true });
                    };
                }}
                class="rounded-lg border p-4"
            >
                <p class="mb-3 text-sm font-medium">Vincular Fornecedor</p>

                {#if linkMode === 'none'}
                    <!-- Search input -->
                    <div class="relative">
                        <Search class="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                        <Input
                            bind:value={linkQuery}
                            oninput={handleLinkSearch}
                            onfocus={() => { if (linkSuggestions.length > 0) showLinkDrop = true; }}
                            onblur={() => setTimeout(() => { showLinkDrop = false; }, 150)}
                            placeholder="Buscar ou criar fornecedor..."
                            class="pl-9"
                            autocomplete="off"
                        />
                        {#if showLinkDrop}
                            <div class="absolute z-10 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                                {#each linkSuggestions as s}
                                    <button type="button"
                                        class="w-full px-3 py-2 text-left hover:bg-accent"
                                        onmousedown={(e) => { e.preventDefault(); selectLinkExisting(s); }}
                                    >
                                        <p class="text-sm font-medium">{s.supplier_name}</p>
                                        {#if s.supplier_legal_name && s.supplier_legal_name !== s.supplier_name}
                                            <p class="text-xs text-muted-foreground">{s.supplier_legal_name}</p>
                                        {/if}
                                    </button>
                                {/each}
                                {#if linkQuery.trim().length >= 2}
                                    <button type="button"
                                        class="flex w-full items-center gap-1.5 border-t px-3 py-2 text-left text-sm text-primary hover:bg-accent"
                                        onmousedown={(e) => { e.preventDefault(); startLinkCreate(); }}
                                    >
                                        <Plus class="size-3" /> Criar "{linkQuery.trim()}"
                                    </button>
                                {/if}
                                {#if linkSuggestions.length === 0 && linkQuery.length >= 2}
                                    <p class="px-3 py-2 text-xs text-muted-foreground">
                                        Nenhum resultado. Clique em "Criar" para adicionar.
                                    </p>
                                {/if}
                            </div>
                        {/if}
                    </div>

                {:else if linkMode === 'existing'}
                    <div class="flex flex-col gap-3 md:flex-row md:items-end">
                        <div class="flex flex-1 items-center justify-between rounded-md border px-3 py-2">
                            <div>
                                <p class="text-sm font-medium">{linkSelectedName}</p>
                                {#if linkSelectedLegal && linkSelectedLegal !== linkSelectedName}
                                    <p class="text-xs text-muted-foreground">{linkSelectedLegal}</p>
                                {/if}
                            </div>
                            <Button type="button" variant="ghost" size="icon" class="size-6" onclick={clearLink}>
                                <X class="size-3.5" />
                            </Button>
                        </div>
                        <input type="hidden" name="supplier_id" value={linkSelectedId} />

                        <div class="w-full space-y-2 md:w-36">
                            <Label for="link_price">Preço (R$)</Label>
                            <Input id="link_price" name="price" type="number" step="0.01" placeholder="0,00" />
                        </div>

                        <Button type="submit">
                            <Plus class="mr-2 size-4" /> Vincular
                        </Button>
                    </div>

                {:else if linkMode === 'new'}
                    <div class="space-y-3 rounded-lg border bg-muted/30 p-3">
                        <div class="flex items-center justify-between">
                            <p class="text-xs font-semibold uppercase tracking-wide text-primary">Novo Fornecedor</p>
                            <Button type="button" variant="ghost" size="icon" class="size-6" onclick={clearLink}>
                                <X class="size-3.5" />
                            </Button>
                        </div>
                        <div class="grid gap-3 md:grid-cols-2">
                            <div class="space-y-1.5">
                                <Label class="text-xs">Nome *</Label>
                                <Input name="new_supplier_name" value={linkNewName} required placeholder="Nome comercial" />
                            </div>
                            <div class="space-y-1.5">
                                <Label class="text-xs">Razão Social</Label>
                                <Input name="new_supplier_legal_name" placeholder="Igual ao nome se não informado" />
                            </div>
                            <div class="space-y-1.5">
                                <Label class="text-xs">CNPJ *</Label>
                                <Input name="new_supplier_cnpj" required placeholder="00.000.000/0000-00" />
                            </div>
                            <div class="space-y-1.5">
                                <Label class="text-xs">Preço (R$)</Label>
                                <Input name="price" type="number" step="0.01" placeholder="0,00" />
                            </div>
                        </div>
                        <div class="flex justify-end border-t pt-2">
                            <Button type="submit">
                                <Plus class="mr-2 size-4" /> Criar e Vincular
                            </Button>
                        </div>
                    </div>
                {/if}

            </form>

        </Card.Content>
    </Card.Root>
</div>
