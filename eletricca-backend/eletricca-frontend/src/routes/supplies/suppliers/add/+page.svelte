<script></script>

<form action="" id="createCliente">
    <div class="mb-3.5 items-center border-b border-[#e7ecf0]
        bg-white font-normal leading-[50px]
        shadow-[0px_1px_10px_rgba(223,225,229,0.5)]"
    >
        <div class="pl-6"><h3>Cadastrar Fornecedor</h3></div>
        <div class="flex justify-end">
            <div>
                <button type="button" onclick="{cCancel}">Cancelar</button>
                <button type="button" onclick="{cList}">Salvar</button>
            </div>
        </div>
    </div>

    <div class="main-form w-full">
        <div class="form-wrapper h-full overflow-auto pb-3.5 pr-3.5 pt-0">
            <div class="border border-solid border-[#dadfe580] bg-white pb-5 pl-[30px] pr-[30px] pt-[30px]">
                <h4
					class="leading-3.5 clear-both mb-12 mt-[25px] h-3.5 border-l-2
                    border-solid border-l-[#3370ff] pl-2 text-base font-semibold text-[#596680]"
				>
					Geral
				</h4>

                <section class="flex w-full">
                    <div class="w-1/2">
                        <div class="flex items-center mb-6">                                            
                            <div class="inline-block w-[30%]">
                                <label for="client_name" class="text-normal text-[#000000a6]">
                                    Nome:
                                </label>
                            </div>
                            <div class="inline-block w-[50%]">
                                <input 
                                class="h-8 leading-8 border-[#a4adb7] rounded-sm"
                                    type="text" 
                                    id="client_name" 
                                    placeholder="Nome do Cliente">
                            </div>
                        </div>
                        <div class="flex items-center mb-6">
                            <div class="inline-block w-[30%]">
                                <label for="client_email" class="text-normal text-[#000000a6]">
                                    Email:
                                </label>
                            </div>
                            <div class="inline-block w-[50%]">
                                <input 
                                    class="h-8 leading-8 border-[#a4adb7] rounded-sm"
                                    type="text" 
                                    id="client_email" 
                                    placeholder="Email">
                            </div>
                        </div>
                    </div>
                    <div class="w-1/2">
                        <div class="flex items-center mb-6">
                            <div class="inline-block w-[30%]">
                                <label for="client_tel" class="text-normal text-[#000000a6]">
                                    Telefone:
                                </label>
                            </div>
                            <div class="inline-block w-[50%]">
                                <input 
                                    class="h-8 leading-8 border-[#a4adb7] rounded-sm" 
                                    type="text" 
                                    id="client_tel" 
                                    placeholder="Telefone">
                            </div>
                        </div>
                        <div class="flex items-center mb-6">                                            
                            <div class="inline-block w-[30%]">
                                <label for="supplier_address" class="text-normal text-[#000000a6]">
                                    Endereço:
                                </label>
                            </div>
                            <div class="inline-block w-[50%]">
                                <textarea
										class="ml-[3px] w-full border border-solid border-[#d9d9d9] pb-0 rounded-sm"
										name="supplier_address"
										id="supplier_address"
										placeholder="Endereço"></textarea>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>

    </div>
</form>