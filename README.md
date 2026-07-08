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

## Producción (PostgreSQL)

1. Cambiar `DATABASE_URL` en `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/fci_backend?schema=public"
```

2. Cambiar el provider en `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Ejecutar migraciones:

```bash
npm run db:migrate:deploy
```

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor en modo desarrollo |
| `npm run build` | Compilar con tsup |
| `npm start` | Ejecutar build de producción |
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
