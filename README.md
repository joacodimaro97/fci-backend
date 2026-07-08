# FCI Backend

Backend REST para seguimiento y simulación de inversiones personales, con un módulo paralelo de gastos e ingresos. Diseñado para consumirse desde un frontend React con TypeScript.

## Stack

- **Node.js** + **TypeScript**
- **Fastify** — servidor HTTP
- **Prisma ORM** — persistencia (SQLite en desarrollo, PostgreSQL en producción)
- **JWT** — autenticación
- **Zod** — validación
- **Pino** — logging
- **Swagger** — documentación en `/docs`
- **Vitest** — tests
- **tsup** — build

## Arquitectura

Clean Architecture con Repository Pattern:

```
src/
├── controllers/     # Manejo HTTP (sin lógica financiera)
├── routes/          # Definición de endpoints
├── services/        # Lógica de negocio
├── repositories/    # Interfaces de persistencia
│   └── prisma/      # Implementaciones Prisma
├── validators/      # Schemas Zod
├── middlewares/     # Auth, error handling
├── plugins/         # JWT, Swagger, Logger
├── finance/         # Motor financiero (desacoplado)
├── models/          # Entidades de dominio
├── dto/             # Data Transfer Objects
├── types/           # Tipos TypeScript
├── config/          # Configuración
├── errors/          # Errores personalizados
├── utils/           # Utilidades
├── app.ts           # Configuración Fastify
└── server.ts        # Entry point
```

## Requisitos

- Node.js >= 20
- npm o pnpm

## Instalación

```bash
# Clonar e instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Generar cliente Prisma y ejecutar migraciones
npm run db:generate
npm run db:migrate

# Cargar datos de prueba
npm run db:seed
```

## Desarrollo

```bash
npm run dev
```

El servidor inicia en `http://localhost:3000`.

Documentación Swagger: `http://localhost:3000/docs`

## Base de datos

El proyecto usa **PostgreSQL** (local y producción).

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
```

Migraciones:

```bash
npm run db:migrate        # desarrollo
npm run db:migrate:deploy # producción / Render
```

## Deploy en Render (gratis)

### 1. Postgres
Ya creaste la base en Render. Copiá el **Internal Database URL** (si el Web Service está en la misma cuenta/región) o el **External Database URL**.

### 2. Web Service
- New → **Web Service** → conectá este repo
- Runtime: **Node**
- Branch: `main` (o la que uses)
- **Build Command:**
  ```bash
  npm install && npx prisma generate && npm run build
  ```
- **Start Command:**
  ```bash
  npx prisma migrate deploy && node dist/server.js
  ```
- Instance: **Free**

### 3. Environment variables
En el Web Service → Environment:

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `DATABASE_URL` | Internal/External URL del Postgres de Render |
| `JWT_SECRET` | string largo aleatorio |
| `JWT_EXPIRES_IN` | `7d` |
| `LOG_LEVEL` | `info` |

`PORT` lo asigna Render solo: no hace falta setearlo.

### 4. Después del primer deploy
- Health: `https://TU-SERVICIO.onrender.com/health`
- Docs: `https://TU-SERVICIO.onrender.com/docs`
- Seed opcional (Shell de Render, una vez):
  ```bash
  npm run db:seed
  ```

### Notas free tier
- El servicio se duerme sin tráfico; la 1ª request puede tardar.
- El frontend debe apuntar a la URL de Render.

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor en modo desarrollo |
| `npm run build` | Compilar con tsup |
| `npm start` | Ejecutar build de producción |
| `npm run start:prod` | Migrar + arrancar (Render) |
| `npm test` | Ejecutar tests |
| `npm run db:migrate` | Crear/aplicar migraciones |
| `npm run db:seed` | Cargar datos de prueba |
| `npm run db:reset` | Resetear BD y re-seed |
| `npm run db:studio` | Abrir Prisma Studio |
| `npm run lint` | Verificar tipos TypeScript |

## Credenciales de prueba (seed)

- **Email:** `demo@fci.com`
- **Password:** `password123`

## Endpoints

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Registrar usuario |
| POST | `/auth/login` | Iniciar sesión |
| GET | `/auth/me` | Usuario autenticado |

### Cuentas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/accounts` | Listar cuentas |
| POST | `/accounts` | Crear cuenta |
| PUT | `/accounts/:id` | Actualizar cuenta |
| DELETE | `/accounts/:id` | Eliminar cuenta |

### Movimientos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/movements` | Listar movimientos |
| POST | `/movements` | Crear movimiento |
| PUT | `/movements/:id` | Actualizar movimiento |
| DELETE | `/movements/:id` | Eliminar movimiento |

### Rendimientos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/performance` | Listar rendimientos diarios |
| POST | `/performance` | Registrar rendimiento |
| PUT | `/performance/:id` | Actualizar rendimiento |
| DELETE | `/performance/:id` | Eliminar rendimiento |
| GET | `/performance/monthly` | Agregados mensuales |
| GET | `/performance/yearly` | Agregados anuales |

### Simulaciones

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/simulation` | Ejecutar simulación (no guarda) |
| POST | `/simulation/save` | Ejecutar y guardar |
| GET | `/simulation` | Listar simulaciones |
| GET | `/simulation/:id` | Obtener simulación |
| DELETE | `/simulation/:id` | Eliminar simulación |


### Estadísticas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/statistics` | Estadísticas financieras completas |

### Cuentas de efectivo (Cash)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/cash/accounts` | Listar cuentas de efectivo |
| POST | `/cash/accounts` | Crear cuenta de efectivo |
| PUT | `/cash/accounts/:id` | Actualizar cuenta |
| DELETE | `/cash/accounts/:id` | Eliminar cuenta |

### Categorías

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/cash/categories` | Listar categorías (`?type=&parentId=&rootsOnly=&tree=`) |
| POST | `/cash/categories` | Crear categoría |
| PUT | `/cash/categories/:id` | Actualizar categoría |
| DELETE | `/cash/categories/:id` | Eliminar categoría |

### Transacciones (ingresos/gastos)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/cash/transactions` | Listar transacciones |
| POST | `/cash/transactions` | Crear ingreso o gasto |
| PUT | `/cash/transactions/:id` | Actualizar transacción |
| DELETE | `/cash/transactions/:id` | Eliminar transacción |

### Resumen de caja

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/cash/summary` | Ingresos, gastos, balance y breakdown por categoría (`?year=&month=&cashAccountId=`) |

## Autenticación

Todos los endpoints (excepto `/auth/register`, `/auth/login` y `/health`) requieren JWT:

```
Authorization: Bearer <token>
```


## Módulo Cash (gastos e ingresos)

Independiente del dominio de inversiones:

1. Crear una cuenta en `POST /cash/accounts` (ej. "Caja de ahorro").
2. Crear categorías raíz y subcategorías en `POST /cash/categories` (`parentId` opcional; solo 1 nivel).
3. Opcional: enviar `openingBalance` al crear/editar la cuenta (plata que ya tenía).
4. Registrar movimientos en `POST /cash/transactions` (monto siempre positivo; el tipo define ingreso/gasto).
5. Consultar el mes con `GET /cash/summary?year=2026&month=7`.

`balance = openingBalance + totalIncome - totalExpense`.

El seed incluye 1 cuenta cash, 8 categorías y 15 transacciones de ejemplo.

## Motor financiero

Funciones disponibles en `src/finance/`:

- Tasas: TEA, TNA, CAGR, conversión diaria/mensual/anual
- Volatilidad y desviación estándar
- Drawdown máximo
- Simulaciones: FIXED, REAL_HISTORY, OPTIMISTIC, PESSIMISTIC, CUSTOM
- Estadísticas completas del portfolio

## Tests

```bash
npm test
npm run test:watch
npm run test:coverage
```
