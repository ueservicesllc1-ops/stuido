#!/bin/bash

# Ir a la carpeta del proyecto Studio
cd ~/studio || { echo "No se encontró la carpeta ~/studio"; exit 1; }

# Agregar todos los cambios
git add .

# Hacer commit con fecha y hora
git commit -m "Respaldo manual Studio: $(date +'%Y-%m-%d %H:%M:%S')"

# Enviar al repositorio en GitHub
git push origin main

echo "Respaldo manual completado para Studio"
