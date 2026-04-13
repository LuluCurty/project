<script lang="ts">
    import { enhance } from '$app/forms';
    import { deserialize } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import { goto } from '$app/navigation';
    import { toast } from 'svelte-sonner';

    import * as Card from '$lib/components/ui/card';
    import * as Tabs from '$lib/components/ui/tabs';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Switch } from '$lib/components/ui/switch';
    import { Badge } from '$lib/components/ui/badge';
    import { Separator } from '$lib/components/ui/separator';
    import ImageCropDialog from '$lib/components/ImageCropDialog.svelte';

    import {
        ArrowLeft, Save, Shield, UserCog, Lock,
        Layers, ShieldCheck, Mail, AtSign, Camera, ImageUp, LoaderCircle as Loader2
    } from '@lucide/svelte';

    let { data, form } = $props();

    let user                = $derived(data.user);
    let roles               = $derived(data.roles);
    let permissionsByModule = $derived(data.permissionsByModule);
    let rolePermissionsMap  = $derived(data.rolePermissionsMap);

    let isSubmittingInfo  = $state(false);
    let isSubmittingPerms = $state(false);
    let isLoadingAvatar   = $state(false);
    let isLoadingBanner   = $state(false);

    let selectedRoleId   = $state<string>(data.user.role_id?.toString() || '');
    let directPermissions = $state<number[]>(data.directPermissionsIds || []);

    $effect(() => {
        directPermissions = data.directPermissionsIds || [];
        selectedRoleId    = data.user.role_id?.toString() || '';
    });

    $effect(() => {
        if (form?.success) toast.success((form as any).message || 'Salvo!');
        else if (form?.error) toast.error((form as any).error);
    });

    let inheritedPermissions = $derived.by(() => {
        if (!selectedRoleId) return [];
        return rolePermissionsMap[Number(selectedRoleId)] || [];
    });

    function toggleDirect(id: number) {
        if (inheritedPermissions.includes(id)) return;
        directPermissions = directPermissions.includes(id)
            ? directPermissions.filter(p => p !== id)
            : [...directPermissions, id];
    }

    function getInitials(first: string, last: string) {
        return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase();
    }

    // ── Crop/upload de avatar e banner ──
    let pendingAvatar = $state<File | null>(null);
    let pendingBanner = $state<File | null>(null);
    let avatarFileInput: HTMLInputElement;
    let bannerFileInput: HTMLInputElement;

    function handleAvatarChange(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (file) pendingAvatar = file;
    }

    function handleBannerChange(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (file) pendingBanner = file;
    }

    async function uploadAvatar(blob: Blob) {
        pendingAvatar = null;
        isLoadingAvatar = true;
        const fd = new FormData();
        fd.set('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
        try {
            const res    = await fetch('?/uploadAvatar', { method: 'POST', body: fd });
            const result = deserialize(await res.text());
            if (result.type === 'success')  { toast.success((result.data as any)?.message ?? 'Foto atualizada!'); await invalidateAll(); }
            else if (result.type === 'failure') toast.error((result.data as any)?.error ?? 'Erro');
        } catch { toast.error('Erro de conexão'); }
        isLoadingAvatar = false;
    }

    async function uploadBanner(blob: Blob) {
        pendingBanner = null;
        isLoadingBanner = true;
        const fd = new FormData();
        fd.set('file', new File([blob], 'banner.jpg', { type: 'image/jpeg' }));
        try {
            const res    = await fetch('?/uploadBanner', { method: 'POST', body: fd });
            const result = deserialize(await res.text());
            if (result.type === 'success')  { toast.success((result.data as any)?.message ?? 'Banner atualizado!'); await invalidateAll(); }
            else if (result.type === 'failure') toast.error((result.data as any)?.error ?? 'Erro');
        } catch { toast.error('Erro de conexão'); }
        isLoadingBanner = false;
    }
</script>

<div class="mx-auto max-w-4xl space-y-6">

    <!-- Header -->
    <div class="flex items-center gap-4">
        <Button variant="ghost" size="icon" onclick={() => goto('/settings/users')}>
            <ArrowLeft class="size-4" />
        </Button>
        <div>
            <h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight">
                Editar Usuário
                <Badge variant="outline">#{user.user_id}</Badge>
            </h1>
            <p class="text-muted-foreground">Dados pessoais, foto e controle de acesso.</p>
        </div>
    </div>

    <!-- Card de perfil com banner + avatar editáveis -->
    <Card.Root class="overflow-hidden">

        <!-- Banner -->
        <div
            class="relative h-44 cursor-pointer group"
            onclick={() => !isLoadingBanner && bannerFileInput.click()}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && bannerFileInput.click()}
            aria-label="Alterar banner"
        >
            {#if user.banner_url}
                <img src={user.banner_url} alt="Banner" class="size-full object-cover" />
            {:else}
                <div class="size-full bg-linear-to-br from-primary/40 via-primary/20 to-primary/5"></div>
            {/if}
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {#if isLoadingBanner}
                    <Loader2 class="size-6 animate-spin text-white" />
                {:else}
                    <ImageUp class="size-5 text-white" />
                    <span class="text-xs font-medium text-white">Alterar Banner</span>
                    <span class="text-[10px] text-white/70">JPG, PNG, WEBP · Máx. 10 MB</span>
                {/if}
            </div>
            <input bind:this={bannerFileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" onchange={handleBannerChange} />
        </div>

        <!-- Avatar + info do usuário -->
        <div class="px-6 pb-5 -mt-12 flex items-end gap-4">

            <!-- Avatar -->
            <div
                class="relative shrink-0 cursor-pointer group"
                onclick={() => !isLoadingAvatar && avatarFileInput.click()}
                role="button"
                tabindex="0"
                onkeydown={(e) => e.key === 'Enter' && avatarFileInput.click()}
                aria-label="Alterar foto de perfil"
            >
                <div class="size-24 rounded-full border-4 border-background bg-background shadow-md">
                    {#if user.avatar_url}
                        <img src={user.avatar_url} alt="Avatar" class="size-full rounded-full object-cover" />
                    {:else}
                        <div class="size-full rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                            {getInitials(user.first_name, user.last_name)}
                        </div>
                    {/if}
                </div>
                <div class="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    {#if isLoadingAvatar}
                        <Loader2 class="size-5 animate-spin text-white" />
                    {:else}
                        <Camera class="size-5 text-white" />
                    {/if}
                </div>
                <input bind:this={avatarFileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" onchange={handleAvatarChange} />
            </div>

            <!-- Nome + cargo -->
            <div class="mb-2 space-y-1 min-w-0">
                <h2 class="text-xl font-semibold truncate">{user.first_name} {user.last_name ?? ''}</h2>
                <div class="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" class="gap-1 text-xs">
                        <ShieldCheck class="size-3" />
                        {user.role_name ?? 'Sem Cargo'}
                    </Badge>
                    {#if user.auth_source}
                        <Badge variant={user.auth_source === 'SSH' ? 'outline' : 'secondary'} class="text-xs">
                            {user.auth_source}
                        </Badge>
                    {/if}
                    {#if user.email}
                        <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail class="size-3" />
                            <span class="truncate">{user.email}</span>
                        </div>
                    {/if}
                    {#if user.username}
                        <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <AtSign class="size-3" />
                            <span class="truncate font-mono">{user.username}</span>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </Card.Root>

    <!-- Tabs -->
    <Tabs.Root value="info">
        <Tabs.List class="grid w-full grid-cols-2">
            <Tabs.Trigger value="info">
                <UserCog class="mr-1.5 size-3.5" /> Informações
            </Tabs.Trigger>
            <Tabs.Trigger value="permissoes">
                <Shield class="mr-1.5 size-3.5" /> Permissões
            </Tabs.Trigger>
        </Tabs.List>

        <!-- ── Tab: Informações ── -->
        <Tabs.Content value="info">
            <form
                method="POST"
                action="?/updateInfo"
                use:enhance={() => {
                    isSubmittingInfo = true;
                    return async ({ update }) => { await update({ reset: false }); isSubmittingInfo = false; };
                }}
            >
                <div class="grid gap-6 pt-4 md:grid-cols-[1fr_280px]">

                    <Card.Root>
                        <Card.Header>
                            <Card.Title class="text-base">Dados Pessoais</Card.Title>
                        </Card.Header>
                        <Card.Content class="space-y-4">
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-2">
                                    <Label>Nome <span class="text-destructive">*</span></Label>
                                    <Input name="first_name" value={(form as any)?.first_name ?? user.first_name} required />
                                </div>
                                <div class="space-y-2">
                                    <Label>Sobrenome</Label>
                                    <Input name="last_name" value={(form as any)?.last_name ?? user.last_name} />
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-2">
                                    <Label for="email">Email</Label>
                                    <div class="relative">
                                        <Mail class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                        <Input id="email" type="email" name="email" class="pl-9" value={(form as any)?.email ?? user.email ?? ''} placeholder="email@eletricca.com.br" />
                                    </div>
                                </div>
                                <div class="space-y-2">
                                    <Label for="username">Nome de Usuário</Label>
                                    <div class="relative">
                                        <AtSign class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                        <Input id="username" name="username" class="pl-9 font-mono" value={(form as any)?.username ?? user.username ?? ''} placeholder="joao.silva" />
                                    </div>
                                </div>
                            </div>
                            <p class="text-[11px] text-muted-foreground">Pelo menos um dos dois (email ou username) é obrigatório.</p>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-2">
                                    <Label>Telefone</Label>
                                    <Input name="telphone" value={(form as any)?.telphone ?? user.telphone} placeholder="(00) 00000-0000" />
                                </div>
                            </div>
                        </Card.Content>
                    </Card.Root>

                    <!-- Cargo + Save -->
                    <div class="space-y-4">
                        <Card.Root class="border-l-4 border-l-primary">
                            <Card.Header>
                                <Card.Title class="text-base">Cargo & Função</Card.Title>
                                <Card.Description class="text-xs">Define o nível de acesso base.</Card.Description>
                            </Card.Header>
                            <Card.Content class="space-y-4">
                                <div class="space-y-2">
                                    <Label>Cargo</Label>
                                    <select
                                        name="role_id"
                                        bind:value={selectedRoleId}
                                        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none"
                                    >
                                        <option value="">Sem Cargo</option>
                                        {#each roles as role}
                                            <option value={role.id.toString()}>{role.name}</option>
                                        {/each}
                                    </select>
                                </div>

                                {#if selectedRoleId}
                                    <div class="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                                        <Shield class="size-3 mt-0.5 shrink-0" />
                                        <span>Concede <b>{rolePermissionsMap[Number(selectedRoleId)]?.length || 0}</b> permissões automaticamente.</span>
                                    </div>
                                {/if}

                                <Separator />

                                <Button type="submit" class="w-full" disabled={isSubmittingInfo}>
                                    {#if isSubmittingInfo}
                                        <Loader2 class="mr-2 size-4 animate-spin" /> Salvando...
                                    {:else}
                                        <Save class="mr-2 size-4" /> Salvar Dados
                                    {/if}
                                </Button>
                            </Card.Content>
                        </Card.Root>
                    </div>
                </div>
            </form>
        </Tabs.Content>

        <!-- ── Tab: Permissões ── -->
        <Tabs.Content value="permissoes">
            <form
                method="POST"
                action="?/updatePermissions"
                use:enhance={() => {
                    isSubmittingPerms = true;
                    return async ({ update }) => { await update({ reset: false }); isSubmittingPerms = false; };
                }}
                class="space-y-4 pt-4"
            >
                <div class="flex items-center justify-between px-1">
                    <p class="text-sm text-muted-foreground">
                        Permissões marcadas com <Badge variant="secondary" class="h-5 px-1.5 text-[10px] gap-1 mx-1"><Lock class="size-2.5" /> Cargo</Badge> são herdadas e não podem ser removidas aqui.
                    </p>
                </div>

                {#each Object.entries(permissionsByModule) as [moduleName, perms]}
                    <Card.Root>
                        <Card.Header class="border-b bg-muted/30 py-3">
                            <div class="flex items-center gap-2">
                                <Layers class="size-4 text-muted-foreground" />
                                <Card.Title class="text-sm font-semibold capitalize">{moduleName}</Card.Title>
                            </div>
                        </Card.Header>
                        <Card.Content class="pt-4">
                            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {#each perms as p}
                                    {@const isInherited = inheritedPermissions.includes(p.id)}
                                    {@const isDirect    = directPermissions.includes(p.id)}
                                    {@const isActive    = isInherited || isDirect}

                                    <div class="flex items-start gap-3 rounded-lg border p-2 {isActive ? 'border-primary/20 bg-primary/5' : 'border-transparent'}">
                                        <div class="pt-1">
                                            <Switch
                                                checked={isActive}
                                                disabled={isInherited}
                                                onCheckedChange={() => toggleDirect(p.id)}
                                            />
                                        </div>

                                        {#if isDirect && !isInherited}
                                            <input type="checkbox" name="permissions" value={p.id} checked class="hidden" />
                                        {/if}

                                        <div class="space-y-0.5 min-w-0">
                                            <div class="flex flex-wrap items-center gap-2">
                                                <span class="text-sm font-medium {isActive ? 'text-foreground' : 'text-muted-foreground'}">
                                                    {p.slug.split('.')[1] || p.slug}
                                                </span>
                                                {#if isInherited}
                                                    <Badge variant="secondary" class="h-5 px-1.5 text-[10px] gap-1">
                                                        <Lock class="size-2.5" /> Cargo
                                                    </Badge>
                                                {/if}
                                            </div>
                                            <p class="text-[11px] leading-tight text-muted-foreground line-clamp-2">{p.description}</p>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </Card.Content>
                    </Card.Root>
                {/each}

                <div class="flex justify-end pt-2">
                    <Button type="submit" disabled={isSubmittingPerms}>
                        {#if isSubmittingPerms}
                            <Loader2 class="mr-2 size-4 animate-spin" /> Salvando...
                        {:else}
                            <Save class="mr-2 size-4" /> Salvar Permissões
                        {/if}
                    </Button>
                </div>
            </form>
        </Tabs.Content>
    </Tabs.Root>
</div>

<!-- Croppers -->
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
