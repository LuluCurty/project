<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import FormTitle from "$lib/components/ui/titles/FormTitle.svelte";
    import { capitalizeFirstChar } from "$lib/utils/utils";
    
    let title = $state<string>('');
    const id = $derived(page.params.id);
    

    interface Item {
        id: number;
        
    };

    interface ApiResponse{
        id: number;
    }


    async function saveChanges() {
        
    }
    async function getItem() {
        try {
            const res = await fetch(`/api/supplies/${id}`,{
                credentials: 'include'
            });

            const data = await res.json();
            console.log(data);
        } catch (e) {
            console.error(e);
            alert('Erro ao buscar informações');
        }
    }
    function cancelChanges() {
        goto('/supplies');
    }

</script>
<form action="" method="post">
    <FormTitle {title} {cancelChanges} {saveChanges} />
    <button type="button" onclick={getItem}>
        aperta ai
    </button>
</form>