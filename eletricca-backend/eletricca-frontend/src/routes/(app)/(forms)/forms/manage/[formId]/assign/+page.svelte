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
    // Usamos um Svelte Set/Map reativo se possível, ou array simples
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
            // Adiciona os que ainda não estão
            const newIds = visibleIds.filter((id: number) => !selectedUserIds.includes(id));
            selectedUserIds = [...selectedUserIds, ...newIds];
        } else {
            // Remove apenas os visíveis
            selectedUserIds = selectedUserIds.filter(id => !visibleIds.includes(id));
        }
    }

    // Verifica se todos da página atual estão selecionados
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

<div class="space-y-6 max-w-5xl mx-auto pb-20">
    <div class="flex items-center gap-4">
        <Button variant="ghost" size="icon" onclick={() => goto('/forms/manage')}>
            <ArrowLeft class="size-5" />
        </Button>
        <div>
            <h2 class="text-2xl font-bold tracking-tight">Atribuir Formulário</h2>
            <p class="text-muted-foreground">
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
        class="grid gap-6 lg:grid-cols-3"
    >
        <div class="lg:col-span-1 space-y-4">
            <Card.Root>
                <Card.Header>
                    <Card.Title class="flex items-center gap-2 text-base">
                        <Tag class="size-4" /> Configuração da Tarefa
                    </Card.Title>
                </Card.Header>
                <Card.Content class="space-y-4">
                    <div class="space-y-2">
                        <Label>Referência / Período *</Label>
                        <Input 
                            name="period_reference" 
                            placeholder="Ex: Janeiro/2025 ou Q1-2025" 
                            bind:value={periodReference}
                            required
                        />
                        <p class="text-[10px] text-muted-foreground">
                            Identificador único para evitar duplicidade (ex: Mês, Semana, Evento).
                        </p>
                    </div>

                    <div class="space-y-2">
                        <Label>Data de Entrega (Opcional)</Label>
                        <Input 
                            type="date" 
                            name="due_date" 
                            bind:value={dueDate}
                        />
                    </div>

                    <div class="rounded-lg bg-muted p-4 mt-4">
                        <p class="text-sm font-medium text-muted-foreground mb-1">Usuários Selecionados</p>
                        <p class="text-3xl font-bold text-primary">{selectedUserIds.length}</p>
                    </div>

                    <Input type="hidden" name="selected_users" value={JSON.stringify(selectedUserIds)} />

                    <Button type="submit" class="w-full mt-4" disabled={selectedUserIds.length === 0 || isAssigning}>
                        {#if isAssigning}
                            <Loader2 class="mr-2 size-4 animate-spin" /> Atribuindo...
                        {:else}
                            <UserPlus class="mr-2 size-4" /> Confirmar Atribuição
                        {/if}
                    </Button>
                </Card.Content>
            </Card.Root>
        </div>

        <div class="lg:col-span-2">
            <Card.Root>
                <Card.Header class="pb-3">
                    <div class="flex items-center justify-between">
                        <Card.Title class="text-base flex items-center gap-2">
                            <Users class="size-4" /> Selecionar Usuários
                        </Card.Title>
                        <div class="relative w-64">
                            <Search class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                            <Input 
                                type="search" 
                                placeholder="Buscar nome ou email..." 
                                class="pl-9"
                                oninput={handleSearch}
                            />
                        </div>
                    </div>
                </Card.Header>
                <Card.Content>
                    <div class="border rounded-md">
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
                                    <Table.Head>Email</Table.Head>
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
                                        <Table.Row class={selectedUserIds.includes(user.user_id) ? "bg-muted/30" : ""}>
                                            <Table.Cell class="text-center">
                                                <Checkbox 
                                                    checked={selectedUserIds.includes(user.user_id)}
                                                    onCheckedChange={(v) => toggleSelection(user.user_id, !!v)}
                                                />
                                            </Table.Cell>
                                            <Table.Cell class="font-medium">
                                                {user.first_name} {user.last_name}
                                            </Table.Cell>
                                            <Table.Cell class="text-muted-foreground text-sm">
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

                    {#if data.pagination.totalItems > data.pagination.limit}
                        <div class="mt-4 flex justify-end">
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
                                        
                                        <span class="px-4 text-sm text-muted-foreground flex items-center">
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
    </form>
</div>