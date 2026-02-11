class HeapVisualizer {
    constructor(canvasId, arrayViewId, logId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.arrayView = document.getElementById(arrayViewId);
        this.logContainer = document.getElementById(logId);
        
        this.heap = [];
        this.isMaxHeap = true;
        this.animationSpeed = 500;
        this.isAnimating = false;
        
        this.nodeRadius = 25;
        this.levelHeight = 70;
        
        this.initCanvas();
    }

    initCanvas() {
        this.canvas.width = 800;
        this.canvas.height = 400;
        this.render();
    }

    setHeapType(type) {
        this.isMaxHeap = (type === 'max');
        if (this.heap.length > 0) {
            this.buildHeap(this.heap);
        }
        this.log(`Switched to ${this.isMaxHeap ? 'Max' : 'Min'} Heap`, 'info');
    }

    compare(a, b) {
        return this.isMaxHeap ? a > b : a < b;
    }

    parent(i) { return Math.floor((i - 1) / 2); }
    left(i) { return 2 * i + 1; }
    right(i) { return 2 * i + 2; }

    async insert(value) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        this.log(`Inserting ${value}...`, 'info');
        this.heap.push(value);
        let idx = this.heap.length - 1;

        this.render({ highlight: [idx] });
        await this.delay();

        while (idx > 0 && this.compare(this.heap[idx], this.heap[this.parent(idx)])) {
            const parentIdx = this.parent(idx);
            this.log(`${value} > parent ${this.heap[parentIdx]}, swap`, 'swap');
            this.render({ comparing: [idx, parentIdx] });
            await this.delay();
            
            this.swap(idx, parentIdx);
            this.render({ swapping: [idx, parentIdx] });
            await this.delay();
            
            idx = parentIdx;
        }

        this.log(`Inserted ${value} at index ${idx}`, 'success');
        this.render({ highlight: [idx] });
        this.isAnimating = false;
    }

    async extract() {
        if (this.isAnimating || this.heap.length === 0) return null;
        this.isAnimating = true;

        const extracted = this.heap[0];
        this.log(`Extracting ${this.isMaxHeap ? 'max' : 'min'} value: ${extracted}`, 'info');
        
        this.render({ highlight: [0] });
        await this.delay();

        if (this.heap.length === 1) {
            this.heap.pop();
            this.render();
            this.isAnimating = false;
            return extracted;
        }

        this.heap[0] = this.heap.pop();
        this.log(`Moved ${this.heap[0]} to root`, 'info');
        this.render({ highlight: [0] });
        await this.delay();

        await this._heapifyDown(0);

        this.log(`Extracted ${extracted}`, 'success');
        this.render();
        this.isAnimating = false;
        return extracted;
    }

    async _heapifyDown(idx) {
        const n = this.heap.length;

        while (true) {
            let target = idx;
            const leftIdx = this.left(idx);
            const rightIdx = this.right(idx);

            if (leftIdx < n && this.compare(this.heap[leftIdx], this.heap[target])) {
                target = leftIdx;
            }
            if (rightIdx < n && this.compare(this.heap[rightIdx], this.heap[target])) {
                target = rightIdx;
            }

            if (target === idx) break;

            this.log(`Heapify: swap arr[${idx}]=${this.heap[idx]} with arr[${target}]=${this.heap[target]}`, 'swap');
            this.render({ comparing: [idx, target] });
            await this.delay();
            
            this.swap(idx, target);
            this.render({ swapping: [idx, target] });
            await this.delay();

            idx = target;
        }
    }

    async buildHeap(arr) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        this.heap = [...arr];
        this.log(`Building ${this.isMaxHeap ? 'Max' : 'Min'} Heap from array...`, 'info');
        this.render();
        await this.delay();

        for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
            await this._heapifyDown(i);
        }

        this.log('Heap built successfully!', 'success');
        this.render();
        this.isAnimating = false;
    }

    swap(i, j) {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }

    clear() {
        this.heap = [];
        this.render();
        this.clearLog();
        this.log('Heap cleared', 'info');
    }

    peek() {
        if (this.heap.length === 0) {
            this.log('Heap is empty', 'warning');
            return null;
        }
        this.log(`Top element: ${this.heap[0]}`, 'info');
        this.render({ highlight: [0] });
        return this.heap[0];
    }

    render(highlights = {}) {
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.heap.length === 0) {
            this.ctx.fillStyle = '#888';
            this.ctx.font = '16px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Empty Heap', this.canvas.width / 2, this.canvas.height / 2);
            this.renderArrayView(highlights);
            return;
        }

        this._drawNode(0, this.canvas.width / 2, 40, this.canvas.width / 4, highlights);
        this.renderArrayView(highlights);
    }

    _drawNode(idx, x, y, spread, highlights) {
        if (idx >= this.heap.length) return;

        const leftIdx = this.left(idx);
        const rightIdx = this.right(idx);

        this.ctx.strokeStyle = '#4a90d9';
        this.ctx.lineWidth = 2;

        if (leftIdx < this.heap.length) {
            const childX = x - spread;
            const childY = y + this.levelHeight;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y + this.nodeRadius);
            this.ctx.lineTo(childX, childY - this.nodeRadius);
            this.ctx.stroke();
            this._drawNode(leftIdx, childX, childY, spread / 2, highlights);
        }

        if (rightIdx < this.heap.length) {
            const childX = x + spread;
            const childY = y + this.levelHeight;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y + this.nodeRadius);
            this.ctx.lineTo(childX, childY - this.nodeRadius);
            this.ctx.stroke();
            this._drawNode(rightIdx, childX, childY, spread / 2, highlights);
        }

        let fillColor = '#4a90d9';
        if (highlights.highlight && highlights.highlight.includes(idx)) {
            fillColor = '#28a745';
        } else if (highlights.comparing && highlights.comparing.includes(idx)) {
            fillColor = '#ffc107';
        } else if (highlights.swapping && highlights.swapping.includes(idx)) {
            fillColor = '#e94560';
        }

        this.ctx.beginPath();
        this.ctx.arc(x, y, this.nodeRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = fillColor;
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(this.heap[idx], x, y);

        this.ctx.fillStyle = '#888';
        this.ctx.font = '10px sans-serif';
        this.ctx.fillText(`[${idx}]`, x, y + this.nodeRadius + 12);
    }

    renderArrayView(highlights = {}) {
        this.arrayView.innerHTML = '';
        
        this.heap.forEach((value, idx) => {
            const cell = document.createElement('div');
            cell.className = 'heap-array-cell';
            
            if (highlights.highlight && highlights.highlight.includes(idx)) {
                cell.classList.add('highlight');
            }
            if (highlights.comparing && highlights.comparing.includes(idx)) {
                cell.classList.add('comparing');
            }
            if (highlights.swapping && highlights.swapping.includes(idx)) {
                cell.classList.add('swapping');
            }

            const idxSpan = document.createElement('span');
            idxSpan.className = 'heap-cell-index';
            idxSpan.textContent = idx;

            const valSpan = document.createElement('span');
            valSpan.className = 'heap-cell-value';
            valSpan.textContent = value;

            cell.appendChild(idxSpan);
            cell.appendChild(valSpan);
            this.arrayView.appendChild(cell);
        });
    }

    log(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.logContainer.appendChild(entry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    clearLog() {
        this.logContainer.innerHTML = '';
    }

    delay() {
        return new Promise(resolve => setTimeout(resolve, this.animationSpeed));
    }

    setSpeed(speed) {
        this.animationSpeed = speed;
    }

    async demo() {
        this.clear();
        const values = [30, 20, 40, 10, 50, 25, 35];
        
        this.log(`Demo: Inserting ${values.join(', ')}`, 'info');
        
        for (const val of values) {
            await this.insert(val);
            await new Promise(r => setTimeout(r, 300));
        }
        
        this.log('Extracting top 3 elements...', 'info');
        for (let i = 0; i < 3; i++) {
            await this.extract();
            await new Promise(r => setTimeout(r, 500));
        }
        
        this.log('Demo complete!', 'success');
    }
}

if (typeof window !== 'undefined') {
    window.HeapVisualizer = HeapVisualizer;
}
