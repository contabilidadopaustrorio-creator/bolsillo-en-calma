# Bolsillo en calma — GitHub Pages

Dashboard PWA para súper ($130/mes) y distracciones ($80/mes), con límites editables, historial mensual y alertas.

## Aplicación publicada

https://contabilidadopaustrorio-creator.github.io/bolsillo-en-calma/?v=7

La interfaz permanece en GitHub Pages y consulta/guarda directamente en Google Sheets mediante Google Apps Script. No redirige a ChatGPT y no requiere iniciar sesión ni configurar una conexión en cada dispositivo.

**Acceso sin contraseña solicitado por el propietario:** cualquiera con el enlace puede consultar y modificar este control de gastos. El endpoint se limita a la hoja configurada por su propietario. No concede acceso a otros archivos de Drive.

## Uso

Registra los gastos en la app. Se guardan primero en el navegador y se envían automáticamente a Sheets. Al abrir la app se descarga el historial compartido. Sin internet, los registros quedan pendientes; se reintentan al volver a conectarse. Pulsa Sincronizar para traer los últimos cambios de otro dispositivo.

En Android, instala desde Chrome. En iPhone, usa Safari → Compartir → Añadir a pantalla de inicio.

Los datos locales anteriores se conservan y se combinan por identificador. Los reintentos no duplican gastos. La hoja mantiene las pestañas de eventos, gastos, presupuestos y resumen. Las alertas aparecen dentro de la app.

## Código y publicación

`dist/` contiene la aplicación estática completa. El workflow `.github/workflows/pages.yml` publica esa carpeta con GitHub Actions. No requiere instalación ni compilación.

`google-apps-script/Code.gs` es una plantilla de la API; el identificador privado de la hoja no se publica en este repositorio. Para una instancia independiente, configura su propio ID de hoja y despliega Apps Script como aplicación web. La URL del endpoint público de esta instancia está configurada en `dist/sync.js`.

Pruebas: `node tests/github.cjs`.
