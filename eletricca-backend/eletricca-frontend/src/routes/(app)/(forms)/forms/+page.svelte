<script lang="ts">
	import {
		Search,
		EllipsisVertical,
		FileText,
		ClipboardList,
		ChevronLeft,
		ChevronRight,
		LoaderCircle as Loader2,
		Eye,
		PenLine,
		Settings,
		ClipboardCheck,
		CircleAlert as AlertCircle
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import * as Table from '$lib/components/ui/table/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let isLoading = $state(false);
	let searchValue = $state(data.search || '');
	let searchTimeout: ReturnType<typeof setTimeout>;

	function handleSearchInput(e: Event) {
		const target = e.target as HTMLInputElement;
		searchValue = target.value;

		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			const url = new URL(page.url);
			url.searchParams.set('search', searchValue);
			url.searchParams.set('page', '1');
			goto(url.toString(), { keepFocus: true, noScroll: true });
		}, 500);
	}

	function handlePageChange(newPage: number) {
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
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h2 class="text-2xl font-bold tracking-tight text-primary">Formulários</h2>
			<p class="text-muted-foreground">Visualize e gerencie todos os formulários do sistema</p>
		</div>

		<div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
			<Button variant="outline" onclick={() => goto('/forms/view')}>
				<Eye class="mr-2 size-4" /> Respostas
			</Button>
			<Button variant="outline" onclick={() => goto('/forms/assigned')}>
				<ClipboardList class="mr-2 size-4" />
				<span class="hidden sm:inline">Meus</span> Atribuídos
				{#if data.stats.pendingAssignments > 0}
					<Badge variant="destructive" class="ml-2">{data.stats.pendingAssignments}</Badge>
				{/if}
			</Button>
			<Button onclick={() => goto('/forms/manage')}>
				<Settings class="mr-2 size-4" /> Gerenciar
			</Button>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Total de Formulários</p>
						<p class="text-2xl font-bold">{data.stats.totalForms}</p>
					</div>
					<div class="rounded-full bg-muted p-3">
						<FileText class="size-5 text-muted-foreground" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Formulários Ativos</p>
						<p class="text-2xl font-bold text-green-600">{data.stats.activeForms}</p>
					</div>
					<div class="rounded-full bg-green-100 p-3">
						<ClipboardCheck class="size-5 text-green-600" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Total de Respostas</p>
						<p class="text-2xl font-bold text-blue-600">{data.stats.totalResponses}</p>
					</div>
					<div class="rounded-full bg-blue-100 p-3">
						<PenLine class="size-5 text-blue-600" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root
			class={data.stats.pendingAssignments > 0 ? 'border-amber-200 bg-amber-50/50' : ''}
		>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Pendentes (Você)</p>
						<p class="text-2xl font-bold" class:text-amber-600={data.stats.pendingAssignments > 0}>
							{data.stats.pendingAssignments}
						</p>
					</div>
					<div
						class="rounded-full p-3"
						class:bg-amber-100={data.stats.pendingAssignments > 0}
						class:bg-muted={data.stats.pendingAssignments === 0}
					>
						<AlertCircle
							class="size-5 {data.stats.pendingAssignments > 0 ? 'text-amber-600' : 'text-muted-foreground'}"
						/>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Main Table Card -->
	<Card.Root>
		<Card.Header class="pb-3">
			<div class="flex items-center gap-2">
				<div class="relative w-full max-w-sm">
					<Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Buscar formulário..."
						class="w-full pl-9"
						value={searchValue}
						oninput={handleSearchInput}
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
							<Table.Head class="w-[50px]">ID</Table.Head>
							<Table.Head>Título</Table.Head>
							<Table.Head class="hidden lg:table-cell">Descrição</Table.Head>
							<Table.Head class="text-center">Campos</Table.Head>
							<Table.Head class="text-center">Respostas</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
							<Table.Head class="hidden md:table-cell">Criado em</Table.Head>
							<Table.Head class="text-right">Ações</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if isLoading}
							<Table.Row>
								<Table.Cell colspan={8} class="h-24 text-center">
									<div class="flex items-center justify-center gap-2">
										<Loader2 class="size-5 animate-spin text-primary" />
									</div>
								</Table.Cell>
							</Table.Row>
						{:else if data.forms.length === 0}
							<Table.Row>
								<Table.Cell colspan={8} class="h-24 text-center text-muted-foreground">
									{#if data.search}
										Nenhum formulário encontrado para "{data.search}"
									{:else}
										Nenhum formulário cadastrado
									{/if}
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each data.forms as form (form.id)}
								<Table.Row
									class="cursor-pointer hover:bg-muted/50"
									onclick={() => goto(`/forms/manage/${form.id}`)}
								>
									<Table.Cell class="font-medium text-muted-foreground">#{form.id}</Table.Cell>
									<Table.Cell class="font-medium">{form.title}</Table.Cell>
									<Table.Cell
										class="hidden max-w-[250px] truncate text-muted-foreground lg:table-cell"
										title={form.description}
									>
										{form.description || '-'}
									</Table.Cell>
									<Table.Cell class="text-center">
										<Badge variant="outline">{form.field_count}</Badge>
									</Table.Cell>
									<Table.Cell class="text-center">
										<Badge variant="secondary">{form.response_count}</Badge>
									</Table.Cell>
									<Table.Cell class="text-center">
										{#if form.is_active}
											<Badge class="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>
										{:else}
											<Badge variant="secondary" class="bg-gray-100 text-gray-600">Inativo</Badge>
										{/if}
									</Table.Cell>
									<Table.Cell class="hidden text-muted-foreground md:table-cell">
										{formatDate(form.created_at)}
									</Table.Cell>
									<Table.Cell class="text-right">
										<DropdownMenu.Root>
											<DropdownMenu.Trigger
												class={buttonVariants({ variant: 'ghost', size: 'icon' }) + ' size-8'}
												onclick={(e: MouseEvent) => e.stopPropagation()}
											>
												<EllipsisVertical class="size-4" />
												<span class="sr-only">Abrir menu</span>
											</DropdownMenu.Trigger>

											<DropdownMenu.Content align="end">
												<DropdownMenu.Item onclick={() => goto(`/forms/manage/${form.id}`)}>
													<Eye class="mr-2 size-4" /> Ver Detalhes
												</DropdownMenu.Item>
												<DropdownMenu.Item
													onclick={() => goto(`/forms/manage/${form.id}/responses`)}
												>
													<PenLine class="mr-2 size-4" /> Ver Respostas
												</DropdownMenu.Item>
												<DropdownMenu.Item
													onclick={() => goto(`/forms/manage/${form.id}/assign`)}
												>
													<ClipboardList class="mr-2 size-4" /> Atribuir
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

			<!-- Mobile Cards -->
			<div class="space-y-3 sm:hidden">
				{#if data.forms.length === 0}
					<div class="py-8 text-center text-muted-foreground">
						{#if data.search}
							Nenhum formulário encontrado para "{data.search}"
						{:else}
							Nenhum formulário cadastrado
						{/if}
					</div>
				{:else}
					{#each data.forms as form (form.id)}
						<button
							type="button"
							class="w-full rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/50"
							onclick={() => goto(`/forms/manage/${form.id}`)}
						>
							<div class="mb-2 flex items-start justify-between gap-2">
								<div class="min-w-0 flex-1">
									<p class="font-medium">{form.title}</p>
									{#if form.description}
										<p class="line-clamp-1 text-sm text-muted-foreground">{form.description}</p>
									{/if}
								</div>
								{#if form.is_active}
									<Badge class="shrink-0 bg-green-100 text-green-800">Ativo</Badge>
								{:else}
									<Badge variant="secondary" class="shrink-0">Inativo</Badge>
								{/if}
							</div>
							<div class="flex items-center gap-4 text-sm text-muted-foreground">
								<span>{form.field_count} campos</span>
								<span>{form.response_count} respostas</span>
								<span class="ml-auto">{formatDate(form.created_at)}</span>
							</div>
						</button>
					{/each}
				{/if}
			</div>

			<!-- Pagination -->
			{#if data.pagination.totalItems > data.pagination.limit}
				<Pagination.Root
					count={data.pagination.totalItems}
					perPage={data.pagination.limit}
					page={data.pagination.page}
				>
					{#snippet children({ pages, currentPage })}
						<Pagination.Content class="mt-4">
							<Pagination.Item>
								<Pagination.PrevButton
									class="cursor-pointer"
									disabled={currentPage <= 1}
									onclick={() => handlePageChange(currentPage - 1)}
								>
									<ChevronLeft class="size-4" />
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
											onclick={(e: MouseEvent) => {
												e.preventDefault();
												handlePageChange(p.value);
											}}
										>
											{p.value}
										</Pagination.Link>
									</Pagination.Item>
								{/if}
							{/each}

							<Pagination.Item>
								<Pagination.NextButton
									onclick={() => handlePageChange(currentPage + 1)}
									disabled={currentPage * data.pagination.limit >= data.pagination.totalItems}
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
