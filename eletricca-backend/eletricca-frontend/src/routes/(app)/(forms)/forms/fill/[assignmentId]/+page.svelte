<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Save,
		ArrowLeft,
		Calendar,
		FileUp,
		LoaderCircle as Loader2,
		CircleAlert as AlertCircle,
		Clock,
		User,
		FileText,
		CircleCheck as CheckCircle2,
		Upload,
		X,
		CloudOff,
		Check
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';

	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let { assignment, fields } = data;

	let isSubmitting = $state(false);

	// Estado para guardar as respostas (para lógica condicional)
	let answers = $state<Record<number, any>>({});

	// ========== AUTO-SAVE COM LOCALSTORAGE ==========
	const STORAGE_KEY = `form_draft_${assignment.id}`;
	let draftStatus = $state<'idle' | 'saving' | 'saved' | 'restored'>('idle');
	let saveTimeout: ReturnType<typeof setTimeout>;
	let hasDraft = $state(false);

	// Carregar rascunho salvo ao montar
	onMount(() => {
		if (browser) {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				try {
					const parsed = JSON.parse(saved);
					answers = parsed.answers || {};
					hasDraft = true;
					draftStatus = 'restored';
					// Esconder indicador após 3s
					setTimeout(() => {
						if (draftStatus === 'restored') draftStatus = 'idle';
					}, 3000);
				} catch (e) {
					console.error('Erro ao restaurar rascunho:', e);
					localStorage.removeItem(STORAGE_KEY);
				}
			}
		}
	});

	// Salvar rascunho automaticamente (debounced)
	function saveDraft() {
		if (!browser) return;
		clearTimeout(saveTimeout);
		draftStatus = 'saving';
		saveTimeout = setTimeout(() => {
			try {
				const draft = {
					answers,
					savedAt: new Date().toISOString()
				};
				localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
				draftStatus = 'saved';
				hasDraft = true;
				// Voltar para idle após 2s
				setTimeout(() => {
					if (draftStatus === 'saved') draftStatus = 'idle';
				}, 2000);
			} catch (e) {
				console.error('Erro ao salvar rascunho:', e);
			}
		}, 500); // Debounce de 500ms
	}

	// Limpar rascunho após envio bem-sucedido
	function clearDraft() {
		if (browser) {
			localStorage.removeItem(STORAGE_KEY);
			hasDraft = false;
		}
	}

	// Observar mudanças nas respostas para auto-save
	$effect(() => {
		// Acessa answers para criar dependência reativa
		const _ = JSON.stringify(answers);
		if (browser && Object.keys(answers).length > 0) {
			saveDraft();
		}
	});

	// Estado para arquivos selecionados (preview)
	let selectedFiles = $state<Record<number, File | null>>({});

	// Formatação de data
	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		return date.toLocaleDateString('pt-BR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	// Verificar se está atrasado
	function isOverdue(dueDate: string | null): boolean {
		if (!dueDate) return false;
		return new Date(dueDate) < new Date();
	}

	// Dias restantes
	function getDaysRemaining(dueDate: string | null): number | null {
		if (!dueDate) return null;
		const diff = new Date(dueDate).getTime() - new Date().getTime();
		return Math.ceil(diff / (1000 * 60 * 60 * 24));
	}

	// Lógica condicional - verificar se campo deve aparecer
	function isFieldVisible(field: any): boolean {
		if (!field.condition_field_id) return true;

		const parentValue = answers[field.condition_field_id];

		if (parentValue === undefined || parentValue === null || parentValue === '') return false;

		const conditionVal = field.condition_value;

		switch (field.condition_operator) {
			case 'equals':
				return parentValue.toString() === conditionVal;
			case 'not_equals':
				return parentValue.toString() !== conditionVal;
			case 'contains':
				return parentValue.toString().includes(conditionVal);
			default:
				return true;
		}
	}

	// Contar campos visíveis e preenchidos
	let visibleFields = $derived(fields.filter((f) => isFieldVisible(f)));
	let filledCount = $derived(
		visibleFields.filter((f) => {
			const val = answers[f.id];
			if (val === undefined || val === null) return false;
			if (typeof val === 'string' && val.trim() === '') return false;
			return true;
		}).length
	);

	// Handler para arquivo
	function handleFileChange(fieldId: number, event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			selectedFiles[fieldId] = input.files[0];
		}
	}

	function removeFile(fieldId: number) {
		selectedFiles[fieldId] = null;
		const input = document.getElementById(`field_${fieldId}`) as HTMLInputElement;
		if (input) input.value = '';
	}

	// Validação de campos obrigatórios (checkbox não suporta required nativo)
	let validationErrors = $state<Record<number, string>>({});

	function validateForm(): boolean {
		const errors: Record<number, string> = {};

		for (const field of visibleFields) {
			if (!field.is_required) continue;

			const val = answers[field.id];

			if (field.field_type === 'checkbox') {
				if (!val || String(val).trim() === '') {
					errors[field.id] = 'Selecione pelo menos uma opção.';
				}
			}
		}

		validationErrors = errors;
		if (Object.keys(errors).length > 0) {
			// Scroll até o primeiro campo com erro
			const firstErrorId = Object.keys(errors)[0];
			const el = document.getElementById(`field_${firstErrorId}`);
			el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			return false;
		}
		return true;
	}

	// Dias restantes computado
	let daysRemaining = $derived(getDaysRemaining(assignment.due_date));
</script>

<div class="min-h-screen bg-background pb-24 lg:pb-6">
	<!-- Header fixo no mobile -->
	<div
		class="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
	>
		<div class="mx-auto max-w-3xl px-4 py-4">
			<div class="flex items-start justify-between gap-4">
				<div class="flex items-start gap-3">
					<Button
						variant="ghost"
						size="icon"
						class="mt-0.5 shrink-0"
						onclick={() => goto('/forms/assigned')}
					>
						<ArrowLeft class="size-5" />
					</Button>
					<div class="min-w-0">
						<h1 class="truncate text-lg font-semibold sm:text-xl">{assignment.title}</h1>
						{#if assignment.description}
							<p class="line-clamp-2 text-sm text-muted-foreground">{assignment.description}</p>
						{/if}
					</div>
				</div>

				<!-- Progress badge desktop + Draft status -->
				<div class="hidden shrink-0 items-center gap-2 sm:flex">
					{#if draftStatus === 'saving'}
						<span class="flex items-center gap-1 text-xs text-muted-foreground">
							<Loader2 class="size-3 animate-spin" />
							Salvando...
						</span>
					{:else if draftStatus === 'saved'}
						<span class="flex items-center gap-1 text-xs text-green-600">
							<Check class="size-3" />
							Salvo
						</span>
					{:else if draftStatus === 'restored'}
						<span class="flex items-center gap-1 text-xs text-amber-600">
							<CloudOff class="size-3" />
							Rascunho restaurado
						</span>
					{/if}
					<Badge variant="outline" class="gap-1.5">
						<CheckCircle2 class="size-3.5" />
						{filledCount}/{visibleFields.length}
					</Badge>
				</div>
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-3xl space-y-4 px-4 py-4 sm:py-6">
		<!-- Info Card -->
		<Card.Root class="border-muted bg-muted/30">
			<Card.Content class="p-4">
				<div class="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
					{#if assignment.period_reference}
						<div class="flex items-center gap-2 text-muted-foreground">
							<FileText class="size-4" />
							<span>{assignment.period_reference}</span>
						</div>
					{/if}

					{#if assignment.due_date}
						<div
							class="flex items-center gap-2"
							class:text-destructive={isOverdue(assignment.due_date)}
							class:text-muted-foreground={!isOverdue(assignment.due_date)}
						>
							<Calendar class="size-4" />
							<span>
								{formatDate(assignment.due_date)}
								{#if daysRemaining !== null}
									{#if daysRemaining < 0}
										<span class="font-medium text-destructive">
											({Math.abs(daysRemaining)} dias atrasado)
										</span>
									{:else if daysRemaining === 0}
										<span class="font-medium text-amber-600">(Hoje)</span>
									{:else if daysRemaining <= 3}
										<span class="font-medium text-amber-600">({daysRemaining} dias)</span>
									{:else}
										<span class="text-muted-foreground">({daysRemaining} dias)</span>
									{/if}
								{/if}
							</span>
						</div>
					{/if}

					<!-- Progress mobile -->
					<div class="flex items-center gap-2 text-muted-foreground sm:hidden">
						<CheckCircle2 class="size-4" />
						<span>{filledCount} de {visibleFields.length} campos</span>
					</div>

					<!-- Draft status mobile -->
					{#if draftStatus !== 'idle'}
						<div class="flex items-center gap-2 sm:hidden">
							{#if draftStatus === 'saving'}
								<Loader2 class="size-3 animate-spin text-muted-foreground" />
								<span class="text-xs text-muted-foreground">Salvando...</span>
							{:else if draftStatus === 'saved'}
								<Check class="size-3 text-green-600" />
								<span class="text-xs text-green-600">Salvo</span>
							{:else if draftStatus === 'restored'}
								<CloudOff class="size-3 text-amber-600" />
								<span class="text-xs text-amber-600">Rascunho restaurado</span>
							{/if}
						</div>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Error Alert -->
		{#if form?.error}
			<div
				class="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive"
			>
				<AlertCircle class="size-5 shrink-0" />
				<p class="text-sm font-medium">{form.error}</p>
			</div>
		{/if}

		<!-- Form -->
		<form
			method="POST"
			action="?/submit"
			enctype="multipart/form-data"
			use:enhance={({ cancel }) => {
				if (!validateForm()) {
					cancel();
					return;
				}
				isSubmitting = true;
				return async ({ result, update }) => {
					isSubmitting = false;
					// Limpar rascunho se enviou com sucesso (redirect = sucesso)
					if (result.type === 'redirect') {
						clearDraft();
					}
					await update();
				};
			}}
		>
			<Card.Root>
				<Card.Content class="space-y-6 p-4 sm:p-6">
					{#each fields as field, index (field.id)}
						{#if isFieldVisible(field)}
							<div
								class="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300"
								class:pt-4={index > 0}
								class:border-t={index > 0}
							>
								<Label for={`field_${field.id}`} class="flex items-start gap-1 text-sm font-medium">
									<span>{field.label}</span>
									{#if field.is_required}
										<span class="text-destructive">*</span>
									{/if}
								</Label>

								<!-- Text / Number -->
								{#if field.field_type === 'text' || field.field_type === 'number'}
									<Input
										type={field.field_type}
										name={`field_${field.id}`}
										id={`field_${field.id}`}
										placeholder={field.placeholder || ''}
										required={field.is_required}
										bind:value={answers[field.id]}
										class="h-11"
									/>

									<!-- Textarea -->
								{:else if field.field_type === 'textarea'}
									<Textarea
										name={`field_${field.id}`}
										id={`field_${field.id}`}
										placeholder={field.placeholder || ''}
										required={field.is_required}
										bind:value={answers[field.id]}
										rows={4}
										class="resize-none"
									/>

									<!-- Date -->
								{:else if field.field_type === 'date'}
									<Input
										type="date"
										name={`field_${field.id}`}
										id={`field_${field.id}`}
										required={field.is_required}
										bind:value={answers[field.id]}
										class="h-11"
									/>

									<!-- Select (Radio Buttons) -->
								{:else if field.field_type === 'select'}
									<input type="hidden" name={`field_${field.id}`} value={answers[field.id] || ''} />
									<div
										id={`field_${field.id}`}
										class="grid gap-3 rounded-lg border p-4 bg-muted/20"
									>
										{#each field.options || [] as option}
											<label
												class="flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/50 {answers[field.id] === option ? 'bg-primary/10 ring-1 ring-primary/30' : ''}"
											>
												<input
													type="radio"
													value={option}
													checked={answers[field.id] === option}
													class="size-4 border-input text-primary accent-primary focus:ring-primary focus:ring-offset-2"
													onchange={() => {
														answers[field.id] = option;
													}}
												/>
												<span class="text-sm">{option}</span>
											</label>
										{/each}
									</div>

									<!-- Checkbox Group -->
								{:else if field.field_type === 'checkbox'}
									<div
										id={`field_${field.id}`}
										class="grid gap-3 rounded-lg border p-4 {validationErrors[field.id] ? 'border-destructive bg-destructive/5' : 'bg-muted/20'}"
									>
										{#each field.options || [] as option}
											<label
												class="flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/50"
											>
												<input
													type="checkbox"
													name={`field_${field.id}`}
													value={option}
													checked={answers[field.id]?.split(',').includes(option) ?? false}
													class="size-4 rounded border-input text-primary accent-primary focus:ring-primary focus:ring-offset-2"
													onchange={(e) => {
														const target = e.target as HTMLInputElement;
														const val = target.value;
														const checked = target.checked;
														const current = answers[field.id]
															? String(answers[field.id]).split(',').filter(Boolean)
															: [];
														if (checked) {
															current.push(val);
														} else {
															const idx = current.indexOf(val);
															if (idx > -1) current.splice(idx, 1);
														}
														answers[field.id] = current.join(',');
														// Limpa erro ao selecionar
														if (validationErrors[field.id] && current.length > 0) {
															delete validationErrors[field.id];
															validationErrors = { ...validationErrors };
														}
													}}
												/>
												<span class="text-sm">{option}</span>
											</label>
										{/each}
									</div>
									{#if validationErrors[field.id]}
										<p class="text-sm text-destructive">{validationErrors[field.id]}</p>
									{/if}

									<!-- File Upload -->
								{:else if field.field_type === 'file'}
									<div class="space-y-2">
										{#if selectedFiles[field.id]}
											<!-- File Preview -->
											<div
												class="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
											>
												<div class="flex items-center gap-3 overflow-hidden">
													<div class="rounded-md bg-primary/10 p-2">
														<FileUp class="size-4 text-primary" />
													</div>
													<div class="min-w-0">
														<p class="truncate text-sm font-medium">
															{selectedFiles[field.id]?.name}
														</p>
														<p class="text-xs text-muted-foreground">
															{(selectedFiles[field.id]?.size || 0 / 1024 / 1024).toFixed(2)} MB
														</p>
													</div>
												</div>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													class="size-8 shrink-0"
													onclick={() => removeFile(field.id)}
												>
													<X class="size-4" />
												</Button>
											</div>
										{:else}
											<!-- Upload Area -->
											<label
												for={`field_${field.id}`}
												class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 p-6 transition-colors hover:border-primary/50 hover:bg-muted/40"
											>
												<div class="rounded-full bg-muted p-3">
													<Upload class="size-5 text-muted-foreground" />
												</div>
												<div class="text-center">
													<p class="text-sm font-medium">Clique para selecionar</p>
													<p class="text-xs text-muted-foreground">ou arraste o arquivo aqui</p>
												</div>
												<p class="text-xs text-muted-foreground">Máximo: 10MB</p>
											</label>
										{/if}
										<input
											type="file"
											name={`field_${field.id}`}
											id={`field_${field.id}`}
											required={field.is_required && !selectedFiles[field.id]}
											class="sr-only"
											onchange={(e) => handleFileChange(field.id, e)}
										/>
									</div>
								{/if}
							</div>
						{/if}
					{/each}
				</Card.Content>
			</Card.Root>

			<!-- Footer Fixo Mobile -->
			<div
				class="fixed inset-x-0 bottom-0 border-t bg-background p-4 lg:relative lg:mt-4 lg:border-0 lg:bg-transparent lg:p-0"
			>
				<div class="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:justify-end">
					<Button
						type="button"
						variant="outline"
						class="order-2 h-11 sm:order-1"
						onclick={() => goto('/forms/assigned')}
					>
						Cancelar
					</Button>
					<Button type="submit" disabled={isSubmitting} class="order-1 h-11 sm:order-2 sm:min-w-40">
						{#if isSubmitting}
							<Loader2 class="mr-2 size-4 animate-spin" />
							Enviando...
						{:else}
							<Save class="mr-2 size-4" />
							Enviar Resposta
						{/if}
					</Button>
				</div>
			</div>
		</form>
	</div>
</div>
