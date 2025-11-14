
<script>
    let { cancelChanges, saveChanges, title = '' } = $props();
</script>

<div
	class="mb-3.5 items-center border-b border-[#e7ecf0]
        bg-white font-normal leading-[50px]
        shadow-[0px_1px_10px_rgba(223,225,229,0.5)]"
>
	<div class="pl-6"><h3>{title}</h3></div>
	<div class="flex justify-end">
		<div>
			<button type="button" onclick={cancelChanges}>Cancelar</button>
			<button type="button" onclick={saveChanges}>Salvar</button>
		</div>
	</div>
</div>
