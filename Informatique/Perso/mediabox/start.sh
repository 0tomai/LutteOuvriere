#!/bin/bash
echo "🎬 Démarrage de MediaBox..."
cd "$(dirname "$0")"

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js n'est pas installé."
  echo "   Téléchargez-le sur https://nodejs.org"
  read -p "Appuyez sur Entrée pour quitter..."
  exit 1
fi

NODE_VERSION=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])")
if [ "$NODE_VERSION" -lt 14 ]; then
  echo "❌ Node.js version trop ancienne ($NODE_VERSION). Version 14+ requise."
  exit 1
fi

echo "✅ Node.js $(node --version) détecté"
echo "🌐 Ouvrez http://localhost:${PORT:-8080} dans votre navigateur"
echo "🛑 Ctrl+C pour arrêter"
echo ""

# Auto-open browser (optional)
(sleep 1.5 && open "http://localhost:${PORT:-8080}" 2>/dev/null || xdg-open "http://localhost:${PORT:-8080}" 2>/dev/null) &

node server.js
