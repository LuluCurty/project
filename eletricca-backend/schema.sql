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

CREATE TABLE IF NOT EXISTS status_condo (
    status_condo_id             SERIAL PRIMARY KEY,
    supplier_name               VARCHAR(30),
    condo_name                  VARCHAR(30) NOT NULL,
    operator                    VARCHAR(30),
    supplies_status             VARCHAR(30),
    expected_data               VARCHAR(30),
    client_comunication         VARCHAR(30) NOT NULL,
    execution_data              VARCHAR(30),
    status_condo                VARCHAR(30) NOT NULL,
    creation_date               TIMESTAMP DEFAULT NOW()
)

CREATE TABLE IF NOT EXISTS super_admin (
    super_admin_id                  SERIAL PRIMARY KEY,
    super_admin_admin               VARCHAR(150) NOT NULL UNIQUE,
    super_admin_password_hashed     TEXT NOT NULL,
    super_admin_telphone            VARCHAR(20) NOT NULL,
    super_admin_first_name          VARCHAR(20) NOT NULL,
    super_admin_last_name           VARCHAR(20) NOT NULL,
    creation_date                   TIMESTAMP DEFAULT NOW()
)
CREATE TABLE IF NOT EXISTS supplies (
    id              SERIAL PRIMARY KEY,
    supply_name     VARCHAR(40),          
    quantity        INTEGER NOT NULL DEFAULT 0,
    image_url       TEXT
)

CREATE TABLE IF NOT EXISTS supplies_variation (
    id                          SERIAL PRIMARY KEY,
    supply_id                   INT NOT NULL REFERENCES supplies(id) ON DELETE CASCADE, 
    variation_description       TEXT NOT NULL,
    quantity                    INTEGER NOT NULL DEFAULT 0
)


CREATE TYPE IF NOT EXISTS user_role_type AS ENUM (
    'admin',
    'managers',
    'operators',
    'clients'
)

CREATE TABLE IF NOT EXISTS roles(
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL
)
CREATE TABLE IF NOT EXISTS resources(
    id SERIAL PRIMARY KEY, 
    resource_name VARCHAR(50) NOT NULL
)
CREATE TABLE IF NOT EXISTS user_permissions()

CREATE TABLE IF NOT EXISTS avatars (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    s3_key_original TEXT NOT NULL,
    s3_key_profile TEXT NOT NULL,
    s3_key_thumbnail TEXT NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    size_bytes INTEGER NOT NULL,
    is_preset BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);



/* CREATE DATABASE eletricca;
CREATE USER eletricca_user WITH PASSWORD "eletrO@8002";
GRANT ALL PRIVILEGES ON DATABASE eletricca TO eletricca_user;
ALTER DATABASE eletricca OWNER TO eletricca_user;  */