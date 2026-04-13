<script lang="ts">
    import { enhance } from '$app/forms';
    import { deserialize } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import { toast } from 'svelte-sonner';
    import type { PageData, ActionData } from './$types';

    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Separator } from '$lib/components/ui/separator';
    import { Badge } from '$lib/components/ui/badge';
    import * as Tabs from '$lib/components/ui/tabs';

    import {
        Lock, Save, ShieldCheck, Mail, Phone, AtSign,
        Camera, ImageUp, LoaderCircle as Loader2, User, TriangleAlert
    } from '@lucide/svelte';

    import ImageCropDialog from '$lib/components/ImageCropDialog.svelte';

    let { data, form }: { data: PageData, form: ActionData } = $props();

    let profile = $derived(data.profile);

    let isLoadingInfo   = $state(false);
    let isLoadingPass   = $state(false);
    let isLoadingAvatar = $state(false);
    let isLoadingBanner = $state(false);

    let avatarFileInput: HTMLInputElement;
    let bannerFileInput: HTMLInputElement;

    // Arquivo aguardando recorte antes do upload
    let pendingAvatar = $state<File | null>(null);
    let pendingBanner = $state<File | null>(null);

    // Toasts para actions updateInfo / changePassword (via use:enhance)
    $effect(() => {
        if (form?.success) toast.success((form as any).message || 'Operação realizada!');
        else if (form?.error) toast.error((form as any).error);
    });

    function getInitials(first: string, last: string) {
        return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase();
    }

    // Abre o cropper ao selecionar arquivo (não faz upload ainda)
    function handleAvatarChange(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (file) pendingAvatar = file;
    }

    function handleBannerChange(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (file) pendingBanner = file;
    }

    // Chamado após o usuário confirmar o recorte
    async function uploadAvatar(blob: Blob) {
        pendingAvatar = null;
        isLoadingAvatar = true;
        const formData = new FormData();
        formData.set('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
        try {
            const response = await fetch('?/uploadAvatar', { method: 'POST', body: formData });
            const result = deserialize(await response.text());
            if (result.type === 'success') {
                toast.success((result.data as any)?.message ?? 'Foto de perfil atualizada!');
                await invalidateAll();
            } else if (result.type === 'failure') {
                toast.error((result.data as any)?.error ?? 'Erro ao fazer upload');
            }
        } catch {
            toast.error('Erro de conexão');
        }
        isLoadingAvatar = false;
    }

    async function uploadBanner(blob: Blob) {
        pendingBanner = null;
        isLoadingBanner = true;
        const formData = new FormData();
        formData.set('file', new File([blob], 'banner.jpg', { type: 'image/jpeg' }));
        try {
            const response = await fetch('?/uploadBanner', { method: 'POST', body: formData });
            const result = deserialize(await response.text());
            if (result.type === 'success') {
                toast.success((result.data as any)?.message ?? 'Banner atualizado!');
                await invalidateAll();
            } else if (result.type === 'failure') {
                toast.error((result.data as any)?.error ?? 'Erro ao fazer upload');
            }
        } catch {
            toast.error('Erro de conexão');
        }
        isLoadingBanner = false;
    }
</script>

<div class="space-y-6 fade-in slide-in-from-bottom-4 duration-500">

    <div>
        <h1 class="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p class="text-muted-foreground">Gerencie suas informações pessoais e segurança.</p>
    </div>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-[300px_1fr]">

        <!-- ── Sidebar: Foto de perfil ── -->
        <div class="space-y-4">
            <Card.Root class="overflow-hidden">

                <!-- Banner -->
                <div
                    class="relative h-36 cursor-pointer group"
                    onclick={() => !isLoadingBanner && bannerFileInput.click()}
                    role="button"
                    tabindex="0"
                    onkeydown={(e) => e.key === 'Enter' && bannerFileInput.click()}
                    aria-label="Alterar banner"
                >
                    {#if profile?.banner_url}
                        <img
                            src={profile.banner_url}
                            alt="Banner do perfil"
                            class="size-full object-cover"
                        />
                    {:else}
                        <div class="size-full bg-linear-to-br from-primary/40 via-primary/20 to-primary/5"></div>
                    {/if}

                    <!-- Hover overlay -->
                    <div class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        {#if isLoadingBanner}
                            <Loader2 class="size-6 animate-spin text-white" />
                        {:else}
                            <ImageUp class="size-5 text-white" />
                            <span class="text-xs font-medium text-white">Alterar Banner</span>
                            <span class="text-[10px] text-white/70">JPG, PNG, WEBP · Máx. 10 MB</span>
                        {/if}
                    </div>

                    <input
                        bind:this={bannerFileInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        class="hidden"
                        onchange={handleBannerChange}
                    />
                </div>

                <!-- Avatar + Info -->
                <div class="px-5 pb-5 -mt-12">

                    <!-- Avatar -->
                    <div
                        class="relative inline-block cursor-pointer group"
                        onclick={() => !isLoadingAvatar && avatarFileInput.click()}
                        role="button"
                        tabindex="0"
                        onkeydown={(e) => e.key === 'Enter' && avatarFileInput.click()}
                        aria-label="Alterar foto de perfil"
                    >
                        <div class="size-24 rounded-full border-4 border-background bg-background shadow-md">
                            {#if profile?.avatar_url}
                                <img
                                    src={profile.avatar_url}
                                    alt="Foto de perfil"
                                    class="size-full rounded-full object-cover"
                                />
                            {:else}
                                <div class="size-full rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                                    {getInitials(profile?.first_name ?? '', profile?.last_name ?? '')}
                                </div>
                            {/if}
                        </div>

                        <!-- Camera overlay -->
                        <div class="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                            {#if isLoadingAvatar}
                                <Loader2 class="size-5 animate-spin text-white" />
                            {:else}
                                <Camera class="size-5 text-white" />
                            {/if}
                        </div>

                        <input
                            bind:this={avatarFileInput}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            class="hidden"
                            onchange={handleAvatarChange}
                        />
                    </div>

                    <!-- Nome + cargo -->
                    <div class="mt-3 space-y-1.5">
                        <h2 class="text-xl font-semibold leading-tight">
                            {profile?.first_name ?? ''} {profile?.last_name ?? ''}
                        </h2>
                        <Badge variant="secondary" class="gap-1 text-xs">
                            <ShieldCheck class="size-3" />
                            {profile?.role_name ?? 'Sem Cargo'}
                        </Badge>
                    </div>

                    <Separator class="my-4" />

                    <!-- Contato -->
                    <div class="space-y-2.5 text-sm text-muted-foreground">
                        {#if profile?.username}
                            <div class="flex items-center gap-2.5">
                                <AtSign class="size-4 shrink-0" />
                                <span class="truncate font-mono" title={profile.username}>{profile.username}</span>
                            </div>
                        {/if}
                        {#if profile?.email}
                            <div class="flex items-center gap-2.5">
                                <Mail class="size-4 shrink-0" />
                                <span class="truncate" title={profile.email}>{profile.email}</span>
                            </div>
                        {/if}
                        {#if profile?.telphone}
                            <div class="flex items-center gap-2.5">
                                <Phone class="size-4 shrink-0" />
                                <span>{profile.telphone}</span>
                            </div>
                        {:else}
                            <div class="flex items-center gap-2.5 opacity-40">
                                <Phone class="size-4 shrink-0" />
                                <span class="italic">Telefone não cadastrado</span>
                            </div>
                        {/if}
                    </div>

                    <Separator class="my-4" />

                    <p class="text-center text-[11px] text-muted-foreground">
                        Clique na foto ou no banner para alterar
                    </p>
                </div>
            </Card.Root>
        </div>

        <!-- ── Conteúdo principal ── -->
        <div class="space-y-6">
            <Tabs.Root value="geral" class="w-full">
                <Tabs.List class="grid w-full grid-cols-2">
                    <Tabs.Trigger value="geral">
                        <User class="mr-1.5 size-3.5" />
                        Dados Pessoais
                    </Tabs.Trigger>
                    <Tabs.Trigger value="seguranca">
                        <Lock class="mr-1.5 size-3.5" />
                        Segurança & Senha
                    </Tabs.Trigger>
                </Tabs.List>

                <!-- Tab: Dados Pessoais -->
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
                                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div class="space-y-2">
                                        <Label for="first_name">Nome</Label>
                                        <Input
                                            id="first_name"
                                            name="first_name"
                                            value={(form as any)?.firstName ?? profile?.first_name ?? ''}
                                            required
                                        />
                                    </div>
                                    <div class="space-y-2">
                                        <Label for="last_name">Sobrenome</Label>
                                        <Input
                                            id="last_name"
                                            name="last_name"
                                            value={(form as any)?.lastName ?? profile?.last_name ?? ''}
                                        />
                                    </div>
                                </div>

                                <div class="space-y-2">
                                    <Label for="email">Email</Label>
                                    <div class="relative">
                                        <Mail class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            class="pl-9"
                                            value={(form as any)?.email ?? profile?.email ?? ''}
                                            placeholder="email@eletricca.com.br"
                                        />
                                    </div>
                                    {#if profile?.auth_source === 'SSH' && !profile?.email}
                                        <p class="text-[11px] text-muted-foreground">Associe um email para ter outra forma de login além do username SSH.</p>
                                    {:else}
                                        <p class="text-[11px] text-muted-foreground">Pode ser usado para login no sistema.</p>
                                    {/if}
                                </div>

                                <div class="space-y-2">
                                    <Label for="username">Nome de Usuário</Label>
                                    <div class="relative">
                                        <AtSign class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                        <Input
                                            id="username"
                                            name="username"
                                            class="pl-9 {profile?.auth_source === 'SSH' ? 'bg-muted' : ''}"
                                            value={(form as any)?.username ?? profile?.username ?? ''}
                                            placeholder="joao.silva"
                                            disabled={profile?.auth_source === 'SSH'}
                                        />
                                    </div>
                                    {#if profile?.auth_source === 'SSH'}
                                        <p class="text-[11px] text-muted-foreground">Username vinculado ao servidor SSH — não pode ser alterado aqui.</p>
                                    {:else}
                                        <p class="text-[11px] text-muted-foreground">Pode ser usado para login no sistema. Sem espaços.</p>
                                    {/if}
                                </div>

                                <div class="space-y-2">
                                    <Label for="telphone">Telefone</Label>
                                    <Input
                                        id="telphone"
                                        name="telphone"
                                        value={(form as any)?.telphone ?? profile?.telphone ?? ''}
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>

                                <div class="flex justify-end pt-2">
                                    <Button type="submit" disabled={isLoadingInfo}>
                                        {#if isLoadingInfo}
                                            <Loader2 class="mr-2 size-4 animate-spin" /> Salvando...
                                        {:else}
                                            <Save class="mr-2 size-4" /> Salvar Alterações
                                        {/if}
                                    </Button>
                                </div>
                            </form>
                        </Card.Content>
                    </Card.Root>
                </Tabs.Content>

                <!-- Tab: Segurança -->
                <Tabs.Content value="seguranca">
                    <Card.Root>
                        <Card.Header>
                            <Card.Title>Alterar Senha</Card.Title>
                            <Card.Description>Para sua segurança, exigimos a senha atual.</Card.Description>
                        </Card.Header>
                        <Card.Content>
                            {#if profile?.auth_source === 'SSH'}
                                <div class="mb-4 flex gap-3 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
                                    <TriangleAlert class="mt-0.5 size-4 shrink-0" />
                                    <p>
                                        Sua conta foi criada via <strong>autenticação SSH</strong>.
                                        Alterar a senha aqui afeta <strong>apenas o acesso ao sistema web</strong> —
                                        sua senha SSH pessoal no servidor Linux permanece inalterada.
                                    </p>
                                </div>
                            {/if}
                            <form
                                method="POST"
                                action="?/changePassword"
                                use:enhance={() => {
                                    isLoadingPass = true;
                                    return async ({ update, result }) => {
                                        await update({ reset: result.type === 'success' });
                                        isLoadingPass = false;
                                    };
                                }}
                                class="space-y-4"
                            >
                                <div class="space-y-2">
                                    <Label for="current_password">Senha Atual</Label>
                                    <div class="relative">
                                        <Lock class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                        <Input
                                            id="current_password"
                                            type="password"
                                            name="current_password"
                                            class="pl-9"
                                            required
                                        />
                                    </div>
                                </div>

                                <Separator />

                                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div class="space-y-2">
                                        <Label for="new_password">Nova Senha</Label>
                                        <Input
                                            id="new_password"
                                            type="password"
                                            name="new_password"
                                            required
                                            minlength={6}
                                        />
                                    </div>
                                    <div class="space-y-2">
                                        <Label for="confirm_password">Confirmar Nova Senha</Label>
                                        <Input
                                            id="confirm_password"
                                            type="password"
                                            name="confirm_password"
                                            required
                                            minlength={6}
                                        />
                                    </div>
                                </div>

                                <p class="text-[11px] text-muted-foreground">A senha deve ter no mínimo 6 caracteres.</p>

                                <div class="flex justify-end pt-2">
                                    <Button type="submit" variant="destructive" disabled={isLoadingPass}>
                                        {#if isLoadingPass}
                                            <Loader2 class="mr-2 size-4 animate-spin" /> Alterando...
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

<!-- Croppers — abrem quando o usuário seleciona um arquivo -->
<ImageCropDialog
    file={pendingAvatar}
    shape="circle"
    onconfirm={uploadAvatar}
    oncancel={() => pendingAvatar = null}
/>

<ImageCropDialog
    file={pendingBanner}
    shape="rect"
    onconfirm={uploadBanner}
    oncancel={() => pendingBanner = null}
/>
