# BIODENTIS

Plataforma web para la gestión de un centro odontológico. Integra la administración de citas, pacientes, disponibilidad e historias clínicas, con acceso según el rol del usuario.

El proyecto está organizado como un monorepo con una aplicación Next.js y paquetes compartidos de interfaz, tipos, validaciones y configuración.

## Contenido

- [Funcionalidades](#funcionalidades)
- [Tecnologías](#tecnologías)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Requisitos](#requisitos)
- [Instalación y desarrollo](#instalación-y-desarrollo)
- [Comandos disponibles](#comandos-disponibles)
- [Validación](#validación)
- [Compilación y ejecución](#compilación-y-ejecución)
- [Manejo de información](#manejo-de-información)

## Funcionalidades

- Autenticación y control de acceso por roles.
- Gestión de pacientes, odontólogos y usuarios.
- Reserva, confirmación, reprogramación y cancelación de citas.
- Administración de horarios, disponibilidad y excepciones.
- Registro y consulta de historias clínicas.
- Gestión del catálogo de servicios y unidades dentales.
- Paneles de gestión, reportes y exportación de información.
- Notificaciones por correo y almacenamiento de imágenes.

## Tecnologías

| Área | Tecnologías |
| --- | --- |
| Aplicación y API | Next.js 16, React 19 y TypeScript |
| Interfaz | Tailwind CSS 4 y componentes compartidos basados en shadcn/ui |
| Datos y validación | TanStack Query y Zod |
| Persistencia | PostgreSQL y Prisma ORM |
| Autenticación | JWT y bcrypt |
| Correo y archivos | Nodemailer y almacenamiento compatible con S3 |
| Monorepo | pnpm workspaces y Turborepo |
| Calidad | ESLint, Prettier y pruebas automatizadas |

## Estructura del proyecto

```text
apps/
  web/
    app/                  Rutas, páginas y endpoints de Next.js
    components/           Componentes de la aplicación
    modules/              Módulos de negocio
    prisma/               Modelo de datos, migraciones y seed
    tests/                Pruebas automatizadas
    public/               Recursos estáticos
packages/
  ui/                     Componentes y estilos compartidos
  shared-types/           Tipos compartidos
  shared-validators/      Esquemas de validación compartidos
  config/                 Configuración compartida
  eslint-config/          Configuración de ESLint
  typescript-config/      Configuración de TypeScript
docs/                     Documentación técnica y funcional
```

## Requisitos

- Node.js compatible con la versión de Next.js instalada y con los requisitos del repositorio.
- pnpm 10.33.4, según la versión declarada en el repositorio.
- Git.
- Una instancia de PostgreSQL disponible para desarrollo.

## Instalación y desarrollo

### 1. Instalar dependencias

Clona el repositorio y, desde su carpeta raíz, ejecuta:

```bash
pnpm install --frozen-lockfile
```

### 2. Configurar el entorno

La aplicación requiere variables de entorno para la conexión a la base de datos, la autenticación y los servicios externos. Solicita la configuración al responsable del proyecto y complétala localmente antes de continuar.

Por seguridad, este README no incluye nombres, valores ni ejemplos de variables de entorno.

### 3. Preparar la base de datos

Genera el cliente de Prisma:

```bash
pnpm db:generate
```

En una base de datos exclusiva de desarrollo, aplica las migraciones:

```bash
pnpm db:migrate
```

La carga de datos de prueba es opcional y requiere su configuración local:

```bash
pnpm db:seed
```

Utiliza el seed únicamente en una base de desarrollo destinada a pruebas.

### 4. Iniciar la aplicación

Compila los tipos compartidos e inicia el entorno de desarrollo:

```bash
pnpm --filter @biodentis/shared-types build
pnpm dev
```

Abre la dirección local que indique Next.js en la terminal.

## Comandos disponibles

Ejecuta estos comandos desde la raíz del monorepo:

| Comando | Descripción |
| --- | --- |
| `pnpm dev` | Inicia el entorno de desarrollo. |
| `pnpm build` | Compila la aplicación y los paquetes con tareas de compilación. |
| `pnpm lint` | Ejecuta el análisis estático. |
| `pnpm typecheck` | Comprueba los tipos de TypeScript. |
| `pnpm format` | Aplica el formato configurado en los paquetes. |
| `pnpm db:generate` | Genera el cliente de Prisma. |
| `pnpm db:migrate` | Crea y aplica migraciones en desarrollo. |
| `pnpm db:seed` | Carga datos de prueba en el entorno local configurado. |
| `pnpm db:studio` | Abre la interfaz de administración de Prisma. |

## Validación

Antes de proponer cambios, ejecuta las comprobaciones generales:

```bash
pnpm lint
pnpm typecheck
```

La aplicación incluye pruebas por módulo. Algunos comandos disponibles son:

```bash
pnpm --filter web test:auth-service
pnpm --filter web test:appointments
pnpm --filter web test:availability
pnpm --filter web test:reports
pnpm --filter web test:storage
```

Consulta los scripts de [apps/web/package.json](apps/web/package.json) para elegir las pruebas correspondientes al cambio. Las pruebas de integración y de extremo a extremo pueden requerir servicios y datos locales preparados.

## Compilación y ejecución

Para generar y ejecutar la compilación de producción:

```bash
pnpm build
pnpm --filter web start
```

Configura previamente el entorno de destino. La compilación genera el cliente de Prisma, pero la actualización de la base de datos se gestiona por separado mediante el procedimiento de despliegue del proyecto.

## Manejo de información

- Mantén las credenciales, secretos y archivos de entorno fuera del control de versiones.
- Utiliza datos ficticios en desarrollo, pruebas y demostraciones.
- Evita incluir información personal o clínica en documentación, capturas, registros o reportes de errores.
- Comparte la configuración y los accesos únicamente por los canales privados establecidos por el equipo.
