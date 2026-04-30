<script lang="ts">
    import { enhance } from '$app/forms';
    import { invalidateAll, goto } from '$app/navigation';
    import { page } from '$app/state';
    import { toast } from 'svelte-sonner';

    import * as Card from '$lib/components/ui/card';
    import * as Table from '$lib/components/ui/table';
    import * as Dialog from '$lib/components/ui/dialog';
    import { Button } from '$lib/components/ui/button';
    import { Badge } from '$lib/components/ui/badge';
    import { Input } from '$lib/components/ui/input';
    import * as Pagination from '$lib/components/ui/pagination';

    import {
        ClipboardList, Clock, CircleCheck, CircleX,
        Search, ArrowUp, ArrowRight, ArrowDown,
        Check, X, Eye, Pencil, Trash2, LoaderCircle,
        PackageSearch, Tags, ClipboardCheck
    } from '@lucide/svelte';

    let { data, form } = $props();

    // ── Toasts dos actions approve/deny ──
    $effect(() => {
        if (form?.success) toast.success('Status atualizado!');
        else if ((form as any)?.error) toast.error((form as any).error);
    });

    // ── Filtro de status via URL ──
    function setFilter(s: string) {
        const u = new URL(page.url);
        u.searchParams.set('status', s);
        u.searchParams.set('page', '1');
        goto(u.toString(), { noScroll: true });
    }

    function handlePage(p: number) {
        const u = new URL(page.url);
        u.searchParams.set('page', p.toString());
        goto(u.toString(), { noScroll: true });
    }

    // ── Busca com debounce ──
    let searchTimeout: ReturnType<typeof setTimeout>;
    function handleSearch(e: Event) {
        const v = (e.target as HTMLInputElement).value;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const u = new URL(page.url);
            u.searchParams.set('search', v);
            u.searchParams.set('page', '1');
            goto(u.toString(), { noScroll: true, keepFocus: true });
        }, 500);
    }

    // ── Detalhe do pedido ──
    let detailOpen    = $state(false);
    let detailLoading = $state(false);
    let detail        = $state<any>(null);

    async function openDetail(id: number) {
        detail        = null;
        detailOpen    = true;
        detailLoading = true;
        try {
            const res = await fetch(`/supplies/manage/${id}`);
            if (!res.ok) throw new Error();
            detail = await res.json();
        } catch { toast.error('Erro ao carregar detalhes'); detailOpen = false; }
        detailLoading = false;
    }

    // ── Helpers visuais ──
    const STATUS = {
        pending:  { label: 'Pendente',  cls: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100', icon: Clock },
        quoting:  { label: 'Cotando',   cls: 'bg-blue-100   text-blue-800   hover:bg-blue-100',   icon: Tags },
        quoted:   { label: 'Cotado',    cls: 'bg-violet-100 text-violet-800 hover:bg-violet-100', icon: ClipboardCheck },
        approved: { label: 'Aprovado',  cls: 'bg-green-100  text-green-800  hover:bg-green-100',  icon: CircleCheck },
        denied:   { label: 'Recusado',  cls: 'bg-red-100    text-red-800    hover:bg-red-100',    icon: CircleX },
    } as const;

    const PRIORITY = {
        high:   { label: 'Alta',  cls: 'text-red-600    font-medium', Icon: ArrowUp },
        medium: { label: 'Média', cls: 'text-orange-600',             Icon: ArrowRight },
        low:    { label: 'Baixa', cls: 'text-slate-500',              Icon: ArrowDown },
    } as const;

    function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
    function fmtDate(s: string) { return new Date(s).toLocaleDateString('pt-BR'); }

    const tabs = [
        { key: 'pending',  label: 'Pendentes',          color: 'text-yellow-700 border-yellow-400' },
        { key: 'quoting',  label: 'Cotando',            color: 'text-blue-700   border-blue-400'   },
        { key: 'quoted',   label: 'Prontos p/ aprovar', color: 'text-violet-700 border-violet-400' },
        { key: 'approved', label: 'Aprovados',          color: 'text-green-700  border-green-400'  },
        { key: 'denied',   label: 'Recusados',          color: 'text-red-700    border-red-400'    },
        { key: 'all',      label: 'Todos',              color: 'text-foreground border-primary'    },
    ] as const;
</script>

<div class="space-y-5">

    <!-- Cabeçalho -->
    <div>
        <h2 class="text-2xl font-bold tracking-tight">Gerenciamento de Pedidos</h2>
        <p class="text-sm text-muted-foreground">Revise, aprove ou recuse listas de materiais.</p>
    </div>

    <!-- KPI cards -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card.Root class="border-l-4 border-l-yellow-400">
            <Card.Content class="flex items-center gap-3 p-4">
                <Clock class="size-8 shrink-0 text-yellow-500" />
                <div>
                    <p class="text-2xl font-bold">{data.stats.pending}</p>
                    <p class="text-xs text-muted-foreground">Pendentes</p>
                </div>
            </Card.Content>
        </Card.Root>

        <Card.Root class="border-l-4 border-l-violet-400">
            <Card.Content class="flex items-center gap-3 p-4">
                <ClipboardCheck class="size-8 shrink-0 text-violet-500" />
                <div>
                    <p class="text-2xl font-bold">{data.stats.quoted}</p>
                    <p class="text-xs text-muted-foreground">Prontos p/ aprovar</p>
                </div>
            </Card.Content>
        </Card.Root>

        <Card.Root class="border-l-4 border-l-green-400">
            <Card.Content class="flex items-center gap-3 p-4">
                <CircleCheck class="size-8 shrink-0 text-green-500" />
                <div>
                    <p class="text-2xl font-bold">{data.stats.approved}</p>
                    <p class="text-xs text-muted-foreground">Aprovados</p>
                </div>
            </Card.Content>
        </Card.Root>

        <Card.Root class="border-l-4 border-l-red-400">
            <Card.Content class="flex items-center gap-3 p-4">
                <CircleX class="size-8 shrink-0 text-red-500" />
                <div>
                    <p class="text-2xl font-bold">{data.stats.denied}</p>
                    <p class="text-xs text-muted-foreground">Recusados</p>
                </div>
            </Card.Content>
        </Card.Root>
    </div>

    <!-- Tabela + filtros -->
    <Card.Root>
        <!-- Filtros -->
        <Card.Header class="pb-0">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <!-- Tabs de status -->
                <div class="flex gap-1 rounded-lg bg-muted p-1">
                    {#each tabs as t}
                        <button
                            onclick={() => setFilter(t.key)}
                            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                                   {data.statusFilter === t.key
                                       ? 'bg-background shadow text-foreground'
                                       : 'text-muted-foreground hover:text-foreground'}"
                        >
                            {t.label}
                        </button>
                    {/each}
                </div>

                <!-- Busca -->
                <div class="relative w-full max-w-xs">
                    <Search class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar lista ou cliente..."
                        class="pl-9"
                        value={data.search}
                        oninput={handleSearch}
                    />
                </div>
            </div>
        </Card.Header>

        <Card.Content class="pt-4">
            <div class="rounded-md border">
                <Table.Root>
                    <Table.Header>
                        <Table.Row class="bg-muted/40">
                            <Table.Head class="w-12">#</Table.Head>
                            <Table.Head>Lista</Table.Head>
                            <Table.Head class="hidden md:table-cell">Cliente</Table.Head>
                            <Table.Head class="hidden sm:table-cell">Prioridade</Table.Head>
                            <Table.Head class="hidden lg:table-cell text-center">Itens</Table.Head>
                            <Table.Head class="hidden lg:table-cell text-right">Melhor Cotação</Table.Head>
                            <Table.Head>Status</Table.Head>
                            <Table.Head class="hidden md:table-cell">Criado em</Table.Head>
                            <Table.Head class="text-right">Ações</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#if data.orders.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={9} class="h-32 text-center">
                                    <PackageSearch class="mx-auto mb-2 size-8 opacity-20" />
                                    <p class="text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
                                </Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each data.orders as order (order.id)}
                                {@const st  = STATUS[order.list_status as keyof typeof STATUS]  ?? STATUS.pending}
                                {@const pri = PRIORITY[order.priority as keyof typeof PRIORITY] ?? PRIORITY.medium}
                                <Table.Row class="group">
                                    <Table.Cell class="text-xs text-muted-foreground font-mono">#{order.id}</Table.Cell>

                                    <Table.Cell>
                                        <div class="flex items-center gap-2">
                                            <ClipboardList class="size-4 shrink-0 text-muted-foreground" />
                                            <span class="font-medium">{order.list_name}</span>
                                        </div>
                                    </Table.Cell>

                                    <Table.Cell class="hidden md:table-cell text-sm text-muted-foreground">
                                        {order.client_first_name ?? '—'} {order.client_last_name ?? ''}
                                    </Table.Cell>

                                    <Table.Cell class="hidden sm:table-cell">
                                        <div class="flex items-center gap-1 text-sm {pri.cls}">
                                            <pri.Icon class="size-3.5" />
                                            {pri.label}
                                        </div>
                                    </Table.Cell>

                                    <Table.Cell class="hidden lg:table-cell text-center text-sm">
                                        {order.item_count}
                                    </Table.Cell>

                                    <Table.Cell class="hidden lg:table-cell text-right text-sm font-medium">
                                        {order.total_value > 0 ? fmt(order.total_value) : '—'}
                                    </Table.Cell>

                                    <Table.Cell>
                                        <Badge variant="outline" class="gap-1 {st.cls}">
                                            <st.icon class="size-3" />
                                            {st.label}
                                        </Badge>
                                    </Table.Cell>

                                    <Table.Cell class="hidden md:table-cell text-xs text-muted-foreground">
                                        {fmtDate(order.creation_date)}
                                    </Table.Cell>

                                    <Table.Cell>
                                        <div class="flex items-center justify-end gap-1">
                                            <!-- Ver detalhes -->
                                            <Button
                                                variant="ghost" size="icon"
                                                class="size-8"
                                                title="Ver detalhes"
                                                onclick={() => openDetail(order.id)}
                                            >
                                                <Eye class="size-4" />
                                            </Button>

                                            <!-- Editar -->
                                            <Button
                                                variant="ghost" size="icon"
                                                class="size-8"
                                                title="Editar"
                                                onclick={() => goto(`/supplies/lists/edit/${order.id}`)}
                                            >
                                                <Pencil class="size-4" />
                                            </Button>

                                            <!-- Aprovar / Recusar (pendente ou cotado) -->
                                            {#if order.list_status === 'pending' || order.list_status === 'quoted'}
                                                <form
                                                    method="POST"
                                                    action="?/approve"
                                                    use:enhance={() => async ({ result }) => {
                                                        if (result.type === 'success') { toast.success('Pedido aprovado!'); await invalidateAll(); }
                                                        else toast.error('Erro ao aprovar.');
                                                    }}
                                                >
                                                    <input type="hidden" name="id" value={order.id} />
                                                    <Button
                                                        type="submit"
                                                        variant="ghost" size="icon"
                                                        class="size-8 text-green-600 hover:bg-green-50 hover:text-green-700"
                                                        title="Aprovar"
                                                    >
                                                        <Check class="size-4" />
                                                    </Button>
                                                </form>

                                                <form
                                                    method="POST"
                                                    action="?/deny"
                                                    use:enhance={() => async ({ result }) => {
                                                        if (result.type === 'success') { toast.success('Pedido recusado.'); await invalidateAll(); }
                                                        else toast.error('Erro ao recusar.');
                                                    }}
                                                >
                                                    <input type="hidden" name="id" value={order.id} />
                                                    <Button
                                                        type="submit"
                                                        variant="ghost" size="icon"
                                                        class="size-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                                                        title="Recusar"
                                                    >
                                                        <X class="size-4" />
                                                    </Button>
                                                </form>
                                            {/if}

                                            <!-- Excluir (aprovado ou recusado) -->
                                            {#if order.list_status !== 'pending'}
                                                <form
                                                    method="POST"
                                                    action="?/delete"
                                                    use:enhance={() => async ({ result, update }) => {
                                                        if (result.type === 'success') { toast.success('Lista excluída.'); await invalidateAll(); }
                                                        else toast.error('Erro ao excluir.');
                                                        await update({ reset: false });
                                                    }}
                                                >
                                                    <input type="hidden" name="id" value={order.id} />
                                                    <Button
                                                        type="submit"
                                                        variant="ghost" size="icon"
                                                        class="size-8 text-muted-foreground hover:text-destructive"
                                                        title="Excluir lista"
                                                    >
                                                        <Trash2 class="size-4" />
                                                    </Button>
                                                </form>
                                            {/if}
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            {/each}
                        {/if}
                    </Table.Body>
                </Table.Root>
            </div>

            <!-- Paginação -->
            {#if data.totalItems > 15}
                <div class="mt-4">
                    <Pagination.Root count={data.totalItems} perPage={15} page={data.currentPage}>
                        {#snippet children({ pages, currentPage })}
                            <Pagination.Content>
                                <Pagination.Item>
                                    <Pagination.PrevButton
                                        disabled={currentPage <= 1}
                                        onclick={() => handlePage(currentPage - 1)}
                                        class="cursor-pointer"
                                    />
                                </Pagination.Item>
                                {#each pages as page (page.key)}
                                    {#if page.type === 'ellipsis'}
                                        <Pagination.Item><Pagination.Ellipsis /></Pagination.Item>
                                    {:else}
                                        <Pagination.Item>
                                            <Pagination.Link
                                                {page}
                                                isActive={currentPage === page.value}
                                                onclick={(e) => { e.preventDefault(); handlePage(page.value); }}
                                            >{page.value}</Pagination.Link>
                                        </Pagination.Item>
                                    {/if}
                                {/each}
                                <Pagination.Item>
                                    <Pagination.NextButton
                                        disabled={currentPage * 15 >= data.totalItems}
                                        onclick={() => handlePage(currentPage + 1)}
                                        class="cursor-pointer"
                                    />
                                </Pagination.Item>
                            </Pagination.Content>
                        {/snippet}
                    </Pagination.Root>
                </div>
            {/if}
        </Card.Content>
    </Card.Root>
</div>

<!-- ── Dialog de detalhes ── -->
<Dialog.Root bind:open={detailOpen}>
    <Dialog.Content class="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden">
        {#if detailLoading || !detail}
            <div class="flex h-48 items-center justify-center">
                <LoaderCircle class="size-8 animate-spin text-primary" />
            </div>
        {:else}
            {@const st       = STATUS[detail.list_status as keyof typeof STATUS]  ?? STATUS.pending}
            {@const pri      = PRIORITY[detail.priority as keyof typeof PRIORITY] ?? PRIORITY.medium}
            {@const bestId   = detail.quotes.length > 0
                ? detail.quotes.reduce((b: any, q: any) => q.total < b.total ? q : b).id
                : null}
            {@const bestQuote = detail.quotes.find((q: any) => q.id === bestId) ?? null}

            <!-- Header -->
            <Dialog.Header class="shrink-0">
                <Dialog.Title class="flex flex-wrap items-center gap-2">
                    <ClipboardList class="size-5 shrink-0" />
                    <span>{detail.list_name}</span>
                    <Badge variant="outline" class="gap-1 {st.cls}">
                        <st.icon class="size-3" />{st.label}
                    </Badge>
                    <span class="flex items-center gap-1 text-sm font-normal {pri.cls}">
                        <pri.Icon class="size-3.5" />{pri.label}
                    </span>
                </Dialog.Title>
                <Dialog.Description class="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                    {#if detail.client_first_name}
                        <span>Cliente: <strong class="text-foreground">{detail.client_first_name} {detail.client_last_name}</strong></span>
                    {/if}
                    <span>Criado por: {detail.creator_first_name} {detail.creator_last_name}</span>
                    <span>Data: {fmtDate(detail.creation_date)}</span>
                    {#if detail.description}
                        <span class="w-full text-foreground/70 italic">{detail.description}</span>
                    {/if}
                </Dialog.Description>
            </Dialog.Header>

            <!-- Body: quotes table or plain items -->
            <div class="min-h-0 flex-1 overflow-auto rounded-md border">
                {#if detail.quotes.length > 0}
                    <table class="w-full text-sm">
                        <thead class="sticky top-0 bg-muted/90 backdrop-blur-sm">
                            <tr class="border-b">
                                <th class="p-2 text-left font-medium text-muted-foreground">Material</th>
                                <th class="p-2 text-right font-medium text-muted-foreground">Qtd</th>
                                {#each detail.quotes as q (q.id)}
                                    <th class="min-w-[120px] p-2 text-right font-medium
                                        {q.id === bestId ? 'text-green-700' : 'text-muted-foreground'}">
                                        {q.supplier_name}
                                        {#if q.id === bestId}
                                            <span class="ml-0.5 text-[10px] font-normal text-green-600">★ melhor</span>
                                        {/if}
                                    </th>
                                {/each}
                            </tr>
                        </thead>
                        <tbody>
                            {#each detail.items as item (item.id)}
                                <tr class="border-b last:border-0 hover:bg-muted/30">
                                    <td class="p-2 font-medium">{item.supply_name}</td>
                                    <td class="p-2 text-right text-muted-foreground">{item.quantity}</td>
                                    {#each detail.quotes as q (q.id)}
                                        {@const price = q.priceMap[item.id]}
                                        <td class="p-2 text-right {q.id === bestId ? 'font-medium text-green-700' : ''}">
                                            {#if price != null}
                                                {fmt(price)}
                                            {:else}
                                                <span class="text-muted-foreground">—</span>
                                            {/if}
                                        </td>
                                    {/each}
                                </tr>
                            {/each}
                            <!-- Totals -->
                            <tr class="border-t bg-muted/40 font-semibold">
                                <td class="p-2">Total</td>
                                <td></td>
                                {#each detail.quotes as q (q.id)}
                                    <td class="p-2 text-right {q.id === bestId ? 'text-green-700' : ''}">
                                        {fmt(q.total)}
                                    </td>
                                {/each}
                            </tr>
                        </tbody>
                    </table>
                {:else}
                    <!-- No quotes yet — show plain item list -->
                    <table class="w-full text-sm">
                        <thead class="sticky top-0 bg-muted/90 backdrop-blur-sm">
                            <tr class="border-b">
                                <th class="p-2 text-left font-medium text-muted-foreground">Material</th>
                                <th class="p-2 text-right font-medium text-muted-foreground">Quantidade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each detail.items as item (item.id)}
                                <tr class="border-b last:border-0">
                                    <td class="p-2">{item.supply_name}</td>
                                    <td class="p-2 text-right">{item.quantity}</td>
                                </tr>
                            {:else}
                                <tr>
                                    <td colspan={2} class="h-16 p-2 text-center text-muted-foreground">Nenhum item.</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                {/if}
            </div>

            <!-- Footer: best total + actions -->
            <div class="flex shrink-0 items-center justify-between border-t pt-3">
                <div>
                    {#if bestQuote}
                        <p class="text-xs text-muted-foreground">Melhor proposta — {bestQuote.supplier_name}</p>
                        <p class="text-xl font-bold text-green-700">{fmt(bestQuote.total)}</p>
                    {:else}
                        <p class="text-sm text-muted-foreground">Sem cotações registradas</p>
                    {/if}
                </div>

                <div class="flex gap-2">
                    {#if detail.list_status === 'pending' || detail.list_status === 'quoted'}
                        <form method="POST" action="?/deny"
                            use:enhance={() => async ({ result }) => {
                                if (result.type === 'success') { toast.success('Pedido recusado.'); detailOpen = false; await invalidateAll(); }
                                else toast.error('Erro ao recusar.');
                            }}>
                            <input type="hidden" name="id" value={detail.id} />
                            <Button type="submit" variant="outline" class="border-red-200 text-red-600 hover:bg-red-50">
                                <X class="mr-2 size-4" /> Recusar
                            </Button>
                        </form>
                        <form method="POST" action="?/approve"
                            use:enhance={() => async ({ result }) => {
                                if (result.type === 'success') { toast.success('Pedido aprovado!'); detailOpen = false; await invalidateAll(); }
                                else toast.error('Erro ao aprovar.');
                            }}>
                            <input type="hidden" name="id" value={detail.id} />
                            <Button type="submit" class="bg-green-600 hover:bg-green-700">
                                <Check class="mr-2 size-4" /> Aprovar
                            </Button>
                        </form>
                    {:else}
                        <Button variant="outline" onclick={() => { detailOpen = false; goto(`/supplies/lists/edit/${detail.id}`); }}>
                            <Pencil class="mr-2 size-4" /> Editar
                        </Button>
                    {/if}
                </div>
            </div>
        {/if}
    </Dialog.Content>
</Dialog.Root>
