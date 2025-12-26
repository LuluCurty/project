<script lang="ts">
    import { enhance } from '$app/forms';
    import { User, Lock, Loader2, Megaphone } from 'lucide-svelte';
    import logo from '$lib/assets/logo.png';
    
    // Componentes Shadcn
    import * as Card from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label";
    import { Checkbox } from "$lib/components/ui/checkbox";
    import { Alert, AlertDescription } from "$lib/components/ui/alert";

    // Props que vêm do servidor (se der erro, o form volta preenchido)
    let { form } = $props();

    let isLoading = $state(false);
    let showPassword = $state(false);
</script>

<div class="flex min-h-screen w-full items-center justify-center bg-muted/40 px-4">
    <Card.Root class="w-full max-w-md shadow-lg">
        <Card.Header class="space-y-2 text-center">
            <div class="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <img src={logo} alt="Logo Eletricca" class="h-10 w-auto object-contain" />
            </div>
            <Card.Title class="text-2xl font-bold text-primary">Intranet</Card.Title>
            <Card.Description>Bem-vindo à nova Intranet Corporativa</Card.Description>
        </Card.Header>

        <Card.Content>
            {#if form?.error}
                <Alert variant="destructive" class="mb-4">
                    <Megaphone class="h-4 w-4" />
                    <AlertDescription>{form.error}</AlertDescription>
                </Alert>
            {/if}

            <form 
                autocomplete="on"
                method="POST" 
                action="?/login" 
                use:enhance={() => {
                    isLoading = true;
                    return async ({ update }) => {
                        await update();
                        isLoading = false;
                    };
                }}
                class="space-y-4"
            >
                <div class="space-y-2">
                    <Label for="email">Usuário / Email</Label>
                    <div class="relative">
                        <User class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="email" 
                            name="email" 
                            type="text" 
                            placeholder="usuario@eletricca.com.br" 
                            class="pl-9" 
                            value={form?.email ?? ''} 
                            required 
                        />
                    </div>
                </div>

                <div class="space-y-2">
                    <Label for="password">Senha</Label>
                    <div class="relative">
                        <Lock class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="password" 
                            name="password" 
                            type={showPassword ? "text" : "password"} 
                            placeholder="••••••" 
                            class="pl-9 pr-10" 
                            required 
                        />
                        <button 
                            type="button" 
                            onclick={() => showPassword = !showPassword}
                            class="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                        >
                            {#if showPassword}
                                <span class="text-xs font-medium">Ocultar</span>
                            {:else}
                                <span class="text-xs font-medium">Ver</span>
                            {/if}
                        </button>
                    </div>
                </div>

                <div class="flex items-center space-x-2">
                    <Checkbox id="remember-me" name="remember-me" />
                    <Label for="remember-me" class="text-sm font-normal text-muted-foreground">
                        Manter conectado
                    </Label>
                </div>

                <Button type="submit" class="w-full" disabled={isLoading}>
                    {#if isLoading}
                        <Loader2 class="mr-2 h-4 w-4 animate-spin" /> Entrando...
                    {:else}
                        Entrar
                    {/if}
                </Button>
            </form>
        </Card.Content>
        
        <Card.Footer class="flex justify-center pb-6">
            <p class="text-xs text-muted-foreground">
                © {new Date().getFullYear()} Eletricca. Todos os direitos reservados.
            </p>
        </Card.Footer>
    </Card.Root>
</div>