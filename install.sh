# UKS Installer Script
# Usage: ./install.sh

echo "🔥 Installing UKS Tooling..."

# 1. Create local skills directory
mkdir -p skills/knowledge-graph

# 2. Copy CLI code from packages/cli (Standard Monorepo Structure)
cp -r packages/cli/* skills/knowledge-graph/

# 3. Install dependencies
cd skills/knowledge-graph && npm install --production

echo "✅ UKS Knowledge Graph Skill installed!"
echo "👉 Usage: node skills/knowledge-graph/index.js help"
