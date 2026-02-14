const express = require('express');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const app = express();
const PORT = process.env.PORT || 3000;
const GRAPH_FILE = process.env.GRAPH_FILE || path.join(__dirname, '../../graph-default.jsonl');

app.use(express.static('public'));

app.get('/api/graph', async (req, res) => {
    if (!fs.existsSync(GRAPH_FILE)) {
        return res.status(404).json({ error: 'Graph file not found' });
    }

    const nodes = [];
    const links = [];
    const nodeSet = new Set();

    const fileStream = fs.createReadStream(GRAPH_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        try {
            const item = JSON.parse(line);
            
            // Handle Entity (Node)
            if (item.id && item.type) {
                if (!nodeSet.has(item.id)) {
                    nodes.push({ id: item.id, group: item.type, label: item.id }); // Simplified label
                    nodeSet.add(item.id);
                }
            }
            
            // Handle Relation (Link)
            if (item.source && item.target && item.relation) {
                links.push({ source: item.source, target: item.target, type: item.relation });
                
                // Ensure nodes exist even if defined implicitly by relation
                if (!nodeSet.has(item.source)) {
                    nodes.push({ id: item.source, group: 'unknown', label: item.source });
                    nodeSet.add(item.source);
                }
                if (!nodeSet.has(item.target)) {
                    nodes.push({ id: item.target, group: 'unknown', label: item.target });
                    nodeSet.add(item.target);
                }
            }
        } catch (e) {
            console.error('Error parsing line:', line, e);
        }
    }

    res.json({ nodes, links });
});

app.listen(PORT, () => {
    console.log(`🔥 UKS Visualizer running at http://localhost:${PORT}`);
});
