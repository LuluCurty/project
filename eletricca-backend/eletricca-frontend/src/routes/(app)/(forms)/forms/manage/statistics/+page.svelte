<script lang="ts">
    import {
        ArrowLeft, FileText, ChartColumn as BarChart3, CircleCheck as CheckCircle2, TriangleAlert as AlertTriangle,
        Users, ClipboardList, TrendingUp, Clock, ListChecks, Hash, Type, Calendar, CheckSquare, ListFilter
    } from '@lucide/svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';

    import * as Card from '$lib/components/ui/card/index.js';
    import * as Table from '$lib/components/ui/table/index.js';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import { Separator } from '$lib/components/ui/separator/index.js';

    import type { PageProps } from './$types';

    let { data }: PageProps = $props();

    let maxMonthly = $derived(
        data.monthlyResponses.length > 0
            ? Math.max(...data.monthlyResponses.map(m => m.count))
            : 1
    );

    function handleFormSelect(e: Event) {
        const value = (e.target as HTMLSelectElement).value;
        const url = new URL(page.url);
        if (value) {
            url.searchParams.set('formId', value);
        } else {
            url.searchParams.delete('formId');
        }
        goto(url.toString(), { noScroll: true });
    }

    function getFieldTypeIcon(type: string) {
        switch (type) {
            case 'select': case 'radio': return ListFilter;
            case 'checkbox': return CheckSquare;
            case 'number': return Hash;
            case 'date': return Calendar;
            default: return Type;
        }
    }

    function getFieldTypeLabel(type: string) {
        switch (type) {
            case 'select': return 'Seleção';
            case 'radio': return 'Rádio';
            case 'checkbox': return 'Checkbox';
            case 'number': return 'Número';
            case 'text': return 'Texto';
            case 'textarea': return 'Texto Longo';
            case 'date': return 'Data';
            case 'file': return 'Arquivo';
            default: return type;
        }
    }

    // Cores para barras de opções (rotaciona entre elas)
    const barColors = [
        'bg-primary/80',
        'bg-blue-500/80',
        'bg-emerald-500/80',
        'bg-amber-500/80',
        'bg-rose-500/80',
        'bg-violet-500/80',
        'bg-cyan-500/80',
        'bg-orange-500/80'
    ];
</script>

<div class="mx-auto max-w-6xl space-y-4 sm:space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onclick={() => goto('/forms/manage')}>
            <ArrowLeft class="size-5" />
        </Button>
        <div>
            <h2 class="text-xl font-bold tracking-tight text-primary sm:text-2xl">Estatísticas</h2>
            <p class="text-sm text-muted-foreground">Visão geral do módulo de formulários</p>
        </div>
    </div>

    <!-- Cards de Visão Geral -->
    <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Formulários</p>
                        <p class="text-2xl font-bold">{data.overview.totalForms}</p>
                        <p class="text-xs text-muted-foreground">
                            {data.overview.activeForms} ativo{data.overview.activeForms !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <FileText class="size-8 text-muted-foreground/50" />
                </div>
            </Card.Content>
        </Card.Root>

        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Respostas</p>
                        <p class="text-2xl font-bold">{data.overview.totalResponses}</p>
                        <p class="text-xs text-muted-foreground">
                            {data.overview.totalAssignments} atribuição{data.overview.totalAssignments !== 1 ? 'ões' : ''}
                        </p>
                    </div>
                    <ClipboardList class="size-8 text-muted-foreground/50" />
                </div>
            </Card.Content>
        </Card.Root>

        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Taxa de Conclusão</p>
                        <p class="text-2xl font-bold text-green-600">{data.assignments.completionRate}%</p>
                        <p class="text-xs text-muted-foreground">
                            {data.assignments.completed} de {data.assignments.total}
                        </p>
                    </div>
                    <CheckCircle2 class="size-8 text-green-600/50" />
                </div>
            </Card.Content>
        </Card.Root>

        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Atrasados</p>
                        <p class="text-2xl font-bold {data.assignments.overdue > 0 ? 'text-red-600' : ''}">
                            {data.assignments.overdue}
                        </p>
                        <p class="text-xs text-muted-foreground">
                            {data.assignments.pending} pendente{data.assignments.pending !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <AlertTriangle class="size-8 {data.assignments.overdue > 0 ? 'text-red-600/50' : 'text-muted-foreground/50'}" />
                </div>
            </Card.Content>
        </Card.Root>
    </div>

    <!-- Respostas por Mês -->
    <Card.Root>
        <Card.Header>
            <Card.Title class="flex items-center gap-2 text-base">
                <TrendingUp class="size-4" /> Respostas por Mês
            </Card.Title>
            <Card.Description>Últimos 6 meses</Card.Description>
        </Card.Header>
        <Card.Content>
            {#if data.monthlyResponses.length === 0}
                <div class="flex items-center justify-center py-8 text-muted-foreground">
                    <Clock class="mr-2 size-4" />
                    <span class="text-sm">Nenhuma resposta nos últimos 6 meses</span>
                </div>
            {:else}
                <div class="space-y-3">
                    {#each data.monthlyResponses as month}
                        <div class="flex items-center gap-3">
                            <span class="w-24 shrink-0 text-sm text-muted-foreground">{month.label}</span>
                            <div class="flex-1">
                                <div class="h-8 overflow-hidden rounded-md bg-muted">
                                    <div
                                        class="flex h-full items-center rounded-md bg-primary/80 px-2 transition-all"
                                        style="width: {Math.max((month.count / maxMonthly) * 100, 8)}%"
                                    >
                                        <span class="text-xs font-medium text-primary-foreground">{month.count}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </Card.Content>
    </Card.Root>

    <!-- Grid: Top Formulários + Top Respondedores -->
    <div class="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <!-- Top Formulários -->
        <Card.Root>
            <Card.Header>
                <Card.Title class="flex items-center gap-2 text-base">
                    <BarChart3 class="size-4" /> Top Formulários
                </Card.Title>
                <Card.Description>Por número de respostas</Card.Description>
            </Card.Header>
            <Card.Content>
                {#if data.topForms.length === 0}
                    <p class="py-8 text-center text-sm text-muted-foreground">Nenhum formulário encontrado</p>
                {:else}
                    <!-- Desktop Table -->
                    <div class="hidden rounded-md border sm:block">
                        <Table.Root>
                            <Table.Header>
                                <Table.Row class="bg-muted/50">
                                    <Table.Head>Formulário</Table.Head>
                                    <Table.Head class="text-center">Respostas</Table.Head>
                                    <Table.Head class="text-center">Atribuições</Table.Head>
                                    <Table.Head class="text-right">Taxa</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {#each data.topForms as form}
                                    <Table.Row>
                                        <Table.Cell class="max-w-[200px]">
                                            <div class="flex items-center gap-2">
                                                <span class="truncate text-sm font-medium">{form.title}</span>
                                                {#if !form.isActive}
                                                    <Badge variant="secondary" class="shrink-0 text-[10px]">Inativo</Badge>
                                                {/if}
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell class="text-center font-medium">{form.responseCount}</Table.Cell>
                                        <Table.Cell class="text-center text-muted-foreground">{form.assignmentCount}</Table.Cell>
                                        <Table.Cell class="text-right">
                                            <Badge variant={form.completionRate >= 80 ? 'default' : form.completionRate >= 50 ? 'secondary' : 'destructive'}>
                                                {form.completionRate}%
                                            </Badge>
                                        </Table.Cell>
                                    </Table.Row>
                                {/each}
                            </Table.Body>
                        </Table.Root>
                    </div>

                    <!-- Mobile Cards -->
                    <div class="space-y-2 sm:hidden">
                        {#each data.topForms as form}
                            <div class="flex items-center justify-between rounded-lg border p-3">
                                <div class="min-w-0 flex-1">
                                    <p class="truncate text-sm font-medium">{form.title}</p>
                                    <p class="text-xs text-muted-foreground">
                                        {form.responseCount} resp. / {form.assignmentCount} atrib.
                                    </p>
                                </div>
                                <Badge variant={form.completionRate >= 80 ? 'default' : form.completionRate >= 50 ? 'secondary' : 'destructive'} class="ml-2 shrink-0">
                                    {form.completionRate}%
                                </Badge>
                            </div>
                        {/each}
                    </div>
                {/if}
            </Card.Content>
        </Card.Root>

        <!-- Top Respondedores -->
        <Card.Root>
            <Card.Header>
                <Card.Title class="flex items-center gap-2 text-base">
                    <Users class="size-4" /> Top Respondedores
                </Card.Title>
                <Card.Description>Usuários mais ativos</Card.Description>
            </Card.Header>
            <Card.Content>
                {#if data.topResponders.length === 0}
                    <p class="py-8 text-center text-sm text-muted-foreground">Nenhuma resposta registrada</p>
                {:else}
                    <!-- Desktop Table -->
                    <div class="hidden rounded-md border sm:block">
                        <Table.Root>
                            <Table.Header>
                                <Table.Row class="bg-muted/50">
                                    <Table.Head>Usuário</Table.Head>
                                    <Table.Head class="text-center">Respostas</Table.Head>
                                    <Table.Head class="text-center">Completados</Table.Head>
                                    <Table.Head class="text-right">Total Atrib.</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {#each data.topResponders as user}
                                    <Table.Row>
                                        <Table.Cell>
                                            <div>
                                                <p class="text-sm font-medium">{user.name}</p>
                                                <p class="text-xs text-muted-foreground">{user.email}</p>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell class="text-center font-medium">{user.responseCount}</Table.Cell>
                                        <Table.Cell class="text-center text-green-600">{user.completedAssignments}</Table.Cell>
                                        <Table.Cell class="text-right text-muted-foreground">{user.totalAssignments}</Table.Cell>
                                    </Table.Row>
                                {/each}
                            </Table.Body>
                        </Table.Root>
                    </div>

                    <!-- Mobile Cards -->
                    <div class="space-y-2 sm:hidden">
                        {#each data.topResponders as user}
                            <div class="flex items-center justify-between rounded-lg border p-3">
                                <div class="min-w-0 flex-1">
                                    <p class="truncate text-sm font-medium">{user.name}</p>
                                    <p class="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                                <div class="ml-2 shrink-0 text-right">
                                    <p class="text-sm font-bold">{user.responseCount}</p>
                                    <p class="text-[10px] text-muted-foreground">respostas</p>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </Card.Content>
        </Card.Root>
    </div>

    <!-- Separador -->
    <Separator />

    <!-- Estatísticas por Campo -->
    <div class="space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h3 class="text-lg font-semibold">Análise por Campo</h3>
                <p class="text-sm text-muted-foreground">Selecione um formulário para ver estatísticas detalhadas</p>
            </div>
            <select
                class="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring sm:w-72"
                onchange={handleFormSelect}
                value={data.selectedFormId || ''}
            >
                <option value="">Selecione um formulário...</option>
                {#each data.formsList as form}
                    <option value={form.id}>
                        {form.title} ({form.responseCount} resp.)
                    </option>
                {/each}
            </select>
        </div>

        {#if data.selectedFormId && data.fieldStats.length > 0}
            <div class="grid gap-4 sm:gap-6 md:grid-cols-2">
                {#each data.fieldStats as field, fieldIndex (field.id)}
                    <Card.Root>
                        <Card.Header class="pb-3">
                            <div class="flex items-start justify-between gap-2">
                                <div class="min-w-0">
                                    <Card.Title class="text-sm font-semibold">{field.label}</Card.Title>
                                    <p class="text-xs text-muted-foreground">
                                        {field.totalResponses} resposta{field.totalResponses !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <Badge variant="outline" class="shrink-0 gap-1 text-[10px]">
                                    {@const Icon = getFieldTypeIcon(field.fieldType)}
                                    <Icon class="size-3" />
                                    {getFieldTypeLabel(field.fieldType)}
                                </Badge>
                            </div>
                        </Card.Header>
                        <Card.Content>
                            {#if field.totalResponses === 0}
                                <p class="py-4 text-center text-sm text-muted-foreground">Sem respostas</p>

                            {:else if field.optionStats}
                                <!-- Select / Checkbox / Radio: Barras de distribuição -->
                                <div class="space-y-2.5">
                                    {#each field.optionStats as opt, i}
                                        <div class="space-y-1">
                                            <div class="flex items-center justify-between text-sm">
                                                <span class="truncate font-medium">{opt.option}</span>
                                                <span class="ml-2 shrink-0 text-muted-foreground">
                                                    {opt.count}
                                                    <span class="text-xs">({opt.percentage}%)</span>
                                                </span>
                                            </div>
                                            <div class="h-6 overflow-hidden rounded bg-muted">
                                                <div
                                                    class="flex h-full items-center rounded px-2 transition-all {barColors[i % barColors.length]}"
                                                    style="width: {Math.max(opt.percentage, 4)}%"
                                                >
                                                    {#if opt.percentage >= 15}
                                                        <span class="text-[10px] font-medium text-white">{opt.percentage}%</span>
                                                    {/if}
                                                </div>
                                            </div>
                                        </div>
                                    {/each}
                                </div>

                                {#if field.fieldType === 'checkbox'}
                                    <p class="mt-3 text-[10px] text-muted-foreground">
                                        * Percentual = respondentes que marcaram / total de respondentes
                                    </p>
                                {/if}

                            {:else if field.numberStats}
                                <!-- Number: Min, Max, Média -->
                                <div class="grid grid-cols-3 gap-3">
                                    <div class="rounded-lg bg-muted/50 p-3 text-center">
                                        <p class="text-[10px] font-medium uppercase text-muted-foreground">Mínimo</p>
                                        <p class="text-lg font-bold">{field.numberStats.min}</p>
                                    </div>
                                    <div class="rounded-lg bg-primary/10 p-3 text-center">
                                        <p class="text-[10px] font-medium uppercase text-muted-foreground">Média</p>
                                        <p class="text-lg font-bold text-primary">{field.numberStats.avg}</p>
                                    </div>
                                    <div class="rounded-lg bg-muted/50 p-3 text-center">
                                        <p class="text-[10px] font-medium uppercase text-muted-foreground">Máximo</p>
                                        <p class="text-lg font-bold">{field.numberStats.max}</p>
                                    </div>
                                </div>

                            {:else if field.textStats}
                                <!-- Text / Textarea -->
                                <div class="grid grid-cols-2 gap-3">
                                    <div class="rounded-lg bg-muted/50 p-3 text-center">
                                        <p class="text-[10px] font-medium uppercase text-muted-foreground">Respostas</p>
                                        <p class="text-lg font-bold">{field.textStats.totalResponses}</p>
                                    </div>
                                    <div class="rounded-lg bg-muted/50 p-3 text-center">
                                        <p class="text-[10px] font-medium uppercase text-muted-foreground">Caracteres (média)</p>
                                        <p class="text-lg font-bold">{field.textStats.avgLength}</p>
                                    </div>
                                </div>

                            {:else}
                                <!-- Outros tipos (date, file) -->
                                <div class="rounded-lg bg-muted/50 p-3 text-center">
                                    <p class="text-[10px] font-medium uppercase text-muted-foreground">Total de Respostas</p>
                                    <p class="text-lg font-bold">{field.totalResponses}</p>
                                </div>
                            {/if}
                        </Card.Content>
                    </Card.Root>
                {/each}
            </div>

        {:else if data.selectedFormId && data.fieldStats.length === 0}
            <Card.Root>
                <Card.Content class="py-12">
                    <p class="text-center text-muted-foreground">
                        Nenhum campo encontrado ou sem respostas para este formulário.
                    </p>
                </Card.Content>
            </Card.Root>
        {/if}
    </div>
</div>
