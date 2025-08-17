# Prompt Battle

Este proyecto es un juego de batalla de prompts entre usuarios, construido con un servidor Node.js y un cliente React. Los jugadores crean imágenes basadas en un prompt e intentan adivinar cuáles fueron creadas por humanos y cuáles por IA.

## Estructura del proyecto

- **client/** – Contiene el código del frontend creado con React y Vite.
- **server/** – Contiene el código del backend usando Express y Socket.IO.
- **shared/** – Define constantes compartidas entre el cliente y el servidor.

## Requisitos

- Node.js ≥ 18
- Una clave de API de OpenAI válida para generar imágenes.

## Configuración del entorno

1. Clona este repositorio:
   ```bash
   git clone https://github.com/Alexpavon16/prompt-battle.git
   cd prompt-battle
   ```

2. Crea un archivo `.env` dentro de la carpeta `server/` con la siguiente variable:
   ```
   OPENAI_API_KEY=tu_clave_de_openai
   ```
   Sustituye `tu_clave_de_openai` por tu clave real.

3. Instala las dependencias para el servidor y el cliente:
   ```bash
   cd server
   npm install
   cd ../client
   npm install
   ```

4. Inicia el servidor:
   ```bash
   cd ../server
   npm start
   ```
   El servidor se iniciará en `http://localhost:3000`.

5. En otra terminal, inicia el cliente:
   ```bash
   cd client
   npm run dev
   ```
   Esto abrirá la aplicación en `http://localhost:5173` o el puerto que indique Vite.

## Notas

- El juego utiliza **Socket.IO** para manejar las salas y la comunicación en tiempo real entre jugadores.
- Asegúrete de que el servidor y el cliente se estén ejecutando al mismo tiempo para que la aplicación funcione correctamente.
- Esta aplicación fue subida a GitHub y no viene con `node_modules`. Por lo tanto, es necesario ejecutar `npm install` en `server` y `client` la primera vez.
