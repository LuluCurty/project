<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import { Send, Image as ImageIcon, Mic, X, Play, Pause, Trash2 } from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import { slide } from 'svelte/transition';

	let { data }: { data: PageData } = $props();
	let messages = $state(data.messages);

	$effect(() => {
		messages = data.messages;
	});

	let currentUser = $derived(data.me);
	let talkingTo = $derived(data.talkingTo);

	// Estados do Chat
	let messageText = $state('');
	let selectedFile: File | null = $state(null);
	let isRecording = $state(false);
	let mediaRecorder: MediaRecorder | null = null;
	let audioChunks: Blob[] = [];
	let fileInputRef: HTMLInputElement;

	// Scroll automático para o fim
	let chatContainer: HTMLElement;
	let isNearBottom = true;

	function handleScroll() {
		if (!chatContainer) return;
		const { scrollTop, scrollHeight, clientHeight } = chatContainer;
		const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
		isNearBottom = distanceFromBottom < 100;
	}

	$effect(() => {
		messages;

		tick().then(() => {
			if (chatContainer && isNearBottom) {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}
		});
	});

	let eventSource: EventSource;
	$effect(() => {
		const talkingToId = page.params.userId;
		eventSource = new EventSource(`/stream/chat/${talkingToId}`);

		eventSource.onmessage = (event) => {
			const incomingMsg = JSON.parse(event.data);

			const index = messages.findIndex((m) => m.id === incomingMsg.id);

			if (index !== -1) {
				const newMessages = [...messages];
				newMessages[index] = incomingMsg;
				messages = newMessages;
			} else {
				messages = [...messages, incomingMsg];

				tick().then(() => {
					if (chatContainer && isNearBottom) {
						chatContainer.scrollTop = chatContainer.scrollHeight;
					}
				});
			}
		};

		eventSource.onerror = () => {
			console.error('Erro na conexão SSE');
			eventSource.close();
		};

		return () => {
			eventSource.close();
		};
	});

	// --- FUNÇÕES DE MÍDIA ---

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files?.length) selectedFile = target.files[0];
	}

	async function toggleRecording() {
		if (isRecording) {
			mediaRecorder?.stop();
			isRecording = false;
		} else {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
				mediaRecorder = new MediaRecorder(stream);
				audioChunks = [];

				mediaRecorder.ondataavailable = (event) => {
					audioChunks.push(event.data);
				};

				mediaRecorder.onstop = () => {
					const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
					// Cria um arquivo falso para enviar no formulário
					console.log('Tamanho do audio gravado:', audioBlob.size);
					selectedFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
				};

				mediaRecorder.start();
				isRecording = true;
			} catch (err) {
				alert('Erro ao acessar microfone');
			}
		}
	}

	function clearSelection() {
		selectedFile = null;
		if (fileInputRef) fileInputRef.value = '';
	}
</script>

<div
	class="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col overflow-hidden rounded-lg border bg-card shadow-sm"
>
	<div class="flex items-center gap-2 border-b bg-muted/30 p-4 font-bold">
		<div class="h-3 w-3 rounded-full bg-green-500"></div>
		{talkingTo?.first_name}
		{talkingTo?.last_name}
	</div>

	<div
		bind:this={chatContainer}
		onscroll={handleScroll}
		class="flex-1 space-y-4 overflow-y-auto bg-slate-50/50 p-4"
	>
		{#each messages as msg (msg.id)} <div class="flex {msg.sender_id === currentUser ? 'justify-end' : 'justify-start'} group">
                <div class="flex items-center gap-2 max-w-[70%]">
                    
                    {#if msg.sender_id === currentUser && !msg.is_deleted}
                        <form 
                            action="?/delete" 
                            method="POST" 
                            use:enhance 
                            class="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <input type="hidden" name="id" value={msg.id}>
                            <button type="submit" class="text-muted-foreground hover:text-red-500 p-1">
                                <Trash2 size={14} />
                            </button>
                        </form>
                    {/if}

                    <div class="rounded-lg p-3 text-sm w-full
                        {msg.sender_id === currentUser 
                            ? 'bg-primary text-primary-foreground rounded-tr-none' 
                            : 'bg-muted text-foreground rounded-tl-none'}"
                    >
                        {#if msg.is_deleted}
                            <div class="italic opacity-60 flex items-center gap-2 text-xs">
                                <Trash2 size={12}/>
                                <span>Mensagem apagada</span>
                            </div>
                        {:else}
                            {#if msg.msg_type === 'text'}
                                <p>{msg.content}</p>
                            
                            {:else if msg.msg_type === 'image'}
                                <img src={msg.content} alt="foto" class="rounded-md max-w-full h-auto mt-1" />
                            
                            {:else if msg.msg_type === 'audio'}
                                <audio controls src={msg.content} class="mt-1 h-8 w-48"></audio>
                            {/if}
                        {/if}

                        {#if !msg.is_deleted}
                            <span class="text-[10px] opacity-70 block mt-1 text-right">
                                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        {/if}
                    </div>
                </div>
            </div>
        {/each}
	</div>

	{#if selectedFile}
		<div class="flex items-center justify-between border-t bg-muted/20 p-2">
			<span class="truncate text-xs">Arquivo: {selectedFile.name}</span>
			<button
				onclick={() => (selectedFile = null)}
				class="rounded p-1 text-red-500 hover:bg-red-100"
			>
				<X size={16} />
			</button>
		</div>
	{/if}

	<div class="border-t bg-background p-3">
		<form
            action="?/send"
			method="POST"
			enctype="multipart/form-data"
			use:enhance={({ formData, cancel }) => {
				// 1. Debug no Cliente: Vamos ver o que temos antes de enviar
				if (!selectedFile && !messageText) {
					console.warn('Nada para enviar.');
					cancel();
					return;
				}

				if (selectedFile) {
					// DESEMBRULHAR O ESTADO
					const rawFile = $state.snapshot(selectedFile);

					console.log('CL: Arquivo Original:', rawFile);
					console.log('CL: Tamanho:', rawFile.size);

					if (rawFile.size === 0) {
						alert('Erro: O arquivo tem 0 bytes no cliente!');
						cancel();
						return;
					}
					const safeFile = new File([rawFile], rawFile.name, { type: rawFile.type });

					// Usamos .set para garantir que sobrescreve qualquer lixo anterior
					formData.set('file', safeFile);

					console.log('CL: Arquivo anexado ao FormData com sucesso.');
				}

				return async ({ result }) => {
					// Só limpamos se tiver dado sucesso
					if (result.type === 'success') {
						messageText = '';
						selectedFile = null;
						clearSelection();
					} else if (result.type === 'failure' || result.type === 'error') {
						alert('erro');
					}
				};
			}}
			class="flex items-center gap-2"
		>
			<input
				type="hidden"
				name="type"
				value={selectedFile ? (selectedFile.type.startsWith('audio') ? 'audio' : 'image') : 'text'}
			/>

			{#if !isRecording}
				<div class="flex items-center gap-2">
					<label
						class="cursor-pointer rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
					>
						<input
							bind:this={fileInputRef}
							type="file"
							accept="image/*"
							name="file"
							class="hidden"
							onchange={handleFileSelect}
						/>
						<ImageIcon size={20} />
					</label>

					<button
						type="button"
						onclick={toggleRecording}
						class="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
					>
						<Mic size={20} />
					</button>
				</div>

				<input
					type="text"
					name="content"
					bind:value={messageText}
					placeholder={selectedFile ? 'Arquivo pronto para envio...' : 'Digite sua mensagem...'}
					disabled={!!selectedFile}
					class="flex-1 border-none bg-transparent px-2 py-2 text-sm outline-none"
					autocomplete="off"
				/>
			{:else}
				<div class="flex flex-1 animate-pulse items-center gap-2 px-2 text-red-500">
					<div class="h-3 w-3 rounded-full bg-red-500"></div>
					<span class="text-sm font-medium">Gravando áudio...</span>
				</div>
				<button
					type="button"
					onclick={toggleRecording}
					class="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600"
				>
					Parar & Anexar
				</button>
			{/if}

			<button
				type="submit"
				disabled={!messageText && !selectedFile}
				class="rounded-full bg-primary p-2 text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
			>
				<Send size={18} />
			</button>
		</form>
	</div>
</div>
