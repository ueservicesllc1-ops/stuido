#!/bin/bash

# ==============================================================================
# Script para guardar y subir cambios a GitHub de forma automatizada.
#
# Este script realiza las siguientes acciones:
# 1. Añade todos los cambios (archivos nuevos, modificados, eliminados) al
#    área de preparación de Git.
# 2. Crea un commit con un mensaje descriptivo que incluye la fecha y hora
#    actual para tener un registro claro.
# 3. Sube (push) los cambios a la rama 'main' del repositorio remoto 'origin'.
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
git commit -m "$COMMIT_MESSAGE"
if [ $? -ne 0 ]; then
    echo "⚠️  No se creó un nuevo commit. Probablemente no había cambios que guardar."
    echo "✅ Todo está al día."
    exit 0
fi
echo "    => Commit creado con el mensaje: '$COMMIT_MESSAGE'"


# 3. Subir los cambios a GitHub (rama main)
echo "    => Subiendo cambios a GitHub..."
git push origin main
if [ $? -ne 0 ]; then
    echo "❌ Error: 'git push' falló. Revisa tu conexión o los permisos del repositorio."
    exit 1
fi

echo "🚀 ¡Éxito! Tus cambios han sido guardados en GitHub."
