<script lang="ts">
    import {
        Search, EllipsisVertical, Plus, FileText, Users, ChevronLeft, ChevronRight,
        Loader2, Pencil, Trash, UserPlus, Eye, ToggleLeft, ToggleRight, ArrowLeft, ClipboardList, BarChart3
    } from '@lucide/svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { enhance } from '$app/forms'; // IMPORTANTE

    import * as Table from '$lib/components/ui/table/index.js';
    import * as Card from '$lib/components/ui/card/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Input } from '$lib/components/ui/input/';
    import * as Pagination from "$lib/components/ui/pagination/index.js";
    import { buttonVariants } from '$lib/components/ui/button/index.js';
    import * as AlertDialog from '$lib/components/ui/alert-dialog';

    import type { PageProps } from './$types';

    let { data }: PageProps = $props();

    // MUDANÇA: Dados vindo do Backend
    let forms = $derived(data.forms);
    let stats = $derived(data.stats);
    let pagination = $derived(data.pagination);

    let isLoading = $state<boolean>(false);
    let deleteDialogOpen = $state<boolean>(false);
    let formToDelete = $state<{ id: number; title: string } | null>(null);

    let searchTimeout: ReturnType<typeof setTimeout>;

    function handleSearchInput(e: Event) {
        const target = e.target as HTMLInputElement;
        const value = target.value;

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
        url.searchParams.set('page', newPage.toString());
        goto(url.toString(), { keepFocus: true });
    }

    function formatDate(dateString: Date | string) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-br', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    function openDeleteDialog(form: { id: number; title: string }) {
        formToDelete = form;
        deleteDialogOpen = true;
    }
</script>

<div class="space-y-4">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div class="flex items-center gap-4">
            <Button variant="ghost" size="icon" onclick={() => goto('/forms')}>
                <ArrowLeft class="size-5" />
            </Button>
            <div>
                <h2 class="text-2xl font-bold tracking-tight text-primary">Gerenciar Formulários</h2>
                <p class="text-muted-foreground">Crie, edite e gerencie seus formulários</p>
            </div>
        </div>
        <div class="flex w-full items-center gap-2 sm:w-auto">
            <Button variant="outline" onclick={() => goto('/forms/manage/statistics')}>
                <BarChart3 class="mr-2 size-4" /> Estatísticas
            </Button>
            <Button variant="outline" onclick={() => goto('/forms/manage/assignment')}>
                <ClipboardList class="mr-2 size-4" /> Atribuições
            </Button>
            <Button onclick={() => goto('/forms/manage/create')}>
                <Plus class="mr-2 size-4" /> Novo Formulário
            </Button>
        </div>
    </div>

    <div class="grid gap-4 md:grid-cols-4">
        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Total</p>
                        <p class="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <FileText class="size-8 text-muted-foreground/50" />
                </div>
            </Card.Content>
        </Card.Root>
        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Ativos</p>
                        <p class="text-2xl font-bold text-green-600">{stats.active}</p>
                    </div>
                    <ToggleRight class="size-8 text-green-600/50" />
                </div>
            </Card.Content>
        </Card.Root>
        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Inativos</p>
                        <p class="text-2xl font-bold text-gray-500">{stats.inactive}</p>
                    </div>
                    <ToggleLeft class="size-8 text-gray-400/50" />
                </div>
            </Card.Content>
        </Card.Root>
        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Atribuições</p>
                        <p class="text-2xl font-bold text-blue-600">{stats.totalAssignments}</p>
                    </div>
                    <Users class="size-8 text-blue-600/50" />
                </div>
            </Card.Content>
        </Card.Root>
    </div>

    <Card.Root>
        <Card.Header class="pb-3">
            <div class="flex items-center gap-2">
                <div class="relative w-full max-w-sm">
                    <Search class="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar formulário..."
                        class="w-full pl-9"
                        oninput={handleSearchInput}
                        defaultValue={page.url.searchParams.get('search') || ''}
                    />
                </div>
            </div>
        </Card.Header>

        <Card.Content>
            <div class="rounded-md border">
                <Table.Root>
                    <Table.Header>
                        <Table.Row class="bg-muted/50">
                            <Table.Head class="w-[50px]">ID</Table.Head>
                            <Table.Head>Título</Table.Head>
                            <Table.Head class="hidden lg:table-cell">Criado por</Table.Head>
                            <Table.Head class="text-center hidden sm:table-cell">Campos</Table.Head>
                            <Table.Head class="text-center hidden sm:table-cell">Respostas</Table.Head>
                            <Table.Head class="text-center hidden md:table-cell">Atribuições</Table.Head>
                            <Table.Head class="text-center">Status</Table.Head>
                            <Table.Head class="hidden md:table-cell">Atualizado</Table.Head>
                            <Table.Head class="text-right">Ações</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#if isLoading}
                            <Table.Row>
                                <Table.Cell colspan={9} class="h-24 text-center">
                                    <Loader2 class="size-5 animate-spin text-primary mx-auto" />
                                </Table.Cell>
                            </Table.Row>
                        {:else if forms.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={9} class="h-24 text-center text-muted-foreground">
                                    <div class="flex flex-col items-center gap-2">
                                        <FileText class="size-10 text-muted-foreground/50" />
                                        <p>Nenhum formulário encontrado</p>
                                        <Button variant="outline" size="sm" onclick={() => goto('/forms/manage/create')}>
                                            <Plus class="mr-2 size-4" /> Criar primeiro formulário
                                        </Button>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each forms as form (form.id)}
                                <Table.Row class="hover:bg-muted/50">
                                    <Table.Cell class="font-medium text-muted-foreground">
                                        #{form.id}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div class="flex flex-col">
                                            <span class="font-medium">{form.title}</span>
                                            <span class="text-xs text-muted-foreground truncate max-w-[200px] hidden sm:block">
                                                {form.description}
                                            </span>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell class="hidden lg:table-cell text-muted-foreground">
                                        {form.created_by_name}
                                    </Table.Cell>
                                    <Table.Cell class="text-center hidden sm:table-cell">
                                        <Badge variant="outline">{form.field_count}</Badge>
                                    </Table.Cell>
                                    <Table.Cell class="text-center hidden sm:table-cell">
                                        <Badge variant="secondary">{form.response_count}</Badge>
                                    </Table.Cell>
                                    <Table.Cell class="text-center hidden md:table-cell">
                                        <Badge variant="outline" class="border-blue-200 text-blue-700">
                                            {form.assignment_count}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell class="text-center">
                                        <form action="?/toggleStatus" method="POST" use:enhance>
                                            <input type="hidden" name="id" value={form.id}>
                                            <button
                                                type="submit"
                                                class="cursor-pointer transition-opacity hover:opacity-80"
                                                title={form.is_active ? 'Clique para desativar' : 'Clique para ativar'}
                                            >
                                                {#if form.is_active}
                                                    <Badge class="bg-green-100 text-green-800 hover:bg-green-200 pointer-events-none">Ativo</Badge>
                                                {:else}
                                                    <Badge variant="secondary" class="bg-gray-100 text-gray-600 hover:bg-gray-200 pointer-events-none">Inativo</Badge>
                                                {/if}
                                            </button>
                                        </form>
                                    </Table.Cell>
                                    <Table.Cell class="hidden md:table-cell text-muted-foreground text-sm">
                                        {formatDate(form.updated_at)}
                                    </Table.Cell>
                                    <Table.Cell class="text-right">
                                        <DropdownMenu.Root>
                                            <DropdownMenu.Trigger
                                                class={buttonVariants({ variant: "ghost", size: "icon"}) + " size-8"}
                                            >
                                                <EllipsisVertical class="size-4" />
                                                <span class="sr-only">Abrir menu</span>
                                            </DropdownMenu.Trigger>

                                            <DropdownMenu.Content align="end">
                                                <DropdownMenu.Label>Ações</DropdownMenu.Label>
                                                <DropdownMenu.Separator />

                                                <DropdownMenu.Item onclick={() => goto(`/forms/manage/${form.id}`)}>
                                                    <Pencil class="mr-2 size-4"/> Editar
                                                </DropdownMenu.Item>

                                                <DropdownMenu.Item onclick={() => goto(`/forms/manage/${form.id}/assign`)}>
                                                    <UserPlus class="mr-2 size-4"/> Atribuir
                                                </DropdownMenu.Item>

                                                <DropdownMenu.Item onclick={() => goto(`/forms/manage/${form.id}/responses`)}>
                                                    <Eye class="mr-2 size-4"/> Ver Respostas
                                                </DropdownMenu.Item>

                                                <DropdownMenu.Separator />

                                                <DropdownMenu.Item
                                                    class="text-destructive focus:text-destructive"
                                                    onclick={() => openDeleteDialog({ id: form.id, title: form.title })}
                                                >
                                                    <Trash class="mr-2 size-4" /> Excluir
                                                </DropdownMenu.Item>
                                            </DropdownMenu.Content>
                                        </DropdownMenu.Root>
                                    </Table.Cell>
                                </Table.Row>
                            {/each}
                        {/if}
                    </Table.Body>
                </Table.Root>
            </div>

            {#if pagination.totalItems > pagination.limit}
                <Pagination.Root count={pagination.totalItems} perPage={pagination.limit} page={pagination.page}>
                    {#snippet children({ pages, currentPage })}
                        <Pagination.Content class="mt-4">
                            <Pagination.Item>
                                <Pagination.PrevButton
                                    class="cursor-pointer"
                                    disabled={currentPage <= 1}
                                    onclick={() => handlePageChange((currentPage - 1).toString())}
                                >
                                    <ChevronLeft class="size-4"/>
                                    <span class="hidden sm:block">Anterior</span>
                                </Pagination.PrevButton>
                            </Pagination.Item>

                            {#each pages as p (p.key)}
                                {#if p.type === 'ellipsis'}
                                    <Pagination.Item>
                                        <Pagination.Ellipsis />
                                    </Pagination.Item>
                                {:else}
                                    <Pagination.Item>
                                        <Pagination.Link
                                            page={p}
                                            isActive={currentPage === p.value}
                                            onclick={(e: MouseEvent)=> {
                                                e.preventDefault();
                                                handlePageChange((p.value).toString())
                                            }}
                                        >
                                            {p.value}
                                        </Pagination.Link>
                                    </Pagination.Item>
                                {/if}
                            {/each}

                            <Pagination.Item>
                                <Pagination.NextButton
                                    onclick={() => handlePageChange((currentPage + 1).toString())}
                                    disabled={currentPage * pagination.limit >= pagination.totalItems}
                                    class="cursor-pointer"
                                >
                                    <span class="hidden sm:block">Próximo</span>
                                    <ChevronRight class="size-4" />
                                </Pagination.NextButton>
                            </Pagination.Item>
                        </Pagination.Content>
                    {/snippet}
                </Pagination.Root>
            {/if}
        </Card.Content>
    </Card.Root>
</div>

<AlertDialog.Root bind:open={deleteDialogOpen}>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>Excluir formulário?</AlertDialog.Title>
            <AlertDialog.Description>
                Você está prestes a excluir o formulário <strong>"{formToDelete?.title}"</strong>.
                Esta ação não pode ser desfeita. Todas as respostas associadas serão perdidas.
            </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
            
            <form action="?/delete" method="POST" use:enhance={() => {
                return async ({ result, update }) => {
                    if(result.type === 'success') {
                        deleteDialogOpen = false;
                        await update();
                    }
                }
            }}>
                <input type="hidden" name="id" value={formToDelete?.id}>
                <Button 
                    type="submit"
                    variant="destructive"
                >
                    Excluir
                </Button>
            </form>

        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>