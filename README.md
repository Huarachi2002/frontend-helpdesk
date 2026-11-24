# Helpdesk UAGRM - Frontend Web (React + Vite)

Interfaz de usuario y plataforma web para la Mesa de Ayuda y Soporte Técnico del Campus Virtual (UAGRM). Desarrollado con **React 19**, **Vite**, componentes **PrimeReact**, **Zustand** para la gestión de estado global, **Tabler Icons** y **Chart.js**.

---

## 📋 Requisitos Previos

Asegúrate de tener instalado en tu computadora:

* **Node.js** >= 18.x (se recomienda versión LTS 20+)
* Gestor de paquetes **npm** (incluido con Node.js) o **pnpm**
* Servidor Backend (Laravel) en ejecución en `http://localhost:8000`

---

## 🚀 Guía Paso a Paso para Levantar el Frontend

### 1. Ubicarse en el directorio del Frontend
Abre una terminal y entra en la carpeta correspondiente:
```bash
cd frontend-helpdesk
```

### 2. Instalar las dependencias de Node.js
Ejecuta la instalación de paquetes con npm:
```bash
npm install
```
*(O si utilizas pnpm: `pnpm install`)*

### 3. Configurar las Variables de Entorno (`.env`)
Verifica que exista el archivo `.env` en la raíz de `frontend-helpdesk`. Si no existe, créalo o duplica `.env.example`:
```bash
cp .env.example .env
```
*(En Windows PowerShell: `Copy-Item .env.example .env`)*

Asegúrate de que la variable `VITE_API_URL` apunte a la API de Laravel:
```ini
VITE_API_URL=http://localhost:8000/api
```

### 4. Iniciar el Servidor de Desarrollo
Inicia Vite en modo desarrollo:
```bash
npm run dev
```

La aplicación se compilará instantáneamente y estará accesible en tu navegador en:  
👉 **`http://localhost:5173`**

---

## 🔑 Acceso y Navegación según Rol Institucional

El menú lateral, las rutas protegidas y las acciones se adaptan dinámicamente según el rol del usuario autenticado:

### 1. Rol Administrador (Director)
* **Credenciales de prueba**: `admin@helpdesk.com` / `password`
* **Vistas disponibles**:
  * 📊 **Dashboard General**: Métricas en tiempo real y resumen de incidencias.
  * 🎫 **Gestión de Tickets**: Bandeja completa, asignaciones, reasignaciones directas y aprobación de solicitudes.
  * 🤖 **Historial Bot**: Registro de consultas resueltas por el bot de IA y escalamientos.
  * 📈 **Reportes & KPIs**: Métricas de resolución (MTTR), primera respuesta (FRT) y cumplimiento SLA.
  * 👥 **Usuarios & Roles**: Directorio del personal institucional y gestión de agentes.
  * 📁 **Gestión de Categorías**: Clasificación temática de tickets.
  * 🔥 **Prioridades & SLAs**: Tiempos límites de resolución y pesos de escalamiento.
  * ⚙️ **Configuraciones**: Políticas globales de notificación, parámetros de espera y disparador manual de recordatorios.

### 2. Rol Técnico de Soporte
* **Credenciales de prueba**: `juan@helpdesk.com` / `password` (o `maria@helpdesk.com`)
* **Vistas disponibles**:
  * 🎫 **Gestión de Tickets**: Atención de incidencias asignadas, cambio de estados, medición de horas sin responder en estado de espera y emisión de solicitudes de reasignación justificadas.
  * 🤖 **Historial Bot**: Visualización de interacciones del chatbot inteligente.
  * 📈 **Reportes & KPIs**: Analítica de tiempos de atención y rendimiento técnico.

---

## 📦 Scripts Disponibles

* `npm run dev` — Inicia el servidor de desarrollo local con recarga rápida (HMR).
* `npm run build` — Genera el bundle de producción optimizado en la carpeta `dist/`.
* `npm run preview` — Previsualiza localmente la compilación de producción.
