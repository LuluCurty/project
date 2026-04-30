-- ============================================================
-- Migration 002: Supply list quotes workflow
-- ============================================================
-- New status flow: pending → quoting → quoted → approved/denied
-- Items no longer require supplier or price at creation time.
-- Multiple supplier quotes per list, one gets selected before approval.
-- ============================================================

-- 1. Extend list_status CHECK
ALTER TABLE supplies_lists
    DROP CONSTRAINT IF EXISTS supplies_lists_list_status_check;

ALTER TABLE supplies_lists
    ADD CONSTRAINT supplies_lists_list_status_check
    CHECK (list_status IN ('pending', 'quoting', 'quoted', 'approved', 'denied'));

-- 2. Make price and supplier optional on list items
--    (items are now created before quotes come in)
ALTER TABLE supplies_list_items
    ALTER COLUMN price DROP NOT NULL;

ALTER TABLE supplies_list_items
    ALTER COLUMN supplier_id DROP NOT NULL;

-- 3. Quotes table — one row per (list, supplier) pair
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

-- 4. Quote items — price per item per quote
CREATE TABLE IF NOT EXISTS supply_list_quote_items (
    id           SERIAL PRIMARY KEY,
    quote_id     INT NOT NULL REFERENCES supply_list_quotes(id) ON DELETE CASCADE,
    list_item_id INT NOT NULL REFERENCES supplies_list_items(id) ON DELETE CASCADE,
    price        NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    UNIQUE (quote_id, list_item_id)
);

-- 5. Selected quote FK on the list (added after both tables exist)
ALTER TABLE supplies_lists
    ADD COLUMN IF NOT EXISTS selected_quote_id INT;

ALTER TABLE supplies_lists
    ADD CONSTRAINT fk_selected_quote
    FOREIGN KEY (selected_quote_id) REFERENCES supply_list_quotes(id) ON DELETE SET NULL;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_supply_list_quotes_list   ON supply_list_quotes(list_id);
CREATE INDEX IF NOT EXISTS idx_supply_list_quote_items   ON supply_list_quote_items(quote_id);

-- 7. New permission for the quoting role
INSERT INTO permissions (slug, description, module)
VALUES ('supplies.quote', 'Gerenciar cotações de listas', 'Materiais')
ON CONFLICT (slug) DO NOTHING;
