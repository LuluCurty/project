<script lang="ts">
	import {
		ArrowLeft,
		Plus,
		Trash2,
		GripVertical,
		Save,
		Type,
		Hash,
		ListChecks,
		SquareCheck as CheckSquare,
		Calendar,
		TextAlignStart as AlignLeft,
		FileUp,
		ChevronDown,
		ChevronUp,
		Settings2,
		LoaderCircle as Loader2
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';

	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/';
	import { Label } from '$lib/components/ui/label/';
	import { Textarea } from '$lib/components/ui/textarea/';
	import { Switch } from '$lib/components/ui/switch/';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Select from '$lib/components/ui/select/';
	import { Separator } from '$lib/components/ui/separator/';

	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const fieldTypes = [
		{ value: 'text', label: 'Texto', icon: Type },
		{ value: 'number', label: 'Número', icon: Hash },
		{ value: 'select', label: 'Seleção', icon: ListChecks },
		{ value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
		{ value: 'date', label: 'Data', icon: Calendar },
		{ value: 'textarea', label: 'Texto Longo', icon: AlignLeft },
		{ value: 'file', label: 'Arquivo', icon: FileUp }
	];

	const conditionOperators = [
		{ value: 'equals', label: 'Igual a' },
		{ value: 'not_equals', label: 'Diferente de' },
		{ value: 'contains', label: 'Contém' }
	];

	interface FormField {
		id: string;
		field_type: string;
		label: string;
		placeholder: string;
		options: string[];
		is_required: boolean;
		field_order: number;
		condition_field_id: string | null;
		condition_operator: string | null;
		condition_value: string | null;
		expanded: boolean;
	}

	let formTitle = $state('');
	let formDescription = $state('');
	let formIsActive = $state(true);
	let fields = $state<FormField[]>([]);
	let isSaving = $state(false);

	$effect(() => {
		if (form?.error) {
			alert(form.error);
			isSaving = false; // Resetar loading se der erro
		}
	});

	function generateId() {
		return `field_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	}

	function addField(type: string) {
		const newField: FormField = {
			id: generateId(),
			field_type: type,
			label: '',
			placeholder: '',
			options: [],
			is_required: false,
			field_order: fields.length + 1,
			condition_field_id: null,
			condition_operator: null,
			condition_value: null,
			expanded: true
		};
		fields = [...fields, newField];
	}

	function removeField(id: string) {
		fields = fields.filter((f) => f.id !== id);
		// Clean up conditions that depended on this field
		fields = fields.map((f, index) => ({
			...f,
			field_order: index + 1,
			condition_field_id: f.condition_field_id === id ? null : f.condition_field_id,
			condition_operator: f.condition_field_id === id ? null : f.condition_operator,
			condition_value: f.condition_field_id === id ? null : f.condition_value
		}));
	}

	function moveField(index: number, direction: 'up' | 'down') {
		if (direction === 'up' && index > 0) {
			const temp = fields[index];
			fields[index] = fields[index - 1];
			fields[index - 1] = temp;
		} else if (direction === 'down' && index < fields.length - 1) {
			const temp = fields[index];
			fields[index] = fields[index + 1];
			fields[index + 1] = temp;
		}
		fields = fields.map((f, i) => ({ ...f, field_order: i + 1 }));
	}

	function toggleField(id: string) {
		fields = fields.map((f) => (f.id === id ? { ...f, expanded: !f.expanded } : f));
	}

	// CORREÇÃO: Função simplificada (agora só adiciona, o update é via bind)
	function addOption(fieldId: string) {
		const field = fields.find((f) => f.id === fieldId);
		if (field) field.options.push('');
	}

	function removeOption(fieldId: string, optionIndex: number) {
		const field = fields.find((f) => f.id === fieldId);
		if (field) {
			field.options = field.options.filter((_, i) => i !== optionIndex);
		}
	}

	function getFieldTypeInfo(type: string) {
		return fieldTypes.find((t) => t.value === type) || fieldTypes[0];
	}

	function getAvailableConditionFields(currentFieldId: string) {
		// Only allow fields that have a label and are NOT the current field
		return fields.filter((f) => f.id !== currentFieldId && f.label.trim().length > 0);
	}

	function validateForm(): string[] {
		const errors: string[] = [];

		if (!formTitle.trim()) errors.push('O título do formulário é obrigatório');
		if (fields.length === 0) errors.push('Adicione pelo menos um campo ao formulário');

		fields.forEach((field, index) => {
			if (!field.label.trim()) {
				errors.push(`Campo ${index + 1}: O rótulo é obrigatório`);
			}
			// CORREÇÃO: Validação real de opções vazias
			if (field.field_type === 'select' || field.field_type === 'checkbox') {
				const hasValidOption = field.options.some((opt) => opt.trim().length > 0);
				if (!hasValidOption) {
					errors.push(`Campo "${field.label || index + 1}": Adicione pelo menos uma opção válida.`);
				}
			}
		});

		return errors;
	}

	function getFieldsForSubmission() {
		return fields.map(({ expanded, ...field }) => ({
			...field,
			// CORREÇÃO: Enviar o ID do front como temp_id para o backend mapear
			temp_id: field.id
		}));
	}
</script>

<form
	method="POST"
	use:enhance={({ cancel }) => {
		const errors = validateForm();
		if (errors.length > 0) {
			alert(errors.join('\n'));
			cancel();
			return;
		}
		isSaving = true;
		return async ({ result, update }) => {
			if (result.type === 'redirect') {
				goto(result.location);
			} else {
				isSaving = false;
				await update();
			}
		};
	}}
>
	<input type="hidden" name="title" value={formTitle} />
	<input type="hidden" name="description" value={formDescription} />
	<input type="hidden" name="is_active" value={formIsActive.toString()} />
	<input type="hidden" name="fields" value={JSON.stringify(getFieldsForSubmission())} />

	<div class="space-y-4">
		<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
			<div class="flex items-center gap-4">
				<Button type="button" variant="ghost" size="icon" onclick={() => goto('/forms/manage')}>
					<ArrowLeft class="size-5" />
				</Button>
				<div>
					<h2 class="text-2xl font-bold tracking-tight text-primary">Novo Formulário</h2>
					<p class="text-muted-foreground">Configure os campos e opções do formulário</p>
				</div>
			</div>

			<div class="flex w-full items-center gap-2 sm:w-auto">
				<Button type="button" variant="outline" onclick={() => goto('/forms/manage')}>
					Cancelar
				</Button>
				<Button type="submit" disabled={isSaving}>
					{#if isSaving}
						<Loader2 class="mr-2 size-4 animate-spin" />
					{:else}
						<Save class="mr-2 size-4" />
					{/if}
					Salvar Formulário
				</Button>
			</div>
		</div>

		<div class="grid gap-4 lg:grid-cols-3">
			<div class="space-y-4 lg:col-span-1">
				<Card.Root>
					<Card.Header><Card.Title class="text-lg">Informações</Card.Title></Card.Header>
					<Card.Content class="space-y-4">
						<div class="space-y-2">
							<Label for="title">Título *</Label>
							<Input id="title" placeholder="Ex: Relatório Semanal" bind:value={formTitle} />
						</div>
						<div class="space-y-2">
							<Label for="description">Descrição</Label>
							<Textarea
								id="description"
								placeholder="Propósito do formulário..."
								bind:value={formDescription}
								rows={3}
							/>
						</div>
						<div class="flex items-center justify-between">
							<div>
								<Label for="is_active">Ativo</Label>
								<p class="text-xs text-muted-foreground">Disponível para respostas</p>
							</div>
							<Switch id="is_active" bind:checked={formIsActive} />
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header><Card.Title class="text-lg">Adicionar Campo</Card.Title></Card.Header>
					<Card.Content>
						<div class="grid grid-cols-2 gap-2">
							{#each fieldTypes as fieldType}
								<Button
									type="button"
									variant="outline"
									class="h-auto flex-col gap-1 py-3"
									onclick={() => addField(fieldType.value)}
								>
									<fieldType.icon class="size-5" />
									<span class="text-xs">{fieldType.label}</span>
								</Button>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<div class="lg:col-span-2">
				<Card.Root>
					<Card.Header>
						<div class="flex items-center justify-between">
							<Card.Title class="text-lg">
								Campos <Badge variant="secondary" class="ml-2">{fields.length}</Badge>
							</Card.Title>
						</div>
					</Card.Header>
					<Card.Content>
						{#if fields.length === 0}
							<div
								class="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center"
							>
								<Plus class="mb-2 size-10 text-muted-foreground/50" />
								<p class="text-muted-foreground">Nenhum campo adicionado</p>
							</div>
						{:else}
							<div class="space-y-3">
								{#each fields as field, index (field.id)}
									{@const typeInfo = getFieldTypeInfo(field.field_type)}
									<div class="rounded-lg border bg-card">
										<button
											class="flex cursor-pointer flex-wrap items-center gap-2 p-3 select-none sm:flex-nowrap"
											onclick={() => toggleField(field.id)}
											type="button"
											tabindex="0"
										>
											<GripVertical class="hidden size-4 shrink-0 text-muted-foreground sm:block" />

											<Badge variant="outline" class="shrink-0 gap-1">
												<typeInfo.icon class="size-3" />
												<span class="hidden sm:inline">{typeInfo.label}</span>
											</Badge>

											<span class="min-w-12 flex-1 truncate text-sm font-medium sm:text-base">
												{field.label || 'Sem rótulo'}
											</span>

											{#if field.condition_field_id}
												<span class="text-xs text-orange-500 sm:hidden">●</span>
												<Badge
													variant="outline"
													class="hidden shrink-0 border-orange-300 text-xs text-orange-600 sm:inline-flex"
												>
													Condicional
												</Badge>
											{/if}

											{#if field.is_required}
												<span class="text-red-500 sm:hidden">*</span>
												<Badge variant="secondary" class="hidden shrink-0 text-xs sm:inline-flex">
													Obrigatório
												</Badge>
											{/if}

											<div class="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
												<Button
													type="button"
													variant="ghost"
													size="icon"
													class="hidden size-7 sm:inline-flex"
													onclick={(e) => {
														e.stopPropagation();
														moveField(index, 'up');
													}}
													disabled={index === 0}
												>
													<ChevronUp class="size-4" />
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													class="hidden size-7 sm:inline-flex"
													onclick={(e) => {
														e.stopPropagation();
														moveField(index, 'down');
													}}
													disabled={index === fields.length - 1}
												>
													<ChevronDown class="size-4" />
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													class="size-7 text-destructive hover:text-destructive"
													onclick={(e) => {
														e.stopPropagation();
														removeField(field.id);
													}}
												>
													<Trash2 class="size-4" />
												</Button>
											</div>
										</button>

										{#if field.expanded}
											<div class="border-t p-4">
												<div class="grid gap-4 sm:grid-cols-2">
													<div class="space-y-2">
														<Label>Rótulo *</Label>
														<Input placeholder="Ex: Nome completo" bind:value={field.label} />
													</div>
													<div class="space-y-2">
														<Label>Placeholder</Label>
														<Input
															placeholder="Ex: Digite aqui..."
															bind:value={field.placeholder}
														/>
													</div>
												</div>

												{#if field.field_type === 'select' || field.field_type === 'checkbox'}
													<Separator class="my-4" />
													<div class="space-y-2">
														<div class="flex items-center justify-between">
															<Label>Opções</Label>
															<Button
																type="button"
																variant="outline"
																size="sm"
																onclick={() => addOption(field.id)}
															>
																<Plus class="mr-1 size-3" /> Adicionar
															</Button>
														</div>
														<div class="space-y-2">
															{#each field.options as option, optIndex}
																<div class="flex items-center gap-2">
																	<Input
																		bind:value={field.options[optIndex]}
																		placeholder={`Opção ${optIndex + 1}`}
																	/>
																	<Button
																		type="button"
																		variant="ghost"
																		size="icon"
																		class="size-8 text-destructive"
																		onclick={() => removeOption(field.id, optIndex)}
																	>
																		<Trash2 class="size-4" />
																	</Button>
																</div>
															{/each}
															{#if field.options.length === 0}
																<p class="text-sm text-muted-foreground">
																	Nenhuma opção adicionada
																</p>
															{/if}
														</div>
													</div>
												{/if}

												<Separator class="my-4" />

												<div class="flex flex-wrap items-center gap-4">
													<div class="flex items-center gap-2">
														<Switch id={`req_${field.id}`} bind:checked={field.is_required} />
														<Label for={`req_${field.id}`}>Obrigatório</Label>
													</div>

													{#if getAvailableConditionFields(field.id).length > 0}
														<Separator orientation="vertical" class="h-6" />
														<Button
															type="button"
															variant="ghost"
															size="sm"
															class="text-muted-foreground"
															onclick={() => {
																if (field.condition_field_id) {
																	field.condition_field_id = null;
																	field.condition_operator = null;
																	field.condition_value = null;
																} else {
																	field.condition_operator = 'equals';
																}
															}}
														>
															<Settings2 class="mr-1 size-3" />
															{field.condition_field_id ? 'Remover condição' : 'Adicionar condição'}
														</Button>
													{/if}
												</div>

												{#if field.condition_operator}
													{@const availableFields = getAvailableConditionFields(field.id)}
													{@const selectedCondField = availableFields.find(
														(f) => f.id === field.condition_field_id
													)}
													{@const selectedOperator = conditionOperators.find(
														(o) => o.value === field.condition_operator
													)}

													<div class="mt-4 rounded-lg bg-muted/50 p-3">
														<p class="mb-2 text-sm font-medium">Mostrar apenas quando:</p>
														<div class="grid gap-2 sm:grid-cols-3">
															<Select.Root
																type="single"
																value={field.condition_field_id || undefined}
																onValueChange={(v) => {
																	field.condition_field_id = v;
																	field.condition_value = null;
																}}
															>
																<Select.Trigger
																	>{selectedCondField?.label || 'Campo...'}</Select.Trigger
																>
																<Select.Content>
																	{#each availableFields as condField}
																		<Select.Item value={condField.id}>{condField.label}</Select.Item
																		>
																	{/each}
																</Select.Content>
															</Select.Root>

															<Select.Root
																type="single"
																value={field.condition_operator || undefined}
																onValueChange={(v) => (field.condition_operator = v)}
															>
																<Select.Trigger
																	>{selectedOperator?.label || 'Operador'}</Select.Trigger
																>
																<Select.Content>
																	{#each conditionOperators as op}
																		<Select.Item value={op.value}>{op.label}</Select.Item>
																	{/each}
																</Select.Content>
															</Select.Root>

															{#if selectedCondField && (selectedCondField.field_type === 'select' || selectedCondField.field_type === 'checkbox')}
																<Select.Root
																	type="single"
																	value={field.condition_value || undefined}
																	onValueChange={(v) => (field.condition_value = v)}
																>
																	<Select.Trigger
																		>{field.condition_value || 'Valor...'}</Select.Trigger
																	>
																	<Select.Content>
																		{#each selectedCondField.options as opt}
																			<Select.Item value={opt}>{opt}</Select.Item>
																		{/each}
																	</Select.Content>
																</Select.Root>
															{:else}
																<Input placeholder="Valor" bind:value={field.condition_value} />
															{/if}
														</div>
													</div>
												{/if}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</div>
</form>
