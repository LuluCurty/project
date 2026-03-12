<script lang="ts">
    import {
        ArrowLeft, Search, UserPlus, Save, Trash2,
        ChevronLeft, ChevronRight, Users, RefreshCw
    } from '@lucide/svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { enhance } from '$app/forms';

    import * as Card from '$lib/components/ui/card';
    import * as Table from '$lib/components/ui/table';
    import { Button } from '$lib/components/ui/button';
    import { Badge } from '$lib/components/ui/badge';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Checkbox } from '$lib/components/ui/checkbox';
    import * as Select from '$lib/components/ui/select';
    import * as Pagination from '$lib/components/ui/pagination';
    import * as Alert from '$lib/components/ui/alert';

    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    type EditEntry = { priority: string; dueDate: string; availableFrom: string };

    function buildEditMap(assignments: typeof data.assignments): Record<number, EditEntry> {
        const m: Record<number, EditEntry> = {};
        for (const a of assignments) {
            m[a.id] = {
                priority: a.priority,
                dueDate: a.due_date ? (a.due_date as string).slice(0, 10) : '',
                availableFrom: a.available_from ? (a.available_from as string).slice(0, 10) : ''
            };
        }
        return m;
    }

    let editMap = $state(buildEditMap(data.assignments));
    let selectedNewUsers = $state<Set<number>>(new Set());
    let newUserConfig = $state<Record<number, EditEntry>>({});

    $effect(() => {
        if (form?.success) {
            editMap = buildEditMap(data.assignments);
            selectedNewUsers = new Set();
            newUserConfig = {};
        }
    });

    let updatesJson = $derived(
        JSON.stringify(
            data.assignments.map((a: any) => ({
                id: a.id,
                priority: editMap[a.id]?.priority ?? a.priority,
                dueDate: editMap[a.id]?.dueDate ?? '',
                availableFrom: editMap[a.id]?.availableFrom ?? ''
            }))
        )
    );

    let addJson = $derived(
        JSON.stringify(
            [...selectedNewUsers].map(userId => ({
                userId,
                priority: newUserConfig[userId]?.priority ?? 'medium',
                dueDate: newUserConfig[userId]?.dueDate ?? '',
                availableFrom: newUserConfig[userId]?.availableFrom ?? ''
            }))
        )
    );

    let searchTimeout: ReturnType<typeof setTimeout>;

    function handleSearchInput(e: Event) {
        const target = e.target as HTMLInputElement;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const url = new URL(page.url);
            url.searchParams.set('search', target.value);
            url.searchParams.set('page', '1');
            goto(url.toString(), { keepFocus: true, noScroll: true });
        }, 500);
    }

    function handlePageChange(newPage: string) {
        const url = new URL(page.url);
        url.searchParams.set('page', newPage);
        goto(url.toString(), { keepFocus: true });
    }

    function toggleNewUser(userId: number) {
        const nextSet = new Set(selectedNewUsers);
        const nextConfig = { ...newUserConfig };
        if (nextSet.has(userId)) {
            nextSet.delete(userId);
            delete nextConfig[userId];
        } else {
            nextSet.add(userId);
            nextConfig[userId] = { priority: 'medium', dueDate: '', availableFrom: '' };
        }
        selectedNewUsers = nextSet;
        newUserConfig = nextConfig;
    }

    function toggleAll() {
        const allIds = data.users.map((u: any) => u.user_id);
        const allSelected = allIds.every((id: number) => selectedNewUsers.has(id));
        const nextSet = new Set(selectedNewUsers);
        const nextConfig = { ...newUserConfig };
        if (allSelected) {
            allIds.forEach((id: number) => { nextSet.delete(id); delete nextConfig[id]; });
        } else {
            allIds.forEach((id: number) => {
                if (!nextSet.has(id)) { nextSet.add(id); nextConfig[id] = { priority: 'medium', dueDate: '', availableFrom: '' }; }
            });
        }
        selectedNewUsers = nextSet;
        newUserConfig = nextConfig;
    }

    function priorityLabel(p: string) {
        return p === 'urgent' ? 'Urgente' : p === 'high' ? 'Alta' : p === 'medium' ? 'Média' : 'Baixa';
    }

    function statusLabel(s: string) {
        return s === 'completed' ? 'Concluído' : s === 'in_progress' ? 'Em Andamento' : s === 'cancelled' ? 'Cancelado' : 'Pendente';
    }

    let submittingUpdate = $state(false);
    let submittingAdd = $state(false);

    let allVisibleSelected = $derived(
        data.users.length > 0 && data.users.every((u: any) => selectedNewUsers.has(u.user_id))
    );
</script>

{#each data.assignments as a (a.id)}
    <form id="remove-{a.id}" method="POST" action="?/removeAssignment"
          use:enhance={() => async ({ update }) => { await update(); }}>
        <input type="hidden" name="assignmentId" value={a.id} />
    </form>
    <form id="reset-{a.id}" method="POST" action="?/resetAssignment"
          use:enhance={() => async ({ update }) => { await update(); }}>
        <input type="hidden" name="assignmentId" value={a.id} />
    </form>
{/each}

<div class="max-w-4xl mx-auto space-y-6 pb-20">
    <div class="flex items-center gap-4">
        <Button type="button" variant="ghost" size="icon" onclick={() => goto(`/tasks/manage/${data.task.id}`)}>
            <ArrowLeft class="size-5" />
        </Button>
        <div>
            <h2 class="text-2xl font-bold tracking-tight text-primary">Atribuições</h2>
            <p class="text-muted-foreground">{data.task.title}</p>
        </div>
    </div>

    {#if form?.error}
        <Alert.Root variant="destructive">
            <Alert.Description>{form.error}</Alert.Description>
        </Alert.Root>
    {/if}

    {#if form?.success}
        <Alert.Root class="border-green-200 bg-green-50 text-green-800">
            <Alert.Description>
                {#if form.action === 'add'}
                    {form.count} usuário(s) atribuído(s) com sucesso!
                {:else if form.action === 'remove'}
                    Atribuição removida. Histórico preservado no sistema.
                {:else if form.action === 'reset'}
                    Tarefa reatribuída. O progresso anterior foi limpo.
                {:else}
                    Alterações salvas com sucesso!
                {/if}
            </Alert.Description>
        </Alert.Root>
    {/if}

    <!-- Section 1: Current Assignments -->
    <form method="POST" action="?/updateAssignments"
          use:enhance={() => {
              submittingUpdate = true;
              return async ({ update }) => { submittingUpdate = false; await update(); };
          }}>
        <input type="hidden" name="updates" value={updatesJson} />
        <Card.Root>
            <Card.Header class="pb-3">
                <div class="flex items-center justify-between">
                    <div>
                        <Card.Title class="text-base flex items-center gap-2">
                            Atribuições Ativas
                            {#if data.assignments.length > 0}
                                <Badge variant="secondary">{data.assignments.length}</Badge>
                            {/if}
                        </Card.Title>
                        <Card.Description>Edite prioridade e prazo de cada usuário individualmente.</Card.Description>
                    </div>
                    {#if data.assignments.length > 0}
                        <Button type="submit" size="sm" disabled={submittingUpdate}>
                            <Save class="mr-1.5 size-3.5" /> Salvar Alterações
                        </Button>
                    {/if}
                </div>
            </Card.Header>
            <Card.Content>
                {#if data.assignments.length === 0}
                    <div class="flex flex-col items-center justify-center py-10 rounded-md border border-dashed text-center">
                        <Users class="size-8 text-muted-foreground/50 mb-2" />
                        <p class="text-sm text-muted-foreground">Nenhuma atribuição ativa</p>
                        <p class="text-xs text-muted-foreground/70 mt-1">Use a seção abaixo para adicionar usuários</p>
                    </div>
                {:else}
                    <div class="rounded-md border hidden sm:block overflow-x-auto">
                        <Table.Root>
                            <Table.Header>
                                <Table.Row class="bg-muted/50">
                                    <Table.Head>Usuário</Table.Head>
                                    <Table.Head class="w-[120px]">Status</Table.Head>
                                    <Table.Head class="w-[140px]">Prioridade</Table.Head>
                                    <Table.Head class="w-40">Disponível em</Table.Head>
                                    <Table.Head class="w-40">Prazo</Table.Head>
                                    <Table.Head class="w-[60px]"></Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {#each data.assignments as a (a.id)}
                                    <Table.Row>
                                        <Table.Cell>
                                            <p class="font-medium text-sm">{a.first_name} {a.last_name}</p>
                                            <p class="text-xs text-muted-foreground">{a.email}</p>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Badge
                                                variant={a.status === 'in_progress' ? 'secondary' : 'outline'}
                                                class={a.status === 'completed' ? 'bg-green-100 text-green-700 border-none' : ''}
                                            >{statusLabel(a.status)}</Badge>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Select.Root type="single"
                                                value={editMap[a.id]?.priority ?? a.priority}
                                                onValueChange={(v) => { editMap = { ...editMap, [a.id]: { ...editMap[a.id], priority: v } }; }}>
                                                <Select.Trigger class="h-8 w-full text-xs">
                                                    {priorityLabel(editMap[a.id]?.priority ?? a.priority)}
                                                </Select.Trigger>
                                                <Select.Content>
                                                    <Select.Item value="low">Baixa</Select.Item>
                                                    <Select.Item value="medium">Média</Select.Item>
                                                    <Select.Item value="high">Alta</Select.Item>
                                                    <Select.Item value="urgent">Urgente</Select.Item>
                                                </Select.Content>
                                            </Select.Root>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Input type="date" class="h-8 text-xs"
                                                   value={editMap[a.id]?.availableFrom ?? ''}
                                                   oninput={(e) => { editMap = { ...editMap, [a.id]: { ...editMap[a.id], availableFrom: (e.target as HTMLInputElement).value } }; }} />
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Input type="date" class="h-8 text-xs"
                                                   value={editMap[a.id]?.dueDate ?? ''}
                                                   oninput={(e) => { editMap = { ...editMap, [a.id]: { ...editMap[a.id], dueDate: (e.target as HTMLInputElement).value } }; }} />
                                        </Table.Cell>
                                        <Table.Cell>
                                            <div class="flex items-center gap-0.5">
                                                {#if a.status === 'completed'}
                                                    <button type="submit" form="reset-{a.id}"
                                                            class="inline-flex items-center justify-center size-7 rounded text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                            title="Reatribuir (limpa progresso e volta para pendente)">
                                                        <RefreshCw class="size-3.5" />
                                                    </button>
                                                {/if}
                                                <button type="submit" form="remove-{a.id}"
                                                        class="inline-flex items-center justify-center size-7 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        title="Remover atribuição (histórico preservado)">
                                                    <Trash2 class="size-3.5" />
                                                </button>
                                            </div>
                                        </Table.Cell>
                                    </Table.Row>
                                {/each}
                            </Table.Body>
                        </Table.Root>
                    </div>
                    <div class="space-y-3 sm:hidden">
                        {#each data.assignments as a (a.id)}
                            <div class="rounded-md border p-3 space-y-3">
                                <div class="flex items-start justify-between gap-2">
                                    <div>
                                        <p class="font-medium text-sm">{a.first_name} {a.last_name}</p>
                                        <p class="text-xs text-muted-foreground">{a.email}</p>
                                    </div>
                                    <div class="flex items-center gap-1 shrink-0">
                                        <Badge variant={a.status === 'in_progress' ? 'secondary' : 'outline'}
                                               class="text-xs {a.status === 'completed' ? 'bg-green-100 text-green-700 border-none' : ''}">
                                            {statusLabel(a.status)}
                                        </Badge>
                                        {#if a.status === 'completed'}
                                            <button type="submit" form="reset-{a.id}"
                                                    class="inline-flex items-center justify-center size-7 rounded text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                    title="Reatribuir">
                                                <RefreshCw class="size-3.5" />
                                            </button>
                                        {/if}
                                        <button type="submit" form="remove-{a.id}"
                                                class="inline-flex items-center justify-center size-7 rounded text-muted-foreground hover:text-red-600 transition-colors">
                                            <Trash2 class="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-2">
                                    <div class="space-y-1">
                                        <Label class="text-xs">Prioridade</Label>
                                        <Select.Root type="single"
                                            value={editMap[a.id]?.priority ?? a.priority}
                                            onValueChange={(v) => { editMap = { ...editMap, [a.id]: { ...editMap[a.id], priority: v } }; }}>
                                            <Select.Trigger class="h-8 w-full text-xs">
                                                {priorityLabel(editMap[a.id]?.priority ?? a.priority)}
                                            </Select.Trigger>
                                            <Select.Content>
                                                <Select.Item value="low">Baixa</Select.Item>
                                                <Select.Item value="medium">Média</Select.Item>
                                                <Select.Item value="high">Alta</Select.Item>
                                                <Select.Item value="urgent">Urgente</Select.Item>
                                            </Select.Content>
                                        </Select.Root>
                                    </div>
                                    <div class="space-y-1">
                                        <Label class="text-xs">Disponível em</Label>
                                        <Input type="date" class="h-8 text-xs"
                                               value={editMap[a.id]?.availableFrom ?? ''}
                                               oninput={(e) => { editMap = { ...editMap, [a.id]: { ...editMap[a.id], availableFrom: (e.target as HTMLInputElement).value } }; }} />
                                    </div>
                                    <div class="space-y-1 col-span-2">
                                        <Label class="text-xs">Prazo</Label>
                                        <Input type="date" class="h-8 text-xs"
                                               value={editMap[a.id]?.dueDate ?? ''}
                                               oninput={(e) => { editMap = { ...editMap, [a.id]: { ...editMap[a.id], dueDate: (e.target as HTMLInputElement).value } }; }} />
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                    <p class="mt-3 text-xs text-muted-foreground">
                        Remover uma atribuição não apaga o histórico — ele fica arquivado para consulta futura.
                    </p>
                {/if}
            </Card.Content>
        </Card.Root>
    </form>

    <!-- Section 2: Add New Users -->
    <form method="POST" action="?/addAssignments"
          use:enhance={() => {
              submittingAdd = true;
              return async ({ update }) => { submittingAdd = false; await update(); };
          }}>
        <input type="hidden" name="newAssignments" value={addJson} />
        <Card.Root>
            <Card.Header class="pb-3">
                <div class="flex items-center justify-between">
                    <div>
                        <Card.Title class="text-base flex items-center gap-2">
                            Adicionar Usuários
                            {#if selectedNewUsers.size > 0}
                                <Badge variant="secondary">{selectedNewUsers.size} selecionado(s)</Badge>
                            {/if}
                        </Card.Title>
                        <Card.Description>Configure prioridade e prazo individualmente antes de atribuir.</Card.Description>
                    </div>
                    <Button type="submit" size="sm" disabled={submittingAdd || selectedNewUsers.size === 0}>
                        <UserPlus class="mr-1.5 size-3.5" /> Atribuir Selecionados
                    </Button>
                </div>
                <div class="relative w-full max-w-sm mt-2">
                    <Search class="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="search" placeholder="Buscar usuário..." class="w-full pl-9"
                           oninput={handleSearchInput}
                           defaultValue={page.url.searchParams.get('search') || ''} />
                </div>
            </Card.Header>
            <Card.Content>
                {#if data.users.length === 0}
                    <div class="flex flex-col items-center justify-center py-8 rounded-md border border-dashed text-center">
                        <p class="text-sm text-muted-foreground">
                            {page.url.searchParams.get('search')
                                ? 'Nenhum usuário encontrado'
                                : 'Todos os usuários já estão atribuídos a esta tarefa'}
                        </p>
                    </div>
                {:else}
                    <div class="rounded-md border hidden sm:block overflow-x-auto">
                        <Table.Root>
                            <Table.Header>
                                <Table.Row class="bg-muted/50">
                                    <Table.Head class="w-11">
                                        <button type="button" class="flex items-center" onclick={toggleAll}>
                                            <Checkbox checked={allVisibleSelected} tabindex={-1} />
                                        </button>
                                    </Table.Head>
                                    <Table.Head>Nome</Table.Head>
                                    <Table.Head class="hidden md:table-cell">Email</Table.Head>
                                    <Table.Head>Cargo</Table.Head>
                                    <Table.Head class="w-[140px]">Prioridade</Table.Head>
                                    <Table.Head class="w-40">Disponível em</Table.Head>
                                    <Table.Head class="w-40">Prazo</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {#each data.users as u (u.user_id)}
                                    {@const isSelected = selectedNewUsers.has(u.user_id)}
                                    <Table.Row
                                        class="cursor-pointer {isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'}"
                                        onclick={() => toggleNewUser(u.user_id)}>
                                        <Table.Cell>
                                            <Checkbox checked={isSelected} tabindex={-1} />
                                        </Table.Cell>
                                        <Table.Cell class="font-medium text-sm">{u.first_name} {u.last_name}</Table.Cell>
                                        <Table.Cell class="text-muted-foreground text-sm hidden md:table-cell">{u.email}</Table.Cell>
                                        <Table.Cell>
                                            <Badge variant="outline" class="text-xs">{u.role_name}</Badge>
                                        </Table.Cell>
                                        <Table.Cell onclick={(e) => e.stopPropagation()}>
                                            {#if isSelected}
                                                <Select.Root type="single"
                                                    value={newUserConfig[u.user_id]?.priority ?? 'medium'}
                                                    onValueChange={(v) => { newUserConfig = { ...newUserConfig, [u.user_id]: { ...newUserConfig[u.user_id], priority: v } }; }}>
                                                    <Select.Trigger class="h-8 w-full text-xs">
                                                        {priorityLabel(newUserConfig[u.user_id]?.priority ?? 'medium')}
                                                    </Select.Trigger>
                                                    <Select.Content>
                                                        <Select.Item value="low">Baixa</Select.Item>
                                                        <Select.Item value="medium">Média</Select.Item>
                                                        <Select.Item value="high">Alta</Select.Item>
                                                        <Select.Item value="urgent">Urgente</Select.Item>
                                                    </Select.Content>
                                                </Select.Root>
                                            {:else}
                                                <span class="text-xs text-muted-foreground">—</span>
                                            {/if}
                                        </Table.Cell>
                                        <Table.Cell onclick={(e) => e.stopPropagation()}>
                                            {#if isSelected}
                                                <Input type="date" class="h-8 text-xs"
                                                       value={newUserConfig[u.user_id]?.availableFrom ?? ''}
                                                       oninput={(e) => {
                                                           const val = (e.target as HTMLInputElement).value;
                                                           newUserConfig = { ...newUserConfig, [u.user_id]: { ...newUserConfig[u.user_id], availableFrom: val } };
                                                       }} />
                                            {:else}
                                                <span class="text-xs text-muted-foreground">—</span>
                                            {/if}
                                        </Table.Cell>
                                        <Table.Cell onclick={(e) => e.stopPropagation()}>
                                            {#if isSelected}
                                                <Input type="date" class="h-8 text-xs"
                                                       value={newUserConfig[u.user_id]?.dueDate ?? ''}
                                                       oninput={(e) => {
                                                           const val = (e.target as HTMLInputElement).value;
                                                           newUserConfig = { ...newUserConfig, [u.user_id]: { ...newUserConfig[u.user_id], dueDate: val } };
                                                       }} />
                                            {:else}
                                                <span class="text-xs text-muted-foreground">—</span>
                                            {/if}
                                        </Table.Cell>
                                    </Table.Row>
                                {/each}
                            </Table.Body>
                        </Table.Root>
                    </div>
                    <div class="space-y-2 sm:hidden">
                        {#each data.users as u (u.user_id)}
                            {@const isSelected = selectedNewUsers.has(u.user_id)}
                            <div class="rounded-md border p-3 space-y-2 {isSelected ? 'border-primary/30 bg-primary/5' : ''}">
                                <button type="button" class="flex w-full items-center gap-3 text-left"
                                        onclick={() => toggleNewUser(u.user_id)}>
                                    <Checkbox checked={isSelected} tabindex={-1} />
                                    <div class="flex-1 min-w-0">
                                        <p class="text-sm font-medium">{u.first_name} {u.last_name}</p>
                                        <p class="text-xs text-muted-foreground truncate">{u.email}</p>
                                    </div>
                                    <Badge variant="outline" class="text-xs shrink-0">{u.role_name}</Badge>
                                </button>
                                {#if isSelected}
                                    <div class="grid grid-cols-2 gap-2 pt-1">
                                        <div class="space-y-1">
                                            <Label class="text-xs">Prioridade</Label>
                                            <Select.Root type="single"
                                                value={newUserConfig[u.user_id]?.priority ?? 'medium'}
                                                onValueChange={(v) => { newUserConfig = { ...newUserConfig, [u.user_id]: { ...newUserConfig[u.user_id], priority: v } }; }}>
                                                <Select.Trigger class="h-8 w-full text-xs">
                                                    {priorityLabel(newUserConfig[u.user_id]?.priority ?? 'medium')}
                                                </Select.Trigger>
                                                <Select.Content>
                                                    <Select.Item value="low">Baixa</Select.Item>
                                                    <Select.Item value="medium">Média</Select.Item>
                                                    <Select.Item value="high">Alta</Select.Item>
                                                    <Select.Item value="urgent">Urgente</Select.Item>
                                                </Select.Content>
                                            </Select.Root>
                                        </div>
                                        <div class="space-y-1">
                                            <Label class="text-xs">Disponível em</Label>
                                            <Input type="date" class="h-8 text-xs"
                                                   value={newUserConfig[u.user_id]?.availableFrom ?? ''}
                                                   oninput={(e) => {
                                                       const val = (e.target as HTMLInputElement).value;
                                                       newUserConfig = { ...newUserConfig, [u.user_id]: { ...newUserConfig[u.user_id], availableFrom: val } };
                                                   }} />
                                        </div>
                                        <div class="space-y-1 col-span-2">
                                            <Label class="text-xs">Prazo</Label>
                                            <Input type="date" class="h-8 text-xs"
                                                   value={newUserConfig[u.user_id]?.dueDate ?? ''}
                                                   oninput={(e) => {
                                                       const val = (e.target as HTMLInputElement).value;
                                                       newUserConfig = { ...newUserConfig, [u.user_id]: { ...newUserConfig[u.user_id], dueDate: val } };
                                                   }} />
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                    {#if data.pagination.totalItems > data.pagination.limit}
                        <div class="mt-4 flex justify-center">
                            <Pagination.Root count={data.pagination.totalItems} perPage={data.pagination.limit} page={data.pagination.page}>
                                {#snippet children({ currentPage })}
                                    <Pagination.Content>
                                        <Pagination.Item>
                                            <Pagination.PrevButton onclick={() => handlePageChange((currentPage - 1).toString())} disabled={currentPage <= 1}>
                                                <ChevronLeft class="size-4" />
                                                <span class="hidden sm:block">Anterior</span>
                                            </Pagination.PrevButton>
                                        </Pagination.Item>
                                        <span class="px-4 text-sm text-muted-foreground flex items-center">
                                            {currentPage} / {data.pagination.totalPages}
                                        </span>
                                        <Pagination.Item>
                                            <Pagination.NextButton onclick={() => handlePageChange((currentPage + 1).toString())} disabled={currentPage >= data.pagination.totalPages}>
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
            </Card.Content>
        </Card.Root>
    </form>
</div>
