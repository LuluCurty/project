<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { navigating } from '$app/state';
    import { toast } from 'svelte-sonner';

    import {
        Plus, Search, EllipsisVertical, Pencil, Trash,
        ChevronLeft, ChevronRight, LoaderCircle
    } from '@lucide/svelte';

    import * as Table from '$lib/components/ui/table';
    import * as Card from '$lib/components/ui/card';
    import { Badge } from '$lib/components/ui/badge';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import { Button, buttonVariants } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import * as Pagination from "$lib/components/ui/pagination";
    
    import * as AlertDialog from "$lib/components/ui/alert-dialog";

    let { data } = $props();

    interface Users {
        first_name: string;
        last_name: string;
        user_id: number;
        role_name: string;
        telphone: string;
        auth_source: string;
        user_role: string;
        email: string;
        creation_date: Date;
    }

    let users: Users[] = $derived(data.users);
    let pagination = $derived(data.pagination);
    let isLoading = $derived(!!navigating.to);

    let searchTimeout: ReturnType<typeof setTimeout>;
    
    // Referência aos formulários ocultos
    let deleteForms: Record<number, HTMLFormElement> = $state({});

    // --- ESTADO DO DIALOG DE EXCLUSÃO ---
    let isDeleteOpen = $state(false);
    let userToDelete = $state<{id: number, name: string} | null>(null);

    // Função que abre o modal
    function confirmDelete(id: number, name: string) {
        userToDelete = { id, name };
        isDeleteOpen = true;
    }

    // Função que executa a exclusão
    function executeDelete() {
        if (userToDelete && deleteForms[userToDelete.id]) {
            deleteForms[userToDelete.id].requestSubmit();
        }
        isDeleteOpen = false;
    }

    function handleSearchInput(e: Event) {
        const target = e.target as HTMLInputElement;
        const value = target.value;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const url = new URL(page.url);
            url.searchParams.set('search', value);
            url.searchParams.set('page', '1');
            goto(url.toString(), { keepFocus: true, noScroll: true });
        }, 600);
    };

    function handlePageChange(newPage: number) {
        const url = new URL(page.url);
        url.searchParams.set('page', newPage.toString());
        goto(url.toString(), { keepFocus: true });
    };

    function formatDate(date: Date | string) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
</script>

<div class="space-y-4">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
            <h2 class="text-2xl font-bold tracking-tight text-primary">Usuários</h2>
            <p class="text-muted-foreground">Gerencie o acesso e as permissões dos usuários.</p>
        </div>
        <div class="flex w-full items-center gap-2 sm:w-auto">
            <Button onclick={() => goto('/settings/users/create')}>
                <Plus class="mr-2 size-4" /> Adicionar
            </Button>
        </div>
    </div>

    <Card.Root>
        <Card.Header class="pb-3">
            <div class="flex items-center gap-2">
                <div class="relative w-full max-w-sm">
                    <Search class="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por nome ou email..."
                        class="w-full pl-9"
                        defaultValue={page.url.searchParams.get('search') ?? ''}
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
                            <Table.Head>Nome</Table.Head>
                            <Table.Head>Email</Table.Head>
                            <Table.Head>Função / Cargo</Table.Head>
                            <Table.Head>Telefone</Table.Head>
                            <Table.Head>Método</Table.Head>
                            <Table.Head>Criação</Table.Head>
                            <Table.Head class="text-right">Opções</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#if isLoading}
                            <Table.Row>
                                <Table.Cell colspan={7} class="h-24 text-center">
                                    <div class="flex items-center justify-center gap-2">
                                        <LoaderCircle class="size-5 animate-spin text-primary" />
                                        <span class="text-muted-foreground">Carregando...</span>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        {:else if users.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={7} class="h-24 text-center text-muted-foreground">
                                    Nenhum usuário encontrado.
                                </Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each users as user (user.user_id)}
                                <Table.Row>
                                    <Table.Cell class="font-medium text-muted-foreground">
                                        #{user.user_id}
                                    </Table.Cell>
                                    
                                    <Table.Cell>
                                        <div class="font-medium">
                                            {user.first_name} {user.last_name}
                                        </div>
                                    </Table.Cell>
                                    
                                    <Table.Cell>{user.email}</Table.Cell>
                                    
                                    <Table.Cell>
                                        {#if user.role_name}
                                            <Badge variant="default" class="capitalize font-normal bg-blue-600 hover:bg-blue-700">
                                                {user.role_name}
                                            </Badge>
                                        {:else}
                                            <Badge variant="secondary" class="capitalize font-normal text-muted-foreground">
                                                {user.user_role}
                                            </Badge>
                                        {/if}
                                    </Table.Cell>
                                    
                                    <Table.Cell>{user.telphone || '-'}</Table.Cell>

                                    <Table.Cell>
                                        {user.auth_source}
                                    </Table.Cell>

                                    <Table.Cell class="text-muted-foreground text-xs">
                                        {formatDate(user.creation_date)}
                                    </Table.Cell>
                                    
                                    <Table.Cell class="text-right">
                                        
                                        <form 
                                            action="?/delete" 
                                            method="POST"
                                            use:enhance={() => {
                                                return async ({ result, update }) => {
                                                    if (result.type === 'success') {
                                                        toast.success('Usuário excluído.');
                                                        update();
                                                    } else if (result.type === 'failure') {
                                                        toast.error(String(result.data?.error) || 'Erro ao excluir.');
                                                    }
                                                };
                                            }}
                                            bind:this={deleteForms[user.user_id]}
                                            class="hidden"
                                        >
                                            <input type="hidden" name="id" value={user.user_id}>
                                        </form>

                                        <DropdownMenu.Root>
                                            <DropdownMenu.Trigger class={buttonVariants({ variant: "ghost", size: "icon"}) + " size-8"}>
                                                <EllipsisVertical class="size-4" />
                                                <span class="sr-only">Opções</span>
                                            </DropdownMenu.Trigger>

                                            <DropdownMenu.Content align="end">
                                                <DropdownMenu.Item onclick={() => goto(`/settings/users/${user.user_id}`)}>
                                                    <Pencil class="mr-2 size-4"/> Editar
                                                </DropdownMenu.Item>
                                                
                                                <DropdownMenu.Item 
                                                    class="text-destructive focus:text-destructive cursor-pointer"
                                                    onclick={() => confirmDelete(user.user_id, `${user.first_name} ${user.last_name}`)}
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

            {#if pagination.totalItems > 0}
                <div class="mt-4">
                    <Pagination.Root count={pagination.totalItems} perPage={pagination.limit} page={pagination.page}>
                        {#snippet children({ pages, currentPage })}
                            <Pagination.Content>
                                <Pagination.Item>
                                    <Pagination.PrevButton class="cursor-pointer" disabled={currentPage <= 1} onclick={() => handlePageChange(currentPage - 1)}>
                                        <ChevronLeft class="size-4"/><span class="hidden sm:block">Anterior</span>
                                    </Pagination.PrevButton>
                                </Pagination.Item>
                                {#each pages as page (page.key)}
                                    {#if page.type === 'ellipsis'}
                                        <Pagination.Item><Pagination.Ellipsis /></Pagination.Item>
                                    {:else}
                                        <Pagination.Item>
                                            <Pagination.Link {page} isActive={currentPage === page.value} onclick={(e)=> { e.preventDefault(); handlePageChange(page.value) }}>
                                                {page.value}
                                            </Pagination.Link>
                                        </Pagination.Item>
                                    {/if}
                                {/each}
                                <Pagination.Item>
                                    <Pagination.NextButton onclick={() => handlePageChange(currentPage + 1)} disabled={currentPage * pagination.limit >= pagination.totalItems} class="cursor-pointer">
                                        <span class="hidden sm:block">Próximo</span><ChevronRight class="size-4" />
                                    </Pagination.NextButton>
                                </Pagination.Item>
                            </Pagination.Content>
                        {/snippet}
                    </Pagination.Root>
                </div>
            {/if}
        </Card.Content>
    </Card.Root>

    <AlertDialog.Root bind:open={isDeleteOpen}>
        <AlertDialog.Content>
            <AlertDialog.Header>
                <AlertDialog.Title>Você tem certeza absoluta?</AlertDialog.Title>
                <AlertDialog.Description>
                    Essa ação não pode ser desfeita. Isso excluirá permanentemente o usuário
                    <span class="font-bold text-foreground">{userToDelete?.name}</span>
                    e removerá todos os seus dados.
                </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
                <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
                <AlertDialog.Action 
                    class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onclick={executeDelete}
                >
                    Sim, excluir usuário
                </AlertDialog.Action>
            </AlertDialog.Footer>
        </AlertDialog.Content>
    </AlertDialog.Root>
</div>