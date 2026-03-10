<script lang="ts">
    import {
        ArrowLeft, Search, Tag, Users,
        ChevronLeft, ChevronRight, Save, User, TriangleAlert as AlertTriangle, Clock
    } from '@lucide/svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { enhance } from '$app/forms';

    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Badge } from '$lib/components/ui/badge';
    import * as Table from '$lib/components/ui/table';
    import * as Pagination from '$lib/components/ui/pagination';

    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let assignment = $derived(data.assignment);
    let users = $derived(data.users ?? []);
    let pagination = $derived(data.pagination ?? { page: 1, limit: 10, totalItems: 0, totalPages: 1 });

    // Estado editável
    let periodReference = $state(data.assignment.period_reference || '');
    let dueDate = $state(formatDateForInput(data.assignment.due_date));
    let selectedUserId = $state<number>(data.assignment.user_id);
    let isSaving = $state(false);

    // Usuário selecionado info
    let selectedUserName = $derived(() => {
        const userInList = users.find((u: any) => u.user_id === selectedUserId);
        if (userInList) return `${userInList.first_name} ${userInList.last_name}`;
        if (selectedUserId === assignment.user_id) return assignment.user_name;
        return 'Selecione um usuário';
    });

    let selectedUserEmail = $derived(() => {
        const userInList = users.find((u: any) => u.user_id === selectedUserId);
        if (userInList) return userInList.email;
        if (selectedUserId === assignment.user_id) return assignment.user_email;
        return '';
    });

    let isOverdue = $derived(
        assignment.due_date && new Date(assignment.due_date) < new Date()
    );

    // Busca
    let searchTimeout: ReturnType<typeof setTimeout>;

    function handleSearch(e: Event) {
        const value = (e.target as HTMLInputElement).value;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const url = new URL(page.url);
            url.searchParams.set('search', value);
            url.searchParams.set('page', '1');
            goto(url.toString(), { keepFocus: true, noScroll: true });
        }, 500);
    }

    function handlePageChange(newPage: string) {
        const url = new URL(page.url);
        url.searchParams.set('page', newPage);
        goto(url.toString(), { keepFocus: true });
    }

    function selectUser(userId: number) {
        selectedUserId = userId;
    }

    function formatDateForInput(dateString: Date | string | null): string {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toISOString().split('T')[0];
    }
</script>

<div class="mx-auto max-w-5xl space-y-4 pb-32 sm:space-y-6 lg:pb-6">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3 sm:items-center sm:gap-4">
            <Button variant="ghost" size="icon" class="mt-0.5 shrink-0 sm:mt-0" onclick={() => goto('/forms/manage/assignment')}>
                <ArrowLeft class="size-5" />
            </Button>
            <div class="min-w-0">
                <h2 class="text-xl font-bold tracking-tight sm:text-2xl">Editar Atribuição</h2>
                <p class="truncate text-sm text-muted-foreground">
                    Formulário: <span class="font-medium text-primary">{assignment.form_title}</span>
                </p>
            </div>
        </div>
        <Badge
            variant={isOverdue ? 'destructive' : 'secondary'}
            class={isOverdue ? '' : 'bg-yellow-100 text-yellow-800'}
        >
            {#if isOverdue}
                <AlertTriangle class="mr-1 size-3" /> Atrasado
            {:else}
                <Clock class="mr-1 size-3" /> Pendente
            {/if}
        </Badge>
    </div>

    <form
        method="POST"
        use:enhance={({ cancel }) => {
            if (!periodReference.trim()) {
                alert('Defina uma referência para o período.');
                cancel();
                return;
            }
            if (!selectedUserId) {
                alert('Selecione um usuário.');
                cancel();
                return;
            }
            isSaving = true;
            return async ({ update }) => {
                isSaving = false;
                await update();
            };
        }}
        class="grid gap-4 sm:gap-6 lg:grid-cols-3"
    >
        <!-- Hidden inputs -->
        <input type="hidden" name="new_user_id" value={selectedUserId} />

        <!-- Coluna esquerda: Configuração -->
        <div class="lg:col-span-1 space-y-4">
            <Card.Root>
                <Card.Header>
                    <Card.Title class="flex items-center gap-2 text-base">
                        <Tag class="size-4" /> Configuração
                    </Card.Title>
                </Card.Header>
                <Card.Content class="space-y-4">
                    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                        <div class="space-y-2">
                            <Label>Referência / Período *</Label>
                            <Input
                                name="period_reference"
                                placeholder="Ex: Janeiro/2025 ou Q1-2025"
                                bind:value={periodReference}
                                required
                                class="h-11"
                            />
                        </div>

                        <div class="space-y-2">
                            <Label>Data de Entrega (Opcional)</Label>
                            <Input
                                type="date"
                                name="due_date"
                                bind:value={dueDate}
                                class="h-11"
                            />
                        </div>
                    </div>

                    <!-- Usuário selecionado -->
                    <div class="rounded-lg border bg-muted/30 p-4">
                        <p class="text-xs font-medium text-muted-foreground mb-2">Usuário Atribuído</p>
                        <div class="flex items-center gap-3">
                            <div class="flex size-9 items-center justify-center rounded-full bg-primary/10">
                                <User class="size-4 text-primary" />
                            </div>
                            <div class="min-w-0 flex-1">
                                <p class="truncate text-sm font-medium">{selectedUserName()}</p>
                                <p class="truncate text-xs text-muted-foreground">{selectedUserEmail()}</p>
                            </div>
                            {#if selectedUserId !== assignment.user_id}
                                <Badge class="shrink-0 bg-blue-100 text-blue-800">Alterado</Badge>
                            {/if}
                        </div>
                    </div>

                    <!-- Botão desktop -->
                    <Button type="submit" class="hidden w-full lg:flex" disabled={isSaving}>
                        {#if isSaving}
                            <Save class="mr-2 size-4 animate-spin" /> Salvando...
                        {:else}
                            <Save class="mr-2 size-4" /> Salvar Alterações
                        {/if}
                    </Button>
                </Card.Content>
            </Card.Root>
        </div>

        <!-- Coluna direita: Seleção de Usuário -->
        <div class="lg:col-span-2">
            <Card.Root>
                <Card.Header class="pb-3">
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Card.Title class="flex items-center gap-2 text-base">
                            <Users class="size-4" /> Reatribuir Usuário
                        </Card.Title>
                        <div class="relative w-full sm:w-64">
                            <Search class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar nome ou email..."
                                class="pl-9"
                                oninput={handleSearch}
                                defaultValue={data.search || ''}
                            />
                        </div>
                    </div>
                </Card.Header>
                <Card.Content>
                    <!-- Desktop Table -->
                    <div class="hidden rounded-md border sm:block">
                        <Table.Root>
                            <Table.Header>
                                <Table.Row class="bg-muted/50">
                                    <Table.Head class="w-[50px]"></Table.Head>
                                    <Table.Head>Nome</Table.Head>
                                    <Table.Head class="hidden md:table-cell">Email</Table.Head>
                                    <Table.Head>Cargo</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {#if users.length === 0}
                                    <Table.Row>
                                        <Table.Cell colspan={4} class="h-24 text-center text-muted-foreground">
                                            Nenhum usuário encontrado.
                                        </Table.Cell>
                                    </Table.Row>
                                {:else}
                                    {#each users as user (user.user_id)}
                                        {@const isSelected = selectedUserId === user.user_id}
                                        {@const isOriginal = assignment.user_id === user.user_id}
                                        <Table.Row
                                            class="cursor-pointer transition-colors {isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'}"
                                            onclick={() => selectUser(user.user_id)}
                                        >
                                            <Table.Cell class="text-center">
                                                <div class="flex items-center justify-center">
                                                    <div class="flex size-4 items-center justify-center rounded-full border-2 {isSelected ? 'border-primary' : 'border-muted-foreground/30'}">
                                                        {#if isSelected}
                                                            <div class="size-2 rounded-full bg-primary"></div>
                                                        {/if}
                                                    </div>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell class="font-medium">
                                                <div class="flex items-center gap-2">
                                                    {user.first_name} {user.last_name}
                                                    {#if isOriginal}
                                                        <Badge variant="outline" class="text-xs">Atual</Badge>
                                                    {/if}
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell class="hidden text-sm text-muted-foreground md:table-cell">
                                                {user.email}
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Badge variant="outline">{user.role_name || user.user_role}</Badge>
                                            </Table.Cell>
                                        </Table.Row>
                                    {/each}
                                {/if}
                            </Table.Body>
                        </Table.Root>
                    </div>

                    <!-- Mobile Cards -->
                    <div class="space-y-2 sm:hidden">
                        {#if users.length === 0}
                            <div class="py-8 text-center text-muted-foreground">
                                Nenhum usuário encontrado.
                            </div>
                        {:else}
                            {#each users as user (user.user_id)}
                                {@const isSelected = selectedUserId === user.user_id}
                                {@const isOriginal = assignment.user_id === user.user_id}
                                <button
                                    type="button"
                                    class="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors
                                    {isSelected
                                        ? 'border-primary/30 bg-primary/5'
                                        : 'hover:bg-muted/50'}"
                                    onclick={() => selectUser(user.user_id)}
                                >
                                    <div class="flex size-5 items-center justify-center rounded-full border-2 {isSelected ? 'border-primary' : 'border-muted-foreground/30'}">
                                        {#if isSelected}
                                            <div class="size-2.5 rounded-full bg-primary"></div>
                                        {/if}
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <p class="truncate text-sm font-medium">
                                            {user.first_name} {user.last_name}
                                            {#if isOriginal}
                                                <span class="text-xs text-muted-foreground">(Atual)</span>
                                            {/if}
                                        </p>
                                        <p class="truncate text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                    <Badge variant="outline" class="shrink-0 text-xs">
                                        {user.role_name || user.user_role}
                                    </Badge>
                                </button>
                            {/each}
                        {/if}
                    </div>

                    <!-- Pagination -->
                    {#if pagination.totalItems > pagination.limit}
                        <div class="mt-4 flex justify-center sm:justify-end">
                            <Pagination.Root
                                count={pagination.totalItems}
                                perPage={pagination.limit}
                                page={pagination.page}
                            >
                                {#snippet children({ pages, currentPage })}
                                    <Pagination.Content>
                                        <Pagination.Item>
                                            <Pagination.PrevButton
                                                onclick={() => handlePageChange((currentPage - 1).toString())}
                                                disabled={currentPage <= 1}
                                            >
                                                <ChevronLeft class="size-4" />
                                            </Pagination.PrevButton>
                                        </Pagination.Item>

                                        <span class="flex items-center px-4 text-sm text-muted-foreground">
                                            Pág {currentPage} de {pagination.totalPages}
                                        </span>

                                        <Pagination.Item>
                                            <Pagination.NextButton
                                                onclick={() => handlePageChange((currentPage + 1).toString())}
                                                disabled={currentPage >= pagination.totalPages}
                                            >
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

        <!-- Footer fixo mobile/tablet -->
        <div class="fixed inset-x-0 bottom-0 z-10 border-t bg-background p-4 lg:hidden">
            <div class="mx-auto flex max-w-5xl items-center gap-3">
                <div class="flex-1">
                    <p class="text-sm font-medium text-muted-foreground">
                        Editando atribuição
                    </p>
                </div>
                <Button type="submit" class="h-11 min-w-40" disabled={isSaving}>
                    {#if isSaving}
                        <Save class="mr-2 size-4 animate-spin" /> Salvando...
                    {:else}
                        <Save class="mr-2 size-4" /> Salvar
                    {/if}
                </Button>
            </div>
        </div>
    </form>
</div>
