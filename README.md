# TechSupport Pro - Sistema de Gestión de Tickets

Sistema backend de gestión de tickets de soporte técnico con sistema de priorización automática, escalamiento por SLA y gestión de roles.

## 📋 Descripción

TechSupport Pro es una API REST diseñada para gestionar tickets de soporte técnico con las siguientes características principales:

- **Gestión de usuarios con roles** (Admin, Supervisor, Agente)
- **Sistema de tickets** con priorización automática según tipo de cliente
- **Escalamiento automático por SLA** (VIP: 2 horas, Normal: 24 horas)
- **Validación de transiciones de estado** del ciclo de vida del ticket
- **Cálculo automático de tiempo de resolución**
- **Sistema de autenticación JWT** con refresh tokens
- **Autorización granular** por rol y recurso

## 🚀 Tecnologías Utilizadas

### Backend

- **Node.js** (v18+)
- **TypeScript** - Tipado estático
- **Express** - Framework web
- **Prisma ORM** - Manejo de base de datos
- **PostgreSQL** - Base de datos principal
- **MongoDB** - Almacenamiento de logs
- **Redis** - Rate limiting y cache

### Seguridad

- **bcrypt** - Hash de contraseñas
- **jsonwebtoken** - Autenticación JWT
- **express-rate-limit** - Rate limiting
- **CORS** configurado

### Desarrollo

- **ts-node-dev** - Hot reload en desarrollo
- **ESLint** - Linting
- **Prettier** - Formateo de código

## 📁 Estructura del Proyecto

```
techsupport-pro/
├── src/
│   ├── config/              # Configuraciones (DB, logger, env)
│   ├── modules/             # Módulos de la aplicación
│   │   ├── auth/           # Autenticación y autorización
│   │   ├── tickets/        # Gestión de tickets
│   │   └── users/          # Gestión de clientes
│   ├── shared/             # Código compartido
│   │   ├── middleware/     # Middlewares globales
│   │   └── types/          # Tipos TypeScript
│   └── server.ts           # Punto de entrada
├── prisma/
│   ├── schema.prisma       # Schema de la base de datos
│   └── seed.ts            # Datos de prueba
├── docker-compose.yml      # Servicios Docker
└── package.json
```

## ⚙️ Instalación y Configuración

### Prerrequisitos

- Node.js 18 o superior
- Docker y Docker Compose
- Git

### 1. Clonar el repositorio

```bash
git clone https://github.com/andresmoln/techsupport-pro.git
cd techsupport-pro
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto (puedes copiar `.env.example`):

### 4. Levantar servicios con Docker

**En desarrollo:**

```bash
docker-compose -f docker/docker-compose.dev.yml --env-file .env up -d
```

Esto levantará solo los servicios (PostgreSQL, MongoDB, Redis).  
La aplicación Node.js se ejecuta localmente con `npm run dev`.

### 5. Ejecutar migraciones de Prisma

```bash
npx prisma migrate dev
```

### 6. Cargar datos de prueba

```bash
npm run prisma:seed
```

### 7. Iniciar el servidor

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 👤 Usuarios de Prueba

El seed carga los siguientes usuarios:

| Email                      | Password    | Rol        | Descripción                   |
| -------------------------- | ----------- | ---------- | ----------------------------- |
| admin@techsupport.com      | password123 | ADMIN      | Acceso total                  |
| supervisor@techsupport.com | password123 | SUPERVISOR | Gestión de tickets y clientes |
| agente1@techsupport.com    | password123 | AGENTE     | Nivel 1 - Tickets asignados   |
| agente2@techsupport.com    | password123 | AGENTE     | Nivel 2 - Tickets escalados   |
| agente3@techsupport.com    | password123 | AGENTE     | Nivel 3 - Tickets críticos    |

## 🔌 Endpoints de la API

### Autenticación

```
POST   /api/auth/login          # Iniciar sesión
POST   /api/auth/register       # Registrar usuario (solo Admin)
POST   /api/auth/refresh        # Renovar access token
POST   /api/auth/logout         # Cerrar sesión
GET    /api/auth/me             # Obtener usuario actual
```

### Tickets

```
POST   /api/tickets                # Crear ticket
GET    /api/tickets                # Listar tickets (con filtros)
GET    /api/tickets/:id            # Obtener ticket por ID
PUT    /api/tickets/:id            # Actualizar ticket
DELETE /api/tickets/:id            # Eliminar ticket (Admin/Supervisor)
POST   /api/tickets/escalar-sla   # Ejecutar escalamiento SLA
```

**Filtros disponibles:**

- `estado`: ABIERTO, EN_PROGRESO, RESUELTO, CERRADO, ESCALADO
- `prioridad`: ALTA, MEDIA, BAJA
- `clienteId`: UUID del cliente
- `agenteAsignadoId`: UUID del agente
- `fechaDesde`: Fecha ISO
- `fechaHasta`: Fecha ISO
- `page`: Número de página
- `pageSize`: Elementos por página (max 100)

### Clientes

```
POST   /api/clients        # Crear cliente (Admin/Supervisor)
GET    /api/clients        # Listar clientes
GET    /api/clients/:id    # Obtener cliente por ID
PUT    /api/clients/:id    # Actualizar cliente (Admin/Supervisor)
DELETE /api/clients/:id    # Eliminar cliente (solo Admin)
```

### Health Check

```
GET    /health             # Verificar estado de la API
```

## 🎯 Reglas de Negocio

### Priorización Automática

- **Clientes VIP** → Tickets con prioridad ALTA
- **Clientes Normales** → Tickets con prioridad MEDIA

### Sistema de SLA

- **Clientes VIP**: 2 horas máximo
- **Clientes Normales**: 24 horas máximo

Si un ticket excede el SLA, se escala automáticamente al siguiente nivel.

### Niveles de Escalamiento

1. **Nivel 1**: Agentes junior - Tickets nuevos
2. **Nivel 2**: Agentes senior - Tickets que excedieron SLA VIP
3. **Nivel 3**: Especialistas - Tickets críticos o complejos

### Transiciones de Estado Válidas

```
ABIERTO → EN_PROGRESO, ESCALADO
EN_PROGRESO → RESUELTO, ESCALADO
ESCALADO → EN_PROGRESO, RESUELTO
RESUELTO → CERRADO
CERRADO → (sin transiciones)
```

### Restricciones de Agentes

- Agentes Nivel 1: No pueden atender tickets escalados a Nivel 2 o 3
- Agentes Nivel 2: No pueden atender tickets escalados a Nivel 3
- Agentes Nivel 3: Pueden atender cualquier ticket

### Permisos por Rol

| Acción                    | Admin | Supervisor | Agente |
| ------------------------- | ----- | ---------- | ------ |
| Crear usuario             | ✅    | ❌         | ❌     |
| Crear cliente             | ✅    | ✅         | ❌     |
| Actualizar cliente        | ✅    | ✅         | ❌     |
| Eliminar cliente          | ✅    | ❌         | ❌     |
| Crear ticket              | ✅    | ✅         | ✅     |
| Ver todos los tickets     | ✅    | ✅         | ❌\*   |
| Actualizar ticket         | ✅    | ✅         | ✅\*   |
| Eliminar ticket           | ✅    | ✅         | ❌     |
| Ejecutar escalamiento SLA | ✅    | ✅         | ❌     |

\*Los agentes solo pueden ver y actualizar tickets asignados a ellos.

## 🔒 Seguridad

### Autenticación

- **JWT** con access tokens de corta duración (15 minutos)
- **Refresh tokens** con rotación (7 días)
- **One-time use** de refresh tokens
- Contraseñas hasheadas con **bcrypt** (cost factor 10)

### Rate Limiting

- **General**: 100 requests por minuto
- **Login**: 10 intentos por minuto (protección contra brute force)

### Headers de Seguridad

- `X-Frame-Options: DENY` (protección contra clickjacking)
- `X-Content-Type-Options: nosniff` (protección contra MIME sniffing)
- `Strict-Transport-Security` en producción (HSTS)

### Validación de Inputs

- Sanitización de strings (protección XSS)
- Validación de emails
- Validación de UUIDs
- Validación de rangos de fechas

### Timeout

- Límite de 30 segundos por request

## 📊 Base de Datos

### Modelos Principales

**Usuario**

- Autenticación y relación con Agente

**Agente**

- Nivel de escalamiento (1, 2, 3)
- Relación 1-N con Tickets

**Cliente**

- Tipo: VIP o NORMAL
- Relación 1-N con Tickets

**Ticket**

- Estado del ticket
- Prioridad automática
- Nivel de escalamiento
- Tiempo de resolución calculado
- Soft delete

**RefreshToken**

- Tokens de sesión
- Expiración

### Índices Optimizados

- `ticket.estado`
- `ticket.prioridad`
- `ticket.clienteId`
- `ticket.agenteAsignadoId`
- `ticket.fechaCreacion`
- `ticket.deletedAt`

## 🧪 Testing

### Colección de Postman

Importa la colección `TechSupport Pro API - Complete.postman_collection.json` para probar todos los endpoints.

### Ejemplo de flujo completo

1. Login como Admin
2. Crear un cliente VIP
3. Crear un ticket para ese cliente (verás que se asigna prioridad ALTA)
4. Asignar el ticket a un agente
5. Cambiar estado a EN_PROGRESO
6. Resolver el ticket (se calcula tiempo de resolución)
7. Cerrar el ticket

## 📝 Scripts Disponibles

```bash
npm run dev          # Iniciar en modo desarrollo
npm run build        # Compilar TypeScript
npm start            # Iniciar en producción
npm run typecheck    # Verificar tipos TypeScript

# Prisma
npm run prisma:generate   # Generar cliente de Prisma
npm run prisma:migrate    # Ejecutar migraciones
npm run prisma:studio     # Abrir Prisma Studio
npm run prisma:seed       # Cargar datos de prueba
```

## 🛠️ Comandos Útiles

### Desarrollo

**Levantar solo servicios (PostgreSQL, MongoDB, Redis):**

```bash
docker-compose -f docker/docker-compose.dev.yml --env-file .env up -d
```

**Ver logs:**

```bash
docker-compose -f docker/docker-compose.dev.yml --env-file .env logs -f
```

**Detener servicios:**

```bash
docker-compose -f docker/docker-compose.dev.yml --env-file .env down
```

**Reset completo (elimina volúmenes):**

```bash
docker-compose -f docker/docker-compose.dev.yml --env-file .env down -v
```

### Producción

**Levantar todos los servicios incluyendo la app:**

```bash
docker-compose -f docker/docker-compose.prod.yml --env-file .env.production up -d --build
```

**Ver logs de la aplicación:**

```bash
docker-compose -f docker/docker-compose.prod.yml --env-file .env.production logs -f app
```

**Detener todo:**

```bash
docker-compose -f docker/docker-compose.prod.yml --env-file .env.production down
```

## 🚀 Despliegue en Producción con Docker

### Preparación

1. **Clonar el repositorio en el servidor:**

```bash
git clone https://github.com/andresmoln/techsupport-pro.git
cd techsupport-pro
```

2. **Crear archivo .env.production con secretos seguros:**

```bash
cp .env.production .env.production.local
# Editar .env.production.local y cambiar TODOS los valores marcados como "CAMBIAR"
```

**IMPORTANTE:** Generar secretos seguros:

```bash
# Generar JWT_SECRET
openssl rand -base64 32

# Generar JWT_REFRESH_SECRET
openssl rand -base64 32
```

3. **Renombrar el archivo de producción:**

```bash
mv .env.production.local .env.production
```

4. **Verificar que .env.production NO esté en Git:**

```bash
git status
# NO debe aparecer .env.production
```

### Despliegue

**Levantar todos los servicios:**

```bash
docker-compose -f docker/docker-compose.prod.yml --env-file .env.production up -d --build
```

Esto:

- Construye la imagen de la aplicación
- Levanta PostgreSQL, MongoDB, Redis
- Levanta la aplicación Node.js
- Ejecuta migraciones automáticamente
- Reinicia automáticamente si falla

**Verificar que todo esté corriendo:**

```bash
docker-compose -f docker/docker-compose.prod.yml ps
```

**Cargar datos de prueba (opcional):**

```bash
docker-compose -f docker/docker-compose.prod.yml exec app npx prisma db seed
```

**Ver logs:**

```bash
docker-compose -f docker/docker-compose.prod.yml logs -f app
```

### Consideraciones de Seguridad

1. **NUNCA subir .env o .env.production a Git**
   - Están en `.gitignore` por defecto
   - Verificar antes de cada commit

2. **Cambiar TODOS los secretos por valores seguros:**
   - JWT_SECRET (mínimo 32 caracteres)
   - JWT_REFRESH_SECRET (mínimo 32 caracteres)
   - POSTGRES_PASSWORD

3. **En producción real, considera:**
   - Usar servicios managed (AWS RDS, MongoDB Atlas, Redis Cloud)
   - Variables de entorno del sistema operativo
   - Servicios de secretos (AWS Secrets Manager, HashiCorp Vault)
   - Reverse proxy con SSL (Nginx, Traefik)
   - Firewall y reglas de seguridad
   - Backups automáticos
   - Monitoring y alertas

## 🐛 Troubleshooting

### Error: "Can't reach database server"

- Verifica que Docker esté corriendo: `docker ps`
- Revisa los logs: `docker-compose logs postgres`

### Error: "Port already in use"

- Cambia el puerto en `.env` y `docker-compose.yml`
- O detén el servicio que usa ese puerto

### Error: "JWT malformed"

- Verifica que `JWT_SECRET` esté configurado en `.env`
- Haz login de nuevo para obtener un token válido

## 📄 Licencia

Este proyecto fue desarrollado como prueba técnica para Suntech Ventures.

## 👨‍💻 Autor

José Andres Molina Hinestroza
andresmoln02@gmail.com
www.linkedin.com/in/josmolinah

---

**Versión**: 1.0.0  
**Última actualización**: Febrero 2026
