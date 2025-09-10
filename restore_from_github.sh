#!/bin/bash

# ==============================================================================
# Script para restaurar la última versión desde GitHub de forma segura.
#
# Este script realiza las siguientes acciones:
# 1. Comprueba si hay cambios locales sin guardar.
# 2. Si hay cambios, los guarda temporalmente (git stash).
# 3. Descarga los últimos cambios de la rama 'main' del repositorio.
# 4. Vuelve a aplicar los cambios locales que se guardaron.
# 5. Comprueba si 'package.json' ha cambiado para notificar si es necesario
#    instalar nuevas dependencias (npm install).
#
# Para ejecutar este script:
# 1. Asegúrate de estar en la terminal, en el directorio raíz de tu proyecto.
# 2. Concede permisos de ejecución al archivo con el comando:
#    chmod +x restore_from_github.sh
# 3. Ejecuta el script con:
#    ./restore_from_github.sh
# ==============================================================================

echo "🔄  Iniciando restauración desde GitHub..."

# Comprobar si hay cambios en package.json antes del pull
BEFORE_PULL_PKG_HASH=$(git show HEAD:package.json | git hash-object --stdin)

# Guardar cambios locales si existen
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "    => Guardando cambios locales temporalmente..."
    git stash push -m "Cambios locales guardados antes de restaurar desde GitHub"
    STASHED=true
fi

# Descargar los últimos cambios
echo "    => Descargando cambios desde la rama 'main'..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "❌ Error: 'git pull' falló. Revisa tu conexión, los permisos del repositorio o posibles conflictos."
    # Si el pull falla, intenta restaurar los cambios stasheados
    if [ "$STASHED" = true ]; then
        echo "    => Intentando restaurar cambios locales..."
        git stash pop
    fi
    exit 1
fi
echo "    => Descarga completada."

# Restaurar cambios locales si se guardaron
if [ "$STASHED" = true ]; then
    echo "    => Aplicando de nuevo los cambios locales..."
    git stash pop
    if [ $? -ne 0 ]; then
        echo "⚠️  Atención: Hubo un conflicto al aplicar tus cambios locales."
        echo "    Tus cambios están guardados en el último stash. Puedes verlos con 'git stash list' y aplicarlos manualmente con 'git stash apply'."
    fi
fi

# Comprobar si package.json cambió después del pull
AFTER_PULL_PKG_HASH=$(git show HEAD:package.json | git hash-object --stdin)

if [ "$BEFORE_PULL_PKG_HASH" != "$AFTER_PULL_PKG_HASH" ]; then
    echo "📦  ¡Atención! El archivo 'package.json' ha cambiado."
    echo "    Es posible que necesites instalar o actualizar dependencias."
    echo "    Considera ejecutar 'npm install' en tu terminal."
fi

echo "✅ ¡Éxito! Tu proyecto ha sido actualizado con la última versión de GitHub."