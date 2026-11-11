# Bot de WhatsApp para el clan

Bot sencillo para grupos existentes. Usa `whatsapp-web.js` y WhatsApp Web: **no es la API oficial de Meta**, así que puede desconectarse, dejar de funcionar tras cambios de WhatsApp o exponer el número a restricciones. Úsalo con un número que controles.

## Qué incluye

- `!cerrar` y `!abrir` en los grupos configurados; solo los administradores del grupo pueden usarlos.
- Bienvenida con reglas y ficha cuando alguien entra en el lobby.
- `!anuncio <mensaje>` para enviar un anuncio a los grupos configurados.
- `!idgrupo` para consultar el ID de un grupo y `!ayuda` para ver comandos.
- Ruta `/health` para comprobar que el proceso sigue activo.

El bot debe ser administrador en cada grupo donde deba cambiar permisos. La bienvenida se envía cuando WhatsApp notifica que alguien ya entró; no aprueba solicitudes de entrada ni añade usuarios por sí mismo.

## Personalizar grupos y textos

1. Copia `.env.example` a `.env`.
2. Entra en el lobby con una cuenta administradora y escribe `!idgrupo`. Repite en cada grupo que quieras controlar.
3. Pon el ID del lobby en `LOBBY_GROUP_ID` y todos los IDs (separados por comas) en `GROUP_IDS`.
4. Edita las reglas y la ficha en `src/messages.js`.
5. Añade el bot a tus grupos y hazlo administrador.

No compartas `.env`, el QR ni la carpeta `.wwebjs_auth`: contienen credenciales de acceso a la cuenta.

## Ejecutar localmente para vincular y probar

Necesitas Node.js 24 o superior y Chromium. En Windows quizá tengas que definir `CHROME_BIN` con la ruta a Chrome.

```powershell
Copy-Item .env.example .env
npm install
npm start
```

Escanea el QR con WhatsApp → **Dispositivos vinculados**. Comprueba `!cerrar` y `!abrir` en un grupo de prueba antes de usarlo en los grupos reales.

## Alojamiento en Render

El `Dockerfile` instala Chromium y guarda la sesión bajo `/app/.wwebjs_auth`. En Render crea un **Web Service** conectado al repositorio, usando Docker. Añade las variables `LOBBY_GROUP_ID` y `GROUP_IDS` en Environment, y un disco persistente con ruta `/app/.wwebjs_auth`. Render indica que los discos persistentes están disponibles para servicios de pago; sin persistencia la sesión se pierde al reiniciar o desplegar. El servicio debe permanecer en un plan que no suspenda el proceso.

Durante el primer despliegue, abre los logs y escanea el QR que imprime el bot. Después de verificar que sigue conectado tras un reinicio, puedes dejar el PC apagado: el proceso corre en Render.

El QR y los mensajes de log son sensibles; no los publiques ni los envíes a nadie. Si el bot se desconecta, revisa los logs antes de volver a vincularlo.
