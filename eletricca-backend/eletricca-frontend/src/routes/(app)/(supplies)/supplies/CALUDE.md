# Tasks System
A basic task system so my managers can give tasks to my users
Users can manage their own individual tasks
Managers will have the capacity to view assignments, statistics, delete or edit tasks

# Layout
- (supplies) -> will be home for my docs files
- (supplies)/supplies -> will be where my system is
- supplies/+page.server.ts will be where I will filter who is allowed to enter this module
- supplies/+layout.server.ts redundance for guarding the frontend
- supplies/+page.svelte will be my frontend, I will list all my supplies here, together with the options to delete, edit and create new supplies (which are permissions that will be managed by the backend on +page.server.ts)
- Users will be able to click on one task and create a new entry, meaning they will be able to answer it and send information to the backend
- This will be responsive as I plan to build a mobile app based on this system

# Rules
- Only authorized perosnal are capeble of aproving one supply list
- Users have different access and permission capabilities
- One user can create a list, but never self aprove the list
- Another user with permission to access /orders can approve one list
- Every action has its proper notification
- One supply can have multiple suppliers and it can have no supply, that way I can add a new supply without needing to add a new supplier everytime.
- Whenever we add new supplies to the list, the suppliers data should come automatically, this way the user can just click do add, instead of having to type the name of the supplier. If there are multiple suppliers, the user can change to see what supplier has the best price. 


# Database Tables involved

- TABLE supplies (
    id              SERIAL PRIMARY KEY,
    supply_name     VARCHAR(40),          
    quantity        INTEGER NOT NULL DEFAULT 0,
    image_url       TEXT,
    details         TEXT,
    creation_date   TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
)

- TABLE supplies_lists( 
    id                  SERIAL PRIMARY KEY,
    list_name           VARCHAR(255) NOT NULL,
    client_id           INT REFERENCES client(id), -- cada lista é relacionado a um cliente especifico
    created_by          INT REFERENCES users(user_id), --criado por id_usuario
    priority            VARCHAR(30) DEFAULT 'medium' CHECK (priority IN ('medium', 'low', 'high')),
    list_status         VARCHAR(50) DEFAULT 'pending' CHECK (list_status IN ('pending', 'approved', 'denied')), --pending approved denied
    creation_date       TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(), -- criado
    updated_at          TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),  -- atualizado
    description         TEXT
);

- TABLE supplier( 
    id                  SERIAL PRIMARY KEY,
    supplier_name       VARCHAR(50) NOT NULL,
    supplier_email      VARCHAR(50) NOT NULL UNIQUE,
    supplier_telephone  VARCHAR(50),
    supplier_address    TEXT,
    creation_date       timestamp without time zone now(),
    updated_at          timestamp without time zone now(), -- precisa atualizar o banco para incluir
    description         TEXT -- precisa atualizar o banco para incluir
);

- TABLE supplies_list_items(
    id                  SERIAL PRIMARY KEY,
    list_id             INT REFERENCES supplies_lists(id) ON DELETE CASCADE,
    supply_id           INT REFERENCES supplies(id),
    supplier_id         INT REFERENCES supplier(id),
    quantity            INT NOT NULL CHECK (quantity > 0),
    price               NUMERIC(12,2) NOT NULL -- preço do fornecedor
);

- TABLE supply_princing( --relacao materiais e fornecedores
    id                  SERIAL PRIMARY KEY,
    supply_id           INT REFERENCES supplies(id) ON DELETE CASCADE,
    supplier_id         INT REFERENCES suppliers(id) ON DELETE CASCADE,
    price               NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    is_default          BOOLEAN,
    UNIQUE              (supply_id, supplier_id)
)
## supplies
