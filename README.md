# Sistema de Asistencia por QR

Sistema para registrar la asistencia de alumnos a clases mediante escaneo de código QR. Proyecto desarrollado como práctica pre-profesional.

## Stack

| Parte | Tecnología |
|---|---|
| Framework | Next.js + TypeScript |
| Frontend | React |
| Componentes UI | Ant Design |
| Backend | Route Handlers de Next.js |
| ORM | Drizzle ORM |
| Base de datos | PostgreSQL en Neon |
| Generación QR | qrcode.react |
| Lectura QR | html5-qrcode |
| Validación | Zod |
| Despliegue | Vercel |

## Requisitos previos

- Node.js 18 o superior
- npm
- Acceso al connection string de la base de datos en Neon (pídelo a algún integrante del equipo)

## Instalación y arranque local

1. Clonar el repositorio:

   ```bash
   git clone <url-del-repositorio>
   cd Sistema-de-asistencia-por-QR
   ```

2. Instalar dependencias:

   ```bash
   npm install
   ```

3. Crear el archivo `.env.local` en la raíz del proyecto con la conexión a Neon:

   ```
   DATABASE_URL="postgresql://usuario:password@host.neon.tech/basededatos?sslmode=require&channel_binding=require"
   ```

   > ⚠️ **Nunca subas `.env.local` a GitHub.** Ya está incluido en `.gitignore`. Pide el connection string real a un compañero por un canal seguro (no por chat de texto plano).

4. Si es la primera vez que se configura la base de datos, aplicar las migraciones:

   ```bash
   npx drizzle-kit migrate
   ```

5. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

6. Abrir [http://localhost:3000/admin](http://localhost:3000/admin) en el navegador.

## Estructura del proyecto

```
src/
├── app/
│   ├── admin/
│   │   ├── alumnos/          # Registro y listado de alumnos
│   │   ├── inscripciones/    # Ver QR de una inscripción
│   │   ├── clases/           # Crear, abrir y cerrar clases
│   │   ├── asistencia/       # Tabla de asistencias + registro manual
│   │   └── scanner/          # Escaneo de QR con cámara
│   ├── alumno/[token]/       # Portal público del alumno
│   └── api/
│       ├── alumnos/
│       ├── inscripciones/
│       ├── clases/
│       └── asistencias/
├── components/
│   ├── qr/                   # Componentes de generación y lectura de QR
│   └── ...
├── db/
│   ├── index.ts              # Conexión a Neon
│   └── schema.ts             # Modelo de datos (Drizzle)
└── lib/
    └── validations/          # Esquemas de validación (Zod)
```

## Modelo de datos

Cuatro tablas principales:

- **students** — datos del alumno.
- **enrollments** — inscripción del alumno a un periodo. Contiene el `qrToken` (UUID aleatorio, no revela DNI ni datos personales).
- **class_sessions** — sesiones de clase (`OPEN`, `CLOSED`, `CANCELLED`).
- **attendances** — registro de asistencia. Restricción única `enrollmentId + classSessionId`: un alumno no puede registrar asistencia dos veces en la misma clase.

## Flujo general

```
Administrador registra alumno
        ↓
Crea inscripción → se genera QR único
        ↓
Administrador abre una clase
        ↓
Alumno muestra su QR
        ↓
Scanner (cámara) lee el QR
        ↓
POST /api/asistencias/scan valida y registra
        ↓
Asistencia visible en /admin/asistencia
```

Si el QR falla o no está disponible, existe registro manual por DNI en `/admin/asistencia`.

## Endpoints principales

```
POST   /api/alumnos
GET    /api/alumnos
GET    /api/alumnos/[id]
POST   /api/inscripciones
GET    /api/inscripciones/[id]
POST   /api/clases
GET    /api/clases
PATCH  /api/clases/[id]
POST   /api/asistencias/scan
POST   /api/asistencias/manual
GET    /api/asistencias
```

## Flujo de trabajo en Git

Nadie programa directamente sobre `main`. Cada integrante trabaja en su propia rama.

```bash
git checkout main
git pull origin main
git checkout -b feature/nombre-de-la-funcionalidad

# ... trabajar ...

git add .
git commit -m "feat: descripción del cambio"
git push origin feature/nombre-de-la-funcionalidad
```

Luego crear un Pull Request hacia `main` para que otro integrante lo revise antes de mezclar.

## División del equipo

| Practicante | Responsabilidad |
|---|---|
| 1 | Base de datos, backend, APIs, validaciones |
| 2 | Panel de administración (alumnos, clases, asistencias) |
| 3 | Generación y lectura de QR, portal del alumno |

## Estado actual

- [x] Registro y gestión de alumnos
- [x] Inscripciones y generación de QR
- [x] Apertura y cierre de clases
- [x] Escaneo de QR y registro de asistencia (sin duplicados)
- [x] Registro manual de asistencia
- [ ] Portal del alumno completo (pendiente de endpoint de consulta por token)
- [ ] Autenticación de administrador (fuera de alcance de esta primera fase)

## Despliegue

El proyecto se despliega en [Vercel](https://vercel.com). Al importar el repositorio, configurar la variable de entorno `DATABASE_URL` en el dashboard de Vercel con el mismo connection string de Neon.