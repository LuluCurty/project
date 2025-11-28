<script lang="ts">

    import { goto } from '$app/navigation';
    import { LockKeyhole, LockKeyholeOpen, User, LogIn } from '@lucide/svelte';

    let password_hashed = $state<string>('');
    let email = $state<string>('');
    let rememberMe = $state<boolean>(false);
    let err = $state<string>('');
    let showPassword = $state<boolean>(false);
    

    async function login(event: Event): Promise<void> {
        event.preventDefault();
        err='';
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password_hashed, rememberMe })
            });

            const user = await res.json();

            if (user.user.user_id) {
                localStorage.setItem('user', user.user.email);
                goto('/');
            }

        } catch (error) {
            console.error(error);
            alert('Login Falhou');
        }
    }
</script>

<div class="main-ap-login">
    <div class="container">
        {#if err}
            <div class="hidden warning"></div>
        {/if}

        <form class="login-form clear-both" autocomplete="on" onsubmit={login}>
            
            <div class="title">
                <img src="http://10.242.241.230/public/imgs/icone.png" alt="logo">
                <h2>Intranet</h2>
            </div>

            <div class="welcome">
                <p>Bem vindo a nova Intranet</p>
            </div>

            <div class="input-wrapper">
                <User class="icon" />
                <input 
                    type="text" 
                    class="inputs" 
                    placeholder="Username/Email" 
                    required 
                    autocomplete="username"
                    id="email"
                    bind:value={email}
                >
            </div>

            <div class="input-wrapper">
                <button type="button" tabindex="-1">
                    {#if showPassword} 
                        <LockKeyholeOpen class="icon"/>
                    {:else}
                        <LockKeyhole class="icon" />
                    {/if}
                </button>
                <input 
                    type={showPassword? "text" : "password"}
                    autocomplete="current-password"
                    class="app-input"
                    required
                    placeholder="Senha"
                    bind:value={password_hashed}
                >
            </div>

            <div class="remember-me">
                <input 
                    type="checkbox" 
                    name="remember-me" 
                    id="remember-me" 
                    bind:checked={rememberMe}
                >
                <label for="remember-me">Lembre-me</label>
            </div>

            <div class="log-in">
                <button type="submit" class="login-wrapper">
                    <LogIn class='icon'/>
                    <span>Login</span>
                </button>
            </div>
        </form>
    </div>
</div>