<script lang="ts">
    import {
        Search,
        EllipsisVertical,
        Plus,
        FileText,
        Users,
        ChevronLeft,
        ChevronRight,
        Loader2,
        Pencil,
        Trash,
        UserPlus,
        Eye,
        ToggleLeft,
        ToggleRight,
        ArrowLeft
    } from '@lucide/svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';

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

    // Mock Data - substituir por dados reais do +page.server.ts
    const mockForms = [
        {
            id: 1,
            title: 'Relatório Semanal de Atividades',
            description: 'Formulário para registrar atividades semanais da equipe',
            is_active: true,
            created_at: '2025-01-15T10:30:00',
            updated_at: '2025-01-28T14:20:00',
            created_by: 'João Silva',
            field_count: 8,
            response_count: 24,
            assignment_count: 15
        },
        {
            id: 2,
            title: 'Checklist de Segurança',
            description: 'Verificação diária de itens de segurança no local de trabalho',
            is_active: true,
            created_at: '2025-01-10T14:00:00',
            updated_at: '2025-01-25T09:15:00',
            created_by: 'Maria Santos',
            field_count: 12,
            response_count: 156,
            assignment_count: 32
        },
        {
            id: 3,
            title: 'Avaliação de Fornecedor',
            description: 'Formulário para avaliar qualidade e pontualidade de fornecedores',
            is_active: true,
            created_at: '2025-01-08T09:15:00',
            updated_at: '2025-01-20T11:00:00',
            created_by: 'João Silva',
            field_count: 6,
            response_count: 8,
            assignment_count: 5
        },
        {
            id: 4,
            title: 'Solicitação de Material',
            description: 'Requisição de materiais para projetos',
            is_active: false,
            created_at: '2024-12-20T11:45:00',
            updated_at: '2025-01-05T16:30:00',
            created_by: 'Carlos Oliveira',
            field_count: 5,
            response_count: 42,
            assignment_count: 0
        },
        {
            id: 5,
            title: 'Feedback de Treinamento',
            description: 'Avaliação pós-treinamento para colaboradores',
            is_active: true,
            created_at: '2025-01-20T16:00:00',
            updated_at: '2025-01-20T16:00:00',
            created_by: 'Ana Costa',
            field_count: 10,
            response_count: 3,
            assignment_count: 20
        },
        {
            id: 6,
            title: 'Registro de Ocorrências',
            description: 'Documentação de incidentes e ocorrências no ambiente de trabalho',
            is_active: true,
            created_at: '2025-01-22T08:00:00',
            updated_at: '2025-01-29T10:45:00',
            created_by: 'João Silva',
            field_count: 15,
            response_count: 7,
            assignment_count: 50
        }
    ];

    let forms = $state(mockForms);
    let isLoading = $state<boolean>(false);
    let deleteDialogOpen = $state<boolean>(false);
    let formToDelete = $state<{ id: number; title: string } | null>(null);

    let search = $derived(page.url.searchParams.get('search') || '');
    let limit = $state<number>(10);
    let totalItems = $state<number>(mockForms.length);
    let currentPage = $derived(Number(page.url.searchParams.get('page')) || 1);

    let searchTimeout: ReturnType<typeof setTimeout>;

    // Estatísticas
    let stats = $derived({
        total: forms.length,
        active: forms.filter(f => f.is_active).length,
        inactive: forms.filter(f => !f.is_active).length,
        totalAssignments: forms.reduce((acc, f) => acc + f.assignment_count, 0)
    });

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

    function formatDate(dateString: string) {
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

    function confirmDelete() {
        if (formToDelete) {
            // TODO: Implementar delete real via form action
            forms = forms.filter(f => f.id !== formToDelete!.id);
            deleteDialogOpen = false;
            formToDelete = null;
        }
    }

    function toggleFormStatus(formId: number) {
        // TODO: Implementar toggle real via form action
        forms = forms.map(f =>
            f.id === formId ? { ...f, is_active: !f.is_active } : f
        );
    }
</script>

<div class="space-y-4">
    <!-- Header -->
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
            <Button onclick={() => goto('/forms/manage/create')}>
                <Plus class="mr-2 size-4" /> Novo Formulário
            </Button>
        </div>
    </div>

    <!-- Stats Cards -->
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

    <!-- Main Table Card -->
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
                                    <div class="flex items-center justify-center gap-2">
                                        <Loader2 class="size-5 animate-spin text-primary" />
                                    </div>
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
                                        {form.created_by}
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
                                        <button
                                            class="cursor-pointer"
                                            onclick={() => toggleFormStatus(form.id)}
                                            title={form.is_active ? 'Clique para desativar' : 'Clique para ativar'}
                                        >
                                            {#if form.is_active}
                                                <Badge class="bg-green-100 text-green-800 hover:bg-green-200">Ativo</Badge>
                                            {:else}
                                                <Badge variant="secondary" class="bg-gray-100 text-gray-600 hover:bg-gray-200">Inativo</Badge>
                                            {/if}
                                        </button>
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

                                                <DropdownMenu.Item onclick={() => goto(`/forms/${form.id}/responses`)}>
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

            {#if totalItems > limit}
                <Pagination.Root count={totalItems} perPage={limit} page={currentPage}>
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
                                    disabled={currentPage * limit >= totalItems}
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

<!-- Delete Confirmation Dialog -->
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
            <AlertDialog.Action
                class={buttonVariants({ variant: "destructive" })}
                onclick={confirmDelete}
            >
                Excluir
            </AlertDialog.Action>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>
