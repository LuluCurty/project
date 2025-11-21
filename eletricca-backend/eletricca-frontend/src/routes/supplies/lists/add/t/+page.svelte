<script lang="ts">
	import { Plus, X, Trash2 } from 'lucide-svelte';
	import '../../s.css';

	// Tipos
	interface Client {
		id: number;
		client_first_name: string;
		client_last_name: string;
		client_email: string;
	}

	interface Supply {
		id: number;
		supply_name: string;
		supply_description?: string;
	}

	interface Supplier {
		id: number;
		supplier_name: string;
		price: number;
	}

	interface ListItem {
		supply: Supply;
		supplier: Supplier;
		quantity: number;
		price: number;
	}

	// Estados da aba "Lista"
	let currentTab = $state('lista');
	let listName = $state('');
	let description = $state('');
	let priority = $state('medium');
	let selectedClient = $state<Client | null>(null);

	// Autocomplete de clientes
	let clientSearch = $state('');
	let clientSuggestions = $state<Client[]>([]);
	let showClientSuggestions = $state(false);

	// Estados da aba "Materiais"
	let listItems = $state<ListItem[]>([]);
	
	// Item sendo adicionado
	let supplySearch = $state('');
	let supplySuggestions = $state<Supply[]>([]);
	let showSupplySuggestions = $state(false);
	let selectedSupply = $state<Supply | null>(null);
	
	let supplierSearch = $state('');
	let supplierSuggestions = $state<Supplier[]>([]);
	let showSupplierSuggestions = $state(false);
	let selectedSupplier = $state<Supplier | null>(null);
	
	let currentQuantity = $state(1);
	let currentPrice = $state(0);

	// Total calculado
	let totalValue = $derived(
		listItems.reduce((sum, item) => sum + item.quantity * item.price, 0)
	);

	function changeTab(tabToChange = 'lista') {
		currentTab = tabToChange;
	}

	// ========== FUNÇÕES DE BUSCA (você implementa depois com seus endpoints) ==========
	// essa eu aprendi a fazer
	async function searchClients() {
		if (clientSearch.length < 2) {
			clientSuggestions = [];
			showClientSuggestions = false;
			return;
		}

		try {
			// TODO: Substituir por seu endpoint
			const res = await fetch(`/api/client/search?q=${encodeURIComponent(clientSearch)}`, {
				credentials: 'include'
			});
			if (res.ok) {
				clientSuggestions = await res.json();
				showClientSuggestions = clientSuggestions.length > 0;
			}
		} catch (error) {
			console.error('Erro ao buscar clientes:', error);
		}
	}

	async function searchSupplies() {
		if (supplySearch.length < 2) {
			supplySuggestions = [];
			showSupplySuggestions = false;
			return;
		}

		try {
			// TODO: Substituir por seu endpoint
			const res = await fetch(`/api/supply/search?q=${encodeURIComponent(supplySearch)}`, {
				credentials: 'include'
			});
			if (res.ok) {
				supplySuggestions = await res.json();
				showSupplySuggestions = supplySuggestions.length > 0;
			}
		} catch (error) {
			console.error('Erro ao buscar materiais:', error);
		}
	}

	async function searchSuppliers() {
		if (!selectedSupply || supplierSearch.length < 1) {
			supplierSuggestions = [];
			showSupplierSuggestions = false;
			return;
		}

		try {
			// TODO: Substituir por seu endpoint
			const res = await fetch(`/api/supply/${selectedSupply.id}/suppliers`, {
				credentials: 'include'
			});
			if (res.ok) {
				supplierSuggestions = await res.json();
				showSupplierSuggestions = supplierSuggestions.length > 0;
			}
		} catch (error) {
			console.error('Erro ao buscar fornecedores:', error);
		}
	}

	// ========== HANDLERS ==========

	function selectClient(client: Client) {
		selectedClient = client;
		clientSearch = '';
		clientSuggestions = [];
		showClientSuggestions = false;
	}

	function removeClient() {
		selectedClient = null;
	}

	function selectSupply(supply: Supply) {
		selectedSupply = supply;
		supplySearch = '';
		supplySuggestions = [];
		showSupplySuggestions = false;
		selectedSupplier = null;
		currentPrice = 0;
	}

	function removeSupply() {
		selectedSupply = null;
		selectedSupplier = null;
		supplySearch = '';
		currentPrice = 0;
	}

	function selectSupplier(supplier: Supplier) {
		selectedSupplier = supplier;
		supplierSearch = '';
		supplierSuggestions = [];
		showSupplierSuggestions = false;
		currentPrice = supplier.price;
	}

	function removeSupplier() {
		selectedSupplier = null;
		supplierSearch = '';
		currentPrice = 0;
	}

	function addItemToList() {
		if (!selectedSupply || !selectedSupplier || currentQuantity <= 0) {
			alert('Preencha todos os campos');
			return;
		}

		listItems = [
			...listItems,
			{
				supply: selectedSupply,
				supplier: selectedSupplier,
				quantity: currentQuantity,
				price: currentPrice
			}
		];

		// Limpar campos
		selectedSupply = null;
		selectedSupplier = null;
		supplySearch = '';
		supplierSearch = '';
		currentQuantity = 1;
		currentPrice = 0;
	}

	function removeItem(index: number) {
		listItems = listItems.filter((_, i) => i !== index);
	}

	async function cList() {
		if (!listName || !selectedClient) {
			alert('Preencha o nome da lista e selecione um cliente');
			return;
		}

		if (listItems.length === 0) {
			alert('Adicione pelo menos um material à lista');
			return;
		}

		// TODO: Implementar salvamento
		console.log('Salvando lista:', {
			list_name: listName,
			client_id: selectedClient.id,
			priority,
			description,
			items: listItems.map(item => ({
				supply_id: item.supply.id,
				supplier_id: item.supplier.id,
				quantity: item.quantity,
				price: item.price
			}))
		});

		alert('Lista criada! (implementar endpoint)');
	}

	function cCancel() {
		// Implementar navegação de volta
		history.back();
	}
</script>

<form id="createList" onsubmit={(e) => { e.preventDefault(); cList(); }}>
	<div
		class="main-form-title mb-3.5 items-center border-b border-[#e7ecf0]
        bg-white font-normal leading-[50px]
        shadow-[0px_1px_10px_rgba(223,225,229,0.5)]"
	>
		<div class="pl-6"><h3>Criar lista</h3></div>
		<div class="flex justify-between">
			<div class="overflow-hidden [*]:text-[#596680] flex">
				<div
					class="mr-11 ml-5 text-[14px] transition-colors duration-300 ease-[cubic-bezier(0.645,0.045,0.355,1)]"
					class:text-[#3D77FF]={currentTab === 'lista'}
					class:font-bold={currentTab === 'lista'}
					class:border-b-[#3D77FF]={currentTab === 'lista'}
					class:border-b-[3px]={currentTab === 'lista'}
				>
					<button onclick={() => changeTab('lista')} type="button">Lista</button>
				</div>
				<div
					class="mr-11 ml-5 text-[14px] transition-colors duration-300 ease-[cubic-bezier(0.645,0.045,0.355,1)]"
					class:text-[#3D77FF]={currentTab === 'materiais'}
					class:font-bold={currentTab === 'materiais'}
					class:border-b-[#3D77FF]={currentTab === 'materiais'}
					class:border-b-[3px]={currentTab === 'materiais'}
				>
					<button onclick={() => changeTab('materiais')} type="button">Materiais</button>
				</div>
			</div>

			<div class="">
				<button type="button" onclick={cCancel} class="general-button">Cancelar</button>
				<button type="submit" class="general-button">Salvar</button>
			</div>
		</div>
	</div>

	<div class="main-form w-full">
		<div class="w-full">
			<div class="tabpanel-content h-full overflow-auto pb-3.5 pl-3.5 pr-3.5 pt-0">
				<div
					class="form-content border border-solid border-[#dadfe580] bg-white pb-5 pl-[30px] pr-[30px] pt-[30px]"
				>
					{#if currentTab === 'lista'}
						<h4
							class="leading-3.5 clear-both mb-[25px] mt-[25px] h-3.5 border-l-2
							border-solid border-l-[#3370ff] pl-2 text-base font-semibold text-[#596680]"
						>
							Geral
						</h4>
						<section class="flex w-full">
							<div class="mb-3.5 w-1/2">
								<div class="mb-3 h-8 leading-8">
									<div class="inline-block w-1/3">
										<label class="text-normal text-[#000000a6]" for="list-name"> Nome: </label>
									</div>
									<div class="inline-block w-1/2">
										<div class="h-8 leading-8">
											<input
												name="list-name"
												id="list-name"
												class="h-8 w-full cursor-text border border-[#a4adb7] bg-white px-2"
												type="text"
												bind:value={listName}
											/>
										</div>
									</div>
								</div>
							</div>
							<div class="mb-3.5 w-1/2">
								<div class="mb-3 leading-8">
									<div class="inline-block w-1/3">
										<label class="text-normal text-[#000000a6]" for="client-name">
											Cliente:
										</label>
									</div>
									<div class="inline-block w-1/2 relative">
										{#if selectedClient}
											<div class="flex items-center gap-2 rounded border border-[#3D77FF] bg-[#e6f2ff] px-2 py-1">
												<span class="text-sm">
													{selectedClient.client_first_name} {selectedClient.client_last_name}
												</span>
												<button
													type="button"
													onclick={removeClient}
													class="text-gray-500 hover:text-red-500"
												>
													<X class="h-4 w-4" />
												</button>
											</div>
										{:else}
											<div class="relative">
												<input
													class="h-8 w-full cursor-text border border-[#a4adb7] bg-white px-2"
													name="client-name"
													id="client-name"
													type="text"
													placeholder="Digite para buscar..."
													bind:value={clientSearch}
													oninput={searchClients}
													onfocus={searchClients}
												/>
												{#if showClientSuggestions && clientSuggestions.length > 0}
													<div
														class="absolute z-50 mt-1 max-h-60 w-full overflow-auto 
														rounded border border-[#d9d9d9] bg-white shadow-lg"
													>
														{#each clientSuggestions as client}
															<button
																type="button"
																class="w-full cursor-pointer px-3 py-2 text-left hover:bg-[#f5f5f5]"
																onclick={() => selectClient(client)}
															>
																<div class="font-medium text-sm">
																	{client.client_first_name}
																	{client.client_last_name}
																</div>
																<div class="text-xs text-gray-500">{client.client_email}</div>
															</button>
														{/each}
													</div>
												{/if}
											</div>
										{/if}
									</div>
								</div>
							</div>
						</section>

						<section class="flex w-full">
							<div class="mb-3.5 w-1/2">
								<div class="mb-3 h-8 leading-8">
									<div class="inline-block w-1/3">
										<label class="text-normal text-[#000000a6]" for="priority">Prioridade:</label>
									</div>
									<div class="inline-block w-1/2">
										<div class="h-8 leading-8">
											<select
												class="h-8 w-full border border-[#a4adb7]"
												name="priority"
												id="priority"
												bind:value={priority}
											>
												<option value="low">Baixa</option>
												<option value="medium" selected>Média</option>
												<option value="high">Alta</option>
											</select>
										</div>
									</div>
								</div>
							</div>
						</section>

						<section>
							<div class="mb-8 w-1/2">
								<div class="mb-3 leading-8">
									<div class="float-left inline-block w-1/3">
										<label class="text-normal text-[#000000a6]" for="description">Descrição:</label>
									</div>
									<div class="inline-block w-3/5">
										<textarea
											class="ml-[3px] w-full border border-solid border-[#d9d9d9] p-2"
											name="description"
											id="description"
											placeholder="Descrição"
											rows="4"
											bind:value={description}
										></textarea>
									</div>
								</div>
							</div>
						</section>
					{:else} 
						<h4
							class="leading-3.5 clear-both mb-[25px] mt-[25px] h-3.5 border-l-2 border-solid border-l-[#3370ff] pl-2 text-base font-semibold text-[#596680]"
						>
							Adicionar Materiais
						</h4>

						<div class="grid grid-cols-2 gap-6">
							<!-- Formulário de adição -->
							<div class="space-y-4 rounded border border-[#d9d9d9] bg-[#fafafa] p-4">
								<div>
									<label for="supply-s" class="mb-2 block text-sm font-medium text-[#596680]">Material</label>
									{#if selectedSupply}
										<div
											class="flex items-center gap-2 rounded border border-[#3D77FF] bg-[#e6f2ff] px-2 py-1"
										>
											<span class="text-sm">{selectedSupply.supply_name}</span>
											<button
												type="button"
												onclick={removeSupply}
												class="text-gray-500 hover:text-red-500"
											>
												<X class="h-4 w-4" />
											</button>
										</div>
									{:else}
										<div class="relative">
											<input
												name="supply-s"
												type="text"
												class="h-8 w-full border border-[#a4adb7] px-2"
												placeholder="Digite para buscar..."
												bind:value={supplySearch}
												oninput={searchSupplies}
												onfocus={searchSupplies}
											/>
											{#if showSupplySuggestions && supplySuggestions.length > 0}
												<div
													class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded border border-[#d9d9d9] bg-white shadow-lg"
												>
													{#each supplySuggestions as supply}
														<button
															type="button"
															class="w-full cursor-pointer px-3 py-2 text-left hover:bg-[#f5f5f5]"
															onclick={() => selectSupply(supply)}
														>
															<div class="font-medium text-sm">{supply.supply_name}</div>
															{#if supply.supply_description}
																<div class="text-xs text-gray-500">
																	{supply.supply_description}
																</div>
															{/if}
														</button>
													{/each}
												</div>
											{/if}
										</div>
									{/if}
								</div>

								{#if selectedSupply}
									<div>
										<label class="mb-2 block text-sm font-medium text-[#596680]">Fornecedor</label>
										{#if selectedSupplier}
											<div
												class="flex items-center gap-2 rounded border border-[#3D77FF] bg-[#e6f2ff] px-2 py-1"
											>
												<span class="text-sm"
													>{selectedSupplier.supplier_name} - R$ {selectedSupplier.price.toFixed(
														2
													)}</span
												>
												<button
													type="button"
													onclick={removeSupplier}
													class="text-gray-500 hover:text-red-500"
												>
													<X class="h-4 w-4" />
												</button>
											</div>
										{:else}
											<div class="relative">
												<input
													type="text"
													class="h-8 w-full border border-[#a4adb7] px-2"
													placeholder="Buscar fornecedor..."
													bind:value={supplierSearch}
													oninput={searchSuppliers}
													onfocus={searchSuppliers}
												/>
												{#if showSupplierSuggestions && supplierSuggestions.length > 0}
													<div
														class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded border border-[#d9d9d9] bg-white shadow-lg"
													>
														{#each supplierSuggestions as supplier}
															<button
																type="button"
																class="w-full cursor-pointer px-3 py-2 text-left hover:bg-[#f5f5f5]"
																onclick={() => selectSupplier(supplier)}
															>
																<div class="font-medium text-sm">{supplier.supplier_name}</div>
																<div class="text-xs text-gray-500">
																	Preço: R$ {supplier.price.toFixed(2)}
																</div>
															</button>
														{/each}
													</div>
												{/if}
											</div>
										{/if}
									</div>

									<div class="grid grid-cols-2 gap-4">
										<div>
											<label class="mb-2 block text-sm font-medium text-[#596680]">Quantidade</label>
											<input
												type="number"
												min="1"
												class="h-8 w-full border border-[#a4adb7] px-2"
												bind:value={currentQuantity}
											/>
										</div>
										<div>
											<label class="mb-2 block text-sm font-medium text-[#596680]"
												>Preço Unit.</label
											>
											<input
												type="number"
												step="0.01"
												min="0"
												class="h-8 w-full border border-[#a4adb7] px-2"
												bind:value={currentPrice}
											/>
										</div>
									</div>

									<button
										type="button"
										onclick={addItemToList}
										class="flex w-full items-center justify-center gap-2 rounded bg-[#3D77FF] px-4 py-2 text-sm text-white hover:bg-[#2a5fd9]"
									>
										<Plus class="h-4 w-4" />
										Adicionar à Lista
									</button>
								{/if}
							</div>

							<!-- Lista de materiais -->
							<div class="rounded border border-[#d9d9d9] bg-white p-4">
								<h5 class="mb-4 font-semibold text-[#596680]">
									Materiais Adicionados ({listItems.length})
								</h5>

								{#if listItems.length === 0}
									<p class="text-center text-sm text-gray-400 py-8">
										Nenhum material adicionado ainda
									</p>
								{:else}
									<div class="space-y-2 max-h-[400px] overflow-auto">
										{#each listItems as item, i}
											<div
												class="flex items-start justify-between rounded border border-[#e7ecf0] bg-[#f9fafb] p-3"
											>
												<div class="flex-1">
													<div class="font-medium text-sm">{item.supply.supply_name}</div>
													<div class="text-xs text-gray-500 mt-1">
														{item.supplier.supplier_name}
													</div>
													<div class="text-xs text-gray-600 mt-1">
														Qtd: {item.quantity} × R$ {item.price.toFixed(2)} = R$ {(
															item.quantity * item.price
														).toFixed(2)}
													</div>
												</div>
												<button
													type="button"
													onclick={() => removeItem(i)}
													class="text-gray-400 hover:text-red-500 ml-2"
												>
													<Trash2 class="h-4 w-4" />
												</button>
											</div>
										{/each}
									</div>

									<div class="mt-4 border-t pt-4">
										<div class="flex justify-between font-semibold text-lg">
											<span>Total:</span>
											<span class="text-[#3D77FF]">R$ {totalValue.toFixed(2)}</span>
										</div>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</form>