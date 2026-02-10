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
		CircleDot,
		ChevronDown,
		Paperclip
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';

	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let { assignment, fields } = data;

	// Mapa de ícones por tipo de campo
	const fieldIcons: Record<string, any> = {
		text: Type,
		number: Hash,
		textarea: AlignLeft,
		select: ChevronDown,
		checkbox: ListChecks,
		radio: CircleDot,
		date: CalendarDays,
		file: Paperclip
	};

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('pt-BR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function formatDateTime(dateStr: string | null): string {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('pt-BR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / 1024 / 1024).toFixed(2) + ' MB';
	}

	function wasFieldVisible(field: any): boolean {
		if (!field.condition_field_id) return true;
		const parentField = fields.find((f: any) => f.id === field.condition_field_id);
		if (!parentField) return true;
		const parentValue = parentField.answer_value;
		if (!parentValue) return false;
		const conditionVal = field.condition_value;
		switch (field.condition_operator) {
			case 'equals':
				return parentValue === conditionVal;
			case 'not_equals':
				return parentValue !== conditionVal;
			case 'contains':
				return parentValue.includes(conditionVal);
			default:
				return true;
		}
	}

	let visibleFields = $derived(fields.filter((f: any) => wasFieldVisible(f)));

	function getFieldTypeName(type: string): string {
		const names: Record<string, string> = {
			text: 'Texto',
			number: 'Número',
			textarea: 'Texto longo',
			select: 'Seleção',
			checkbox: 'Múltipla escolha',
			radio: 'Escolha única',
			date: 'Data',
			file: 'Arquivo'
		};
		return names[type] || type;
	}

	function hasAnswer(field: any): boolean {
		return !!(field.answer_value || field.file);
	}
</script>

<div class="min-h-screen bg-gradient-to-b from-muted/30 to-background">
	<!-- Header fixo -->
	<div class="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
		<div class="mx-auto max-w-3xl px-4 py-4">
			<div class="flex items-start justify-between gap-4">
				<div class="flex items-start gap-3">
					<Button variant="ghost" size="icon" class="mt-0.5 shrink-0" onclick={() => goto('/forms/view')}>
						<ArrowLeft class="size-5" />
					</Button>
					<div class="min-w-0">
						<h1 class="truncate text-lg font-semibold sm:text-xl">{assignment.title}</h1>
						{#if assignment.description}
							<p class="line-clamp-2 text-sm text-muted-foreground">{assignment.description}</p>
						{/if}
					</div>
				</div>
				<Badge class="shrink-0 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
					<CheckCircle2 class="mr-1 size-3" />
					Respondido
				</Badge>
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-3xl space-y-4 px-4 py-4 sm:py-6">
		<!-- Info Card -->
		<Card.Root class="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
			<Card.Content class="p-4 sm:p-5">
				<div class="grid gap-4 sm:grid-cols-3">
					{#if assignment.period_reference}
						<div class="flex items-center gap-3">
							<div class="rounded-lg bg-primary/10 p-2">
								<FileText class="size-4 text-primary" />
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Período</p>
								<p class="text-sm font-medium">{assignment.period_reference}</p>
							</div>
						</div>
					{/if}
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-green-500/10 p-2">
							<Calendar class="size-4 text-green-600" />
						</div>
						<div>
							<p class="text-xs text-muted-foreground">Enviado em</p>
							<p class="text-sm font-medium">{formatDateTime(assignment.submitted_at)}</p>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-blue-500/10 p-2">
							<User class="size-4 text-blue-600" />
						</div>
						<div>
							<p class="text-xs text-muted-foreground">Atribuído por</p>
							<p class="text-sm font-medium">{assignment.assigned_by_name}</p>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Resumo rápido -->
		<div class="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				<ListChecks class="size-4" />
				<span>{visibleFields.length} pergunta{visibleFields.length !== 1 ? 's' : ''}</span>
			</div>
			<div class="flex items-center gap-2 text-sm">
				<span class="text-green-600 font-medium">
					{visibleFields.filter(hasAnswer).length} respondida{visibleFields.filter(hasAnswer).length !== 1 ? 's' : ''}
				</span>
			</div>
		</div>

		<!-- Respostas -->
		<div class="space-y-3">
			{#each visibleFields as field, index (index)}
				{@const FieldIcon = fieldIcons[field.field_type] || Type}
				{@const answered = hasAnswer(field)}

				<Card.Root class="overflow-hidden transition-all hover:shadow-sm {!answered ? 'border-dashed opacity-60' : ''}">
					<div class="flex">
						<!-- Número da pergunta -->
						<div class="flex w-12 shrink-0 flex-col items-center justify-start border-r bg-muted/30 py-4 sm:w-14">
							<span class="text-lg font-bold text-primary">{index + 1}</span>
							<FieldIcon class="mt-1 size-3.5 text-muted-foreground" />
						</div>

						<!-- Conteúdo -->
						<div class="flex-1 p-4">
							<!-- Cabeçalho da pergunta -->
							<div class="mb-3 flex flex-wrap items-start justify-between gap-2">
								<div class="flex-1">
									<h3 class="font-medium leading-snug text-foreground">
										{field.label}
									</h3>
									<p class="mt-0.5 text-xs text-muted-foreground">
										{getFieldTypeName(field.field_type)}
										{#if field.is_required}
											<span class="text-red-500">*</span>
										{/if}
									</p>
								</div>
								{#if answered}
									<CheckCircle2 class="size-5 shrink-0 text-green-500" />
								{/if}
							</div>

							<!-- Valor da resposta -->
							<div class="rounded-lg bg-muted/40 p-3">
								{#if field.file}
									<!-- Arquivo -->
									<div class="flex items-center gap-3">
										<div class="rounded-md bg-primary/10 p-2.5">
											<FileUp class="size-5 text-primary" />
										</div>
										<div class="min-w-0 flex-1">
											<p class="truncate font-medium">{field.file.file_name}</p>
											<p class="text-xs text-muted-foreground">{formatFileSize(field.file.file_size)}</p>
										</div>
										<Button variant="outline" size="sm" onclick={() => window.open(field.file.file_path, '_blank')}>
											<Download class="mr-2 size-4" />
											Baixar
										</Button>
									</div>
								{:else if field.field_type === 'checkbox' && field.answer_value}
									<!-- Checkbox - Lista com checks -->
									{@const options = field.answer_value.split(',').filter(Boolean)}
									<div class="space-y-2">
										{#each options as option, i}
											<div class="flex items-center gap-2">
												<div class="flex size-5 items-center justify-center rounded bg-green-500/20">
													<CheckCircle2 class="size-3.5 text-green-600" />
												</div>
												<span class="text-sm">{option}</span>
											</div>
										{/each}
									</div>
								{:else if field.field_type === 'radio' && field.answer_value}
									<!-- Radio - Opção selecionada -->
									<div class="flex items-center gap-2">
										<div class="flex size-5 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
											<div class="size-2 rounded-full bg-primary"></div>
										</div>
										<span class="text-sm font-medium">{field.answer_value}</span>
									</div>
								{:else if field.field_type === 'select' && field.answer_value}
									<!-- Select - Opção selecionada -->
									<div class="flex items-center gap-2">
										<Badge variant="secondary" class="font-normal">
											{field.answer_value}
										</Badge>
									</div>
								{:else if field.field_type === 'textarea' && field.answer_value}
									<!-- Textarea -->
									<p class="whitespace-pre-wrap text-sm leading-relaxed">{field.answer_value}</p>
								{:else if field.field_type === 'date' && field.answer_value}
									<!-- Data -->
									<div class="flex items-center gap-2">
										<CalendarDays class="size-4 text-muted-foreground" />
										<span class="text-sm font-medium">{formatDate(field.answer_value)}</span>
									</div>
								{:else if field.answer_value}
									<!-- Texto/Número -->
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

		<!-- Footer -->
		<div class="flex justify-center pb-6 pt-2">
			<Button variant="outline" onclick={() => goto('/forms/view')}>
				<ArrowLeft class="mr-2 size-4" />
				Voltar para Minhas Respostas
			</Button>
		</div>
	</div>
</div>
