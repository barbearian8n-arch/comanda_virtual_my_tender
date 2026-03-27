// Tipos API

interface APICommand {
    id: number;
    key: string;
    redis_key: string;
    status: string;
    contact: APICommandContact;
    items: APICommandItem[];
    formated_items?: string;
}

interface APICommandContact {
    lead_id: number;
    name: string;
    number: string;
    number_normalized: string;
}

interface APICommandItem {
    id: number;
    name: string;

    menu_info: {
        id: number;
        name: string;
        unit: string;
        price: number;
        price_per_unit: number;
        category: string;
        is_available: boolean;
        g_per_unit: number;
    };

    requested: {
        quantity: number;
        unit: string;
        estimated_price: number;
    };

    real: {
        quantity: number;
        unit: string;
        total_price: number;
    };

    created_at?: string;
    to_be_weighed: boolean;
}


// Tipos Database

interface DBCommandItem {
    id: number;
    menu_id: number;
    req_unit: string;
    req_quantity: number;
    req_estimated_price: number;
    real_unit: string;
    real_quantity: number;
    real_total_price: number;
    created_at?: string;
    to_be_weighed: boolean;
}

interface DBCommandItemJoin extends DBCommandItem {
    menu_nome: string;
    menu_unidade: string;
    menu_preco: number;
    menu_categoria: string;
    menu_g_por_uni: number;
    menu_is_disponivel: boolean;
    menu_preco_por_uni: number;
}

interface DBCommand {
    id: number;
    client_id: number;
    key: string;
    status: string;
    items: DBCommandItem[];
}

interface DBViewCommandJoin {
    command_id: number;
    command_key: string;
    client_id: number;
    client_name: string;
    client_numero: number;
    client_endereco: string;
    client_valor_entrega: number;
    command_status: string;
    delivery_address: string;
    payment_method: string;
    wa_recipient: string;
    command_created_at: string;
    command_updated_at: string;
    items: DBCommandItemJoin[];
    total_estimated_price: number;
    total_real_price: number;
    to_be_weighed: boolean;
}