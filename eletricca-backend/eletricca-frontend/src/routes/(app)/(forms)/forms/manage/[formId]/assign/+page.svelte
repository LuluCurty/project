<script lang="ts">
    import {
        ArrowLeft, Search, Calendar, Tag, Check, Users,
        ChevronLeft, ChevronRight, Loader2, UserPlus
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
    import { Checkbox } from '$lib/components/ui/checkbox';
    import * as Pagination from "$lib/components/ui/pagination";

    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    // Estado da seleção (Persiste entre paginas)
    let selectedUserIds = $state<number[]>([]);

    // Configuração da Atribuição
    let periodReference = $state('');
    let dueDate = $state('');
    let isAssigning = $state(false);

    // Filtros
    let search = $derived(page.url.searchParams.get('search') || '');
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

    function toggleSelection(userId: number, checked: boolean) {
        if (checked) {
            if (!selectedUserIds.includes(userId)) {
                selectedUserIds = [...selectedUserIds, userId];
            }
        } else {
            selectedUserIds = selectedUserIds.filter(id => id !== userId);
        }
    }

    function toggleAllVisible(checked: boolean) {
        const visibleIds = data.users.map((u: any) => u.user_id);
        if (checked) {
            const newIds = visibleIds.filter((id: number) => !selectedUserIds.includes(id));
            selectedUserIds = [...selectedUserIds, ...newIds];
        } else {
            selectedUserIds = selectedUserIds.filter(id => !visibleIds.includes(id));
        }
    }

    let allVisibleSelected = $derived(
        data.users.length > 0 &&
        data.users.every((u: any) => selectedUserIds.includes(u.user_id))
    );

    function handlePageChange(newPage: string) {
        const url = new URL(page.url);
        url.searchParams.set('page', newPage);
        goto(url.toString(), { keepFocus: true });
    }
</script>

<div class="mx-auto max-w-5xl space-y-4 pb-32 sm:space-y-6 lg:pb-6">
    <!-- Header -->
    <div class="flex items-start gap-3 sm:items-center sm:gap-4">
        <Button variant="ghost" size="icon" class="mt-0.5 shrink-0 sm:mt-0" onclick={() => goto('/forms/manage')}>
            <ArrowLeft class="size-5" />
        </Button>
        <div class="min-w-0">
            <h2 class="text-xl font-bold tracking-tight sm:text-2xl">Atribuir Formulário</h2>
            <p class="truncate text-sm text-muted-foreground">
                Formulário: <span class="font-medium text-primary">{data.form?.title}</span>
            </p>
        </div>
    </div>

    <form
        method="POST"
        use:enhance={({ cancel }) => {
            if(selectedUserIds.length === 0) {
                alert('Selecione pelo menos um usuário.');
                cancel();
                return;
            }
            if(!periodReference) {
                alert('Defina uma referência para esta atribuição.');
                cancel();
                return;
            }
            isAssigning = true;
            return async ({ update }) => {
                isAssigning = false;
                await update();
            };
        }}
        class="grid gap-4 sm:gap-6 lg:grid-cols-3"
    >
        <!-- Configuração -->
        <div class="lg:col-span-1 space-y-4">
            <Card.Root>
                <Card.Header>
                    <Card.Title class="flex items-center gap-2 text-base">
                        <Tag class="size-4" /> Configuração da Tarefa
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
                            <p class="text-[10px] text-muted-foreground">
                                Identificador único para evitar duplicidade.
                            </p>
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

                    <div class="rounded-lg bg-muted p-4">
                        <p class="text-sm font-medium text-muted-foreground mb-1">Usuários Selecionados</p>
                        <p class="text-3xl font-bold text-primary">{selectedUserIds.length}</p>
                    </div>

                    <Input type="hidden" name="selected_users" value={JSON.stringify(selectedUserIds)} />

                    <!-- Botão desktop (dentro do card) -->
                    <Button type="submit" class="hidden w-full lg:flex" disabled={selectedUserIds.length === 0 || isAssigning}>
                        {#if isAssigning}
                            <Loader2 class="mr-2 size-4 animate-spin" /> Atribuindo...
                        {:else}
                            <UserPlus class="mr-2 size-4" /> Confirmar Atribuição
                        {/if}
                    </Button>
                </Card.Content>
            </Card.Root>
        </div>

        <!-- Usuários -->
        <div class="lg:col-span-2">
            <Card.Root>
                <Card.Header class="pb-3">
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Card.Title class="flex items-center gap-2 text-base">
                            <Users class="size-4" /> Selecionar Usuários
                        </Card.Title>
                        <div class="relative w-full sm:w-64">
                            <Search class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar nome ou email..."
                                class="pl-9"
                                oninput={handleSearch}
                                defaultValue={search}
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
                                    <Table.Head class="w-[50px] text-center">
                                        <Checkbox
                                            checked={allVisibleSelected}
                                            onCheckedChange={(v) => toggleAllVisible(!!v)}
                                        />
                                    </Table.Head>
                                    <Table.Head>Nome</Table.Head>
                                    <Table.Head class="hidden md:table-cell">Email</Table.Head>
                                    <Table.Head>Cargo</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {#if data.users.length === 0}
                                    <Table.Row>
                                        <Table.Cell colspan={4} class="h-24 text-center text-muted-foreground">
                                            Nenhum usuário encontrado.
                                        </Table.Cell>
                                    </Table.Row>
                                {:else}
                                    {#each data.users as user (user.user_id)}
                                        <Table.Row
                                            class="cursor-pointer transition-colors {selectedUserIds.includes(user.user_id) ? 'bg-primary/5' : 'hover:bg-muted/50'}"
                                            onclick={() => toggleSelection(user.user_id, !selectedUserIds.includes(user.user_id))}
                                        >
                                            <Table.Cell class="text-center" onclick={(e: MouseEvent) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={selectedUserIds.includes(user.user_id)}
                                                    onCheckedChange={(v) => toggleSelection(user.user_id, !!v)}
                                                />
                                            </Table.Cell>
                                            <Table.Cell class="font-medium">
                                                {user.first_name} {user.last_name}
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
                        <!-- Selecionar todos -->
                        <button
                            type="button"
                            class="flex w-full items-center gap-3 rounded-lg border bg-muted/30 p-3 text-sm font-medium transition-colors hover:bg-muted/50"
                            onclick={() => toggleAllVisible(!allVisibleSelected)}
                        >
                            <Checkbox
                                checked={allVisibleSelected}
                                onCheckedChange={(v) => toggleAllVisible(!!v)}
                            />
                            <span class="text-muted-foreground">Selecionar todos desta página</span>
                        </button>

                        {#if data.users.length === 0}
                            <div class="py-8 text-center text-muted-foreground">
                                Nenhum usuário encontrado.
                            </div>
                        {:else}
                            {#each data.users as user (user.user_id)}
                                <button
                                    type="button"
                                    class="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors
                                    {selectedUserIds.includes(user.user_id)
                                        ? 'border-primary/30 bg-primary/5'
                                        : 'hover:bg-muted/50'}"
                                    onclick={() => toggleSelection(user.user_id, !selectedUserIds.includes(user.user_id))}
                                >
                                    <Checkbox
                                        checked={selectedUserIds.includes(user.user_id)}
                                        onCheckedChange={(v) => toggleSelection(user.user_id, !!v)}
                                    />
                                    <div class="min-w-0 flex-1">
                                        <p class="truncate text-sm font-medium">
                                            {user.first_name} {user.last_name}
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
                    {#if data.pagination.totalItems > data.pagination.limit}
                        <div class="mt-4 flex justify-center sm:justify-end">
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
                                            </Pagination.PrevButton>
                                        </Pagination.Item>

                                        <span class="flex items-center px-4 text-sm text-muted-foreground">
                                            Pág {currentPage} de {data.pagination.totalPages}
                                        </span>

                                        <Pagination.Item>
                                            <Pagination.NextButton
                                                onclick={() => handlePageChange((currentPage + 1).toString())}
                                                disabled={currentPage >= data.pagination.totalPages}
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
                    <p class="text-sm font-medium">
                        <span class="text-primary">{selectedUserIds.length}</span>
                        <span class="text-muted-foreground"> selecionado{selectedUserIds.length !== 1 ? 's' : ''}</span>
                    </p>
                </div>
                <Button type="submit" class="h-11 min-w-40" disabled={selectedUserIds.length === 0 || isAssigning}>
                    {#if isAssigning}
                        <Loader2 class="mr-2 size-4 animate-spin" /> Atribuindo...
                    {:else}
                        <UserPlus class="mr-2 size-4" /> Confirmar
                    {/if}
                </Button>
            </div>
        </div>
    </form>
</div>
