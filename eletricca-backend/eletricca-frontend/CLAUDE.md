# Project Overview
Basic Intranet with lots of functionalities for user corporate management.
- User Management
- Forms Management
- Built-in Chat
- Supply and Order Management

# Tech Stack
- SvelteKit
- PostgreSQL
- TypeScript
- Python (Future) for excel and csv parsing
- TailwindCSS
- Nginx (Future)
- Docker (Future)

# Development
- `npm install` - install dependencies
- `npm run dev` - start dev server
- `npm run build` - build for production
- Disclaimer: because i'm not using a proper permission user I'm using sudo commands so i can use it with my SSL cert

# Architecture
- API: Some parts are on Sveltekit server.ts and some are on https://localhost:54445 Express APP
- Express APP is used as a "central" API for legacy APIs
- vite configuration: ./vite.config.ts
- Sveltekit on adapter-node
- Svelte config: ./svelte.config.js
- Main files are on ./src
- Module Convention where they are separated by (svelteRouteGroup) where there is the frontend on (routeGroup)/+page.svelte and the backend on +page.server.ts on the same route group with a layout.server.ts for frontend guarding for organization and permission management
- Custom Permission Management built using sveltekit locals and routing groups
- Database queries on SQL Syntax for simplicity and clarity
- Database configs on src/lib/server/db.ts using pg library
- Permission Management functions on src/lib/server/auth.ts which each one do a granular or more general permission requirement
- (app) is the main app, there should be only the login page on public so users can login
- (auth) is the main public login page where people will login or register, this page is public and will redirect users that are logged in to the app
- hooks.server.ts for JWT handling, it will save the user information and pass it to the sveltekit locals
- DISCLAIMER: The main JWT authentication procedure is on the legacy API, we will migrate it to the sveltekit
- More information about how specific system functions will be on sub claude.md or (function).md files 

# Conventions
We are using shadcn components with tailwindCSS for frontend, 
For backend we are using Sveltekit with adapter Node.
JWT for authentication
