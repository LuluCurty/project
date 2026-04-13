<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto, invalidateAll } from '$app/navigation';
    import { page } from '$app/state';
    import { toast } from 'svelte-sonner';
    import type { PageData } from './$types';

    import * as Card from '$lib/components/ui/card';
    import * as Table from '$lib/components/ui/table';
    import * as Pagination from '$lib/components/ui/pagination';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Badge } from '$lib/components/ui/badge';
    import {
        Plus, Search, Pencil, Trash,
        Package, ChevronLeft, ChevronRight,
    } from '@lucide/svelte';

    let { data }: { data: PageData } = $props();

    let searchTimer: ReturnType<typeof setTimeout>;

    function handleSearch(e: Event) {
        const v = (e.target as HTMLInputElement).value;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            const u = new URL(page.url);
            u.searchParams.set('search', v);
            u.searchParams.set('page', '1');
            goto(u.toString(), { noScroll: true, keepFocus: true });
        }, 500);
    }

    function handlePage(p: number) {
        const u = new URL(page.url);
        u.searchParams.set('page', p.toString());
        goto(u.toString(), { noScroll: true });
    }

    function fmt(v: number | null) {
        if (v == null) return '—';
        return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
</script>

<div class="space-y-4">

    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
            <h2 class="text-2xl font-bold tracking-tight text-primary">Materiais</h2>
            <p class="text-muted-foreground text-sm">Gerencie o catálogo de materiais.</p>
        </div>
        <Button onclick={() => goto('/supplies/add')}>
            <Plus class="mr-2 size-4" /> Novo Material
        </Button>
    </div>

    <Card.Root>
        <Card.Header class="pb-3">
            <div class="relative w-full max-w-sm">
                <Search class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Buscar por nome..."
                    class="pl-9"
                    value={data.search}
                    oninput={handleSearch}
                />
            </div>
        </Card.Header>

        <Card.Content>
            <div class="rounded-md border">
                <Table.Root>
                    <Table.Header>
                        <Table.Row class="bg-muted/50">
                            <Table.Head class="w-12">#</Table.Head>
                            <Table.Head>Material</Table.Head>
                            <Table.Head class="hidden sm:table-cell text-right">Qtd. Estoque</Table.Head>
                            <Table.Head class="hidden md:table-cell text-right">Preço Padrão</Table.Head>
                            <Table.Head class="hidden lg:table-cell">Fornecedor Padrão</Table.Head>
                            <Table.Head class="hidden lg:table-cell">Detalhes</Table.Head>
                            <Table.Head class="text-right">Ações</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#if data.supplies.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={7} class="h-32 text-center text-muted-foreground">
                                    Nenhum material encontrado.
                                </Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each data.supplies as s (s.id)}
                                <Table.Row>
                                    <Table.Cell class="text-xs text-muted-foreground font-mono">#{s.id}</Table.Cell>

                                    <Table.Cell>
                                        <div class="flex items-center gap-2">
                                            <Package class="size-4 shrink-0 text-muted-foreground" />
                                            <span class="font-medium">{s.supply_name}</span>
                                        </div>
                                    </Table.Cell>

                                    <Table.Cell class="hidden sm:table-cell text-right">
                                        <Badge variant="outline">{s.quantity ?? 0}</Badge>
                                    </Table.Cell>

                                    <Table.Cell class="hidden md:table-cell text-right text-sm font-medium">
                                        {fmt(s.price)}
                                    </Table.Cell>

                                    <Table.Cell class="hidden lg:table-cell text-sm text-muted-foreground">
                                        {s.supplier_name ?? '—'}
                                    </Table.Cell>

                                    <Table.Cell class="hidden lg:table-cell max-w-[200px] truncate text-sm text-muted-foreground"
                                        title={s.details ?? ''}>
                                        {s.details ?? '—'}
                                    </Table.Cell>

                                    <Table.Cell>
                                        <div class="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" class="size-8"
                                                onclick={() => goto(`/supplies/edit/${s.id}`)}>
                                                <Pencil class="size-4" />
                                            </Button>

                                            <form method="POST" action="?/delete"
                                                use:enhance={() => async ({ result, update }) => {
                                                    if (result.type === 'success') {
                                                        toast.success('Material excluído.');
                                                        await invalidateAll();
                                                    } else if (result.type === 'failure') {
                                                        toast.error(String((result.data as any)?.error) || 'Erro ao excluir.');
                                                    }
                                                    await update({ reset: false });
                                                }}
                                            >
                                                <input type="hidden" name="id" value={s.id} />
                                                <Button type="submit" variant="ghost" size="icon"
                                                    class="size-8 text-muted-foreground hover:text-destructive">
                                                    <Trash class="size-4" />
                                                </Button>
                                            </form>
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            {/each}
                        {/if}
                    </Table.Body>
                </Table.Root>
            </div>

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
                                    >
                                        <ChevronLeft class="size-4" />
                                        <span class="hidden sm:block">Anterior</span>
                                    </Pagination.PrevButton>
                                </Pagination.Item>
                                {#each pages as p (p.key)}
                                    {#if p.type === 'ellipsis'}
                                        <Pagination.Item><Pagination.Ellipsis /></Pagination.Item>
                                    {:else}
                                        <Pagination.Item>
                                            <Pagination.Link
                                                page={p}
                                                isActive={currentPage === p.value}
                                                onclick={(e) => { e.preventDefault(); handlePage(p.value); }}
                                            >{p.value}</Pagination.Link>
                                        </Pagination.Item>
                                    {/if}
                                {/each}
                                <Pagination.Item>
                                    <Pagination.NextButton
                                        disabled={currentPage * 15 >= data.totalItems}
                                        onclick={() => handlePage(currentPage + 1)}
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
