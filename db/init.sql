CREATE TABLE gconfigs ( -- global configs
    id serial PRIMARY KEY;
    kvp json NOT NULL; -- freeform json
)

CREATE TABLE receipts (
    id serial PRIMARY KEY; -- autoincrement
    original_filename text NOT NULL;
    file_hash text NOT NULL;
    upload_timestamp bigint NOT NULL; -- upload timestamp
    txdate date NOT NULL; -- calendar date (year, month, day)
    vendor text NOT NULL;
    amount money NOT NULL;
    litems json NOT NULL; -- line items
    allotment_strategy json NOT NULL; -- freeform json
    notes text NOT NULL;
);

CREATE TABLE companies (
    id serial PRIMARY KEY;
    name text NOT NULL;
);

CREATE TABLE allotments (
    id serial PRIMARY KEY;
    retip integer REFERENCES receipts NOT NULL;
    company_id integer REFERENCES companies NOT NULL;
    category_id integer REFERENCES categories NOT NULL;
    amount money NOT NULL;
)

CREATE TABLE expenses (
    id serial PRIMARY KEY;
    txdate_override date; -- nullable
    allotment_id integer REFERENCES allotments NOT NULL;
    notes text NOT NULL;
)

CREATE TABLE categories (
    id serial PRIMARY KEY;
    name text NOT NULL;
)

CREATE TABLE tags (
    id serial PRIMARY KEY;
    allotment_id REFERENCES allotments NOT NULL;
    value text NOT NULL;
)
