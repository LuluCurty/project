<script lang='ts'>
    // runes states
	import { getClientToEdit } from '$lib/state/client-to-edit.svelte';
	import { page } from '$app/state';
    import { goto } from '$app/navigation';
	let client = $derived(getClientToEdit());
    let clientId = $derived(page.params.id);
    let title = $state(`Editar cliente ${capitalizeFirstChar(client.client_first_name)}`);

    let firstName = $state(client.client_first_name);
    let lastName = $state(client.client_last_name)
    let email = $state(client.client_email);
    let tel = $state(client.client_telephone);

    //  import components 
    import FormTitle from '$lib/components/ui/titles/FormTitle.svelte';
    import ClientForm from '$lib/components/ui/form/ClientForm.svelte';

    // import utils 
    import { capitalizeFirstChar } from '$lib/utils/utils';

	$effect(() => {
		if (!client && clientId) {
			fetchClient(clientId);
		}
	});

	async function fetchClient(id) {
		try {
			const res = await fetch(`/api/client/${id}`, {
				credentials: 'include'
			});

            if (!res.ok) {
                alert('Não foi possivel carregar dados, tente recarregar')
                return;
            }
			client = await res.json(); // curiosamente isso recebe o array inteiro, quebrando o codigo
            client = client.client; // pequena gambiarra, não vai impactar em nada
            title = `Editar cliente ${capitalizeFirstChar(client.client_first_name)}`;
            firstName = client.client_first_name;
            lastName = client.client_last_name;
            tel = client.client_telephone;
            email = client.client_email;
        } catch (error) {
			console.error(error);
			alert('Erro ao carregar dados');
		}
	}

    function updateClient(e) {
        
    }
    function cancelChanges() {
        //this will make it go back to the previous page
        goto("/client/");
    }

</script>

<form onsubmit={updateClient} id='update-client'>
    <FormTitle title={title}
        cancelChanges={cancelChanges}
        saveChanges={updateClient}
    />

    <ClientForm
        clientEmail={email}
        clientFirstName={firstName}
        clientLastName={lastName}
        clientTel={tel}
    />
</form>
