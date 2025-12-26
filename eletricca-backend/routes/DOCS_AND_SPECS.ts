interface Item {
    item_id: number;
    item_name: string;
    creation_date: string;
}

//API RESPONSE

// GET

interface getResponseJson {
    item: Item[];
    ok: boolean;
    page: number;
    totalItems: number;
    totalPages: number;
}
// delete item
interface deleteResponseJson {
    ok: boolean;
    message: string;
    success?: boolean;
    deletedId?: number;
}
// create Item
interface createResponseJson {
    ok: boolean;
    message: string;
    createdId: number; 
}

interface updateResponseJson {
    ok: boolean;
    message: string;
    updatedId: string;
}

interface errorResponseJson {
    ok: boolean;
    message: string;
    error: string;
}