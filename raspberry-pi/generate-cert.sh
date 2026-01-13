#!/bin/bash

# Script para generar certificados SSL auto-firmados para desarrollo

echo "🔐 Generando certificados SSL auto-firmados..."

# Generar clave privada y certificado
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=ES/ST=Baleares/L=Mallorca/O=Decoraciones Egea/CN=192.168.1.236"

echo "✅ Certificados generados:"
echo "   - key.pem (clave privada)"
echo "   - cert.pem (certificado)"
echo ""
echo "⚠️  IMPORTANTE: Estos son certificados auto-firmados para desarrollo."
echo "   El navegador mostrará una advertencia de seguridad."
echo "   Debes aceptar la advertencia para continuar."
echo ""
echo "🚀 Ahora puedes iniciar el servidor HTTPS con:"
echo "   npm run start:https"
