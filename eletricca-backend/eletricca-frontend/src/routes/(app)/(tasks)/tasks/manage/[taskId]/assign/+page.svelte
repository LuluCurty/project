<script lang="ts">
    import {
        ArrowLeft, Search, Users, Save,
        ChevronLeft, ChevronRight
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

    // Inicializa com TODOS os usuários já atribuídos (não só os da página atual)
    let selectedUsers = $state<Set<number>>(new Set(data.assignedUserIds));
    let priority = $state('medium');
    let dueDate = $state('');
    let submitting = $state(false);

    // Após salvar com sucesso, sincroniza seleção com o novo estado do DB
    $effect(() => {
        if (form?.success) {
            selectedUsers = new Set(data.assignedUserIds);
        }
    });

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

    function toggleUser(userId: number) {
        const next = new Set(selectedUsers);
        if (next.has(userId)) next.delete(userId);
        else next.add(userId);
        selectedUsers = next;
    }

    function toggleAll() {
        const allIds = data.users.map((u: any) => u.user_id);
        const allSelected = allIds.every((id: number) => selectedUsers.has(id));
        const next = new Set(selectedUsers);
        if (allSelected) allIds.forEach((id: number) => next.delete(id));
        else allIds.forEach((id: number) => next.add(id));
        selectedUsers = next;
    }

    function priorityLabel(p: string) {
        switch (p) {
            case 'urgent': return 'Urgente';
            case 'high': return 'Alta';
            case 'medium': return 'Média';
            case 'low': return 'Baixa';
            default: return p;
        }
    }

    let allVisibleSelected = $derived(
        data.users.length > 0 && data.users.every((u: any) => selectedUsers.has(u.user_id))
    );
</script>

<form
    method="POST"
    action="?/saveAssignments"
    use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
            submitting = false;
            await update();
        };
    }}
>
    <!-- Hidden inputs -->
    <input type="hidden" name="userIds" value={JSON.stringify([...selectedUsers])} />
    <input type="hidden" name="priority" value={priority} />
    <input type="hidden" name="due_date" value={dueDate} />

    <div class="max-w-4xl mx-auto space-y-6 pb-20">
        <!-- Header -->
        <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-4">
                <Button type="button" variant="ghost" size="icon" onclick={() => goto(`/tasks/manage/${data.task.id}`)}>
                    <ArrowLeft class="size-5" />
                </Button>
                <div>
                    <h2 class="text-2xl font-bold tracking-tight text-primary">Atribuir Tarefa</h2>
                    <p class="text-muted-foreground">{data.task.title}</p>
                </div>
            </div>
            <Button type="submit" disabled={submitting}>
                <Save class="mr-2 size-4" /> Salvar
            </Button>
        </div>

        {#if form?.error}
            <Alert.Root variant="destructive">
                <Alert.Description>{form.error}</Alert.Description>
            </Alert.Root>
        {/if}

        {#if form?.success}
            <Alert.Root class="border-green-200 bg-green-50 text-green-800">
                <Alert.Description>
                    {form.count === 0
                        ? 'Todas as atribuições foram removidas.'
                        : `${form.count} usuário(s) atribuído(s) com sucesso!`}
                </Alert.Description>
            </Alert.Root>
        {/if}

        <div class="grid gap-6 lg:grid-cols-[280px_1fr]">
            <!-- Config sidebar -->
            <div class="space-y-4">
                <Card.Root>
                    <Card.Header class="pb-3">
                        <Card.Title class="text-base">Configuração</Card.Title>
                    </Card.Header>
                    <Card.Content class="space-y-4">
                        <div class="space-y-1.5">
                            <Label>Prioridade</Label>
                            <Select.Root type="single" value={priority} onValueChange={(v) => priority = v}>
                                <Select.Trigger class="w-full">
                                    {priorityLabel(priority)}
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Item value="low">Baixa</Select.Item>
                                    <Select.Item value="medium">Média</Select.Item>
                                    <Select.Item value="high">Alta</Select.Item>
                                    <Select.Item value="urgent">Urgente</Select.Item>
                                </Select.Content>
                            </Select.Root>
                        </div>
                        <div class="space-y-1.5">
                            <Label>Prazo</Label>
                            <Input type="date" bind:value={dueDate} />
                        </div>
                        <div class="rounded-md bg-muted/50 px-3 py-2 text-sm">
                            <div class="flex items-center gap-2">
                                <Users class="size-4 text-muted-foreground" />
                                <span><strong>{selectedUsers.size}</strong> usuário(s) selecionado(s)</span>
                            </div>
                        </div>
                    </Card.Content>
                </Card.Root>
            </div>

            <!-- User table -->
            <Card.Root>
                <Card.Header class="pb-3">
                    <Card.Title class="text-base">Selecionar Usuários</Card.Title>
                    <div class="relative w-full max-w-sm mt-2">
                        <Search class="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar usuário..."
                            class="w-full pl-9"
                            oninput={handleSearchInput}
                            defaultValue={page.url.searchParams.get('search') || ''}
                        />
                    </div>
                </Card.Header>

                <Card.Content>
                    <!-- Desktop table -->
                    <div class="rounded-md border hidden sm:block">
                        <Table.Root>
                            <Table.Header>
                                <Table.Row class="bg-muted/50">
                                    <Table.Head class="w-[50px]">
                                        <button type="button" class="flex items-center cursor-pointer" onclick={toggleAll}>
                                            <Checkbox checked={allVisibleSelected} />
                                        </button>
                                    </Table.Head>
                                    <Table.Head>Nome</Table.Head>
                                    <Table.Head class="hidden md:table-cell">Email</Table.Head>
                                    <Table.Head>Cargo</Table.Head>
                                    <Table.Head class="text-center">Status</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {#if data.users.length === 0}
                                    <Table.Row>
                                        <Table.Cell colspan={5} class="h-20 text-center text-muted-foreground">
                                            Nenhum usuário encontrado
                                        </Table.Cell>
                                    </Table.Row>
                                {:else}
                                    {#each data.users as u (u.user_id)}
                                        {@const isSelected = selectedUsers.has(u.user_id)}
                                        <Table.Row
                                            class="hover:bg-muted/50 cursor-pointer {isSelected ? 'bg-primary/5' : ''}"
                                            onclick={() => toggleUser(u.user_id)}
                                        >
                                            <Table.Cell>
                                                <Checkbox checked={isSelected} tabindex={-1} />
                                            </Table.Cell>
                                            <Table.Cell class="font-medium">
                                                {u.first_name} {u.last_name}
                                            </Table.Cell>
                                            <Table.Cell class="text-muted-foreground hidden md:table-cell">
                                                {u.email}
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Badge variant="outline">{u.role_name}</Badge>
                                            </Table.Cell>
                                            <Table.Cell class="text-center">
                                                {#if u.is_assigned}
                                                    <Badge class="bg-green-100 text-green-700 border-none">Atribuído</Badge>
                                                {/if}
                                            </Table.Cell>
                                        </Table.Row>
                                    {/each}
                                {/if}
                            </Table.Body>
                        </Table.Root>
                    </div>

                    <!-- Mobile cards -->
                    <div class="space-y-2 sm:hidden">
                        {#each data.users as u (u.user_id)}
                            {@const isSelected = selectedUsers.has(u.user_id)}
                            <button
                                type="button"
                                class="flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors {isSelected ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'}"
                                onclick={() => toggleUser(u.user_id)}
                            >
                                <Checkbox checked={isSelected} tabindex={-1} />
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium">{u.first_name} {u.last_name}</p>
                                    <p class="text-xs text-muted-foreground truncate">{u.email}</p>
                                </div>
                                <Badge variant="outline" class="text-xs shrink-0">{u.role_name}</Badge>
                                {#if u.is_assigned}
                                    <Badge class="bg-green-100 text-green-700 border-none text-xs shrink-0">Atribuído</Badge>
                                {/if}
                            </button>
                        {/each}
                    </div>

                    {#if data.pagination.totalItems > data.pagination.limit}
                        <div class="mt-4 flex justify-center">
                            <Pagination.Root count={data.pagination.totalItems} perPage={data.pagination.limit} page={data.pagination.page}>
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
                </Card.Content>
            </Card.Root>
        </div>

        <!-- Mobile footer fixo -->
        <div class="fixed bottom-0 left-0 right-0 border-t bg-background p-4 sm:hidden">
            <div class="flex items-center justify-between gap-4">
                <span class="text-sm text-muted-foreground">
                    <strong>{selectedUsers.size}</strong> selecionado(s)
                </span>
                <Button type="submit" disabled={submitting}>
                    <Save class="mr-2 size-4" /> Salvar
                </Button>
            </div>
        </div>
    </div>
</form>
