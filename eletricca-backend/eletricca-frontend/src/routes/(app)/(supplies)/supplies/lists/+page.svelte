<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto, invalidateAll } from '$app/navigation';
    import { page } from '$app/state';
    import { toast } from 'svelte-sonner';
    import { onMount } from 'svelte';
    import type { PageData } from './$types';

    import * as Card from '$lib/components/ui/card';
    import * as Table from '$lib/components/ui/table';
    import * as Pagination from '$lib/components/ui/pagination';
    import { Badge } from '$lib/components/ui/badge';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import {
        Plus, Search, Pencil, Trash, FileText,
        ArrowUp, ArrowRight, ArrowDown, Lock,
        Clock, CircleCheck, CircleX, ChevronLeft, ChevronRight
    } from '@lucide/svelte';

    let { data }: { data: PageData } = $props();

    const STATUS = {
        pending:  { label: 'Pendente', cls: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
        approved: { label: 'Aprovado', cls: 'bg-green-100  text-green-800  hover:bg-green-100'  },
        denied:   { label: 'Recusado', cls: 'bg-red-100    text-red-800    hover:bg-red-100'    },
    } as const;

    const tabs = [
        { key: 'pending',  label: 'Pendentes',  count: data.stats.pending,  icon: Clock        },
        { key: 'approved', label: 'Aprovados',  count: data.stats.approved, icon: CircleCheck  },
        { key: 'denied',   label: 'Recusados',  count: data.stats.denied,   icon: CircleX      },
    ] as const;

    function setFilter(s: string) {
        const u = new URL(page.url);
        u.searchParams.set('status', s);
        u.searchParams.set('page', '1');
        goto(u.toString(), { noScroll: true });
    }

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

    let searchTimer: ReturnType<typeof setTimeout>;

    onMount(() => {
        const msg = page.url.searchParams.get('msg');
        if (msg === 'not_pending') {
            toast.error('Esta lista não pode ser editada pois já foi aprovada ou recusada.');
        } else if (msg === 'no_permission') {
            toast.error('Você não tem permissão para editar esta lista.');
        }
        if (msg) {
            const u = new URL(page.url);
            u.searchParams.delete('msg');
            goto(u.toString(), { replaceState: true, noScroll: true });
        }
    });

    function fmtDate(s: string) { return new Date(s).toLocaleDateString('pt-BR'); }
    function fmt(v: number)     { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

    function canEdit(status: string, createdBy: number) {
        if (status !== 'pending') return false;
        return data.currentUserId === createdBy || data.canManageAll;
    }
</script>

<div class="space-y-4">

    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
            <h2 class="text-2xl font-bold tracking-tight text-primary">Listas de Materiais</h2>
            <p class="text-muted-foreground text-sm">Gerencie orçamentos e listas de compras.</p>
        </div>
        <Button onclick={() => goto('/supplies/lists/add')}>
            <Plus class="mr-2 size-4" /> Nova Lista
        </Button>
    </div>

    <!-- Tabs de status -->
    <div class="flex gap-2 flex-wrap">
        {#each tabs as t}
            <button
                onclick={() => setFilter(t.key)}
                class="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors
                       {data.statusFilter === t.key
                           ? 'bg-primary text-primary-foreground border-primary'
                           : 'bg-background hover:bg-muted border-border text-muted-foreground'}"
            >
                <t.icon class="size-4" />
                {t.label}
                <Badge variant="secondary" class="ml-1 h-5 min-w-5 px-1.5 text-xs">{t.count}</Badge>
            </button>
        {/each}
    </div>

    <Card.Root>
        <Card.Header class="pb-3">
            <div class="relative w-full max-w-sm">
                <Search class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Buscar por lista ou cliente..."
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
                            <Table.Head>Nome</Table.Head>
                            <Table.Head class="hidden md:table-cell">Cliente</Table.Head>
                            <Table.Head class="hidden sm:table-cell">Prioridade</Table.Head>
                            <Table.Head class="hidden lg:table-cell text-right">Total</Table.Head>
                            <Table.Head>Status</Table.Head>
                            <Table.Head class="hidden lg:table-cell">Criado por</Table.Head>
                            <Table.Head class="hidden md:table-cell">Data</Table.Head>
                            <Table.Head class="text-right">Ações</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#if data.lists.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={8} class="h-32 text-center text-muted-foreground">
                                    Nenhuma lista encontrada.
                                </Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each data.lists as list (list.id)}
                                {@const st = STATUS[list.list_status as keyof typeof STATUS] ?? STATUS.pending}
                                <Table.Row>
                                    <Table.Cell class="text-xs text-muted-foreground font-mono">#{list.id}</Table.Cell>

                                    <Table.Cell>
                                        <div class="flex items-center gap-2">
                                            <FileText class="size-4 shrink-0 text-muted-foreground" />
                                            <span class="font-medium">{list.list_name}</span>
                                        </div>
                                    </Table.Cell>

                                    <Table.Cell class="hidden md:table-cell text-sm text-muted-foreground">
                                        {#if list.client_first_name}
                                            {list.client_first_name} {list.client_last_name}
                                        {:else}
                                            <span class="italic">—</span>
                                        {/if}
                                    </Table.Cell>

                                    <Table.Cell class="hidden sm:table-cell">
                                        <div class="flex items-center gap-1 text-sm">
                                            {#if list.priority === 'high'}
                                                <ArrowUp class="size-3.5 text-red-500" />
                                                <span class="text-red-600 font-medium">Alta</span>
                                            {:else if list.priority === 'medium'}
                                                <ArrowRight class="size-3.5 text-orange-500" />
                                                <span class="text-orange-600">Média</span>
                                            {:else}
                                                <ArrowDown class="size-3.5 text-slate-400" />
                                                <span class="text-slate-500">Baixa</span>
                                            {/if}
                                        </div>
                                    </Table.Cell>

                                    <Table.Cell class="hidden lg:table-cell text-right text-sm font-medium">
                                        {fmt(list.total_value)}
                                    </Table.Cell>

                                    <Table.Cell>
                                        <Badge variant="outline" class="gap-1 {st.cls}">{st.label}</Badge>
                                    </Table.Cell>

                                    <Table.Cell class="hidden lg:table-cell text-sm text-muted-foreground">
                                        {list.creator_first_name ?? ''} {list.creator_last_name ?? ''}
                                    </Table.Cell>

                                    <Table.Cell class="hidden md:table-cell text-xs text-muted-foreground">
                                        {fmtDate(list.creation_date)}
                                    </Table.Cell>

                                    <Table.Cell>
                                        <div class="flex items-center justify-end gap-1">
                                            {#if canEdit(list.list_status, list.created_by)}
                                                <!-- Editar -->
                                                <Button variant="ghost" size="icon" class="size-8"
                                                    onclick={() => goto(`/supplies/lists/edit/${list.id}`)}>
                                                    <Pencil class="size-4" />
                                                </Button>

                                                <!-- Excluir -->
                                                <form method="POST" action="?/delete" use:enhance={() => async ({ result, update }) => {
                                                    if (result.type === 'success') {
                                                        toast.success('Lista excluída.');
                                                        await invalidateAll();
                                                    } else if (result.type === 'failure') {
                                                        toast.error(String((result.data as any)?.error) || 'Erro ao excluir.');
                                                    }
                                                    await update({ reset: false });
                                                }}>
                                                    <input type="hidden" name="id" value={list.id} />
                                                    <Button type="submit" variant="ghost" size="icon"
                                                        class="size-8 text-muted-foreground hover:text-destructive">
                                                        <Trash class="size-4" />
                                                    </Button>
                                                </form>
                                            {:else}
                                                <!-- Lista finalizada — somente leitura -->
                                                <Button variant="ghost" size="icon" class="size-8 text-muted-foreground cursor-default opacity-50" disabled title="Lista finalizada, não pode ser editada">
                                                    <Lock class="size-4" />
                                                </Button>
                                            {/if}
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
