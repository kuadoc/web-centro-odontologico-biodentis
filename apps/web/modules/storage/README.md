# Almacenamiento de imágenes — fases 1 y 2

Implementado: servicio, driver local, contrato S3/R2, lectura HTTP y pruebas.
No se modifican Prisma, perfiles, endpoints de escritura existentes ni frontend.
`avatarUrl` y todos sus Base64 se conservan. El módulo aún no participa en el
guardado de fotos de la aplicación: se integra después de probar estas fases.

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

`STORAGE_DRIVER=s3` selecciona el esqueleto explícito compatible con el contrato
S3/Cloudflare R2; sus operaciones fallan con `InfrastructureError` hasta que se
implemente. No usa almacenamiento local como alternativa silenciosa.

## Procesamiento y contrato

```ts
const imagen = await new StorageService().guardarImagen(file, "odontologos");
// imagen.key: odontologos/<uuid>.webp
// imagen.thumbKey: odontologos/<uuid>-thumb.webp
// También devuelve width/height, thumbWidth/thumbHeight y bytes/thumbBytes.

await new StorageService().eliminarImagen(imagen.key);
// Elimina original y thumbnail; admite la clave del thumbnail y es idempotente.
```

El servidor valida `File`, 1 byte–5 MB, firma binaria y decodificación real JPEG,
PNG o WebP. No utiliza el nombre original ni confía en su extensión o MIME
declarado. Rechaza formatos no admitidos, imágenes corruptas/animadas y entradas
de más de 40 millones de píxeles. Aplica orientación EXIF y elimina metadatos
(incluido GPS). Conserva proporción con `fit: inside`, sin ampliar:

| Destino | Lado mayor | WebP | Thumbnail |
| --- | ---: | ---: | --- |
| `odontologos` | 1600 px | calidad 80 | hasta 300 px, calidad 75 |
| `avatares/<UUID propietario>` | 512 px | calidad 80 | hasta 300 px, calidad 75 |

Las claves UUID son inmutables y se crean sin sobrescritura. Si falla la segunda
escritura, el servicio limpia la primera. El driver elimina una escritura parcial.
La actualización de referencias de perfiles y la compensación ante fallos de BD
corresponden a la fase siguiente; no se ejecutan ahora.

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

## Próximas fases: pendientes de autorización

1. Migración aditiva de `fotoKey` y `fotoThumbKey`, conservando `avatarUrl` y Base64.
2. Script idempotente con `--dry-run` y reporte: convertidos, omitidos, fallidos y
   motivos, sin incluir imágenes ni datos sensibles en el reporte. No existe aún
   un comando de migración de datos en esta entrega.
3. Integrar multipart, referencias de fotos, listados de solo URLs y auditoría
   de cambios de perfil; publicar miniaturas con dimensiones explícitas.
4. Verificar la transferencia durante refrescos y scroll. El listado actual
   continúa funcionando como antes hasta esa integración.

Eliminar el campo viejo o limpiar sus datos requerirá aprobación posterior.
