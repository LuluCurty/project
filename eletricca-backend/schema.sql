CREATE TABLE IF NOT EXISTS users (
    user_id                  SERIAL PRIMARY KEY,
    email               VARCHAR(150) UNIQUE,
    username            VARCHAR(50) UNIQUE,
    CONSTRAINT users_has_identifier CHECK (email IS NOT NULL OR username IS NOT NULL),
    password_hashed     VARCHAR(255) NOT NULL,
    telphone            VARCHAR(20),
    user_role           user_role_type NOT NULL DEFAULT 'clients',
    first_name          VARCHAR(30) NOT NULL,
    last_name           VARCHAR(30) NOT NULL,
    creation_date       TIMESTAMP DEFAULT NOW(),
    auth_source         VARCHAR(10),
    role_id             INT REFERENCES roles(id),
    -- profile pictures (S3 via files table)
    avatar_file_id      INT REFERENCES files(id) ON DELETE SET NULL,
    banner_file_id      INT REFERENCES files(id) ON DELETE SET NULL,
    is_super_admin      BOOLEAN NOT NULL DEFAULT FALSE
);

-- Migration (run once on live DB):
-- ALTER TABLE users ADD COLUMN avatar_file_id INT REFERENCES files(id) ON DELETE SET NULL;
-- ALTER TABLE users ADD COLUMN banner_file_id INT REFERENCES files(id) ON DELETE SET NULL;
-- ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;
-- UPDATE users SET is_super_admin = TRUE WHERE user_id = 1;
-- ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE;
-- ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
-- ALTER TABLE users ADD CONSTRAINT users_has_identifier CHECK (email IS NOT NULL OR username IS NOT NULL);

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
    client_id           INT REFERENCES client(id),
    created_by          INT REFERENCES users(user_id),
    priority            VARCHAR(30) DEFAULT 'medium' CHECK (priority IN ('medium', 'low', 'high')),
    -- pending: created, waiting for quotes
    -- quoting: User2 is gathering supplier quotes
    -- quoted:  quotes entered, ready for User3 approval
    -- approved/denied: User3 decision
    list_status         VARCHAR(50) DEFAULT 'pending' CHECK (list_status IN ('pending', 'quoting', 'quoted', 'approved', 'denied')),
    selected_quote_id   INT, -- FK set after supply_list_quotes is created
    creation_date       TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    description         TEXT
);

CREATE TABLE IF NOT EXISTS supplies_list_items(
    id                  SERIAL PRIMARY KEY,
    list_id             INT REFERENCES supplies_lists(id) ON DELETE CASCADE,
    supply_id           INT REFERENCES supplies(id),
    supplier_id         INT REFERENCES supplier(id),   -- nullable: assigned after quoting
    quantity            INT NOT NULL CHECK (quantity > 0),
    price               NUMERIC(12,2)                  -- nullable: filled in via quote
)

CREATE TABLE IF NOT EXISTS supplier(
    id                          SERIAL PRIMARY KEY,
    supplier_name               VARCHAR(100) NOT NULL,
    supplier_legal_name         VARCHAR(150) NOT NULL UNIQUE, -- razão social
    supplier_legal_identifier   VARCHAR(20)  NOT NULL UNIQUE, -- CNPJ
    supplier_email              VARCHAR(100) UNIQUE,
    supplier_telephone          VARCHAR(50),
    supplier_address            TEXT,
    description                 TEXT,
    creation_date               TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    pdf_parser                  VARCHAR(100)
)

CREATE TABLE IF NOT EXISTS supply_princing( --relacao materiais e fornecedores
    id                  SERIAL PRIMARY KEY,
    supply_id           INT REFERENCES supplies(id) ON DELETE CASCADE,
    supplier_id         INT REFERENCES suppliers(id) ON DELETE CASCADE,
    price               NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    is_default          BOOLEAN,
    UNIQUE              (supply_id, supplier_id)
)


-- =============================
-- SUPPLY LIST QUOTES
-- =============================
CREATE TABLE IF NOT EXISTS supply_list_quotes (
    id          SERIAL PRIMARY KEY,
    list_id     INT NOT NULL REFERENCES supplies_lists(id) ON DELETE CASCADE,
    supplier_id INT NOT NULL REFERENCES supplier(id) ON DELETE RESTRICT,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'selected', 'rejected')),
    notes       TEXT,
    created_by  INT NOT NULL REFERENCES users(user_id),
    created_at  TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    UNIQUE (list_id, supplier_id)
);

-- Backfill the FK now that supply_list_quotes exists
ALTER TABLE supplies_lists
    ADD CONSTRAINT fk_selected_quote
    FOREIGN KEY (selected_quote_id) REFERENCES supply_list_quotes(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS supply_list_quote_items (
    id           SERIAL PRIMARY KEY,
    quote_id     INT NOT NULL REFERENCES supply_list_quotes(id) ON DELETE CASCADE,
    list_item_id INT NOT NULL REFERENCES supplies_list_items(id) ON DELETE CASCADE,
    price        NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    UNIQUE (quote_id, list_item_id)
);

CREATE INDEX IF NOT EXISTS idx_supply_list_quotes_list ON supply_list_quotes(list_id);
CREATE INDEX IF NOT EXISTS idx_supply_list_quote_items  ON supply_list_quote_items(quote_id);

-- =============================
-- VIEWS
-- =============================
CREATE OR REPLACE VIEW v_supplies_list_totals AS -- não sei se esta funcionando no banco de dados
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
    -- file upload config (only used when field_type = 'file')
    allowed_file_types TEXT[] DEFAULT NULL,
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
-- FORMS INDEXES
-- =============================
CREATE INDEX idx_form_fields_form ON form_fields(form_id);
CREATE INDEX idx_assignments_user ON form_assignments(user_id);
CREATE INDEX idx_assignments_form ON form_assignments(form_id);
CREATE INDEX idx_responses_form ON form_responses(form_id);
CREATE INDEX idx_responses_user ON form_responses(user_id);
CREATE INDEX idx_values_response ON form_response_values(response_id);
CREATE INDEX idx_files_response ON form_files(response_id);
CREATE INDEX idx_form_assignments_user_status ON form_assignments (user_id, is_completed);
CREATE INDEX idx_form_responses_user_id ON form_responses (user_id);

-- =============================
-- TASK CATEGORIES
-- =============================
CREATE TABLE IF NOT EXISTS task_categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- =============================
-- TASKS (definição)
-- =============================
CREATE TABLE IF NOT EXISTS tasks (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    task_type       VARCHAR(20) NOT NULL DEFAULT 'personal'
                    CHECK (task_type IN ('personal', 'assigned')),
    category_id     INT REFERENCES task_categories(id) ON DELETE SET NULL,
    created_by      INT NOT NULL REFERENCES users(user_id),
    -- Campos usados APENAS por personal tasks
    status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority        VARCHAR(10) DEFAULT 'medium'
                    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date        TIMESTAMP,
    completed_at    TIMESTAMP,
    -- Recorrência (apenas assigned)
    is_recurring        BOOLEAN DEFAULT FALSE,
    recurrence_rule     VARCHAR(20)
                        CHECK (recurrence_rule IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
    recurrence_end_date TIMESTAMP,
    parent_task_id      INT REFERENCES tasks(id) ON DELETE SET NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP DEFAULT NULL
);

-- =============================
-- TASK STEPS (template, max 5 por task)
-- =============================
CREATE TABLE IF NOT EXISTS task_steps (
    id          SERIAL PRIMARY KEY,
    task_id     INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    step_order  INT NOT NULL CHECK (step_order BETWEEN 1 AND 5),
    step_type   VARCHAR(20) NOT NULL DEFAULT 'check'
                CHECK (step_type IN ('check', 'file_upload', 'text')),
    -- tipos permitidos quando step_type = 'file_upload'
    -- ex: ['image','excel','word','powerpoint','audio','video']
    allowed_file_types  TEXT[] DEFAULT NULL,
    -- Para personal tasks (sem assignment), progresso direto aqui
    is_completed    BOOLEAN DEFAULT FALSE,
    completed_at    TIMESTAMP,
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE (task_id, step_order)
);

-- =============================
-- TASK ASSIGNMENTS (N usuários por task)
-- =============================
CREATE TABLE IF NOT EXISTS task_assignments (
    id              SERIAL PRIMARY KEY,
    task_id         INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id         INT NOT NULL REFERENCES users(user_id),
    assigned_by     INT NOT NULL REFERENCES users(user_id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority        VARCHAR(10) NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date        TIMESTAMP,
    available_from  TIMESTAMP,
    assigned_at     TIMESTAMP DEFAULT NOW(),
    completed_at    TIMESTAMP,
    deleted_at      TIMESTAMP DEFAULT NULL,
    UNIQUE (task_id, user_id)
);

-- =============================
-- TASK STEP PROGRESS (progresso por assignment)
-- =============================
CREATE TABLE IF NOT EXISTS task_step_progress (
    id              SERIAL PRIMARY KEY,
    assignment_id   INT NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
    step_id         INT NOT NULL REFERENCES task_steps(id) ON DELETE CASCADE,
    is_completed    BOOLEAN DEFAULT FALSE,
    completed_at    TIMESTAMP,
    file_id         INT REFERENCES files(id) ON DELETE SET NULL,
    UNIQUE (assignment_id, step_id)
);

-- =============================
-- TASK COMMENTS
-- =============================
CREATE TABLE IF NOT EXISTS task_comments (
    id          SERIAL PRIMARY KEY,
    task_id     INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id     INT NOT NULL REFERENCES users(user_id),
    content     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- =============================
-- TASK ASSIGNMENT HISTORY
-- Records each completion cycle when a manager resets a completed assignment
-- =============================
CREATE TABLE IF NOT EXISTS task_assignment_history (
    id              SERIAL PRIMARY KEY,
    assignment_id   INT NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
    cycle           INT NOT NULL,               -- 1st completion, 2nd, etc.
    assigned_at     TIMESTAMP NOT NULL,
    completed_at    TIMESTAMP NOT NULL,
    reset_by        INT REFERENCES users(user_id),
    reset_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    -- JSONB snapshot of which steps were completed and when
    -- [{step_id, title, step_order, completed_at}]
    steps_snapshot  JSONB NOT NULL DEFAULT '[]',
    UNIQUE (assignment_id, cycle)
);
CREATE INDEX idx_task_assignment_history_assignment ON task_assignment_history(assignment_id);

-- =============================
-- TASKS INDEXES
-- =============================
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_type ON tasks(task_type);
CREATE INDEX idx_tasks_category ON tasks(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX idx_task_steps_task ON task_steps(task_id);
CREATE INDEX idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_user ON task_assignments(user_id);
CREATE INDEX idx_task_assignments_status ON task_assignments(user_id, status);
CREATE INDEX idx_task_step_progress_assignment ON task_step_progress(assignment_id);
CREATE INDEX idx_task_comments_task ON task_comments(task_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- =============================
-- NOTIFICATIONS
-- =============================
CREATE TABLE IF NOT EXISTS notifications (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    message         TEXT,
    type            VARCHAR(30) NOT NULL DEFAULT 'info',  -- info, task_assigned, task_completed, task_comment, form_assigned, system, ...
    reference_type  VARCHAR(30),    -- 'task', 'form', etc.
    reference_id    INT,            -- ID do objeto referenciado
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- =============================
-- FILES
-- =============================
CREATE TABLE files (
    id             SERIAL PRIMARY KEY,
    object_key     VARCHAR(500) NOT NULL UNIQUE,  -- caminho no bucket
    bucket         VARCHAR(100) NOT NULL DEFAULT 'project',
    original_name  VARCHAR(255) NOT NULL,          -- nome que o usuário vê
    mime_type      VARCHAR(100) NOT NULL,
    file_size      BIGINT NOT NULL,                -- bytes
    uploaded_by    INT NOT NULL REFERENCES users(user_id),
    reference_type VARCHAR(50),   -- 'task_assignment', 'form_response', 'chat_message'
    reference_id   INT,
    created_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_files_reference ON files(reference_type, reference_id);



/* CREATE DATABASE eletricca;
CREATE USER eletricca_user WITH PASSWORD "eletrO@8002";
GRANT ALL PRIVILEGES ON DATABASE eletricca TO eletricca_user;
ALTER DATABASE eletricca OWNER TO eletricca_user;  */


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
('favorites.manage', 'Gerenciar favoritos globais', 'Sistema'),
('supplies.quote', 'Gerenciar cotações de listas', 'Materiais');

INSERT INTO role_permissions (role_id, permissions_id) SELECT 1, id FROM permissions;

