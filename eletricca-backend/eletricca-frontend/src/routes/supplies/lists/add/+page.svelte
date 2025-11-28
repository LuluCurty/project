<script lang="ts">
	import { Plus, X, Trash2 } from '@lucide/svelte';
	import '../s.css';

	//tipo cliente
	interface Client {
		id: number;
		client_first_name: string;
		client_last_name: String;
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
		supplier_email: string;
		price: number;
	}
	interface ListItem {
		supply: Supply;
		supplier: Supplier;
		quantity: number;
		price: number;
	}

	// variavel de mudança de pagina
	let currentTab = $state('lista');

	// Estados da aba de Lista
	let listName = $state('');
	let description = $state('');
	let priority = $state('medium');
	let selectedClient = $state<Client | null>(null);

	// Estados da aba de materiais
	let selectedSupply = $state<Supply | null>();
	let selectedSupplier = $state<Supplier | null>();	
	let currentQuantity = $state(1);
	let currentPrice = $state(0);
	let listItems = $state<ListItem[]>([]);
	let totalValue = $derived(
		listItems.reduce((sum, item) => sum + item.quantity * item.price, 0)
	);

	// autocompletes
	let clientSearch = $state('');
	let clientSuggestions = $state<Client[]>([]);
	let showClientSuggestions = $state(false);

	let supplySearch = $state('');
	let supplySuggestions = $state<Supply[]>([]);
	let showSupplySuggestions = $state(false);

	let supplierSearch = $state('');
	let supplierSuggestions = $state<Supplier[]>([]);
	let showSupplierSuggestions = $state(false);

	// =========== QUERY FUNCIONS =============
	// são funções de busca de dados
	async function searchClients() {
		if (clientSearch.length < 3) {
			// só começa a mostrar depois do terceiro digito
			clientSuggestions = [];
			showClientSuggestions = false;
			return;
		}
		try { // usar padrao '%path%/search?search='!
			const res = await fetch(`/api/client/search?search=${encodeURIComponent(clientSearch)}`, {
				credentials: "include"
			});

			if (res.ok) {
				const data = await res.json();
				clientSuggestions = data.rows;
				showClientSuggestions = clientSuggestions.length > 0;
			}
		} catch (error) {
			console.log('Erro ao buscar clientes: <searchClients> \n', error);
		}
	}

	async function searchSupply() {
		if (supplySearch.length < 3) {
			supplySuggestions = [];
			showSupplySuggestions = false;
			return;
		}
		
		try {
			const res = await fetch(`/api/supplies/search?q=${encodeURIComponent(supplySearch)}`, {
				credentials: "include"
			});
			if(res.ok) {
				const data = await res.json();
				supplySuggestions = data.supplies;
				showSupplySuggestions = supplySuggestions.length > 0;
			}
		} catch (error) {
			console.error(error);
		}
	}
	async function searchSupplier() {
		if (supplierSearch.length < 2) {
			supplierSuggestions = [];
			showSupplierSuggestions = false;
			return;
		}
		try {
			const res = await fetch(`/api/supplier/search?search=${encodeURIComponent(supplierSearch)}`, { 
				credentials: 'include' 
			});
			
			if (res.ok) {
				const data = await res.json();
				supplierSuggestions = data.rows;
				showSupplierSuggestions = supplierSuggestions.length > 0;
			}
			
		} catch (error) {
			console.error('Erro ao buscar fornecedores', error);
		}
	}
	// ================ HANDLERS ===========
	// autocomplete client
	function selectClient(client: Client) {
		selectedClient = client;
		clientSearch = ''; 
		clientSuggestions = []; 
		showClientSuggestions = false; 
	}
	function removeClient() {
		selectedClient = null;
	}
	// autocomplete de supply
	function selectSupply(supply: Supply) {
		selectedSupply = supply;
		supplySearch = '';
		supplySuggestions = [];
		showSupplySuggestions = false; 
	}
	function removeSupply(){
		selectedSupply = null;
	}
	// autocomplete de fornecedor
	function selectSupplier(supplier: Supplier) {
		selectedSupplier = supplier;
		supplierSearch = '';
		supplierSuggestions = [];
		showSupplierSuggestions = false;
	}
	function removeSupplier() {
		selectedSupplier = null;
	}

	// ===== list state
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
		selectedSupplier = null;
		selectedSupply = null;
		currentPrice = 0;
		currentQuantity = 0;
		supplySearch = '';
		supplierSearch = '';
	}
	function removeItem(index: number){
		listItems = listItems.filter((_, i) => i !== index);
	}

	async function cList() {
		if (!listName || !selectedClient) {
			alert('Preencha o nome da lista e cliente');
			return;
		}

		if (listItems.length === 0) {
			alert('Adicione pelo menus um material a lista');
			return;
		}

		try {
			const payload = {
				listName,
				clientId: selectedClient.id,
				priority,
				description,
				listItems: listItems.map(item => ({
					supply_id: item.supply.id,
					supplier_id: item.supplier.id,
					quantity: item.quantity,
					price: item.price
				}))
			};


			const res = await fetch(`/api/suplist`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			if (res.ok) {
				alert('Lista criada com sucesso');
				history.back();
			} else {
				const data = await res.json();
				console.log(data);
				alert('Erro ao criar lista');
			}
		} catch (error) {
			console.error('Error:\n'+ error);
		}


	}
	function cCancel() {
		// go back
		history.back();
	}
	// +++++ page changer ++++++
	function changeTab(tabToChange = 'lista') {
		currentTab = tabToChange;
	}

</script>

<form id="createList" onsubmit={(event) => { event.preventDefault(); cList(); }}>
	<div
		class="main-form-title mb-3.5 items-center border-b border-[#e7ecf0]
        bg-white font-normal leading-[50px]
        shadow-[0px_1px_10px_rgba(223,225,229,0.5)]"
	>
		<div class="pl-6"><h3>Criar lista</h3></div>
		<div class="flex justify-between">
			<div
				class="[*]:text-[#596680] flex
			overflow-hidden"
			>
				<div
					class="ml-5 mr-11 text-[14px] transition-colors duration-300 ease-[cubic-bezier(0.645,0.045,0.355,1)]"
					class:text-[#3D77FF]={currentTab === 'lista'}
					class:font-bold={currentTab === 'lista'}
					class:border-b-[#3D77FF]={currentTab === 'lista'}
					class:border-b-[3px]={currentTab === 'lista'}
				>
					<button onclick={() => changeTab('lista')} type="button" class="">Lista</button>
				</div>
				<div
					class="ml-5 mr-11 text-[14px] transition-colors duration-300 
							ease-[cubic-bezier(0.645,0.045,0.355,1)]"
					class:text-[#3D77FF]={currentTab === 'materiais'}
					class:font-bold={currentTab === 'materiais'}
					class:border-b-[#3D77FF]={currentTab === 'materiais'}
					class:border-b-[3px]={currentTab === 'materiais'}
				>
					<button onclick={() => changeTab('materiais')} type="button" class="">Materiais</button>
				</div>
			</div>

			<div class="">
				<button type="button" onclick={cCancel} class="general-button">Cancelar</button>
				<button type="submit"  class="general-button">Salvar</button>
			</div>
		</div>
	</div>

	<div class="main-form w-full">
		<div class="w-full">
			<div class="tabpanel-content h-full  pb-3.5 pl-3.5 pr-3.5 pt-0">
				<div
					class="form-content border border-solid border-[#dadfe580]
					 bg-white pb-5 pl-[30px] pr-[30px] pt-[30px]"
				>
					{#if currentTab === 'lista'}
						<h4
							class="leading-3.5 clear-both mb-[25px] mt-[25px] h-3.5 border-l-2
								border-solid border-l-[#3370ff] pl-2 text-base 
								font-semibold text-[#596680]
							"
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
										<div class=" h-8 leading-8">
											<input
												name="list-name"
												id="list-name"
												class="h-8 w-full cursor-text border-[#a4adb7] bg-white"
												type="text"
												bind:value={listName}
											/>
										</div>
									</div>
								</div>
							</div>
							<div class="mb-3.5 w-1/2">
								<div class="mb-3 h-8 leading-8">
									<div class="inline-block w-1/3">
										<label class="text-normal text-[#000000a6]" for="client-name">
											Cliente:
										</label>
									</div>
									<div class="inline-block w-1/2 relative">
										{#if selectedClient}
											<div class="flex items-center gap-2 rounded border
											border-[#3D77FF] bg-[#E6F2FF] px-2 py-1 h-8">
												<span class="text-sm">
													{selectedClient.client_first_name} {selectedClient.client_last_name}
												</span>
												<button 
													type="button"
													class="text-gray-500 hover:text-red-500"
													onclick={removeClient}
												>
													<X class="h-4 w-4"/>
												</button>
											</div>
										{:else}
											<div class="relative" >
												<input 
													type="text" 
													name="search-client" 
													id="search-client"
													placeholder="Digite para buscar"
													class="h-8 w-full cursor-text border-[#a4adb7] bg-white rounded"
													bind:value={clientSearch}
													oninput={searchClients}
													onfocus={searchClients}
												>
												{#if showClientSuggestions && clientSuggestions.length > 0}
													<div
														class="absolute z-50 mt-1 max-h-60 w-full overflow-auto
														rounded border border-[#d9d9d9] bg-white shadow-lg"
													>
														{#each clientSuggestions as client}
															<button 
															type="button"
															class="w-full cursor-pointer px-3 py-2 text-left
															hover:bg-[#f5f5f5]"
															onclick={() => selectClient(client)}
															>
																<div class="font-medium text-sm">
																	{client.client_first_name}
																	{client.client_last_name}
																</div>
																<div class="text-gray-500 text-xs">
																	{client.client_email}
																</div>
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
										<div class=" h-8 leading-8">
											<select
												class="border-[#a4adb7]"
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
								<div class="mb-3 h-8 leading-8">
									<div class="float-left inline-block w-1/3">
										<label class="text-normal text-[#000000a6]" for="description">Descrição:</label>
									</div>
									<div class="inline-block w-3/5">
										<textarea
											class="ml-[3px] w-full border border-solid border-[#d9d9d9] pb-0"
											name="description"
											id="description"
											placeholder="Descrição"
											bind:value={description}
										></textarea>
									</div>
								</div>
							</div>
						</section>
					{:else}
						<h4 
						class="leading-3.5 clear-both mb-[25px] mt-[25px] h-3.5 border-l-2
								border-solid border-l-[#3370ff] pl-2 text-base 
								font-semibold text-[#596680]"
						>
							Adicionar Materiais
						</h4>
						<div class="grid grid-cols-2 gap-6">
							<!--autocomplete-->
							<section class="rounded space-y-4 p-4 bg-[#fafafa] border border-[#d9d9d9]">
								<div id="f">
									<label for="select-supplies" class="mb-2 block text-sm font-medium text-[#596680]">
										Material
									</label>
									{#if selectedSupply}
										<div class="flex items-center gap-2 rounded border
											border-[#3D77FF] bg-[#e6f2ff] px-2 py-1"
										>
											<span class="text-sm">{selectedSupply.supply_name}</span>
											<button type="button" onclick={removeSupply} class="text-gray-500 hover:text-red-500">
												<X class="h-4 w-4"/>
											</button>
										</div>
									{:else}
										<div class="relative">
											<input 
												type="text" 
												name="select-supplies" 
												id="select-supplies"
												placeholder="Digite para buscar"
												class="w-full px-2 border border-[#a4adb7] rounded"
												bind:value={supplySearch}
												oninput={searchSupply}
												onfocus={searchSupply}
											>

											{#if showSupplySuggestions && supplySuggestions.length >0}
												<div class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded border border-[#d9d9d9] bg-white shadow-lg">
													{#each supplySuggestions as supply}
														<button type="button"
															onclick={() => selectSupply(supply)}
															class="w-full  cursor-pointer px-3 py-2 text-left hover:bg-[#f5f5f5]"
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
									<div id="f2">
										<label for="supplier" class="mb-2 block text-sm font-medium text-[#596680]">Fornecedor</label>
										
										{#if selectedSupplier}
											<div>
												<span class="text-sm">
													{selectedSupplier.supplier_name} - R$ 
												</span>
												<button 
													type="button"
													onclick={removeSupplier}
													class="hover:text-red-500 text-gray-500"
												>
													<X class="h-4 w-4"/>
												</button>
											</div>

										{:else} 
											<div class="relative">
												<input 
													type="text" 
													name="supplier" 
													id="supplier"
													placeholder="Buscar Fornecedor"
													bind:value={supplierSearch}
													oninput={searchSupplier}
													onfocus={searchSupplier}
												>

												{#if showSupplierSuggestions && supplierSuggestions.length > 0}
													<div>
														{#each supplierSuggestions as supplier}
															<button 
																class="w-full cursor-pointer px-3 py-2 text-left hover:bg-[#f5f5f5]"
																type="button"
																onclick={() => selectSupplier(supplier)}
															>
																<div class="font-medium text-sm">
																	{supplier.supplier_name}
																</div>
																<div class="text-xs text-gray-500">
																	Preço: R$ 
																</div>
															</button>
														{/each}
													</div>
												{/if}
											</div>	
										{/if}
									</div>

									<div id='price-and-quantity' class="grid grid-cols-2 gap-4">
										<div id="quanttt">
											<label for="supply-quantity">Quantidade:</label>
											<input type="number" 
												name="supply-quantity" 
												id="supply-quantity"
												bind:value={currentQuantity}
												class="h-8 w-full border border-[#a4adb7] px-2"
											/>
										</div>
										<div id="price">
											<label for="supply-price">Preço Unit.</label>
											<input 
												type="number" 
												name="supply-price" 
												id="supply-price"
												step="0.01"
												min="0"
												class="h-8 w-full border px-2 border-[#a4adb7]"
												bind:value={currentPrice}
											>
										</div>
									</div>

									<button 
										type="button"
										class="flex w-full items-center justify-center gap-2 rounded bg-[#3D77FF]! px-4 py-2 text-sm text-white hover:bg-[#2a5fd9]!"
										onclick={addItemToList}
									>
										<Plus class="h-4 w-4"/>
										Adicionar à Lista
									</button>
								{/if}
							</section>

							<!--lista-->
							<section class="rounded space-y-4 p-4 bg-white
								border border-[#d9d9d9]"
							>
								<h5 class="mb-4 font-semibold text-[#596680]">
									Materiais Adicionados ({listItems.length})
								</h5>

								{#if listItems.length === 0}
									<p class="text-center text-sm text-gray-400 py-8">
										Nenhum material
									</p>
								{:else}
									<div class="space-y-2 max-h-[400px] overflow-auto">
										{#each listItems as item, index}
											<div class="flex items-start justify-between rounded border border-[#e7ecf0] bg-[#f9fafb] p-3">
												<div class="flex-1">
													<div class="font-medium text-sm">
														{item.supply.supply_name}
													</div>
													<div class="text-xs text-gray-500 mt-1">
														{item.supplier.supplier_name}
													</div>
													<div class="text-xs text-gray-600 mt-1">
														Qtd: {item.quantity} x R$ =
													</div>
												</div>
												<button
													type="button"
													onclick={() => removeItem(index)}
													class="text-gray-400 hover:text-red-500 ml-2"
												>
													<Trash2 class="h-4 w-4"/>
												</button>
											</div>
										{/each}
									</div>

									<div class="mt-4 border-t pt-4">
										<div class="flex justify-between font-semibold text-lg">
											<span>Total:</span>
											<span class="text-[#3D77FF]">VALOR TOTAL</span>
										</div>
									</div>
								{/if}
							</section>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</form>
