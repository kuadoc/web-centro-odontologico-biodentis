# Almacenamiento de fotos de perfil

Implementado: servicio, drivers local y S3 compatible con Supabase, lectura HTTP,
integración con creación/edición de usuarios y Mi Perfil. Adjuntar prepara una
vista previa local; el guardado del formulario envía una única foto optimizada.
La landing utiliza `users.avatarUrl` para el retrato del odontólogo y conserva
sus dimensiones visuales. Configuración y límites: [guía vigente](../../../../docs/almacenamiento-imagenes.md).

## Configuración

Windows x64 con Node 22.20.0 y sharp 0.34.5 fue comprobado generando WebP con el
binario disponible. No requiere compilación manual ni libvips global.
`pnpm-workspace.yaml` ya permite los builds de sharp. No omitir dependencias
opcionales al instalar: contienen los binarios nativos de la plataforma.

Agregar a `apps/web/.env`, sin sustituir las variables existentes:

```dotenv
STORAGE_DRIVER=local
```

`local` usa `apps/web/uploads/`, fuera de `app/` y `public/`. La carpeta se crea
al escribir; se ignoran sus archivos en Git y se conserva `.gitkeep`.
El resolver admite ejecución desde la raíz del monorepo o desde `apps/web`.
Un despliegue standalone debe ejecutarse desde su directorio de aplicación.
En producción se necesita un volumen/disco persistente, permisos de lectura y
escritura y copia de seguridad de esta carpeta. Un disco efímero no conserva las
imágenes entre despliegues. No publicar `uploads/` directamente con otro servidor.

`STORAGE_DRIVER=s3` selecciona el driver S3. Requiere la configuración del servidor
descrita en la guía vigente. No usa almacenamiento local como alternativa silenciosa.

## Procesamiento y contrato

```ts
const imagen = await new StorageService().guardarImagen(file, "odontologos");
// imagen.key: odontologos/<uuid>.webp
// También devuelve width/height y bytes. No genera una miniatura adicional.

await new StorageService().eliminarImagen(imagen.key);
// Elimina la imagen y admite miniaturas antiguas para compatibilidad.
```

El servidor valida `File`, 1 byte–5 MB, firma binaria y decodificación real JPEG,
PNG o WebP. No utiliza el nombre original ni confía en su extensión o MIME
declarado. Rechaza formatos no admitidos, imágenes corruptas/animadas y entradas
de más de 40 millones de píxeles. Aplica orientación EXIF y elimina metadatos
(incluido GPS). Conserva proporción con `fit: inside`, sin ampliar:

| Destino | Lado mayor | WebP |
| --- | ---: | ---: |
| `odontologos` | 1600 px | sin pérdida de compresión |
| `avatares/<UUID propietario>` | 512 px | calidad 80 |

Cada nueva imagen usa una clave UUID. El driver solicita creación sin sobrescritura;
su garantía depende de la implementación del proveedor. Si falla la persistencia
del perfil durante el guardado se intenta eliminar la nueva imagen. Los reintentos
del avatar actual reutilizan la imagen cuando su contenido procesado coincide.

## Publicación, permisos y caché

La clasificación la decide la carpeta validada por el servicio, nunca un flag
en query string, el MIME, una extensión o un rol declarado por el cliente.
La futura API de subida debe decidir esa carpeta desde la identidad autenticada.

| Clave | Quién puede leer | Cache-Control |
| --- | --- | --- |
| `odontologos/<UUID>[-thumb].webp` | Público, para el equipo publicado en la landing | `public, max-age=31536000, immutable` |
| `avatares/<UUID propietario>/<UUID>[-thumb].webp` | Propietario o ADMIN, ambos activos | `private, no-store` |
| Cualquier error, incluidos 400/401/403/404/500 | Sin imagen | `private, no-store` |

Las fotos públicas pueden conservarse en cachés durante un año: borrar el archivo
impide lecturas nuevas en origen pero no revoca copias ya cacheadas. No colocar
fotografías privadas en `odontologos/`.

La ruta privada usa el JWT de acceso `Authorization: Bearer ...` existente y
consulta únicamente id/rol/isActive mediante el repository. No acepta un id o rol
del cliente como autorización. El propietario está en la clave del directorio,
por lo que estos permisos se pueden probar sin añadir columnas a Prisma.
Las respuestas privadas agregan `Vary: Authorization`. No se usa la cookie refresh
como sustituto del JWT de acceso. En la fase frontend será necesario un fetch
autenticado y una URL blob para mostrar avatares privados en `<img>`; un `<img>`
directo no envía la cabecera Bearer.

`GET /api/uploads/[...path]` usa runtime Node y el flujo route → service →
repository → driver. El repository es el único punto que consulta Prisma para
validar al actor. Usa `handleApiError`, Content-Type `image/webp` y `nosniff`.
El driver verifica `path.resolve` y el prefijo de la carpeta base con separador,
rechaza `..`, barras invertidas y claves fuera del schema, y bloquea enlaces
simbólicos/junctions en directorios y archivos.

## Probar localmente

Desde la raíz, con las dependencias instaladas:

```powershell
pnpm.cmd --filter web test:storage
pnpm.cmd --filter web storage:probar -- public/images/plena_operacion.jpeg
pnpm.cmd --filter web dev
```

El segundo comando devuelve las claves y URLs para abrir ambas versiones en
`http://localhost:3000`. Cada ejecución crea una pareja independiente de archivos.
Puedes usar cualquier JPEG/PNG/WebP local de hasta 5 MB, con ruta relativa a
`apps/web` o absoluta. El archivo original no se modifica.

Para consultar cabeceras:

```powershell
curl.exe -I "http://localhost:3000/api/uploads/odontologos/<UUID>.webp"
# Solo para una miniatura histórica que ya exista:
curl.exe -I "http://localhost:3000/api/uploads/odontologos/<UUID>-thumb.webp"
```

Para probar una imagen privada, usa el UUID real de tu usuario y su JWT vigente
(el script no crea usuarios):

```powershell
pnpm.cmd --filter web storage:probar -- public/images/angel.jpg --propietario <UUID_USUARIO>
curl.exe -i "http://localhost:3000/api/uploads/avatares/<UUID_USUARIO>/<UUID_IMAGEN>.webp"
# Debe responder 401 sin token.
curl.exe -I -H "Authorization: Bearer <ACCESS_TOKEN>" "http://localhost:3000/api/uploads/avatares/<UUID_USUARIO>/<UUID_IMAGEN>.webp"
# 200 para propietario/ADMIN activo; 403 para otro usuario activo.
```

Para traversal (usar `--path-as-is` para que curl no normalice la ruta):

```powershell
curl.exe --path-as-is -i "http://localhost:3000/api/uploads/odontologos/%2e%2e%2fsecreto.webp"
```

Debe rechazarse sin devolver archivos externos. Una clave válida que no existe
responde 404. Las pruebas unitarias también invocan el handler con parámetros
maliciosos para comprobar que no se llama al lector de disco.

Limpiar una pareja creada por la prueba manual:

```powershell
pnpm.cmd --filter web storage:probar -- --eliminar "odontologos/<UUID>.webp"
```

Las pruebas automatizadas generan imágenes y EXIF/GPS en memoria, usan carpetas
temporales, verifican los destinos antes de limpiarlos y simulan la consulta de
identidad. No requieren ni escriben en la base de datos.

## Límites y trabajo pendiente

Las fotos históricas siguen siendo compatibles. Esta versión no realiza un barrido
de objetos del bucket. La retirada segura de fotos anteriores, la limpieza durable
con reintentos y la recuperación ante interrupciones requieren reconciliar primero
las referencias de la base de datos. La compensación actual no es una transacción
distribuida entre PostgreSQL y Storage.
