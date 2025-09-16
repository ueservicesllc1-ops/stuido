#!/bin/bash

# = a============================================================================
# Script para restaurar el proyecto a la última versión de GitHub de forma FORZADA.
#
# ¡ADVERTENCIA! Este script es destructivo.
# Borrará TODOS tus cambios locales que no estén en GitHub.
#
# Úsalo solo cuando quieras que tu proyecto sea un espejo exacto del repositorio.
#
# Para ejecutar este script:
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
echo "    => Reseteando el proyecto a la última versión de 'main'..."
git reset --hard origin/main
if [ $? -ne 0 ]; then
    echo "❌ Error: 'git reset --hard' falló."
    exit 1
fi

# 3. Limpiar archivos y directorios no rastreados.
echo "    => Limpiando archivos y carpetas no rastreados..."
git clean -dfx
if [ $? -ne 0 ]; then
    echo "❌ Error: 'git clean' falló."
    exit 1
fi

echo "✅ ¡Éxito! Tu proyecto ha sido restaurado y ahora es un clon exacto de la rama 'main' de GitHub."
