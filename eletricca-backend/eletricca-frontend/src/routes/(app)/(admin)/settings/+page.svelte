<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
    import {Globe} from '@lucide/svelte';
    
</script>

<Button
    type='button'
    onclick={() => goto('settings/roles')}
>
    <Globe/>
</Button>

<Button
    type='button'
    onclick={() => goto('settings/permissions')}
>
    <Globe/>
</Button>

<span class="text-muted-foreground">
    Futura pagina de configurações do usuario/sistema
</span>