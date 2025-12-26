--
-- PostgreSQL database dump
--

\restrict VykByxJGXLhAsnoObpDeBUkxcb8Em5YdV52GCMRJeljNQdm2US3dVM11wF2JU8h

-- Dumped from database version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: user_role_enum; Type: TYPE; Schema: public; Owner: eletricca_user
--

CREATE TYPE public.user_role_enum AS ENUM (
    'admin',
    'manager',
    'operator',
    'client'
);


ALTER TYPE public.user_role_enum OWNER TO eletricca_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: eletricca_user
--

CREATE TABLE public.announcements (
    id integer NOT NULL,
    message text NOT NULL,
    link text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.announcements OWNER TO eletricca_user;

--
-- Name: announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: eletricca_user
--

CREATE SEQUENCE public.announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.announcements_id_seq OWNER TO eletricca_user;

--
-- Name: announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eletricca_user
--

ALTER SEQUENCE public.announcements_id_seq OWNED BY public.announcements.id;


--
-- Name: client; Type: TABLE; Schema: public; Owner: eletricca_user
--

CREATE TABLE public.client (
    id integer NOT NULL,
    client_first_name character varying(100) NOT NULL,
    client_last_name character varying(100) NOT NULL,
    client_telephone character varying(30) NOT NULL,
    client_email character varying(255) NOT NULL,
    creation_date timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.client OWNER TO eletricca_user;

--
-- Name: client_id_seq; Type: SEQUENCE; Schema: public; Owner: eletricca_user
--

CREATE SEQUENCE public.client_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_id_seq OWNER TO eletricca_user;

--
-- Name: client_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eletricca_user
--

ALTER SEQUENCE public.client_id_seq OWNED BY public.client.id;


--
-- Name: resources; Type: TABLE; Schema: public; Owner: eletricca_user
--

CREATE TABLE public.resources (
    id integer NOT NULL,
    resource_name character varying(50) NOT NULL
);


ALTER TABLE public.resources OWNER TO eletricca_user;

--
-- Name: resources_id_seq; Type: SEQUENCE; Schema: public; Owner: eletricca_user
--

CREATE SEQUENCE public.resources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resources_id_seq OWNER TO eletricca_user;

--
-- Name: resources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eletricca_user
--

ALTER SEQUENCE public.resources_id_seq OWNED BY public.resources.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: eletricca_user
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    role_name character varying(50) NOT NULL
);


ALTER TABLE public.roles OWNER TO eletricca_user;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: eletricca_user
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO eletricca_user;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eletricca_user
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: eletricca_user
--

CREATE TABLE public.services (
    service_id integer NOT NULL,
    first_name character varying(10) NOT NULL,
    service_status character varying(30) DEFAULT 'pending'::character varying,
    details text,
    creation_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.services OWNER TO eletricca_user;

--
-- Name: services_service_id_seq; Type: SEQUENCE; Schema: public; Owner: eletricca_user
--

CREATE SEQUENCE public.services_service_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.services_service_id_seq OWNER TO eletricca_user;

--
-- Name: services_service_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eletricca_user
--

ALTER SEQUENCE public.services_service_id_seq OWNED BY public.services.service_id;


--
-- Name: supplier; Type: TABLE; Schema: public; Owner: eletricca_user
--

CREATE TABLE public.supplier (
    id integer NOT NULL,
    supplier_name character varying(50),
    supplier_email character varying(50) NOT NULL,
    supplier_telephone character varying(50),
    supplier_address text
);


ALTER TABLE public.supplier OWNER TO eletricca_user;

--
-- Name: supplier_id_seq; Type: SEQUENCE; Schema: public; Owner: eletricca_user
--

CREATE SEQUENCE public.supplier_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supplier_id_seq OWNER TO eletricca_user;

--
-- Name: supplier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eletricca_user
--

ALTER SEQUENCE public.supplier_id_seq OWNED BY public.supplier.id;


--
-- Name: supplies; Type: TABLE; Schema: public; Owner: eletricca_user
--

CREATE TABLE public.supplies (
    id integer NOT NULL,
    supply_name character varying(100) NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    image_url text,
    details text,
    creation_date timestamp without time zone DEFAULT now(),
    price numeric(10,2),
    supplier character varying(100)
);


ALTER TABLE public.supplies OWNER TO eletricca_user;

--
-- Name: supplies_id_seq; Type: SEQUENCE; Schema: public; Owner: eletricca_user
--

CREATE SEQUENCE public.supplies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supplies_id_seq OWNER TO eletricca_user;

--
-- Name: supplies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eletricca_user
--

ALTER SEQUENCE public.supplies_id_seq OWNED BY public.supplies.id;


--
-- Name: supplies_list_items; Type: TABLE; Schema: public; Owner: eletricca_user
--

CREATE TABLE public.supplies_list_items (
    id integer NOT NULL,
    list_id integer,
    supply_id integer,
    supplier_id integer,
    quantity integer NOT NULL,
    price numeric(12,2) NOT NULL,
    CONSTRAINT supplies_list_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.supplies_list_items OWNER TO eletricca_user;

--
-- Name: supplies_list_items_id_seq; Type: SEQUENCE; Schema: public; Owner: eletricca_user
--

CREATE SEQUENCE public.supplies_list_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supplies_list_items_id_seq OWNER TO eletricca_user;

--
-- Name: supplies_list_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eletricca_user
--

ALTER SEQUENCE public.supplies_list_items_id_seq OWNED BY public.supplies_list_items.id;


--
-- Name: supplies_lists; Type: TABLE; Schema: public; Owner: eletricca_user
--

CREATE TABLE public.supplies_lists (
    id integer NOT NULL,
    list_name character varying(255) NOT NULL,
    client_id integer,
    created_by integer,
    list_status character varying(50) DEFAULT 'pending'::character varying,
    creation_date timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    priority character varying(50) DEFAULT 'medium'::character varying,
    description text,
    CONSTRAINT supplies_lists_list_status_check CHECK (((list_status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'denied'::character varying])::text[]))),
    CONSTRAINT supplies_lists_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[])))
);


ALTER TABLE public.supplies_lists OWNER TO eletricca_user;

--
-- Name: supplies_lists_id_seq; Type: SEQUENCE; Schema: public; Owner: eletricca_user
--

CREATE SEQUENCE public.supplies_lists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supplies_lists_id_seq OWNER TO eletricca_user;

--
-- Name: supplies_lists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eletricca_user
--

ALTER SEQUENCE public.supplies_lists_id_seq OWNED BY public.supplies_lists.id;


--
-- Name: supplies_variation; Type: TABLE; Schema: public; Owner: eletricca_user
--

CREATE TABLE public.supplies_variation (
    id integer NOT NULL,
    supply_id integer NOT NULL,
    variation_description text NOT NULL,
    quantity integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.supplies_variation OWNER TO eletricca_user;

--
-- Name: supplies_variation_id_seq; Type: SEQUENCE; Schema: public; Owner: eletricca_user
--

CREATE SEQUENCE public.supplies_variation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supplies_variation_id_seq OWNER TO eletricca_user;

--
-- Name: supplies_variation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eletricca_user
--

ALTER SEQUENCE public.supplies_variation_id_seq OWNED BY public.supplies_variation.id;


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: eletricca_user
--

CREATE TABLE public.user_permissions (
    id integer NOT NULL,
    role_id integer,
    resource_id integer,
    action character varying(50) NOT NULL
);


ALTER TABLE public.user_permissions OWNER TO eletricca_user;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: eletricca_user
--

CREATE SEQUENCE public.user_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_permissions_id_seq OWNER TO eletricca_user;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eletricca_user
--

ALTER SEQUENCE public.user_permissions_id_seq OWNED BY public.user_permissions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: eletricca_user
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    email character varying(150) NOT NULL,
    password_hashed character varying(255) NOT NULL,
    telphone character varying(20),
    service_id integer,
    user_role public.user_role_enum DEFAULT 'client'::public.user_role_enum NOT NULL,
    first_name character varying(30) NOT NULL,
    last_name character varying(30) NOT NULL,
    creation_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO eletricca_user;

--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: eletricca_user
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_user_id_seq OWNER TO eletricca_user;

--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eletricca_user
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: announcements id; Type: DEFAULT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.announcements ALTER COLUMN id SET DEFAULT nextval('public.announcements_id_seq'::regclass);


--
-- Name: client id; Type: DEFAULT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.client ALTER COLUMN id SET DEFAULT nextval('public.client_id_seq'::regclass);


--
-- Name: resources id; Type: DEFAULT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.resources ALTER COLUMN id SET DEFAULT nextval('public.resources_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: services service_id; Type: DEFAULT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.services ALTER COLUMN service_id SET DEFAULT nextval('public.services_service_id_seq'::regclass);


--
-- Name: supplier id; Type: DEFAULT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.supplier ALTER COLUMN id SET DEFAULT nextval('public.supplier_id_seq'::regclass);


--
-- Name: supplies id; Type: DEFAULT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.supplies ALTER COLUMN id SET DEFAULT nextval('public.supplies_id_seq'::regclass);


--
-- Name: supplies_list_items id; Type: DEFAULT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.supplies_list_items ALTER COLUMN id SET DEFAULT nextval('public.supplies_list_items_id_seq'::regclass);


--
-- Name: supplies_lists id; Type: DEFAULT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.supplies_lists ALTER COLUMN id SET DEFAULT nextval('public.supplies_lists_id_seq'::regclass);


--
-- Name: supplies_variation id; Type: DEFAULT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.supplies_variation ALTER COLUMN id SET DEFAULT nextval('public.supplies_variation_id_seq'::regclass);


--
-- Name: user_permissions id; Type: DEFAULT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.user_permissions ALTER COLUMN id SET DEFAULT nextval('public.user_permissions_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: client client_client_email_key; Type: CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT client_client_email_key UNIQUE (client_email);


--
-- Name: client client_pkey; Type: CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT client_pkey PRIMARY KEY (id);


--
-- Name: resources resources_name_key; Type: CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_name_key UNIQUE (resource_name);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (role_name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (service_id);


--
-- Name: supplier supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.supplier
    ADD CONSTRAINT supplier_pkey PRIMARY KEY (id);


--
-- Name: supplier supplier_supplier_email_key; Type: CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.supplier
    ADD CONSTRAINT supplier_supplier_email_key UNIQUE (supplier_email);


--
-- Name: supplies_list_items supplies_list_items_pkey; Type: CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.supplies_list_items
    ADD CONSTRAINT supplies_list_items_pkey PRIMARY KEY (id);


--
-- Name: supplies_lists supplies_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.supplies_lists
    ADD CONSTRAINT supplies_lists_pkey PRIMARY KEY (id);


--
-- Name: supplies supplies_pkey; Type: CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.supplies
    ADD CONSTRAINT supplies_pkey PRIMARY KEY (id);


--
-- Name: supplies_variation supplies_variation_pkey; Type: CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.supplies_variation
    ADD CONSTRAINT supplies_variation_pkey PRIMARY KEY (id);


--
-- Name: supplies unique_supply_name; Type: CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.supplies
    ADD CONSTRAINT unique_supply_name UNIQUE (supply_name);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_role_id_resource_id_action_key; Type: CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_role_id_resource_id_action_key UNIQUE (role_id, resource_id, action);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: supplies_list_items supplies_list_items_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.supplies_list_items
    ADD CONSTRAINT supplies_list_items_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.supplies_lists(id) ON DELETE CASCADE;


--
-- Name: supplies_list_items supplies_list_items_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.supplies_list_items
    ADD CONSTRAINT supplies_list_items_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.supplier(id);


--
-- Name: supplies_list_items supplies_list_items_supply_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.supplies_list_items
    ADD CONSTRAINT supplies_list_items_supply_id_fkey FOREIGN KEY (supply_id) REFERENCES public.supplies(id);


--
-- Name: supplies_lists supplies_lists_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.supplies_lists
    ADD CONSTRAINT supplies_lists_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- Name: supplies_lists supplies_lists_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.supplies_lists
    ADD CONSTRAINT supplies_lists_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: supplies_variation supplies_variation_supply_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.supplies_variation
    ADD CONSTRAINT supplies_variation_supply_id_fkey FOREIGN KEY (supply_id) REFERENCES public.supplies(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict VykByxJGXLhAsnoObpDeBUkxcb8Em5YdV52GCMRJeljNQdm2US3dVM11wF2JU8h

