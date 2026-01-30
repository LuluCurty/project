CREATE TABLE IF NOT EXISTS users (
    user_id                  SERIAL PRIMARY KEY,
    email               VARCHAR(150) NOT NULL UNIQUE,
    password_hashed     VARCHAR(255) NOT NULL,
    telphone            VARCHAR(20),
    user_role           user_role_type NOT NULL DEFAULT 'clients',
    first_name          VARCHAR(30) NOT NULL,
    last_name           VARCHAR(30) NOT NULL,
    creation_date       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
    id  SERIAL PRIMARY KEY,
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
--relaçaõ preço, material, lista, fornecedor
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

CREATE TABLE IF NOT EXISTS user_favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permissions_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permissions_id)
);

CREATE TABLE IF NOT EXISTS user_permissions (
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    permissions_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, permissions_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    content TEXT,
    msg_type VARCHAR(10) DEFAULT 'text', 
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_sender FOREIGN KEY(sender_id) REFERENCES users(user_id),
    CONSTRAINT fk_receiver FOREIGN KEY(receiver_id) REFERENCES users(user_id)
);

-- =============================
-- FORMS
-- =============================
CREATE TABLE IF NOT EXISTS forms (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INT NOT NULL REFERENCES users(user_id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================
-- FORMS FIELDS
-- =============================
CREATE TABLE IF NOT EXISTS form_fields(
    id SERIAL PRIMARY KEY,
    form_id INT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    field_type VARCHAR(50) NOT NULL, --text, number, select, checkbox, date, textarea, file
    label VARCHAR(255) NOT NULL,
    placeholder VARCHAR(255),
    options JSONB, -- ["opção 1", "opção 2"]
    is_required BOOLEAN DEFAULT false,
    field_order INT NOT NULL, 
    -- conditional
    condition_field_id INT REFERENCES form_fields(id) ON DELETE SET NULL, 
    condition_operator VARCHAR(20), -- equals, not_equals, contains
    condition_value TEXT,
    -- soft delete
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()   
);

-- =============================
--  FORM ASSIGNMENTS
-- =============================
CREATE TABLE IF NOT EXISTS form_assignments(
    id SERIAL PRIMARY KEY,
    form_id INT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    assigned_by INT NOT NULL REFERENCES users(user_id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    due_date TIMESTAMP,
    period_reference VARCHAR(50), --'Jan/2025', 'Semana 15'
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP
);

-- =============================
-- FORM RESPONSES
-- =============================
CREATE TABLE IF NOT EXISTS form_responses(
    id SERIAL PRIMARY KEY,
    form_id INT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id),
    assignment_id INT REFERENCES form_assignments(id) ON DELETE SET NULL,
    submitted_at TIMESTAMP DEFAULT NOW(),
    edited_by INT REFERENCES users(user_id),
    edited_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS form_response_values(
    id SERIAL PRIMARY KEY, 
    response_id INT NOT NULL REFERENCES form_responses(id) ON DELETE CASCADE,
    field_id INT NOT NULL REFERENCES form_fields(id) ON DELETE RESTRICT,
    value TEXT
);

CREATE TABLE IF NOT EXISTS form_files(
    id SERIAL PRIMARY KEY,
    response_id INT NOT NULL REFERENCES form_responses(id) ON DELETE CASCADE,
    field_id INT NOT NULL REFERENCES form_fields(id) ON DELETE RESTRICT,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INT,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- =============================
-- INDEXES
-- =============================
CREATE INDEX idx_form_fields_form ON form_fields(form_id);
CREATE INDEX idx_assignments_user ON form_assignments(user_id);
CREATE INDEX idx_assignments_form ON form_assignments(form_id);
CREATE INDEX idx_responses_form ON form_responses(form_id);
CREATE INDEX idx_responses_user ON form_responses(user_id);
CREATE INDEX idx_values_response ON form_response_values(response_id);
CREATE INDEX idx_files_response ON form_files(response_id);




INSERT INTO roles(name, description) VALUES 
('Super Admin','Acesso total'),
('Admin','Acesso administrativo'),
('Gerente','Gestão'),
('Usuario', 'Usuario Blank Padrão');

INSERT INTO permissions (slug, description, module) VALUES 
('users.view', 'Visualizar lista de usuários', 'Usuários'),
('users.create', 'Criar novos usuários', 'Usuários'),
('users.edit', 'Editar usuários existentes', 'Usuários'),
('users.delete', 'Excluir usuários', 'Usuários'),
('favorites.manage', 'Gerenciar favoritos globais', 'Sistema');

INSERT INTO role_permissions (role_id, permissions_id) SELECT 1, id FROM permissions;

/* CREATE DATABASE eletricca;
CREATE USER eletricca_user WITH PASSWORD "eletrO@8002";
GRANT ALL PRIVILEGES ON DATABASE eletricca TO eletricca_user;
ALTER DATABASE eletricca OWNER TO eletricca_user;  */