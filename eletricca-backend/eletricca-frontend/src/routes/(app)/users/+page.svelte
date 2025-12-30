<script lang="ts">
	import {
		Plus,
		Search,
		EllipsisVertical,
		Pencil,
		Trash,
		ChevronLeft,
		Loader,
		ChevronRight,
		Ellipsis
	} from '@lucide/svelte';
	import { onMount } from 'svelte';
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

	interface User {
		user_id: number;
		first_name: string;
		last_name: string;
		email: string;
		user_role: string;
		telphone: string;
		creation_date: string;
	}

	interface ApiResponse {
		users: User[];
		limit: number;
		ok: boolean;
		page: number;
		totalItems: number;
		totalPages: number;
	}

	let users = $state<User[]>([]);
	let isLoading = $state(true);

	let search = $state('');
	let limit = 10;
	let totalItems = $state(0);
    let currentPage = $derived(Number(page.url.searchParams.get('page')) || 1);

	let searchTimeout: ReturnType<typeof setTimeout>;

	async function getUsers() {
		try {
			isLoading = true;

			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: limit.toString(),
				search: search.toString()
			});

			const res = await fetch(`/api/users?${params.toString()}`, {
				credentials: 'include'
			});

			if (res.status === 401 || res.status === 403) {
				goto('/login');
				return;
			}

			const data: ApiResponse = await res.json();
			users = data.users || [];
			totalItems = data.totalItems || 0;
		} catch (e) {
			console.error(e);
		} finally {
			isLoading = !isLoading;
		}
	};

    $effect(() => {
        const p = currentPage;
        getUsers();
    });

	function handleSearchInput(e: Event) {
		const target = e.target as HTMLInputElement;
		search = target.value;

		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			currentPage = 1;
			getUsers();
		}, 1000);
	};

    function handlePageChange(newPage: string) {
        const url = new URL(page.url);
        url.searchParams.set('page', newPage.toString());
        goto(url.toString(), { keepFocus: true });
    };

	 

	async function deleteUser(id: number, name: string) {
		/*if (!confirm(`Tem certeza que deseja excluir ${name}?`)) return;

		try {
			const res = await fetch(`/api/users/${id}`, {
				method: 'DELETE',
				credentials: 'include'
			});

			if (res.ok) {
				users = users.filter((u) => u.user_id !== id);
				alert('Usuario excluido com sucesso');
			} else {
				alert('Erro ao excluir.');
			}
		} catch (e) {
			console.error(e);
		} */

		alert('Nem tenta, meu caro')
	}
	function formatDate(dateString: string) {
		if (!dateString) return '-';

		return new Date(dateString).toLocaleDateString('pt-br', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
	
</script>

<div class="space-y-4">
	<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h2 class="text-2xl font-bold tracking-tight text-primary">Usuários</h2>
			<p class="text-muted-foreground">Gerencie o acesso e as permissões dos usuarios</p>
		</div>

		<div class="flex w-full items-center gap-2 sm:w-auto">
			<Button onclick={() => goto('/users/create')}>
				<Plus class="mr-2 size-2" /> Adicionar
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
						placeholder="Buscar por nome ou email"
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
							<Table.Head>Nome</Table.Head>
							<Table.Head>Email</Table.Head>
							<Table.Head>Função</Table.Head>
							<Table.Head>Telefone</Table.Head>
							<Table.Head>Criação</Table.Head>
							<Table.Head class="text-right">Opções</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if isLoading}
							<Table.Row>
								<Table.Cell colspan={7} class="h-24 text-center">
									<div class="flex items-center justify-center gap-2">
										<Loader class="size-5 animate-spin text-primary" />
									</div>
								</Table.Cell>
							</Table.Row>
						{:else if users.length === 0}
							<Table.Row>
								<Table.Cell colspan={7} class="h-24 text-center text-muted-foreground">
									Nenhum registro encontrado
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each users as user (user.user_id)}
								<Table.Row>
									<Table.Cell class="font-medium text-muted-foreground">
										#{user.user_id}
									</Table.Cell>
									<Table.Cell class="font-mediumm">
										{user.first_name}
										{user.last_name}
									</Table.Cell>
									<Table.Cell>
										{user.email}
									</Table.Cell>
									<Table.Cell>
										<Badge
											variant={user.user_role === 'admin' ? 'default' : 'secondary'}
											class="text-[10px] uppercase"
										>
											{user.user_role}
										</Badge>
									</Table.Cell>
									<Table.Cell>
										{user.telphone || '-'}
									</Table.Cell>
									<Table.Cell class="text-xs text-muted-foreground">
										{formatDate(user.creation_date)}
									</Table.Cell>
									<Table.Cell class="text-right">
										<DropdownMenu.Root>
											<DropdownMenu.Trigger
                                                class={buttonVariants({ variant: "ghost", size: "icon"}) + " size-8"}
                                            >
												<Button>
													<EllipsisVertical class="size-4" />
													<span class="sr-only">Abrir menu</span>
												</Button>
											</DropdownMenu.Trigger>

                                            <DropdownMenu.Content align="end">
                                                <DropdownMenu.Item
                                                    onclick={() => goto(`/users/edit/${user.user_id}`)}
                                                >
                                                    <Pencil class="mr-2 size-4"/> Editar
                                                </DropdownMenu.Item>
                                                <DropdownMenu.Item 
                                                    class="text-destructive focus:text-destructive"
                                                    onclick={() => deleteUser(user.user_id, user.first_name)}
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

            {#if totalItems > 0}
                <Pagination.Root count={totalItems} perPage={limit} page={currentPage}>
                    {#snippet children({ pages, currentPage })}
                        <Pagination.Content>

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

                            {#each pages as page (page.key)}
                                {#if page.type === 'ellipsis'}
                                    <Pagination.Item>
                                        <Pagination.Ellipsis />
                                    </Pagination.Item>
                                
                                {:else}
                                    <Pagination.Item>
                                        <Pagination.Link 
                                            {page} 
                                            isActive={currentPage === page.value}
                                            onclick={(e)=> {
                                                e.preventDefault();
                                                handlePageChange((page.value).toString())
                                            }}
                                        >
                                            {page.value}
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
                                    <span class="hidden sm:block">Proximo</span>
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