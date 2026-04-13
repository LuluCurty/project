<script lang="ts">
	import {
		ArrowLeft,
		Calendar,
		FileText,
		User,
		CircleCheck as CheckCircle2,
		Download,
		FileUp,
		Hash,
		Type,
		AlignLeft,
		ListChecks,
		CalendarDays,
		ChevronDown,
		Paperclip
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';

	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let { assignment, fields } = data;

	const fieldIcons: Record<string, any> = {
		text:     Type,
		number:   Hash,
		textarea: AlignLeft,
		select:   ChevronDown,
		checkbox: ListChecks,
		date:     CalendarDays,
		file:     Paperclip
	};

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('pt-BR', {
			day: '2-digit', month: 'short', year: 'numeric'
		});
	}

	function formatDateTime(dateStr: string | null): string {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleString('pt-BR', {
			day: '2-digit', month: 'short', year: 'numeric',
			hour: '2-digit', minute: '2-digit'
		});
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024)           return bytes + ' B';
		if (bytes < 1024 * 1024)    return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / 1024 / 1024).toFixed(2) + ' MB';
	}

	function wasFieldVisible(field: any): boolean {
		if (!field.condition_field_id) return true;
		const parentField = fields.find((f: any) => f.id === field.condition_field_id);
		if (!parentField) return true;
		const parentValue = parentField.answer_value;
		if (!parentValue) return false;
		switch (field.condition_operator) {
			case 'equals':     return parentValue === field.condition_value;
			case 'not_equals': return parentValue !== field.condition_value;
			case 'contains':   return parentValue.includes(field.condition_value);
			default:           return true;
		}
	}

	let visibleFields = $derived(fields.filter((f: any) => wasFieldVisible(f)));

	function hasAnswer(field: any): boolean {
		return !!(field.answer_value || field.file);
	}

	const answeredCount = $derived(visibleFields.filter(hasAnswer).length);
</script>

<div class="min-h-screen bg-background">
	<!-- Header fixo -->
	<div class="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
		<div class="mx-auto max-w-2xl px-4 py-3">
			<div class="flex items-center justify-between gap-3">
				<div class="flex min-w-0 items-center gap-2">
					<Button variant="ghost" size="icon" class="shrink-0" onclick={() => goto('/forms/view')}>
						<ArrowLeft class="size-5" />
					</Button>
					<h1 class="truncate text-base font-semibold sm:text-lg">{assignment.title}</h1>
				</div>
				<Badge class="shrink-0 bg-green-100 text-green-800 border-none text-xs">
					<CheckCircle2 class="mr-1 size-3" />
					Respondido
				</Badge>
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-10">

		<!-- Info Card -->
		<Card.Root class="border-green-200/60 bg-green-50/40">
			<Card.Content class="p-4">
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
					{#if assignment.period_reference}
						<div class="flex items-center gap-3">
							<div class="shrink-0 rounded-lg bg-primary/10 p-2">
								<FileText class="size-4 text-primary" />
							</div>
							<div class="min-w-0">
								<p class="text-xs text-muted-foreground">Período</p>
								<p class="truncate text-sm font-medium">{assignment.period_reference}</p>
							</div>
						</div>
					{/if}
					<div class="flex items-center gap-3">
						<div class="shrink-0 rounded-lg bg-green-500/10 p-2">
							<Calendar class="size-4 text-green-600" />
						</div>
						<div class="min-w-0">
							<p class="text-xs text-muted-foreground">Enviado em</p>
							<p class="truncate text-sm font-medium">{formatDateTime(assignment.submitted_at)}</p>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<div class="shrink-0 rounded-lg bg-blue-500/10 p-2">
							<User class="size-4 text-blue-600" />
						</div>
						<div class="min-w-0">
							<p class="text-xs text-muted-foreground">Atribuído por</p>
							<p class="truncate text-sm font-medium">{assignment.assigned_by_name}</p>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Contagem rápida -->
		<div class="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-sm">
			<div class="flex items-center gap-2 text-muted-foreground">
				<ListChecks class="size-4 shrink-0" />
				<span>{visibleFields.length} pergunta{visibleFields.length !== 1 ? 's' : ''}</span>
			</div>
			<span class="font-medium text-green-600">
				{answeredCount} respondida{answeredCount !== 1 ? 's' : ''}
			</span>
		</div>

		<!-- Respostas -->
		<div class="space-y-3">
			{#each visibleFields as field, index (field.id)}
				{@const FieldIcon = fieldIcons[field.field_type] ?? Type}
				{@const answered = hasAnswer(field)}

				<Card.Root class="overflow-hidden {!answered ? 'border-dashed opacity-60' : ''}">
					<div class="flex">
						<!-- Coluna do número -->
						<div class="flex w-10 shrink-0 flex-col items-center justify-start gap-1 border-r bg-muted/30 py-4 sm:w-12">
							<span class="text-base font-bold text-primary leading-none">{index + 1}</span>
							<FieldIcon class="size-3 text-muted-foreground" />
						</div>

						<!-- Conteúdo -->
						<div class="min-w-0 flex-1 p-3 sm:p-4">
							<!-- Cabeçalho do campo -->
							<div class="mb-2.5 flex items-start justify-between gap-2">
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium leading-snug">
										{field.label}
										{#if field.is_required}
											<span class="text-destructive ml-0.5">*</span>
										{/if}
									</p>
								</div>
								{#if answered}
									<CheckCircle2 class="mt-0.5 size-4 shrink-0 text-green-500" />
								{/if}
							</div>

							<!-- Resposta -->
							<div class="rounded-md bg-muted/40 px-3 py-2.5">
								{#if field.file}
									<!-- Arquivo enviado via S3 -->
									<div class="flex items-center gap-3">
										<div class="shrink-0 rounded-md bg-primary/10 p-2">
											<FileUp class="size-4 text-primary" />
										</div>
										<div class="min-w-0 flex-1">
											<p class="truncate text-sm font-medium">{field.file.file_name}</p>
											<p class="text-xs text-muted-foreground">{formatFileSize(field.file.file_size)}</p>
										</div>
										{#if field.file.file_url}
											<a
												href={field.file.file_url}
												target="_blank"
												rel="noopener noreferrer"
												class="shrink-0"
											>
												<Button variant="outline" size="sm" class="h-8 px-2.5">
													<Download class="size-3.5 sm:mr-1.5" />
													<span class="hidden sm:inline text-xs">Baixar</span>
												</Button>
											</a>
										{:else}
											<span class="text-xs text-muted-foreground shrink-0">Indisponível</span>
										{/if}
									</div>

								{:else if field.field_type === 'checkbox' && field.answer_value}
									<!-- Múltipla escolha -->
									<div class="flex flex-wrap gap-1.5">
										{#each field.answer_value.split(',').filter(Boolean) as option}
											<span class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
												<CheckCircle2 class="size-3" />{option}
											</span>
										{/each}
									</div>

								{:else if field.field_type === 'select' && field.answer_value}
									<!-- Seleção única -->
									<Badge variant="secondary" class="font-normal text-xs">
										{field.answer_value}
									</Badge>

								{:else if field.field_type === 'textarea' && field.answer_value}
									<!-- Texto longo -->
									<p class="whitespace-pre-wrap text-sm leading-relaxed">{field.answer_value}</p>

								{:else if field.field_type === 'date' && field.answer_value}
									<!-- Data -->
									<div class="flex items-center gap-2">
										<CalendarDays class="size-4 shrink-0 text-muted-foreground" />
										<span class="text-sm font-medium">{formatDate(field.answer_value)}</span>
									</div>

								{:else if field.answer_value}
									<!-- Texto / Número -->
									<p class="text-sm">{field.answer_value}</p>

								{:else}
									<!-- Não respondido -->
									<p class="text-sm italic text-muted-foreground">Não respondido</p>
								{/if}
							</div>
						</div>
					</div>
				</Card.Root>
			{/each}
		</div>

		<!-- Rodapé -->
		<div class="flex justify-center pt-2">
			<Button variant="outline" size="sm" onclick={() => goto('/forms/view')}>
				<ArrowLeft class="mr-2 size-4" />
				Voltar para Minhas Respostas
			</Button>
		</div>
	</div>
</div>
