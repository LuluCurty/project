<script lang="ts">
    import { 
        FileText, Calendar, Clock, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, 
        ArrowRight, Funnel as Filter, ChevronLeft, ChevronRight
    } from '@lucide/svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';

    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Badge } from '$lib/components/ui/badge';
    import * as Tabs from "$lib/components/ui/tabs";
    import { Separator } from '$lib/components/ui/separator';
    import * as Pagination from "$lib/components/ui/pagination";

    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    function handleTabChange(value: string) {
        const url = new URL(page.url);
        url.searchParams.set('status', value);
        url.searchParams.set('page', '1');
        goto(url.toString());
    }

    function handlePageChange(newPage: string) {
        const url = new URL(page.url);
        url.searchParams.set('page', newPage);
        goto(url.toString());
    }

    // Função para verificar se está atrasado
    function isOverdue(dateString: string | null) {
        if (!dateString) return false;
        const due = new Date(dateString);
        const today = new Date();
        today.setHours(0,0,0,0);
        return due < today;
    }

    function formatDate(date: string | null) {
        if (!date) return 'Sem prazo';
        return new Date(date).toLocaleDateString('pt-BR');
    }
</script>

<div class="max-w-5xl mx-auto space-y-6 pb-20">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 class="text-3xl font-bold tracking-tight text-primary">Minhas Tarefas</h1>
            <p class="text-muted-foreground">Formulários atribuídos a você para preenchimento.</p>
        </div>
    </div>

    <Tabs.Root value={data.filter} onValueChange={handleTabChange} class="w-full">
        <Tabs.List>
            <Tabs.Trigger value="pending" class="flex gap-2">
                <Clock class="size-4" /> Pendentes
            </Tabs.Trigger>
            <Tabs.Trigger value="completed" class="flex gap-2">
                <CheckCircle2 class="size-4" /> Concluídos
            </Tabs.Trigger>
        </Tabs.List>
    </Tabs.Root>

    {#if data.assignments.length === 0}
        <div class="flex flex-col items-center justify-center py-16 border rounded-lg border-dashed bg-slate-50/50">
            <div class="bg-white p-4 rounded-full shadow-sm mb-4">
                {#if data.filter === 'pending'}
                    <CheckCircle2 class="size-8 text-green-500" />
                {:else}
                    <FileText class="size-8 text-muted-foreground" />
                {/if}
            </div>
            <h3 class="text-lg font-semibold">Tudo limpo por aqui!</h3>
            <p class="text-muted-foreground text-sm max-w-xs text-center">
                {#if data.filter === 'pending'}
                    Você não tem formulários pendentes para preencher no momento.
                {:else}
                    Você ainda não completou nenhum formulário com este filtro.
                {/if}
            </p>
        </div>
    {:else}
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {#each data.assignments as item (item.assignment_id)}
                {@const overdue = !item.is_completed && isOverdue(item.due_date)}
                
                <Card.Root class="flex flex-col h-full hover:shadow-md transition-all border-l-4 {item.is_completed ? 'border-l-green-500' : (overdue ? 'border-l-red-500' : 'border-l-blue-500')}">
                    <Card.Header class="pb-3">
                        <div class="flex justify-between items-start gap-2">
                            <Badge variant="outline" class="font-mono text-xs">
                                {item.period_reference}
                            </Badge>
                            {#if item.is_completed}
                                <Badge class="bg-green-100 text-green-700 hover:bg-green-100 border-none">Concluído</Badge>
                            {:else if overdue}
                                <Badge variant="destructive">Atrasado</Badge>
                            {:else}
                                <Badge variant="secondary" class="bg-blue-50 text-blue-700">Pendente</Badge>
                            {/if}
                        </div>
                        <Card.Title class="text-lg leading-tight mt-2">{item.form_title}</Card.Title>
                        <Card.Description class="line-clamp-2 text-xs mt-1">
                            {item.form_description || 'Sem descrição'}
                        </Card.Description>
                    </Card.Header>
                    
                    <Card.Content class="flex-1">
                        <Separator class="my-2"/>
                        <div class="space-y-2 text-sm text-muted-foreground">
                            <div class="flex items-center gap-2">
                                <Calendar class="size-3.5" />
                                <span>
                                    {#if item.is_completed}
                                        Entregue em: <span class="font-medium text-foreground">{formatDate(item.completed_at)}</span>
                                    {:else}
                                        Prazo: <span class="font-medium {overdue ? 'text-red-600' : 'text-foreground'}">{formatDate(item.due_date)}</span>
                                    {/if}
                                </span>
                            </div>
                            <div class="flex items-center gap-2 text-xs">
                                <span class="bg-muted px-1.5 py-0.5 rounded">Atribuído por: {item.assigned_by_name}</span>
                            </div>
                        </div>
                    </Card.Content>

                    <Card.Footer class="pt-2">
                        {#if !item.is_completed}
                            <Button class="w-full group" onclick={() => goto(`/forms/fill/${item.assignment_id}`)}>
                                Preencher Agora
                                <ArrowRight class="ml-2 size-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        {:else}
                            <Button variant="outline" class="w-full" onclick={() => goto(`/forms/view/${item.assignment_id}`)}>
                                Ver Resposta
                            </Button>
                        {/if}
                    </Card.Footer>
                </Card.Root>
            {/each}
        </div>

        {#if data.pagination.totalItems > data.pagination.limit}
            <div class="mt-6 flex justify-center">
                <Pagination.Root 
                    count={data.pagination.totalItems} 
                    perPage={data.pagination.limit} 
                    page={data.pagination.page}
                >
                    {#snippet children({ pages, currentPage })}
                        <Pagination.Content>
                            <Pagination.Item>
                                <Pagination.PrevButton 
                                    onclick={() => handlePageChange((currentPage - 1).toString())}
                                    disabled={currentPage <= 1}
                                >
                                    <ChevronLeft class="size-4" />
                                    <span class="hidden sm:block">Anterior</span>
                                </Pagination.PrevButton>
                            </Pagination.Item>
                            
                            <span class="px-4 text-sm text-muted-foreground flex items-center">
                                {currentPage} / {data.pagination.totalPages}
                            </span>

                            <Pagination.Item>
                                <Pagination.NextButton 
                                    onclick={() => handlePageChange((currentPage + 1).toString())}
                                    disabled={currentPage >= data.pagination.totalPages}
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
    {/if}
</div>