--
-- PostgreSQL database dump
--

\restrict sANz82yZLMUf0yCRMEaoKKbkuGdUZHmfvotF7itqzHZ3wRxX4m3aUHyR7yWah2C

-- Dumped from database version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)

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
-- Name: supplies id; Type: DEFAULT; Schema: public; Owner: eletricca_user
--

ALTER TABLE ONLY public.supplies ALTER COLUMN id SET DEFAULT nextval('public.supplies_id_seq'::regclass);


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

\unrestrict sANz82yZLMUf0yCRMEaoKKbkuGdUZHmfvotF7itqzHZ3wRxX4m3aUHyR7yWah2C

