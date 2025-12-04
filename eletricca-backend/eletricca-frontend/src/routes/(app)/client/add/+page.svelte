<script>

	let clientFirstName = '';
	let clientLastName = '';
	let clientTel = '';
	let clientEmail = '';

	async function cList(event) {
		event.preventDefault();

		if ( !clientFirstName.trim() || !clientLastName.trim() || !clientTel.trim() || !clientEmail.trim() ) {
			alert('Por favor, preencha todos os campos antes de salvar.');
			return;
		}

		try {
			const res = await fetch(`/api/client`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clientFirstName,
					clientLastName,
					clientTel,
					clientEmail
				}),
				credentials: 'include'
			});
			const data = await res.json();

			if (res.ok) {
				alert('Cliente criado');
				clientFirstName = clientLastName = clientTel = clientEmail = ''; // limpa campos
			} else {
				alert(data.message || 'Erro ao criar cliente');
			}
		} catch (error) {
			console.error(error);
			alert('Erro com o servidor');
		}
	}

    function cCancel() {
        history.back();
    }
</script>

<form id="createCliente" onsubmit={cList}>
	<div
		class="mb-3.5 items-center border-b border-[#e7ecf0]
        bg-white font-normal leading-[50px]
        shadow-[0px_1px_10px_rgba(223,225,229,0.5)]"
	>
		<div class="pl-6"><h3>Cadastrar Cliente</h3></div>
		<div class="flex justify-end">
			<div>
				<button type="button" onclick={cCancel}>Cancelar</button>
				<button type="button" onclick={cList}>Salvar</button>
			</div>
		</div>
	</div>

	<div class="main-form w-full">
		<div class="form-wrapper h-full overflow-auto pb-3.5 pr-3.5 pt-0">
			<div
				class="border border-solid border-[#dadfe580] bg-white pb-5 pl-[30px] pr-[30px] pt-[30px]"
			>
				<h4
					class="leading-3.5 clear-both mb-12 mt-[25px] h-3.5 border-l-2
                    border-solid border-l-[#3370ff] pl-2 text-base font-semibold text-[#596680]"
				>
					Geral
				</h4>

				<section class="flex w-full">
					<div class="w-1/2">
						<div class="mb-6 flex items-center">
							<div class="inline-block w-[30%]">
								<label for="client_name" class="text-normal text-[#000000a6]"> Nome: </label>
							</div>
							<div class="inline-block w-[50%]">
								<input
									class="h-8 rounded-sm border-[#a4adb7] leading-8"
									bind:value={clientFirstName}
									type="text"
									id="client_name"
									placeholder="Nome do Cliente"
									required
								/>
							</div>
						</div>
						<div class="mb-6 flex items-center">
							<div class="inline-block w-[30%]">
								<label for="client_email" class="text-normal text-[#000000a6]"> Email: </label>
							</div>
							<div class="inline-block w-[50%]">
								<input
									bind:value={clientEmail}
									class="h-8 rounded-sm border-[#a4adb7] leading-8"
									type="text"
									id="client_email"
									placeholder="Email"
									required
								/>
							</div>
						</div>
					</div>
					<div class="w-1/2">
						<div class="mb-6 flex items-center">
							<div class="inline-block w-[30%]">
								<label for="client_lastname" class="text-normal text-[#000000a6]">
									Sobrenome:
								</label>
							</div>
							<div class="inline-block w-[50%]">
								<input
									bind:value={clientLastName}
									class="h-8 rounded-sm border-[#a4adb7] leading-8"
									type="text"
									id="client_lastname"
									placeholder="Sobrenome"
									required
								/>
							</div>
						</div>
						<div class="mb-6 flex items-center">
							<div class="inline-block w-[30%]">
								<label for="client_tel" class="text-normal text-[#000000a6]"> Telefone: </label>
							</div>
							<div class="inline-block w-[50%]">
								<input
									bind:value={clientTel}
									class="h-8 rounded-sm border-[#a4adb7] leading-8"
									type="text"
									id="client_tel"
									placeholder="Telefone"
									required
								/>
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>
	</div>
</form>
