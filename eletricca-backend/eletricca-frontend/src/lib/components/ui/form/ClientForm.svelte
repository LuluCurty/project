<script>
    // this is a 4 by 4 form
    // which I plan to make it a general one :)

    let { clientFirstName =$bindable(), 
		clientEmail =$bindable(), 
		clientLastName =$bindable(), 
		clientTel=$bindable() 
	} = $props();

</script>


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