#!/bin/bash

echo "📦 Instalando dependencias..."
npm install

echo ""
echo "✅ Dependencias instaladas correctamente"
echo ""
echo "🚀 Para iniciar el servidor:"
echo "   npm start       (producción con optimizaciones)"
echo "   npm run dev     (desarrollo con nodemon)"
echo ""
echo "📊 Endpoints disponibles:"
echo "   /health         Health check"
echo "   /stats          Estadísticas del sistema"
echo "   /qr             Código QR de WhatsApp"
echo "   /status         Estado de conexión"
echo ""
