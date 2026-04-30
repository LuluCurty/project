<script lang="ts">
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Badge } from '$lib/components/ui/badge';
    import * as Select from '$lib/components/ui/select';
    import { ChevronLeft, Plus, Trash2, Save, FileDown, CheckCheck, FileUp, LoaderCircle } from '@lucide/svelte';

    interface Item   { id: number; supply_name: string; quantity: number; }
    interface Quote  { id: number; supplier_name: string; status: string; notes: string; priceMap: Record<number, number>; }

    let { data, form } = $props();

    const STATUS_LABELS: Record<string, string> = {
        pending: 'Pendente',
        quoting: 'Cotando',
        quoted:  'Cotado',
        approved: 'Aprovado',
        denied:  'Reprovado',
    };
    const STATUS_COLORS: Record<string, string> = {
        pending:  'bg-yellow-100 text-yellow-800',
        quoting:  'bg-blue-100 text-blue-800',
        quoted:   'bg-violet-100 text-violet-800',
        approved: 'bg-green-100 text-green-800',
        denied:   'bg-red-100 text-red-800',
    };

        // Local edits: edits[quote_id][item_id] = string value typed by user
    let edits = $state<Record<number, Record<number, string>>>({});

    // Always-complete prices: derived so it's instantly in sync when data.quotes changes
    const prices = $derived.by(() => {
        const result: Record<number, Record<number, string>> = {};
        for (const q of data.quotes as Quote[]) {
            result[q.id] = {};
            for (const i of data.items as Item[]) {
                result[q.id][i.id] = edits[q.id]?.[i.id] ?? q.priceMap[i.id]?.toString() ?? '';
            }
        }
        return result;
    });

    function setPrice(quoteId: number, itemId: number, value: string) {
        if (!edits[quoteId]) edits[quoteId] = {};
        edits[quoteId][itemId] = value;
    }

    function buildPricesJson(quoteId: number): string {
        return JSON.stringify(
            (data.items as Item[]).map((item) => ({
                list_item_id: item.id,
                price: parseFloat(prices[quoteId]?.[item.id] ?? '0') || 0,
            }))
        );
    }

    function quoteTotal(quoteId: number): number {
        return (data.items as Item[]).reduce((sum, item) => {
            const p = parseFloat(prices[quoteId]?.[item.id] ?? '0') || 0;
            return sum + p * item.quantity;
        }, 0);
    }

    function bestQuoteId(): number | null {
        if (data.quotes.length === 0) return null;
        return data.quotes.reduce((best: Quote, q: Quote) =>
            quoteTotal(q.id) < quoteTotal(best.id) ? q : best
        ).id;
    }

    let selectedSupplier = $state('');
    let isSubmitting     = $state(false);
    const isLocked = $derived(data.list.list_status === 'quoted');

    // PDF import state per quote
    let isImporting = $state<Record<number, boolean>>({});
    let pdfInputEls = $state<Record<number, HTMLInputElement | null>>({});

    function applyImportedPrices(quoteId: number, prices: { list_item_id: number; price: number | null; confidence: number }[]) {
        const filled = prices.filter(p => p.price != null);
        for (const p of filled) {
            if (!edits[quoteId]) edits[quoteId] = {};
            edits[quoteId][p.list_item_id] = p.price!.toFixed(2);
        }
        const skipped = prices.length - filled.length;
        if (skipped > 0)
            toast.success(`${filled.length} preços importados. ${skipped} não encontrados — revise manualmente.`);
        else
            toast.success(`${filled.length} preços importados! Revise antes de salvar.`);
    }
</script>

<div class="mx-auto max-w-7xl space-y-6 p-6">

    <!-- Header -->
    <div class="flex items-start justify-between">
        <div class="space-y-1">
            <a href="/supplies/lists" class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronLeft class="h-4 w-4" /> Voltar para listas
            </a>
            <h1 class="text-2xl font-bold">{data.list.list_name}</h1>
            <div class="flex items-center gap-2">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium {STATUS_COLORS[data.list.list_status]}">
                    {STATUS_LABELS[data.list.list_status]}
                </span>
                {#if data.list.client}
                    <span class="text-sm text-muted-foreground">
                        {data.list.client.client_first_name} {data.list.client.client_last_name}
                    </span>
                {/if}
            </div>
        </div>

        <div class="flex gap-2">
            <!-- PDF download -->
            <a href="/supplies/lists/{data.list.id}/pdf" target="_blank">
                <Button variant="outline" class="gap-2">
                    <FileDown class="h-4 w-4" /> Exportar PDF
                </Button>
            </a>

            <!-- Mark as quoted -->
            {#if !isLocked && data.quotes.length > 0}
                <form method="POST" action="?/markQuoted" use:enhance={() => {
                    isSubmitting = true;
                    return async ({ result, update }) => {
                        isSubmitting = false;
                        if (result.type === 'failure') toast.error(result.data?.error ?? 'Erro');
                        await update();
                    };
                }}>
                    <Button type="submit" class="gap-2 bg-violet-600 hover:bg-violet-700" disabled={isSubmitting}>
                        <CheckCheck class="h-4 w-4" /> Finalizar cotações
                    </Button>
                </form>
            {/if}
        </div>
    </div>

    <!-- Quotes table -->
    <Card.Root>
        <Card.Header>
            <Card.Title>Cotações por fornecedor</Card.Title>
            {#if data.quotes.length === 0}
                <Card.Description>Adicione um fornecedor abaixo para começar.</Card.Description>
            {/if}
        </Card.Header>
        <Card.Content class="overflow-x-auto">
            {#if data.items.length > 0 && data.quotes.length > 0}
                {@const best = bestQuoteId()}
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b">
                            <th class="pb-2 pr-4 text-left font-medium text-muted-foreground">Material</th>
                            <th class="pb-2 pr-6 text-right font-medium text-muted-foreground">Qtd</th>
                            {#each data.quotes as quote (quote.id)}
                                <th class="pb-2 px-2 text-center font-medium min-w-[140px]
                                    {quote.id === best ? 'text-green-700' : ''}">
                                    {quote.supplier_name}
                                    {#if quote.id === best}
                                        <span class="ml-1 text-xs font-normal text-green-600">(menor)</span>
                                    {/if}
                                </th>
                            {/each}
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.items as item (item.id)}
                            <tr class="border-b last:border-0">
                                <td class="py-2 pr-4 font-medium">{item.supply_name}</td>
                                <td class="py-2 pr-6 text-right text-muted-foreground">{item.quantity}</td>
                                {#each data.quotes as quote (quote.id)}
                                    <td class="py-2 px-2">
                                        {#if isLocked}
                                            <span class="block text-center">
                                                {quote.priceMap[item.id] != null
                                                    ? `R$ ${Number(quote.priceMap[item.id]).toFixed(2)}`
                                                    : '—'}
                                            </span>
                                        {:else}
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                class="h-8 text-right text-sm"
                                                bind:value={prices[quote.id][item.id]}
                                                placeholder="0,00"
                                            />
                                        {/if}
                                    </td>
                                {/each}
                            </tr>
                        {/each}
                        <!-- Totals row -->
                        <tr class="border-t bg-muted/30 font-semibold">
                            <td class="py-2 pr-4">Total</td>
                            <td class="py-2 pr-6"></td>
                            {#each data.quotes as quote (quote.id)}
                                <td class="py-2 px-2 text-center
                                    {quote.id === best ? 'text-green-700' : ''}">
                                    R$ {quoteTotal(quote.id).toFixed(2)}
                                </td>
                            {/each}
                        </tr>
                    </tbody>
                </table>
            {:else if data.items.length === 0}
                <p class="text-sm text-muted-foreground">Esta lista não tem itens.</p>
            {/if}
        </Card.Content>
    </Card.Root>

    <!-- Per-quote save + import + remove actions -->
    {#if !isLocked && data.quotes.length > 0}
        <div class="flex flex-wrap gap-3">
            {#each data.quotes as quote (quote.id)}
                <div class="flex items-center gap-2 rounded-lg border bg-card p-3">
                    <span class="text-sm font-medium">{quote.supplier_name}</span>

                    <!-- Import PDF -->
                    <form method="POST" action="?/importPdf" enctype="multipart/form-data"
                        use:enhance={() => {
                            isImporting[quote.id] = true;
                            return async ({ result, update }) => {
                                isImporting[quote.id] = false;
                                if (result.type === 'success' && (result.data as any)?.action === 'importPdf') {
                                    applyImportedPrices(quote.id, (result.data as any).prices);
                                } else if (result.type === 'failure') {
                                    toast.error((result.data as any)?.error ?? 'Erro ao importar PDF');
                                }
                                // reset file input so the same file can be re-selected
                                if (pdfInputEls[quote.id]) pdfInputEls[quote.id]!.value = '';
                                await update({ reset: false });
                            };
                        }}>
                        <input type="hidden" name="quote_id" value={quote.id} />
                        <input
                            type="file"
                            name="pdf"
                            accept=".pdf,application/pdf"
                            class="hidden"
                            bind:this={pdfInputEls[quote.id]}
                            onchange={(e) => (e.currentTarget.closest('form') as HTMLFormElement)?.requestSubmit()}
                        />
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            class="gap-1 h-7 {quote.pdf_parser ? 'text-blue-600 border-blue-200 hover:bg-blue-50' : ''}"
                            title={quote.pdf_parser ? `Parser personalizado: ${quote.pdf_parser}` : 'Parser genérico'}
                            disabled={isImporting[quote.id]}
                            onclick={() => pdfInputEls[quote.id]?.click()}
                        >
                            {#if isImporting[quote.id]}
                                <LoaderCircle class="h-3 w-3 animate-spin" />
                            {:else}
                                <FileUp class="h-3 w-3" />
                            {/if}
                            PDF
                        </Button>
                    </form>

                    <!-- Save -->
                    <form method="POST" action="?/saveQuote" use:enhance={({ formData }) => {
                        formData.set('quote_id', String(quote.id));
                        formData.set('prices', buildPricesJson(quote.id));
                        return async ({ result, update }) => {
                            if (result.type === 'failure') toast.error(result.data?.error ?? 'Erro ao salvar');
                            else toast.success(`Preços de ${quote.supplier_name} salvos`);
                            await update();
                        };
                    }}>
                        <Button type="submit" size="sm" variant="outline" class="gap-1 h-7">
                            <Save class="h-3 w-3" /> Salvar
                        </Button>
                    </form>

                    <!-- Remove -->
                    <form method="POST" action="?/removeQuote" use:enhance={({ formData }) => {
                        formData.set('quote_id', String(quote.id));
                        return async ({ result, update }) => {
                            if (result.type === 'failure') toast.error(result.data?.error ?? 'Erro');
                            else toast.success('Cotação removida');
                            await update();
                        };
                    }}>
                        <Button type="submit" size="sm" variant="ghost" class="h-7 w-7 p-0 text-destructive hover:text-destructive">
                            <Trash2 class="h-3 w-3" />
                        </Button>
                    </form>
                </div>
            {/each}
        </div>
    {/if}

    <!-- Add supplier quote -->
    {#if !isLocked && data.suppliers.length > 0}
        <Card.Root>
            <Card.Header>
                <Card.Title class="text-base">Adicionar fornecedor</Card.Title>
            </Card.Header>
            <Card.Content>
                <form method="POST" action="?/addQuote" class="flex items-end gap-3"
                    use:enhance={() => {
                        return async ({ result, update }) => {
                            if (result.type === 'failure') toast.error(result.data?.error ?? 'Erro');
                            else { toast.success('Fornecedor adicionado'); selectedSupplier = ''; }
                            await update();
                        };
                    }}>
                    <input type="hidden" name="supplier_id" value={selectedSupplier} />
                    <div class="flex-1 space-y-1">
                        <label class="text-sm font-medium">Fornecedor</label>
                        <Select.Root type="single" bind:value={selectedSupplier}>
                            <Select.Trigger class="w-full">
                                {selectedSupplier
                                    ? (data.suppliers.find((s: any) => String(s.id) === selectedSupplier)?.supplier_name ?? 'Selecione...')
                                    : 'Selecione um fornecedor...'}
                            </Select.Trigger>
                            <Select.Content>
                                {#each data.suppliers as s}
                                    <Select.Item value={String(s.id)}>{s.supplier_name}</Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                    <Button type="submit" class="gap-2" disabled={!selectedSupplier}>
                        <Plus class="h-4 w-4" /> Adicionar
                    </Button>
                </form>
            </Card.Content>
        </Card.Root>
    {:else if !isLocked && data.suppliers.length === 0 && data.quotes.length > 0}
        <p class="text-sm text-muted-foreground">Todos os fornecedores cadastrados já foram adicionados.</p>
    {/if}
</div>
