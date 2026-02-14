#!/bin/bash
# UKS Installer Script for Other Bots
# Usage: ./install.sh

echo "🔥 Installing UKS Tooling..."

# 1. Create local skills directory
mkdir -p skills/knowledge-graph

# 2. Copy CLI code
cp -r cli/knowledge-graph/* skills/knowledge-graph/

# 3. Install dependencies
cd skills/knowledge-graph && npm install --production

echo "✅ UKS Knowledge Graph Skill installed!"
echo "👉 Usage: node skills/knowledge-graph/index.js help"
