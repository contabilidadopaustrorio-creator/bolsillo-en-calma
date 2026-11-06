# Acceso de la aplicación publicada

La aplicación personal publicada ahora utiliza una conexión a Google Sheets configurada en el servidor privado. En el celular no se introduce URL ni clave de Sheets.

Abre `app.html` en GitHub Pages: te llevará a la aplicación privada. Si pide iniciar sesión, usa la misma cuenta de ChatGPT propietaria de la app. El repositorio público no contiene la clave, los gastos ni el identificador de la hoja.

`local.html` conserva la versión anterior para recuperar respaldos de registros guardados en el navegador. Las instrucciones de Apps Script que siguen se conservan como plantilla técnica para configurar una instancia independiente; no son pasos necesarios para la app personal ya publicada.

---

# Bolsillo en calma

PWA en español para registrar dos gastos mensuales: súper ($130) y distracciones ($80). Los límites se pueden ajustar por mes. Alertas al 80% y al agotar cada categoría.

## Estado

El dashboard funciona con almacenamiento local. La integración con Google Sheets está implementada, pero debe activarse en tu cuenta antes de sincronizar. No basta con compartir el enlace de la hoja. No hay notificaciones push: los avisos se ven dentro de la app.

## 1. Activar tu Google Sheets (una vez)

Usa una hoja de Google Sheets privada que puedas editar. En Code.gs, reemplaza PEGA_AQUI_EL_ID_DE_TU_HOJA por el ID de esa hoja antes de ejecutar la configuración.

1. Abre tu hoja con una cuenta que pueda editarla. Entra a **Extensiones → Apps Script**.
2. Pega el contenido completo de `google-apps-script/Code.gs` en el editor y guarda.
3. Selecciona **configurarBolsillo** y pulsa **Ejecutar**. Autoriza el acceso a la hoja. Si Google muestra una advertencia por una app propia sin verificar, revisa que sea el proyecto que acabas de crear antes de autorizarlo.
4. En **Configuración del proyecto → Propiedades de la secuencia de comandos**, copia el valor de **BOLSILLO_CLAVE**. Se genera automáticamente; no está en el código. No lo publiques ni lo envíes a un repositorio.
5. En **Implementar → Nueva implementación**, selecciona **Aplicación web**. Ejecutar como: **yo**. Acceso: **cualquier usuario**. Implementa y copia la URL que termina en **/exec**. Si tu organización no permite esta opción, esta integración no podrá usarse así; no cambies políticas de la organización para sortear la restricción.
6. En el dashboard toca **Conectar Sheets**, pega la URL `/exec` y la clave. Confirma el envío de los registros locales.
7. Haz lo mismo en el celular con la misma URL y clave. Toca **Sincronizar** para enviar pendientes y traer los últimos registros.

La implementación recibe peticiones por HTTPS y exige la clave para leer y escribir. Cualquier persona que tenga esa clave podrá acceder a los datos mediante la aplicación web. Mantén la hoja privada; no es necesario publicarla en la web. La URL y clave quedan en el almacenamiento de cada navegador, nunca en los archivos públicos del sitio. Para revocar un dispositivo, cambia BOLSILLO_CLAVE en las propiedades del script y vuelve a conectar los demás dispositivos.

### Pestañas que crea el script

- **Bolsillo_Eventos:** registro de operaciones con identificadores únicos. Es la fuente de datos. No editar ni borrar filas manualmente.
- **Bolsillo_Gastos:** gastos activos, con fecha, mes, categoría, monto y detalle.
- **Bolsillo_Presupuestos:** límites por mes. Si no se cambia el límite, usa $130 y $80.
- **Bolsillo_Resumen:** totales, disponible y estado de salidas calculados con fórmulas.

Las tres últimas son vistas que se regeneran. Registra, elimina y cambia límites desde el dashboard. Las pestañas preexistentes con otros nombres se conservan. No uses estos cuatro nombres para datos ajenos al dashboard.

### Sincronización y respaldo

Guardar un gasto lo conserva primero localmente y, si hay conexión configurada, intenta enviarlo a Sheets. Un error o un tiempo de espera no se presenta como confirmación: los cambios quedan pendientes. **Sincronizar** reenvía los mismos IDs; el servidor evita duplicados usando un bloqueo. Las eliminaciones tienen prioridad sobre adiciones tardías del mismo ID. Si dos dispositivos cambian el presupuesto del mismo mes, prevalece el último cambio recibido por el servidor.

La app consulta Sheets al abrirse si ya está conectada. No hace polling continuo; pulsa Sincronizar para traer cambios de otro dispositivo. Un lote envía como máximo 200 operaciones; vuelve a pulsar si quedan pendientes. No hay actualización remota con la app cerrada.

Exporta un respaldo antes de mover el sitio a GitHub: cada dominio tiene su almacenamiento separado. En el nuevo dominio importa el respaldo antes de conectar Sheets. La importación está bloqueada mientras hay conexión activa para evitar reemplazos accidentales del historial compartido. No borres el navegador si hay pendientes. La primera sincronización combina los datos locales y remotos por ID.

## 2. Publicar en GitHub Pages

1. Crea un repositorio nuevo, por ejemplo `bolsillo-en-calma`. No reemplaces un repositorio que ya contenga otra aplicación.
2. Sube el contenido de esta carpeta: `dist/`, `.github/workflows/pages.yml`, `google-apps-script/` y este README. No subas `.git/`, `.openai/`, respaldos personales ni claves. El archivo ZIP entregado ya excluye esos elementos.
3. En el repositorio abre **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. En **Actions**, ejecuta **Publicar dashboard** si no se inició automáticamente. Cuando termine, GitHub Pages mostrará el enlace del sitio.
5. Abre ese enlace en el celular, importa tu respaldo si corresponde y conecta Sheets. Luego instala la PWA desde el menú del navegador.

El workflow publica únicamente `dist/`. Los archivos usan rutas relativas para funcionar dentro de `https://usuario.github.io/repositorio/`. El dashboard puede ser público sin publicar la hoja ni la clave. Verifica las condiciones de GitHub Pages de tu cuenta si usas un repositorio privado.

## 3. Verificación antes de usar datos reales

1. Conecta el primer dispositivo: debe mostrar **Actualizado con Sheets**.
2. Registra un gasto de prueba de $1 y comprueba la fila en Bolsillo_Gastos.
3. Conecta el segundo dispositivo y pulsa Sincronizar: debe aparecer exactamente una vez.
4. Elimínalo desde la app y sincroniza ambos dispositivos: debe desaparecer de ambos y de la vista de gastos.
5. Sin internet, registra otro gasto: debe indicar pendiente. Reconecta y pulsa Sincronizar; debe aparecer una sola vez. Elimínalo al terminar.

Las pruebas automatizadas locales cubren operaciones, reintentos, límites y aislamiento mensual. No sustituyen la prueba de autorización y lectura/escritura real en tu cuenta, ni la instalación en un celular.

## Desarrollo

No necesita dependencias ni compilación. Servir `dist/` con un servidor HTTP; producción requiere HTTPS para la PWA. Pruebas: `node tests/core.cjs`.

Documentación de referencia:
- Apps Script Web Apps: https://developers.google.com/apps-script/guides/web
- GitHub Pages con Actions: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Conectar otro dispositivo sin copiar datos

En un navegador ya conectado, abre Conectar Sheets y pulsa **Copiar enlace privado para otro dispositivo**. Al abrir ese enlace en tu celular, la app guarda la conexión y consulta Sheets automáticamente. El enlace contiene una credencial privada: úsalo solo en tus dispositivos y no lo publiques. Se retira de la barra de direcciones al abrirse. Tus registros locales se conservan como pendientes si existían antes de conectar.
