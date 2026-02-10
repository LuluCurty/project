<script lang="ts">
	import {
		Search,
		FileText,
		ClipboardList,
		ChevronLeft,
		ChevronRight,
		Eye,
		Calendar,
		CircleCheck as CheckCircle2,
		Clock,
		ArrowLeft,
		FileCheck
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/';
	import * as Pagination from '$lib/components/ui/pagination/index.js';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Valores padrão seguros para stats
	let stats = $derived(data.stats ?? { totalResponses: 0, pendingForms: 0, uniqueForms: 0 });
	let responses = $derived(data.responses ?? []);
	let pagination = $derived(data.pagination ?? { page: 1, limit: 12, totalItems: 0, totalPages: 1 });

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

	function formatDate(dateString: string | null) {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleDateString('pt-br', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function formatDateTime(dateString: string | null) {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleDateString('pt-br', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
		<div class="flex items-start gap-3">
			<Button variant="ghost" size="icon" class="mt-0.5 shrink-0" onclick={() => goto('/forms')}>
				<ArrowLeft class="size-5" />
			</Button>
			<div>
				<h2 class="text-2xl font-bold tracking-tight text-primary">Minhas Respostas</h2>
				<p class="text-muted-foreground">Visualize todos os formulários que você respondeu</p>
			</div>
		</div>

		<div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
			<Button variant="outline" onclick={() => goto('/forms/assigned')}>
				<ClipboardList class="mr-2 size-4" />
				Pendentes
				{#if stats.pendingForms > 0}
					<Badge variant="destructive" class="ml-2">{stats.pendingForms}</Badge>
				{/if}
			</Button>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid gap-4 sm:grid-cols-3">
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Total de Respostas</p>
						<p class="text-2xl font-bold">{stats.totalResponses}</p>
					</div>
					<div class="rounded-full bg-muted p-3">
						<FileCheck class="size-5 text-muted-foreground" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Formulários Únicos</p>
						<p class="text-2xl font-bold text-blue-600">{stats.uniqueForms}</p>
					</div>
					<div class="rounded-full bg-blue-100 p-3">
						<FileText class="size-5 text-blue-600" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class={stats.pendingForms > 0 ? 'border-amber-200 bg-amber-50/50' : ''}>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Pendentes</p>
						<p
							class="text-2xl font-bold"
							class:text-amber-600={stats.pendingForms > 0}
						>
							{stats.pendingForms}
						</p>
					</div>
					<div
						class="rounded-full p-3"
						class:bg-amber-100={stats.pendingForms > 0}
						class:bg-muted={stats.pendingForms === 0}
					>
						<Clock
							class="size-5 {stats.pendingForms > 0 ? 'text-amber-600' : 'text-muted-foreground'}"
						/>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Main Card -->
	<Card.Root>
		<Card.Header class="pb-3">
			<div class="flex items-center gap-2">
				<div class="relative w-full max-w-sm">
					<Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Buscar por formulário ou período..."
						class="w-full pl-9"
						value={searchValue}
						oninput={handleSearchInput}
					/>
				</div>
			</div>
		</Card.Header>

		<Card.Content>
			{#if data.responses.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<div class="rounded-full bg-muted p-4">
						<FileText class="size-8 text-muted-foreground" />
					</div>
					<h3 class="mt-4 text-lg font-medium">Nenhuma resposta encontrada</h3>
					<p class="mt-1 text-sm text-muted-foreground">
						{#if data.search}
							Nenhum resultado para "{data.search}"
						{:else}
							Você ainda não respondeu nenhum formulário
						{/if}
					</p>
					{#if stats.pendingForms > 0}
						<Button class="mt-4" onclick={() => goto('/forms/assigned')}>
							Ver Formulários Pendentes
						</Button>
					{/if}
				</div>
			{:else}
				<!-- Grid de Cards -->
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each data.responses as response (response.response_id)}
						<button
							type="button"
							class="group relative flex flex-col rounded-lg border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-md"
							onclick={() => goto(`/forms/view/${response.assignment_id}`)}
						>
							<!-- Badge de status -->
							<div class="absolute right-3 top-3">
								<Badge class="bg-green-100 text-green-800">
									<CheckCircle2 class="mr-1 size-3" />
									Respondido
								</Badge>
							</div>

							<!-- Título e descrição -->
							<div class="mb-3 pr-24">
								<h3 class="font-semibold leading-tight group-hover:text-primary">
									{response.form_title}
								</h3>
								{#if response.form_description}
									<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
										{response.form_description}
									</p>
								{/if}
							</div>

							<!-- Período de referência -->
							{#if response.period_reference}
								<div class="mb-3">
									<Badge variant="outline" class="font-normal">
										{response.period_reference}
									</Badge>
								</div>
							{/if}

							<!-- Info footer -->
							<div class="mt-auto flex flex-col gap-2 border-t pt-3 text-xs text-muted-foreground">
								<div class="flex items-center gap-4">
									<div class="flex items-center gap-1.5">
										<Calendar class="size-3.5" />
										<span>Enviado: {formatDateTime(response.submitted_at)}</span>
									</div>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-muted-foreground/70">
										Por: {response.assigned_by_name}
									</span>
									<span class="flex items-center gap-1 text-primary opacity-0 transition-opacity group-hover:opacity-100">
										<Eye class="size-3.5" />
										Ver
									</span>
								</div>
							</div>
						</button>
					{/each}
				</div>

				<!-- Pagination -->
				{#if data.pagination.totalItems > data.pagination.limit}
					<Pagination.Root
						count={data.pagination.totalItems}
						perPage={data.pagination.limit}
						page={data.pagination.page}
					>
						{#snippet children({ pages, currentPage })}
							<Pagination.Content class="mt-6">
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
			{/if}
		</Card.Content>
	</Card.Root>
</div>
