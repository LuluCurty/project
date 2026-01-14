<script lang="ts">
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import type { PageData, ActionData } from './$types';

    // UI Components
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Separator } from '$lib/components/ui/separator';
    import { Badge } from '$lib/components/ui/badge';
    import * as Tabs from "$lib/components/ui/tabs";

    // Icons
    import { User, Lock, Save, ShieldCheck, Mail, Phone } from '@lucide/svelte';

    let { data, form }: { data: PageData, form: ActionData } = $props();
    
    let profile = $derived(data.profile);
    
    let isLoadingInfo = $state(false);
    let isLoadingPass = $state(false);

    // Efeito para mostrar Toasts baseado no retorno do form
    $effect(() => {
        if (form?.success) {
            toast.success(form.message || 'Operação realizada!');
        } else if (form?.error) {
            toast.error(form.error);
        }
    });

    // Pega as iniciais para o Avatar
    function getInitials(first: string, last: string) {
        return (first[0] + (last ? last[0] : '')).toUpperCase();
    }
</script>

<div class="space-y-6 fade-in slide-in-from-bottom-4 duration-500">
    
    <div>
        <h1 class="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p class="text-muted-foreground">Gerencie suas informações pessoais e segurança.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
        
        <div class="space-y-6">
            <Card.Root class="text-center overflow-hidden">
                <div class="bg-primary/10 h-24 w-full relative"></div>
                <div class="px-6 pb-6 -mt-12 relative">
                    <div class="mx-auto size-24 rounded-full bg-background p-1.5 shadow-sm">
                        <div class="size-full rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-inner">
                            {getInitials(profile.first_name, profile.last_name)}
                        </div>
                    </div>
                    
                    <div class="mt-4 space-y-1">
                        <h2 class="text-xl font-semibold">{profile.first_name} {profile.last_name || ''}</h2>
                        <div class="flex items-center justify-center gap-2">
                            <Badge variant="secondary" class="gap-1">
                                <ShieldCheck class="size-3" />
                                {profile.role_name || 'Sem Cargo'}
                            </Badge>
                        </div>
                    </div>

                    <Separator class="my-4" />

                    <div class="space-y-3 text-sm text-left">
                        <div class="flex items-center gap-3 text-muted-foreground">
                            <Mail class="size-4" />
                            <span class="truncate" title={profile.email}>{profile.email}</span>
                        </div>
                        {#if profile.telphone}
                        <div class="flex items-center gap-3 text-muted-foreground">
                            <Phone class="size-4" />
                            <span>{profile.telphone}</span>
                        </div>
                        {/if}
                    </div>
                </div>
            </Card.Root>
        </div>

        <div class="space-y-6">
            <Tabs.Root value="geral" class="w-full">
                <Tabs.List class="grid w-full grid-cols-2">
                    <Tabs.Trigger value="geral">Dados Pessoais</Tabs.Trigger>
                    <Tabs.Trigger value="seguranca">Segurança & Senha</Tabs.Trigger>
                </Tabs.List>
                
                <Tabs.Content value="geral">
                    <Card.Root>
                        <Card.Header>
                            <Card.Title>Informações Básicas</Card.Title>
                            <Card.Description>Atualize como você é identificado no sistema.</Card.Description>
                        </Card.Header>
                        <Card.Content>
                            <form 
                                method="POST" 
                                action="?/updateInfo"
                                use:enhance={() => {
                                    isLoadingInfo = true;
                                    return async ({ update }) => {
                                        await update();
                                        isLoadingInfo = false;
                                    };
                                }}
                                class="space-y-4"
                            >
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="space-y-2">
                                        <Label>Nome</Label>
                                        <Input name="first_name" value={form?.firstName ?? profile.first_name} required />
                                    </div>
                                    <div class="space-y-2">
                                        <Label>Sobrenome</Label>
                                        <Input name="last_name" value={form?.lastName ?? profile.last_name} />
                                    </div>
                                </div>

                                <div class="space-y-2">
                                    <Label>Email</Label>
                                    <Input value={profile.email} disabled class="bg-muted" />
                                    <p class="text-[11px] text-muted-foreground">O email não pode ser alterado por aqui.</p>
                                </div>

                                <div class="space-y-2">
                                    <Label>Telefone</Label>
                                    <Input name="telphone" value={form?.telphone ?? profile.telphone} placeholder="(00) 00000-0000" />
                                </div>

                                <div class="flex justify-end pt-2">
                                    <Button type="submit" disabled={isLoadingInfo}>
                                        {#if isLoadingInfo}
                                            <span class="animate-spin mr-2">⏳</span> Salvando...
                                        {:else}
                                            <Save class="mr-2 size-4" /> Salvar Alterações
                                        {/if}
                                    </Button>
                                </div>
                            </form>
                        </Card.Content>
                    </Card.Root>
                </Tabs.Content>

                <Tabs.Content value="seguranca">
                    <Card.Root>
                        <Card.Header>
                            <Card.Title>Alterar Senha</Card.Title>
                            <Card.Description>Para sua segurança, exigimos a senha atual.</Card.Description>
                        </Card.Header>
                        <Card.Content>
                            <form 
                                method="POST" 
                                action="?/changePassword"
                                use:enhance={() => {
                                    isLoadingPass = true;
                                    return async ({ update, result }) => {
                                        await update({ reset: result.type === 'success' }); // Limpa form só se der certo
                                        isLoadingPass = false;
                                    };
                                }}
                                class="space-y-4"
                            >
                                <div class="space-y-2">
                                    <Label>Senha Atual</Label>
                                    <div class="relative">
                                        <Lock class="absolute left-2 top-2.5 size-4 text-muted-foreground" />
                                        <Input type="password" name="current_password" class="pl-8" required />
                                    </div>
                                </div>

                                <Separator />

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="space-y-2">
                                        <Label>Nova Senha</Label>
                                        <Input type="password" name="new_password" required minlength={6} />
                                    </div>
                                    <div class="space-y-2">
                                        <Label>Confirmar Nova Senha</Label>
                                        <Input type="password" name="confirm_password" required minlength={6} />
                                    </div>
                                </div>

                                <div class="flex justify-end pt-2">
                                    <Button type="submit" variant="destructive" disabled={isLoadingPass}>
                                        {#if isLoadingPass}
                                            <span class="animate-spin mr-2">⏳</span> Alterando...
                                        {:else}
                                            <Lock class="mr-2 size-4" /> Atualizar Senha
                                        {/if}
                                    </Button>
                                </div>
                            </form>
                        </Card.Content>
                    </Card.Root>
                </Tabs.Content>
            </Tabs.Root>
        </div>
    </div>
</div>