#!/bin/bash

# ==============================================================================
# Script para guardar y subir cambios a GitHub de forma automatizada.
#
# Este script realiza las siguientes acciones:
# 1. Añade todos los cambios al área de preparación.
# 2. Crea un commit con un mensaje descriptivo.
# 3. Se actualiza con los últimos cambios de GitHub.
# 4. Sube (push) los commits locales a la rama 'main'.
#
# Para ejecutar este script:
#    ./save_to_github.sh
# ==============================================================================

echo "✅ Iniciando respaldo a GitHub..."

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
if ! git diff --cached --quiet; then
    git commit -m "$COMMIT_MESSAGE"
    if [ $? -ne 0 ]; then
        echo "⚠️  No se creó un nuevo commit. Probablemente no había cambios nuevos que guardar."
    else
        echo "    => Commit creado con el mensaje: '$COMMIT_MESSAGE'"
    fi
else
    echo "✅ No había cambios nuevos para guardar en un commit."
fi

# 3. Integrar los cambios remotos antes de subir
echo "    => Sincronizando con los últimos cambios de GitHub..."
git pull origin main --rebase
if [ $? -ne 0 ]; then
    echo "❌ Error: 'git pull' falló. Resuelve los conflictos si los hay y vuelve a intentarlo."
    exit 1
fi

# 4. Subir los cambios a GitHub (rama main)
echo "    => Subiendo todos los cambios pendientes a GitHub..."
git push origin main
if [ $? -ne 0 ]; then
    echo "❌ Error: 'git push' falló. Revisa tu conexión o los permisos del repositorio."
    exit 1
fi

echo "🚀 ¡Éxito! Tus cambios han sido guardados en GitHub."
