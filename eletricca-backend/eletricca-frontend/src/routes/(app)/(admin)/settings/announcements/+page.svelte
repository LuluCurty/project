<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { toast } from 'svelte-sonner';

    // UI Components
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Textarea } from '$lib/components/ui/textarea';
    import { Separator } from '$lib/components/ui/separator';
    import * as AlertDialog from "$lib/components/ui/alert-dialog";
    
    // Icons
    import { ArrowLeft, Megaphone, Save, Trash2, ExternalLink, Info } from '@lucide/svelte';

    let { data, form } = $props();

    // Estado local inicializado com os dados do banco ou valores vazios
    let message = $state(data.announcement?.message || '');
    let link = $state(data.announcement?.link || '');
    
    let isSubmitting = $state(false);
    let isDeleteOpen = $state(false);

    // Se o banco atualizar (ex: navegação), atualiza o form
    $effect(() => {
        if (data.announcement) {
            message = data.announcement.message;
            link = data.announcement.link || '';
        } else {
            // Se não tiver anuncio no banco, limpa (caso tenhamos acabado de deletar)
            message = '';
            link = '';
        }
    });

    // Função auxiliar para deletar
    let deleteForm: HTMLFormElement;
</script>

<div class="max-w-4xl mx-auto space-y-6 pt-6">
    
    <div class="flex items-center gap-4">
        <Button variant="ghost" size="icon" onclick={() => goto('/settings')}>
            <ArrowLeft class="size-4" />
        </Button>
        <div>
            <h1 class="text-2xl font-bold tracking-tight">Barra de Anúncios</h1>
            <p class="text-muted-foreground">Configure a mensagem global que aparece no topo do site.</p>
        </div>
    </div>

    <div class="grid gap-8 md:grid-cols-[1fr_350px]">
        
        <div class="space-y-6">
            <Card.Root>
                <Card.Header>
                    <Card.Title>Conteúdo da Mensagem</Card.Title>
                    <Card.Description>O que você quer comunicar aos usuários?</Card.Description>
                </Card.Header>
                <Card.Content>
                    <form 
                        method="POST" 
                        action="?/save"
                        use:enhance={() => {
                            isSubmitting = true;
                            return async ({ result, update }) => {
                                if (result.type === 'success') {
                                    toast.success('Anúncio atualizado com sucesso!');
                                    await update({ reset: false });
                                } else if (result.type === 'failure') {
                                    toast.error(String(result.data?.error ) || 'Erro ao salvar.');
                                }
                                isSubmitting = false;
                            };
                        }}
                        class="space-y-4"
                    >
                        {#if form?.error}
                            <div class="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
                                {form.error}
                            </div>
                        {/if}

                        <div class="space-y-2">
                            <Label for="message">Mensagem <span class="text-red-500">*</span></Label>
                            <Textarea 
                                id="message" 
                                name="message" 
                                placeholder="Ex: Manutenção programada para este domingo às 22h." 
                                class="resize-none h-24"
                                bind:value={message}
                                required
                            />
                            <p class="text-[11px] text-muted-foreground text-right">
                                {message.length} caracteres
                            </p>
                        </div>

                        <div class="space-y-2">
                            <Label for="link">Link de Ação (Opcional)</Label>
                            <div class="relative">
                                <ExternalLink class="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                                <Input 
                                    id="link" 
                                    name="link" 
                                    placeholder="https://..." 
                                    class="pl-9"
                                    bind:value={link}
                                />
                            </div>
                            <p class="text-[11px] text-muted-foreground">
                                Se preenchido, a barra inteira se tornará um link clicável.
                            </p>
                        </div>

                        <div class="pt-4 flex items-center justify-between">
                            {#if data.announcement}
                                <Button 
                                    type="button" 
                                    variant="destructive" 
                                    onclick={() => isDeleteOpen = true}
                                >
                                    <Trash2 class="mr-2 size-4" /> Desativar Barra
                                </Button>
                            {:else}
                                <div></div> {/if}

                            <Button type="submit" disabled={isSubmitting}>
                                {#if isSubmitting}
                                    Salvando...
                                {:else}
                                    <Save class="mr-2 size-4" /> Publicar Anúncio
                                {/if}
                            </Button>
                        </div>
                    </form>
                </Card.Content>
            </Card.Root>
        </div>

        <div class="space-y-4">
            <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wider pl-1">
                Pré-visualização
            </h3>
            
            <div class="border rounded-xl overflow-hidden shadow-sm ">
                <div class="bg-primary px-4 py-3 text-primary-foreground text-sm font-medium text-center relative flex items-center justify-center min-h-10">
                    {#if message}
                        <div>
                            <Megaphone size={14} class="inline mr-2"/><span class="inline"> {message}</span>
                        </div>
                        {#if link}
                            <ExternalLink class="ml-2 size-3 inline opacity-80" />
                        {/if}
                    {:else}
                        <span class="opacity-50 italic text-xs">A mensagem aparecerá aqui...</span>
                    {/if}
                </div>

                <div class="p-4 space-y-4 opacity-50 pointer-events-none select-none grayscale bg-muted/30">
                    <div class="flex items-center justify-between">
                        <div class="h-4 w-24 bg-foreground/20 rounded"></div>
                        <div class="flex gap-2">
                            <div class="size-8 rounded-full bg-foreground/20"></div>
                        </div>
                    </div>
                    <div class="h-32 bg-foreground/10 rounded-lg border border-dashed border-foreground/20 flex items-center justify-center">
                        <span class="text-xs">Conteúdo do Site</span>
                    </div>
                </div>
            </div>

            <div class="bg-blue-50 text-blue-700 p-4 rounded-lg text-sm flex gap-3 items-start border border-blue-100">
                <Info class="size-5 shrink-0 mt-0.5" />
                <p>
                    A barra de anúncios é exibida no topo de todas as páginas para todos os usuários logados. Use com moderação para avisos importantes.
                </p>
            </div>
        </div>

    </div>
</div>

<form action="?/delete" method="POST" bind:this={deleteForm} use:enhance class="hidden"></form>

<AlertDialog.Root bind:open={isDeleteOpen}>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>Desativar barra de anúncios?</AlertDialog.Title>
            <AlertDialog.Description>
                A mensagem atual será removida e a barra deixará de aparecer para os usuários imediatamente.
            </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
            <AlertDialog.Action 
                class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onclick={() => deleteForm.requestSubmit()}
            >
                Sim, desativar
            </AlertDialog.Action>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>