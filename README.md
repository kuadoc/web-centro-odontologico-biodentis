# Centro Odontologico BIODENTIS

Plataforma web para la gestion de citas e historial clinico de un consultorio odontologico.

## Requisitos Previos

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9
- [Docker](https://www.docker.com/) (opcional, para PostgreSQL)
- [Git](https://git-scm.com/)

## Estructura del Proyecto

```
web-centro-odontologico-biodentis/
├── apps/
│   ├── backend/              ← API REST (Node.js + TypeScript + Express + Prisma)
│   └── web/                  ← Frontend (React + Vite + Tailwind CSS)
│
├── packages/
│   ├── shared-types/         ← Interfaces y enums compartidos
│   ├── shared-validators/    ← Schemas Zod + reglas de negocio
│   └── config/               ← Configuracion compartida (tsconfig, eslint, prettier)
│
├── docker-compose.yml        ← PostgreSQL + Backend + Frontend
└── turbo.json                ← Configuracion de Turborepo.
```

## Instalacion

### 1. Clonar el repositorio

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp apps/backend/.env.example apps/backend/.env
```

Editar `apps/backend/.env` con tus valores:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://biodentis:secret@localhost:5432/biodentis
JWT_ACCESS_SECRET=tu-access-secret-aqui-minimo-32-chars
JWT_REFRESH_SECRET=tu-refresh-secret-aqui-minimo-32-chars
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
FRONTEND_URL=http://localhost:3000
```

> **IMPORTANTE:** Nunca commitear el archivo `.env` a Git. Ya esta en `.gitignore`.

### 4. Levantar PostgreSQL

#### Opcion A: Con Docker (recomendado)

```bash
docker compose up -d postgres
```

Esto levanta PostgreSQL en el puerto 5432 con:
- Base de datos: `biodentis`
- Usuario: `biodentis`
- Contrasena: `secret`

#### Opcion B: PostgreSQL local

Si tienes PostgreSQL instalado localmente, crea la base de datos:

```sql
CREATE DATABASE biodentis;
CREATE USER biodentis WITH PASSWORD 'secret';
GRANT ALL PRIVILEGES ON DATABASE biodentis TO biodentis;
```

### 5. Generar cliente de Prisma y crear tablas

```bash
# Generar el cliente de Prisma
pnpm --filter @biodentis/backend db:generate

# Crear las tablas en la base de datos
pnpm --filter @biodentis/backend db:push
```

### 6. Cargar datos de prueba (seed)

```bash
pnpm --filter web db:seed
```

Configura primero `SEED_DEMO_PASSWORD` (mínimo 12 caracteres) en `apps/web/.env`,
que está excluido de Git. El seed es solo para una base de desarrollo y rechaza
`NODE_ENV=production`. No ejecutes este seed contra una base con usuarios reales.
No cambia las contraseñas de cuentas que ya existen.

Esto crea cuentas de demostración con la contraseña definida localmente:

- Admin: `admin@biodentis.com`
- Recepcionista: `recepcion@biodentis.com`
- Odontologo: `dr.martinez@biodentis.com`
- Paciente: `paciente@biodentis.com`
- Horarios de disponibilidad (Lunes a Viernes 8:00-12:00, 14:00-18:00)

## Ejecutar en Desarrollo

Abrir **3 terminales**:

### Terminal 1: Backend y Frontend (juntos)

```bash
pnpm dev
```

Esto levanta:
- Backend en `http://localhost:3001`
- Frontend en `http://localhost:3000`

O levantar por separado:

```bash
# Backend
pnpm dev:backend

# Frontend
pnpm dev:web
```

### Terminal 3 (opcional): Studio de Prisma

```bash
pnpm --filter @biodentis/backend db:studio
```

Abre la interfaz de Prisma Studio en `http://localhost:5555`

## API REST

### Autenticacion

```bash
# Registro
POST http://localhost:3001/api/v1/auth/register
{
  "email": "nuevo@paciente.com",
  "password": "<contraseña de tu cuenta de prueba>",
  "firstName": "Juan",
  "lastName": "Perez",
  "role": "PATIENT"
}

# Login
POST http://localhost:3001/api/v1/auth/login
{
  "email": "admin@biodentis.com",
  "password": "<contraseña de tu cuenta de prueba>"
}

# Refresh Token (usa cookie httpOnly)
POST http://localhost:3001/api/v1/auth/refresh

# Logout
POST http://localhost:3001/api/v1/auth/logout
```

### Endpoints por Rol

| Endpoint | Paciente | Recepcionista | Odontologo | Admin |
|---|---|---|---|---|
| `GET /appointments` | Propias | Todas | Propias | Todas |
| `POST /appointments` | Si | No | No | No |
| `PATCH /appointments/:id/confirm` | No | Si | No | No |
| `PATCH /appointments/:id/reject` | No | Si | No | No |
| `PATCH /appointments/:id/reschedule` | Si (24h) | Si | No | No |
| `PATCH /appointments/:id/cancel` | Si (24h) | Si | No | No |
| `PATCH /appointments/:id/status` | No | No | Si | No |
| `GET /clinical-records/:patientId` | Propio | No | Propios | No |
| `POST /clinical-records` | No | No | Si | No |
| `GET /reports/appointments` | No | No | No | Si |

## Comandos Utiles

```bash
# Instalar dependencias
pnpm install

# Ejecutar backend y frontend juntos
pnpm dev

# Ejecutar solo backend
pnpm dev:backend

# Ejecutar solo frontend
pnpm dev:web

# Build de todos los paquetes
pnpm build

# Typecheck de todos los paquetes
pnpm typecheck

# Lint de todos los paquetes
pnpm lint

# Generar cliente Prisma
pnpm db:generate

# Crear tablas en DB
pnpm db:push

# Ejecutar migraciones
pnpm db:migrate

# Cargar seed
pnpm db:seed

# Abrir Prisma Studio
pnpm db:studio
```

## Docker

### Levantar PostgreSQL

```bash
docker compose up -d
```

Esto levanta unicamente PostgreSQL en el puerto 5432.

### Detener

```bash
docker compose down
```

### Detener y eliminar datos

```bash
docker compose down -v
```

## Variables de Entorno

| Variable | Descripcion | Default |
|---|---|---|
| `NODE_ENV` | Entorno de ejecucion | `development` |
| `PORT` | Puerto del backend | `3001` |
| `DATABASE_URL` | URL de conexion a PostgreSQL | `postgresql://biodentis:secret@localhost:5432/biodentis` |
| `JWT_ACCESS_SECRET` | Secreto para firmar access tokens | (requerido) |
| `JWT_REFRESH_SECRET` | Secreto para firmar refresh tokens | (requerido) |
| `JWT_ACCESS_EXPIRATION` | Duracion del access token | `15m` |
| `JWT_REFRESH_EXPIRATION` | Duracion del refresh token | `7d` |

## Tecnologias

- **Backend:** Node.js, TypeScript, Express, Prisma ORM, PostgreSQL
- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Autenticacion:** JWT (access + refresh token)
- **Monorepo:** pnpm workspaces + Turborepo
- **Contenedores:** Docker + Docker Compose

## Licencia

Proyecto academico - Centro Odontologico BIODENTIS
