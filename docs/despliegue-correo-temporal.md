# Correo con Gmail SMTP

Configurar estas variables en Vercel y volver a desplegar:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=cuenta@gmail.com
SMTP_PASSWORD=CONTRASENA_DE_APLICACION
EMAIL_FROM="Clínica BIODENTIS <cuenta@gmail.com>"
EMAIL_MODE=test
EMAIL_TEST_RECIPIENT=cuenta@gmail.com
FRONTEND_URL=https://web-centro-odontologico-biodentis.vercel.app
```

La cuenta y contraseña son ejemplos. En Vercel introducir valores sin comillas
exteriores. Usar una contraseña de aplicación de Google, con verificación en dos
pasos habilitada; no usar la contraseña habitual. Los espacios de agrupación de
la contraseña de aplicación se eliminan al leerla.

El puerto 587 usa secure=false y requireTLS=true: STARTTLS es obligatorio y se
validan los certificados. No se necesita dominio propio. EMAIL_FROM debe usar
la misma cuenta Gmail autenticada.

En modo test solo se permite el destinatario original autorizado, sin redirigir
datos ni enlaces de otros pacientes. Si EMAIL_TEST_RECIPIENT queda vacío no se
envía ningún correo. La recuperación se omite antes de crear tokens para
usuarios excluidos. La outbox completa las supresiones deliberadas: pasar luego
a EMAIL_MODE=live no recupera esos avisos.

Para enviar a usuarios generales cambiar EMAIL_MODE a live y volver a desplegar.
RESEND_API_KEY ya no se utiliza. No subir .env ni exponer SMTP_PASSWORD mediante
NEXT_PUBLIC_ o logs.

Los envíos se esperan en runtime Node.js, con timeouts explícitos. Gmail puede
limitar el volumen o bloquear conexiones. Revisar los logs sanitizados y la
duración disponible de las funciones antes de aumentar lotes.

Registro, confirmación y cancelación usan la outbox persistida existente, con
hasta diez intentos y espera exponencial. Verificar la programación externa de
/api/cron/email-outbox y CRON_SECRET. Recuperación y recordatorios no tienen
reintento persistido. SMTP no garantiza deduplicación: el Message-ID estable
solo permite correlacionar; un envío aceptado cuyo resultado local se pierda
puede repetirse. No se modifican modelos ni migraciones.
