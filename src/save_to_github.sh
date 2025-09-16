#!/bin/bash

# ==============================================================================
# Script para GUARDAR FORZADAMENTE los cambios locales en GitHub.
#
# ¡ADVERTENCIA! Este script sobrescribe el historial en la rama 'main' de GitHub.
# Úsalo cuando estés seguro de que tus cambios locales son los correctos y
# quieres reemplazar lo que hay en el repositorio.
#
# Para ejecutar este script:
#    ./save_to_github.sh
# ==============================================================================

echo "✅ Iniciando respaldo FORZADO a GitHub..."

# 1. Añadir todos los cambios al área de preparación (staging)
git add .
if [ $? -ne 0 ]; then
    echo "❌ Error: 'git add' falló. Abortando."
    exit 1
fi
echo "    => Cambios añadidos al área de preparación."

# 2. Crear un commit si hay cambios nuevos
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
COMMIT_MESSAGE="Respaldo forzado: $TIMESTAMP"
if ! git diff --cached --quiet; then
    git commit -m "$COMMIT_MESSAGE"
    if [ $? -ne 0 ]; then
        echo "⚠️  No se pudo crear el commit. Probablemente no había cambios que guardar."
    else
        echo "    => Commit creado con el mensaje: '$COMMIT_MESSAGE'"
    fi
else
    echo "✅ No había cambios nuevos para guardar en un commit."
fi

# 3. Forzar la subida de los cambios a GitHub (rama main)
echo "    => Forzando la subida de todos los cambios pendientes a GitHub..."
git push --force origin main
if [ $? -ne 0 ]; then
    echo "❌ Error: 'git push --force' falló. Revisa tu conexión o los permisos del repositorio."
    exit 1
fi

echo "🚀 ¡Éxito! Tus cambios han sido guardados en GitHub, sobrescribiendo la versión anterior."
