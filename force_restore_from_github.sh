#!/bin/bash

# ==============================================================================
# Script para restaurar el proyecto a la última versión de GitHub de forma FORZADA.
#
# ¡ADVERTENCIA! Este script es destructivo.
# Borrará TODOS tus cambios locales que no estén en GitHub, incluyendo:
#   - Archivos modificados.
#   - Commits locales que no hayas subido.
#   - Archivos nuevos que no estén en el repositorio.
#
# Úsalo solo cuando quieras que tu proyecto sea un espejo exacto del repositorio
# en la rama 'main', eliminando cualquier rastro de trabajo local no guardado.
#
# Para ejecutar este script:
# 1. Asegúrate de estar en la terminal, en el directorio raíz de tu proyecto.
# 2. Concede permisos de ejecución al archivo con el comando:
#    chmod +x force_restore_from_github.sh
# 3. Ejecuta el script con:
#    ./force_restore_from_github.sh
# ==============================================================================

echo "🔄  Iniciando restauración FORZADA desde GitHub..."

# 1. Descargar toda la información más reciente del repositorio remoto (origin).
echo "    => Descargando la información más reciente del repositorio..."
git fetch origin
if [ $? -ne 0 ]; then
    echo "❌ Error: 'git fetch' falló. Revisa tu conexión o la URL del repositorio."
    exit 1
fi

# 2. Forzar el reseteo del estado local a la rama 'main' del repositorio remoto.
# Esto elimina todos los cambios en archivos rastreados y commits locales.
echo "    => Reseteando el proyecto a la última versión de 'main'..."
git reset --hard origin/main
if [ $? -ne 0 ]; then
    echo "❌ Error: 'git reset' falló."
    exit 1
fi

# 3. Eliminar todos los archivos y directorios locales que no son rastreados por Git.
# El comando `git clean -dfx` es potente:
#   -d: Elimina directorios no rastreados.
#   -f: Fuerza la eliminación.
#   -x: Elimina también los archivos ignorados por .gitignore.
echo "    => Limpiando archivos y carpetas no rastreados..."
git clean -dfx
if [ $? -ne 0 ]; then
    echo "❌ Error: 'git clean' falló."
    exit 1
fi

echo "✅ ¡Éxito! Tu proyecto ha sido restaurado y ahora es un clon exacto de la rama 'main' de GitHub."
