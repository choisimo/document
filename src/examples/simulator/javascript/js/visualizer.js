class TreeVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.nodeRadius = 25;
        this.levelHeight = 70;
        this.animationId = null;
        this.resizeCanvas();
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }

    calculatePositions(root) {
        if (!root) return;

        const positions = new Map();
        let minX = Infinity;
        let maxX = -Infinity;

        const calculateInorder = (node, depth) => {
            if (!node) return 0;
            
            const leftCount = calculateInorder(node.left, depth + 1);
            const position = leftCount;
            positions.set(node, { pos: position, depth: depth });
            const rightCount = calculateInorder(node.right, depth + 1);
            
            return leftCount + 1 + rightCount;
        };

        calculateInorder(root, 0);

        const horizontalSpacing = 50;
        const startX = this.canvas.width / 2;
        const startY = 50;

        positions.forEach((value, node) => {
            const totalNodes = positions.size;
            const centerPos = (totalNodes - 1) / 2;
            node.targetX = startX + (value.pos - centerPos) * horizontalSpacing;
            node.targetY = startY + value.depth * this.levelHeight;
            
            minX = Math.min(minX, node.targetX);
            maxX = Math.max(maxX, node.targetX);
        });

        const padding = 50;
        if (minX < padding || maxX > this.canvas.width - padding) {
            const scale = (this.canvas.width - 2 * padding) / (maxX - minX + 1);
            const offset = padding - minX * scale;
            
            positions.forEach((value, node) => {
                node.targetX = node.targetX * scale + offset;
            });
        }

        this._initializePositions(root);
    }

    _initializePositions(node) {
        if (!node) return;
        
        if (node.x === 0 && node.y === 0) {
            node.x = node.targetX;
            node.y = node.targetY;
        }
        
        this._initializePositions(node.left);
        this._initializePositions(node.right);
    }

    animate(root, callback) {
        const animate = () => {
            let needsAnimation = false;
            
            const updatePositions = (node) => {
                if (!node) return;
                
                const dx = node.targetX - node.x;
                const dy = node.targetY - node.y;
                
                if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                    node.x += dx * 0.1;
                    node.y += dy * 0.1;
                    needsAnimation = true;
                } else {
                    node.x = node.targetX;
                    node.y = node.targetY;
                }
                
                updatePositions(node.left);
                updatePositions(node.right);
            };

            updatePositions(root);
            this.draw(root);

            if (needsAnimation) {
                this.animationId = requestAnimationFrame(animate);
            } else {
                if (callback) callback();
            }
        };

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        this.calculatePositions(root);
        animate();
    }

    draw(root) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!root) {
            this.ctx.fillStyle = '#888';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Empty Tree', this.canvas.width / 2, this.canvas.height / 2);
            return;
        }

        this._drawEdges(root);
        this._drawNodes(root);
    }

    _drawEdges(node) {
        if (!node) return;

        this.ctx.strokeStyle = '#4a90d9';
        this.ctx.lineWidth = 2;

        if (node.left) {
            this.ctx.beginPath();
            this.ctx.moveTo(node.x, node.y + this.nodeRadius);
            this.ctx.lineTo(node.left.x, node.left.y - this.nodeRadius);
            this.ctx.stroke();
            this._drawEdges(node.left);
        }

        if (node.right) {
            this.ctx.beginPath();
            this.ctx.moveTo(node.x, node.y + this.nodeRadius);
            this.ctx.lineTo(node.right.x, node.right.y - this.nodeRadius);
            this.ctx.stroke();
            this._drawEdges(node.right);
        }
    }

    _drawNodes(node) {
        if (!node) return;

        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, this.nodeRadius, 0, Math.PI * 2);

        if (node.found) {
            this.ctx.fillStyle = '#28a745';
            this.ctx.strokeStyle = '#1e7b34';
        } else if (node.highlighted) {
            this.ctx.fillStyle = '#e94560';
            this.ctx.strokeStyle = '#c73a52';
        } else {
            this.ctx.fillStyle = '#4a90d9';
            this.ctx.strokeStyle = '#3a7bc8';
        }

        this.ctx.fill();
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(node.key.toString(), node.x, node.y);

        this.ctx.fillStyle = '#888';
        this.ctx.font = '10px monospace';
        this.ctx.fillText(node.address, node.x, node.y + this.nodeRadius + 12);

        this._drawNodes(node.left);
        this._drawNodes(node.right);
    }

    highlightNode(node, type = 'highlight') {
        if (!node) return;
        
        if (type === 'found') {
            node.found = true;
        } else {
            node.highlighted = true;
        }
    }

    clearHighlight(node) {
        if (!node) return;
        node.highlighted = false;
        node.found = false;
    }
}

class MemoryView {
    constructor(stackId, heapId) {
        this.stackView = document.getElementById(stackId);
        this.heapView = document.getElementById(heapId);
        this.stackFrames = [];
        this.heapObjects = new Map();
    }

    pushStackFrame(name, variables = {}) {
        this.stackFrames.forEach(frame => frame.active = false);
        
        const frame = {
            name: name,
            variables: variables,
            active: true
        };
        this.stackFrames.push(frame);
        this.render();
    }

    popStackFrame() {
        this.stackFrames.pop();
        if (this.stackFrames.length > 0) {
            this.stackFrames[this.stackFrames.length - 1].active = true;
        }
        this.render();
    }

    updateStackVariable(varName, value) {
        if (this.stackFrames.length > 0) {
            this.stackFrames[this.stackFrames.length - 1].variables[varName] = value;
            this.render();
        }
    }

    addHeapObject(address, type, data, highlight = false) {
        this.heapObjects.set(address, { type, data, highlight });
        this.render();
    }

    updateHeapObject(address, field, value) {
        if (this.heapObjects.has(address)) {
            this.heapObjects.get(address).data[field] = value;
            this.render();
        }
    }

    highlightHeapObject(address, highlight = true) {
        if (this.heapObjects.has(address)) {
            this.heapObjects.get(address).highlight = highlight;
            this.render();
        }
    }

    removeHeapObject(address) {
        this.heapObjects.delete(address);
        this.render();
    }

    clear() {
        this.stackFrames = [];
        this.heapObjects.clear();
        this.render();
    }

    syncWithTree(root) {
        this.heapObjects.clear();
        this._collectHeapObjects(root);
        this.render();
    }

    _collectHeapObjects(node) {
        if (!node) return;
        
        this.heapObjects.set(node.address, {
            type: 'Node',
            data: {
                key: node.key,
                left: node.left ? node.left.address : 'null',
                right: node.right ? node.right.address : 'null'
            },
            highlight: node.highlighted || node.found
        });
        
        this._collectHeapObjects(node.left);
        this._collectHeapObjects(node.right);
    }

    render() {
        this.stackView.innerHTML = this.stackFrames
            .slice()
            .reverse()
            .map(frame => `
                <div class="stack-frame ${frame.active ? 'active' : ''}">
                    <div class="stack-frame-name">${frame.active ? '→ ' : ''}${frame.name}</div>
                    ${Object.entries(frame.variables).map(([key, value]) => `
                        <div class="stack-var">${key}: ${this._formatValue(value)}</div>
                    `).join('')}
                </div>
            `).join('') || '<div style="color: #888; text-align: center; padding: 20px;">(empty)</div>';

        this.heapView.innerHTML = Array.from(this.heapObjects.entries())
            .map(([address, obj]) => `
                <div class="heap-object ${obj.highlight ? 'highlight' : ''}">
                    <div class="heap-address">${address}</div>
                    <div class="heap-type">${obj.type}</div>
                    ${Object.entries(obj.data).map(([key, value]) => `
                        <div class="heap-field">${key}: ${this._formatValue(value)}</div>
                    `).join('')}
                </div>
            `).join('') || '<div style="color: #888; text-align: center; padding: 20px;">(empty)</div>';
    }

    _formatValue(value) {
        if (value === null || value === 'null') {
            return '<span style="color: #888;">null</span>';
        }
        if (typeof value === 'string' && value.startsWith('0x')) {
            return `<span style="color: #28a745;">→ ${value}</span>`;
        }
        return value;
    }
}

window.TreeVisualizer = TreeVisualizer;
window.MemoryView = MemoryView;
