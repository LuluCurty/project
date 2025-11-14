CREATE TABLE IF NOT EXISTS users (
    id             SERIAL PRIMARY KEY,
    email               VARCHAR(150) NOT NULL UNIQUE,
    password_hashed     VARCHAR(255) NOT NULL,
    telphone            VARCHAR(20),
    user_role           user_role_type NOT NULL DEFAULT 'clients'
    first_name          VARCHAR(30) NOT NULL,
    last_name           VARCHAR(30) NOT NULL,
    creation_date       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
    service_id  SERIAL PRIMARY KEY,
    first_name  VARCHAR(10) NOT NULL,
    service_status  VARCHAR(30) DEFAULT 'pending',
    details     TEXT,
    creation_date   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplies ( --tabela que nunca mais vai mudar kkk
    id              SERIAL PRIMARY KEY,
    supply_name     VARCHAR(40),          
    quantity        INTEGER NOT NULL DEFAULT 0,
    image_url       TEXT,
    details         TEXT,
    creation_date   TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    price           numeric(10,2),
    supplier        VARCHAR(50)
)
CREATE TYPE IF NOT EXISTS user_role_type AS ENUM (
    'admin',
    'managers',
    'operators',
    'clients'
)


--daqui pra baixo é lista + fornecedor + cliente + 
--relçaõ preço, material, lista, fornecedor
-- convencao: usar id para tabela interna
--xxx_id para tabela externa (chave estrangeira)
CREATE TABLE IF NOT EXISTS client ( --show
    id           SERIAL PRIMARY KEY,
    client_first_name   VARCHAR(100) NOT NULL,
    client_last_name    VARCHAR(100) NOT NULL,
    client_telephone    VARCHAR(30) NOT NULL, 
    client_email        VARCHAR(255) NOT NULL UNIQUE,
    creation_date       TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplies_lists( --show
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

CREATE TABLE IF NOT EXISTS supplies_list_items(
    id                  SERIAL PRIMARY KEY,
    list_id             INT REFERENCES supplies_lists(id) ON DELETE CASCADE,
    supply_id           INT REFERENCES supplies(id),
    supplier_id         INT REFERENCES supplier(id),
    quantity            INT NOT NULL CHECK (quantity > 0),
    price               NUMERIC(12,2) NOT NULL -- preço do fornecedor
)

CREATE TABLE IF NOT EXISTS suppliers( --show
    id                  SERIAL PRIMARY KEY,
    supplier_name       VARCHAR(50) NOT NULL,
    supplier_email      VARCHAR(50) NOT NULL UNIQUE,
    supplier_telephone  VARCHAR(50),
    supplier_address    TEXT
)

CREATE TABLE IF NOT EXISTS rel_supplies_suppliers( --relacao materiais e fornecedores
    id                  SERIAL PRIMARY KEY,
    supply_id           INT REFERENCES supplies(id) ON DELETE CASCADE,
    supplier_id         INT REFERENCES suppliers(id) ON DELETE CASCADE,
    price               NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    UNIQUE              (supply_id, supplier_id)
)
CREATE OR REPLACE VIEW v_supplies_list_totals AS
    SELECT
        list.id AS list_id,
        list.list_name, 
        SUM(items.quantity * items.price) AS total_price
    FROM supplies_lists list
    JOIN supplies_list_items items ON list.id = items.list_id
    GROUP BY list.id, list.list_name;


/* CREATE DATABASE eletricca;
CREATE USER eletricca_user WITH PASSWORD "eletrO@8002";
GRANT ALL PRIVILEGES ON DATABASE eletricca TO eletricca_user;
ALTER DATABASE eletricca OWNER TO eletricca_user;  */