<script lang="ts">
    import { goto } from '$app/navigation';
    import {
        ArrowLeft, ClipboardList, CheckCircle2, TriangleAlert as AlertTriangle,
        Users, TrendingUp, Clock, Tag, BarChart3
    } from '@lucide/svelte';

    import * as Card from '$lib/components/ui/card/index.js';
    import * as Table from '$lib/components/ui/table/index.js';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import { Separator } from '$lib/components/ui/separator/index.js';

    import type { PageProps } from './$types';

    let { data }: PageProps = $props();

    let maxMonthly = $derived(
        data.monthlyCompletions.length > 0
            ? Math.max(...data.monthlyCompletions.map(m => m.count))
            : 1
    );

    let maxCategory = $derived(
        data.byCategory.length > 0
            ? Math.max(...data.byCategory.map(c => c.assignmentCount))
            : 1
    );

    function priorityColor(p: string) {
        switch (p) {
            case 'urgent': return 'bg-red-100 text-red-700 border-none';
            case 'high':   return 'bg-orange-100 text-orange-700 border-none';
            case 'medium': return 'bg-yellow-100 text-yellow-700 border-none';
            default:       return 'bg-gray-100 text-gray-600 border-none';
        }
    }

    function rateVariant(rate: number): 'default' | 'secondary' | 'destructive' {
        if (rate >= 80) return 'default';
        if (rate >= 50) return 'secondary';
        return 'destructive';
    }
</script>

<div class="mx-auto max-w-6xl space-y-4 sm:space-y-6">

    <!-- Header -->
    <div class="flex items-center gap-3">
        <Button variant="ghost" size="icon" onclick={() => goto('/tasks/manage')}>
            <ArrowLeft class="size-5" />
        </Button>
        <div>
            <h2 class="text-xl font-bold tracking-tight text-primary sm:text-2xl">Estatísticas de Tarefas</h2>
            <p class="text-sm text-muted-foreground">Visão geral do módulo de tarefas atribuídas</p>
        </div>
    </div>

    <!-- Cards de visão geral -->
    <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Tarefas</p>
                        <p class="text-2xl font-bold">{data.overview.totalTasks}</p>
                        <p class="text-xs text-muted-foreground">{data.overview.totalCategories} categori{data.overview.totalCategories !== 1 ? 'as' : 'a'}</p>
                    </div>
                    <ClipboardList class="size-8 text-muted-foreground/50" />
                </div>
            </Card.Content>
        </Card.Root>

        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Atribuições</p>
                        <p class="text-2xl font-bold">{data.overview.totalAssignments}</p>
                        <p class="text-xs text-muted-foreground">{data.stats.inProgress} em andamento</p>
                    </div>
                    <Users class="size-8 text-muted-foreground/50" />
                </div>
            </Card.Content>
        </Card.Root>

        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Taxa de Conclusão</p>
                        <p class="text-2xl font-bold text-green-600">{data.stats.completionRate}%</p>
                        <p class="text-xs text-muted-foreground">{data.overview.completed} de {data.overview.totalAssignments}</p>
                    </div>
                    <CheckCircle2 class="size-8 text-green-600/50" />
                </div>
            </Card.Content>
        </Card.Root>

        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Atrasadas</p>
                        <p class="text-2xl font-bold {data.overview.overdue > 0 ? 'text-red-600' : ''}">{data.overview.overdue}</p>
                        <p class="text-xs text-muted-foreground">{data.overview.pending} pendente{data.overview.pending !== 1 ? 's' : ''}</p>
                    </div>
                    <AlertTriangle class="size-8 {data.overview.overdue > 0 ? 'text-red-600/50' : 'text-muted-foreground/50'}" />
                </div>
            </Card.Content>
        </Card.Root>
    </div>

    <!-- Conclusões por mês -->
    <Card.Root>
        <Card.Header>
            <Card.Title class="flex items-center gap-2 text-base">
                <TrendingUp class="size-4" /> Conclusões por Mês
            </Card.Title>
            <Card.Description>Últimos 6 meses</Card.Description>
        </Card.Header>
        <Card.Content>
            {#if data.monthlyCompletions.length === 0}
                <div class="flex items-center justify-center py-8 text-muted-foreground">
                    <Clock class="mr-2 size-4" />
                    <span class="text-sm">Nenhuma conclusão nos últimos 6 meses</span>
                </div>
            {:else}
                <div class="space-y-3">
                    {#each data.monthlyCompletions as m}
                        <div class="flex items-center gap-3">
                            <span class="w-24 shrink-0 text-sm text-muted-foreground">{m.label}</span>
                            <div class="flex-1">
                                <div class="h-8 overflow-hidden rounded-md bg-muted">
                                    <div
                                        class="flex h-full items-center rounded-md bg-primary/80 px-2 transition-all"
                                        style="width: {Math.max((m.count / maxMonthly) * 100, 8)}%"
                                    >
                                        <span class="text-xs font-medium text-primary-foreground">{m.count}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </Card.Content>
    </Card.Root>

    <!-- Grid: Por Categoria + Por Prioridade -->
    <div class="grid gap-4 sm:gap-6 lg:grid-cols-2">

        <Card.Root>
            <Card.Header>
                <Card.Title class="flex items-center gap-2 text-base">
                    <Tag class="size-4" /> Por Categoria
                </Card.Title>
                <Card.Description>Atribuições por categoria</Card.Description>
            </Card.Header>
            <Card.Content>
                {#if data.byCategory.length === 0}
                    <p class="py-8 text-center text-sm text-muted-foreground">Nenhuma categoria encontrada</p>
                {:else}
                    <div class="space-y-3">
                        {#each data.byCategory as cat}
                            <div class="space-y-1">
                                <div class="flex items-center justify-between text-sm">
                                    <span class="font-medium truncate max-w-[160px]">{cat.name}</span>
                                    <span class="text-muted-foreground shrink-0 ml-2">
                                        {cat.completedCount}/{cat.assignmentCount}
                                        <span class="text-xs ml-1">({cat.completionRate}%)</span>
                                    </span>
                                </div>
                                <div class="h-5 overflow-hidden rounded bg-muted">
                                    <div
                                        class="h-full rounded bg-primary/70 transition-all"
                                        style="width: {Math.max((cat.assignmentCount / maxCategory) * 100, 4)}%"
                                    ></div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </Card.Content>
        </Card.Root>

        <Card.Root>
            <Card.Header>
                <Card.Title class="flex items-center gap-2 text-base">
                    <BarChart3 class="size-4" /> Por Prioridade
                </Card.Title>
                <Card.Description>Distribuição e taxa de conclusão</Card.Description>
            </Card.Header>
            <Card.Content>
                {#if data.byPriority.length === 0}
                    <p class="py-8 text-center text-sm text-muted-foreground">Sem dados</p>
                {:else}
                    <div class="space-y-3">
                        {#each data.byPriority as p}
                            <div class="flex items-center gap-3">
                                <Badge class="w-20 justify-center shrink-0 {priorityColor(p.priority)}">{p.label}</Badge>
                                <div class="flex-1">
                                    <div class="h-6 overflow-hidden rounded bg-muted">
                                        <div
                                            class="h-full rounded transition-all
                                                   {p.priority === 'urgent' ? 'bg-red-500/70' :
                                                    p.priority === 'high'   ? 'bg-orange-500/70' :
                                                    p.priority === 'medium' ? 'bg-yellow-500/70' :
                                                    'bg-gray-400/70'}"
                                            style="width: {p.completionRate}%"
                                        ></div>
                                    </div>
                                </div>
                                <span class="text-sm text-muted-foreground shrink-0 w-28 text-right">
                                    {p.completed}/{p.total} ({p.completionRate}%)
                                </span>
                            </div>
                        {/each}
                    </div>
                {/if}
            </Card.Content>
        </Card.Root>
    </div>

    <Separator />

    <!-- Grid: Top Tarefas + Top Performers -->
    <div class="grid gap-4 sm:gap-6 lg:grid-cols-2">

        <Card.Root>
            <Card.Header>
                <Card.Title class="flex items-center gap-2 text-base">
                    <ClipboardList class="size-4" /> Top Tarefas
                </Card.Title>
                <Card.Description>Por número de atribuições</Card.Description>
            </Card.Header>
            <Card.Content>
                {#if data.topTasks.length === 0}
                    <p class="py-8 text-center text-sm text-muted-foreground">Nenhuma tarefa encontrada</p>
                {:else}
                    <div class="hidden rounded-md border sm:block">
                        <Table.Root>
                            <Table.Header>
                                <Table.Row class="bg-muted/50">
                                    <Table.Head>Tarefa</Table.Head>
                                    <Table.Head class="text-center">Atrib.</Table.Head>
                                    <Table.Head class="text-center">Concl.</Table.Head>
                                    <Table.Head class="text-right">Taxa</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {#each data.topTasks as t}
                                    <Table.Row>
                                        <Table.Cell class="max-w-[180px]">
                                            <p class="truncate text-sm font-medium">{t.title}</p>
                                            <p class="text-xs text-muted-foreground">{t.categoryName}</p>
                                        </Table.Cell>
                                        <Table.Cell class="text-center">{t.assignmentCount}</Table.Cell>
                                        <Table.Cell class="text-center text-green-600">{t.completedCount}</Table.Cell>
                                        <Table.Cell class="text-right">
                                            <Badge variant={rateVariant(t.completionRate)}>{t.completionRate}%</Badge>
                                        </Table.Cell>
                                    </Table.Row>
                                {/each}
                            </Table.Body>
                        </Table.Root>
                    </div>
                    <div class="space-y-2 sm:hidden">
                        {#each data.topTasks as t}
                            <div class="flex items-center justify-between rounded-lg border p-3">
                                <div class="min-w-0 flex-1">
                                    <p class="truncate text-sm font-medium">{t.title}</p>
                                    <p class="text-xs text-muted-foreground">{t.completedCount}/{t.assignmentCount} concluídas</p>
                                </div>
                                <Badge variant={rateVariant(t.completionRate)} class="ml-2 shrink-0">{t.completionRate}%</Badge>
                            </div>
                        {/each}
                    </div>
                {/if}
            </Card.Content>
        </Card.Root>

        <Card.Root>
            <Card.Header>
                <Card.Title class="flex items-center gap-2 text-base">
                    <Users class="size-4" /> Top Performers
                </Card.Title>
                <Card.Description>Usuários com mais tarefas concluídas</Card.Description>
            </Card.Header>
            <Card.Content>
                {#if data.topPerformers.length === 0}
                    <p class="py-8 text-center text-sm text-muted-foreground">Nenhum dado encontrado</p>
                {:else}
                    <div class="hidden rounded-md border sm:block">
                        <Table.Root>
                            <Table.Header>
                                <Table.Row class="bg-muted/50">
                                    <Table.Head>Usuário</Table.Head>
                                    <Table.Head class="text-center">Concl.</Table.Head>
                                    <Table.Head class="text-center">Total</Table.Head>
                                    <Table.Head class="text-right">Taxa</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {#each data.topPerformers as u}
                                    <Table.Row>
                                        <Table.Cell>
                                            <p class="text-sm font-medium">{u.name}</p>
                                            <p class="text-xs text-muted-foreground">{u.email}</p>
                                        </Table.Cell>
                                        <Table.Cell class="text-center font-medium text-green-600">{u.completedCount}</Table.Cell>
                                        <Table.Cell class="text-center text-muted-foreground">{u.totalAssignments}</Table.Cell>
                                        <Table.Cell class="text-right">
                                            <Badge variant={rateVariant(u.completionRate)}>{u.completionRate}%</Badge>
                                        </Table.Cell>
                                    </Table.Row>
                                {/each}
                            </Table.Body>
                        </Table.Root>
                    </div>
                    <div class="space-y-2 sm:hidden">
                        {#each data.topPerformers as u}
                            <div class="flex items-center justify-between rounded-lg border p-3">
                                <div class="min-w-0 flex-1">
                                    <p class="truncate text-sm font-medium">{u.name}</p>
                                    <p class="text-xs text-muted-foreground">{u.email}</p>
                                </div>
                                <div class="ml-2 shrink-0 text-right">
                                    <p class="text-sm font-bold text-green-600">{u.completedCount}</p>
                                    <p class="text-[10px] text-muted-foreground">concluídas</p>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </Card.Content>
        </Card.Root>
    </div>

</div>
