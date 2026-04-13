<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto, invalidateAll } from '$app/navigation';
    import { toast } from 'svelte-sonner';
    import type { PageData, ActionData } from './$types';

    import * as Card from '$lib/components/ui/card';
    import * as Table from '$lib/components/ui/table';
    import * as Select from '$lib/components/ui/select';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Button } from '$lib/components/ui/button';
    import { Textarea } from '$lib/components/ui/textarea';
    import { Badge } from '$lib/components/ui/badge';
    import {
        ChevronLeft, Save, LoaderCircle, Package,
        Plus, Trash2, Star, StarOff,
    } from '@lucide/svelte';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let isSaving   = $state(false);
    let newSuppId  = $state('');

    // Feedback das sub-actions (addPricing, removePricing, setDefault)
    $effect(() => {
        if (!form) return;
        const f = form as any;
        if (f.success) {
            if (f.action === 'update')        toast.success('Dados atualizados.');
            if (f.action === 'addPricing')    toast.success('Fornecedor vinculado.');
            if (f.action === 'removePricing') toast.success('Fornecedor removido.');
            if (f.action === 'setDefault')    toast.success('Fornecedor padrão definido.');
        } else if (f.error) {
            toast.error(f.error);
        }
    });

    // IDs já vinculados para esconder do select de adicionar
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

            <!-- Adicionar novo fornecedor -->
            <form method="POST" action="?/addPricing"
                use:enhance={() => {
                    return async ({ result, update }) => {
                        if (result.type === 'success') newSuppId = '';
                        await invalidateAll();
                        await update({ reset: true });
                    };
                }}
                class="rounded-lg border p-4"
            >
                <p class="mb-3 text-sm font-medium">Vincular Fornecedor</p>
                <div class="flex flex-col gap-3 md:flex-row md:items-end">
                    <div class="flex-1 space-y-2">
                        <Label>Fornecedor</Label>
                        <Select.Root type="single" onValueChange={(v) => newSuppId = v}>
                            <Select.Trigger class="w-full">
                                {data.suppliers.find((s: any) => s.id.toString() === newSuppId)?.supplier_name || 'Selecione...'}
                            </Select.Trigger>
                            <Select.Content>
                                {#each data.suppliers.filter((s: any) => !linkedIds.has(s.id.toString())) as sup}
                                    <Select.Item value={sup.id.toString()}>{sup.supplier_name}</Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                        <input type="hidden" name="supplier_id" value={newSuppId} />
                    </div>

                    <div class="w-full space-y-2 md:w-36">
                        <Label for="new_price">Preço (R$)</Label>
                        <Input id="new_price" name="price" type="number" step="0.01"
                            placeholder="0,00" disabled={!newSuppId} />
                    </div>

                    <Button type="submit" disabled={!newSuppId}>
                        <Plus class="mr-2 size-4" /> Vincular
                    </Button>
                </div>
            </form>

        </Card.Content>
    </Card.Root>
</div>
