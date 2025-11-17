<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import '../s.css';

	//tipo cliente
	interface Client {
		id: number;
		client_first_name: string;
		client_last_name: String;
		client_email: string;
	}

	// ++++++ variavel de mudança de pagina ++++
	let currentTab = $state('lista');

	// +++++++ Estados da aba de Lista +++++++
	let listName = $state('');
	let clientName = $state('');
	let description = $state('');
	let priority = $state('medium');
	let selectedClient = $state<Client | null>(null); // seleciona o client

	// ++++ autocomplete de clients
	let clientSearch = $state('');
	let clientSuggestions = $state<Client[]>([]);
	let showClientSuggestions = $state(false);

	// +++++ butoes ++++
	async function cList() {
		return 1;
	}
	function cCancel() {
		return 0;
	}
	// terminar a aba de lista e depois ir mexer na aba de materiais

	// +++++ page changer ++++++
	function changeTab(tabToChange = 'lista') {
		currentTab = tabToChange;
	}

	// funções do autocomplete de clientes: +++++++
	async function searchClients() {
		if (clientSearch.length < 3) {
			// só começa a mostrar depois do terceiro digito
			clientSuggestions = [];
			showClientSuggestions = false;
			return;
		}
		try {
			const res = await fetch(`/api/client/search?=${encodeURIComponent(clientSearch)}`, {
				credentials: "include"
			});

			if (res.ok) {
				clientSuggestions = await res.json();
				showClientSuggestions = clientSuggestions.length > 0;
			}
		} catch (error) {
			console.log('Erro ao buscar clientes: <searchClients> \n', error);
		}
	}
</script>

<form id="createList">
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
					class="ml-5 mr-11 text-[14px] transition-colors duration-300 ease-[cubic-bezier(0.645,0.045,0.355,1)]"
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
				<button type="button" onclick={cList} class="general-button">Salvar</button>
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
										<label class="text-normal text-[#000000a6]" for="client-name">Cliente:</label>
									</div>
									<div class="inline-block w-1/2">
										<div class=" h-8 leading-8">
											<input
												class="h-8 w-full cursor-text border-[#a4adb7] bg-white"
												name="client-name"
												id="client-name"
												type="text"
												bind:value={clientName}
											/>
										</div>
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
						<h1>TESTE SUCEDIDO!</h1>
					{/if}
				</div>
			</div>
		</div>
	</div>
</form>
