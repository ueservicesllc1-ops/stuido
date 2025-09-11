#!/bin/bash

# ==============================================================================
# Script para guardar y subir cambios a GitHub de forma automatizada.
#
# Este script realiza las siguientes acciones:
# 1. Pide el nombre de usuario y token de acceso para autenticarse.
# 2. Añade todos los cambios (archivos nuevos, modificados, eliminados) al
#    área de preparación de Git.
# 3. Crea un commit con un mensaje descriptivo si hay cambios que guardar.
# 4. Sube (push) todos los commits locales a la rama 'main' del repositorio
#    usando las credenciales proporcionadas.
#
# Para ejecutar este script:
# 1. Asegúrate de estar en la terminal, en el directorio raíz de tu proyecto.
# 2. Concede permisos de ejecución al archivo con el comando:
#    chmod +x save_to_github.sh
# 3. Ejecuta el script con:
#    ./save_to_github.sh
# ==============================================================================

# Da permisos de ejecución al propio script la primera vez.
chmod +x save_to_github.sh

echo "✅ Iniciando respaldo a GitHub..."

# --- Solicitar credenciales ---
read -p "Introduce tu nombre de usuario de GitHub: " GITHUB_USER
read -s -p "Introduce tu Token de Acceso Personal de GitHub: " GITHUB_TOKEN
echo "" # Nueva línea después de la entrada del token

# --- Extraer el nombre del repositorio de la URL remota ---
REMOTE_URL=$(git config --get remote.origin.url)
# Asumimos formato https://github.com/usuario/repo.git
REPO_NAME=$(echo $REMOTE_URL | sed 's|https://github.com/||' | sed 's|\.git||')

# --- Construir la URL con autenticación ---
AUTH_URL="https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${REPO_NAME}.git"

# 1. Añadir todos los cambios al área de preparación (staging)
git add .
if [ $? -ne 0 ]; then
    echo "❌ Error: 'git add' falló. Abortando."
    exit 1
fi
echo "    => Cambios añadidos al área de preparación."

# 2. Crear un commit con un mensaje que incluye la fecha y hora actual
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
COMMIT_MESSAGE="Respaldo manual: $TIMESTAMP"
# Solo intenta hacer commit si hay algo en el staging
if ! git diff --cached --quiet; then
    git commit -m "$COMMIT_MESSAGE"
    if [ $? -ne 0 ]; then
        echo "⚠️  Error al crear el commit. Abortando."
    else
        echo "    => Commit creado con el mensaje: '$COMMIT_MESSAGE'"
    fi
else
    echo "✅ No había cambios nuevos para guardar en un commit."
fi


# 3. Subir los cambios a GitHub (rama main)
echo "    => Subiendo todos los cambios pendientes a GitHub..."
# Usamos la URL con el token para el push
git push $AUTH_URL main
if [ $? -ne 0 ]; then
    echo "❌ Error: 'git push' falló. Revisa tu conexión y que el token tenga los permisos 'repo' correctos."
    exit 1
fi

echo "🚀 ¡Éxito! Tus cambios han sido guardados en GitHub."
