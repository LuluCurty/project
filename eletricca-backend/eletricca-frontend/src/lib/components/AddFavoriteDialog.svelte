<script lang='ts'>
    import { enhance } from "$app/forms";
    import { LoaderCircle } from "@lucide/svelte";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Input } from "$lib/components/ui/input";
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label";
    import { Checkbox }  from "$lib/components/ui/checkbox";

    let { open = $bindable(false) } = $props();

    let loading = $state(false);
    let isInternal = $state(true);
</script>

<Dialog.Root bind:open={open}>
    <Dialog.Content class="sm:max-w-[425px] bg-card text-card-foreground border-border">
        <Dialog.Header>
            <Dialog.Title>
                Adicione Favoritos
            </Dialog.Title>
            <Dialog.Description>
                Crie um atalho para outras aplicações
            </Dialog.Description>
        </Dialog.Header>

        <form 
            action="/favorites?/create"
            method="POST"
            use:enhance={() => {
                loading = true;
                return async ({ result, update }) => {
                    loading = false;
                    if (result.type === 'success') {
                        open = false; // fecha o dialog;
                        await update(); //atualiza a sidebar
                    }
                }
            }}
            class="grid gap-4 py-4"
        >
            <div class="grid grid-cols-4 items-center gap-4">
                <Label class="text-right" for="title">Título</Label>
                <Input id="title" name="title" placeholder="Ex: Google" required class="col-span-3"/>
            </div>

            <div class="grid grid-cols-4 items-center gap-4">
                <Label for="url" class="text-right">Link</Label>
                <Input id="url" name="url" placeholder="Ex: google.com.br" required class="col-span-3"/>                
            </div>

            <div class="grid grid-cols-4 items-center gap-4">
                <div class="col-start-2 col-span-3 flex items-center space-x-2">
                    <Checkbox
                        id="internal"
                        bind:checked={isInternal}
                        aria-labelledby="terms-label"
                    />
                    <input type="hidden" name="is_internal" value={isInternal ? 'on' : 'off'}>
                    <Label 
                        id="terms-label"
                        for="internal"
                        class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Link Interno (abre na mesma aba)
                    </Label>
                </div>
            </div>
            <Dialog.Footer>
                <Button type="submit" disabled={loading}>
                    {#if loading}
                        <LoaderCircle class="mr-2 h-4 w-4 animate-spin"></LoaderCircle>
                    {/if}
                    Salvar
                </Button>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root>