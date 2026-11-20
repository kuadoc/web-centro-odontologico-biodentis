# Imágenes en Vercel y Supabase S3

Configurar en `apps/web/.env` para desarrollo y en las variables del proyecto de Vercel para el despliegue:

```dotenv
STORAGE_DRIVER=s3
S3_ENDPOINT=https://PROJECT_REF.storage.supabase.co/storage/v1/s3
S3_REGION=us-east-1
S3_BUCKET=biodentis.drive
S3_IMAGE_PREFIX=imagen
S3_ACCESS_KEY_ID=CLAVE_DE_ACCESO
S3_SECRET_ACCESS_KEY=CLAVE_SECRETA
```

Copiar bucket y región desde Supabase; el endpoint no incluye el bucket. Usar un bucket **privado** porque contiene tanto fotografías públicas de odontólogos como avatares privados. Las credenciales son exclusivas del servidor, sin prefijo `NEXT_PUBLIC_`. El `.env` local está excluido de Git; Vercel necesita las mismas variables configuradas en su proyecto.

Las claves físicas son `imagen/odontologos/<UUID>.webp` e `imagen/avatares/<propietario>/<UUID>.webp`. Cada foto nueva genera un único WebP optimizado, sin miniatura adicional ni copia del original. `S3_IMAGE_PREFIX` vale `imagen` por defecto y se aplica a escritura, lectura y borrado. Las rutas `/api/uploads/...` conservan las claves lógicas sin ese prefijo. La carpeta `documentos/` queda reservada para documentos.

Seleccionar un archivo prepara una vista previa local. Mi Perfil envía la foto con Guardar cambios; Administración la envía con Crear Usuario o Actualizar Usuario. La creación de un odontólogo guarda en `users.avatarUrl` la ruta del archivo externo y la landing consulta esa misma referencia. Se mantiene el tamaño visual del carrusel. El formulario ya no ofrece el catálogo fijo de fotos de `public/images`.

El selector admite JPEG, PNG y WebP. Para retratos públicos de odontólogos se envían los bytes del archivo de entrada sin recorte ni recompresión en el navegador, hasta 3 MiB. El servidor aplica orientación EXIF, limita el lado mayor a 1600 px sin ampliar y codifica un único WebP sin pérdida de compresión. El recorte visible lo realiza la tarjeta existente de la landing; sus dimensiones CSS se mantienen. El límite de 4 MiB + 64 caracteres de Base64 permite ese archivo con margen bajo los 4,5 MB de la petición de Vercel. Las imágenes demasiado grandes se rechazan explícitamente en lugar de degradar su calidad automáticamente. Los avatares privados mantienen el recorte de 256 px en el navegador y admiten archivos de entrada de hasta 5 MiB.

La conversión sin pérdida no recupera detalle de una foto ya comprimida ni evita la reducción de dimensiones cuando el original supera 1600 px. Las fotos previamente guardadas a 640 × 768/JPEG deben adjuntarse de nuevo desde el original para aprovechar el procesamiento nuevo.

El servidor comprueba la firma y la decodificación real, elimina metadatos EXIF/GPS y guarda un WebP con clave UUID. Los nuevos perfiles guardan una ruta `/api/uploads/...` en la base de datos. Si falla su persistencia durante el guardado se intenta eliminar la imagen recién creada. La comparación del avatar actual y el bloqueo de la fila del usuario evitan nuevas subidas de la misma imagen confirmada ante solicitudes simultáneas y reintentos. Esto no constituye una transacción distribuida ni resuelve interrupciones del proceso o fallos de limpieza: sigue pendiente la reconciliación durable de objetos. Las fotos antiguas en data URL y `/images/` siguen siendo compatibles; no se migran automáticamente. Al reemplazar o quitar una foto, los archivos anteriores se conservan para no borrar referencias concurrentes; su limpieza posterior requiere comprobar referencias en la base de datos. No se eliminan imágenes ni miniaturas históricas durante esta implementación.

Las fotos de odontólogos se sirven públicamente por la API; los avatares requieren sesión del propietario o de un administrador. El componente de avatar descarga estos últimos con autenticación. Cada subida genera un UUID nuevo y envía `If-None-Match: *`. La garantía atómica de no sobrescritura depende del proveedor: Supabase tiene una [corrección pendiente para respetar esa condición](https://github.com/supabase/storage/pull/1636). Las pruebas locales verifican el envío de la condición y el manejo de conflictos simulados; no prueban que el servicio remoto la aplique. Los errores del proveedor no exponen credenciales.

Comprobaciones locales:

```powershell
pnpm.cmd --filter web test:storage
pnpm.cmd typecheck
pnpm.cmd lint
```

Prueba manual contra el almacenamiento configurado, cuando bucket y región estén completos (crea una única imagen real):

```powershell
pnpm.cmd --filter web storage:probar -- foto.jpg
pnpm.cmd --filter web storage:probar -- --eliminar odontologos/UUID_DEVUELTO.webp
pnpm.cmd --filter web storage:probar -- --verificar
```

Referencias: [autenticación S3 de Supabase](https://supabase.com/docs/guides/storage/s3/authentication), [compatibilidad S3](https://supabase.com/docs/guides/storage/s3/compatibility), [límites de Vercel](https://vercel.com/docs/functions/limitations).
