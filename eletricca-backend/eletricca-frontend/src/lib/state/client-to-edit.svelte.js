
let clientToEdit = $state(null);
let itemToEdit = $state();

export function getClientToEdit() {
    return clientToEdit;
}

export function setClientToEdit(client) {
    clientToEdit = client;
}

export function getItemToEdit() {
    return itemToEdit;
}
export function setItemToEdit(externalItem) {
    itemToEdit = externalItem;
}