
let clientToEdit = $state(null);

export function getClientToEdit() {
    return clientToEdit;
}

export function setClientToEdit(client) {
    clientToEdit = client;
}