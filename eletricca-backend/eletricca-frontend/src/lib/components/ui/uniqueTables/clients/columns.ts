import type { ColumnDef } from "@tanstack/table-core";

export type Client = {
    id: String;
    clientFirstName: String;
    clientLastName: String;
    clientEmail: String;
    clientTelephone: String;
};

export const columns: ColumnDef<Client>[]=[
    {
        accessorKey: "clientFirstName",
        header: "Nome"
    },
    {
        accessorKey: "clientLastName",
        header: "Sobrenome"
    },
    {
        accessorKey: "clientEmail",
        header: "Email"
    },
    {
        accessorKey: "clientTelephone",
        header: "Tel"
    },
];

