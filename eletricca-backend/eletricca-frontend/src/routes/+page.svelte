<script lang="ts">
	import Header from '$lib/components/header.svelte';
	import Footer from '$lib/components/footer.svelte';
	import Aside from '$lib/components/aside.svelte';
	import TableTitle from '$lib/components/ui/titles/TableTitle.svelte';
	import * as Table from '$lib/components/ui/table/index.js';

	import { sideBarCollapsed } from '../lib/stores/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	let isAuthenticated = $state(false);

	async function getExtensions() {
		const res = await fetch(`/api/ucm/`, {
			credentials: 'include'
		});

		const { data } = await res.json();

		console.log(data.response.account);
	}

	async function authenticate() {
		try {
			const res = await fetch('/api/auth/check', {
				credentials: 'include'
			});

			if (!res.ok) {
				goto('/login');
			}

			const data = await res.json();
			isAuthenticated = data.authenticated;

			if (!isAuthenticated) {
				goto('/login');
			}

			isAuthenticated = true;
		} catch (e) {
			console.error(e);
		}
		getExtensions();
	}

	onMount(authenticate);
</script>

<div class="app-wrapper">
	<Header />
	<Aside />
	<main class="main-app-wrapper" class:collapsed={$sideBarCollapsed}>
		<TableTitle title="Dashboard" />

		<div>
			<Table.Root>
				<Table.Caption>A list of your recent invoices.</Table.Caption>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-[100px]">Invoice</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Method</Table.Head>
						<Table.Head class="text-end">Amount</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					<Table.Row>
						<Table.Cell class="font-medium">INV001</Table.Cell>
						<Table.Cell>Paid</Table.Cell>
						<Table.Cell>Credit Card</Table.Cell>
						<Table.Cell class="text-end">$250.00</Table.Cell>
					</Table.Row>
				</Table.Body>
			</Table.Root>
		</div>
	</main>
	<Footer />
</div>
