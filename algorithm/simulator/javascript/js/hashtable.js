class HashTable {
    constructor(size = 11) {
        this.size = size;
        this.table = new Array(size).fill(null);
        this.count = 0;
        this.collisions = 0;
        this.animationSpeed = 500;
        this.isAnimating = false;
    }

    hash(key) {
        return ((key % this.size) + this.size) % this.size;
    }

    async insert(key, onStep) {
        if (this.count >= this.size) {
            if (onStep) onStep({ type: 'error', message: 'Table is full!' });
            return false;
        }

        const hashValue = this.hash(key);
        let idx = hashValue;
        let probeCount = 0;

        if (onStep) onStep({ 
            type: 'hash', 
            message: `hash(${key}) = ${key} mod ${this.size} = ${hashValue}`,
            index: hashValue
        });

        await this.delay();

        while (this.table[idx] !== null) {
            probeCount++;
            this.collisions++;
            
            if (onStep) onStep({ 
                type: 'collision', 
                message: `Collision at index ${idx} (occupied by ${this.table[idx]}). Probing next...`,
                index: idx,
                probeCount
            });

            await this.delay();
            idx = (idx + 1) % this.size;

            if (idx === hashValue) {
                if (onStep) onStep({ type: 'error', message: 'Table is full (wrapped around)!' });
                return false;
            }
        }

        this.table[idx] = key;
        this.count++;

        if (onStep) onStep({ 
            type: 'insert', 
            message: `Inserted ${key} at index ${idx}` + (probeCount > 0 ? ` after ${probeCount} collision(s)` : ''),
            index: idx,
            value: key
        });

        return true;
    }

    async search(key, onStep) {
        const hashValue = this.hash(key);
        let idx = hashValue;
        let comparisons = 0;

        if (onStep) onStep({ 
            type: 'hash', 
            message: `hash(${key}) = ${key} mod ${this.size} = ${hashValue}`,
            index: hashValue
        });

        await this.delay();

        while (this.table[idx] !== null) {
            comparisons++;
            
            if (onStep) onStep({ 
                type: 'compare', 
                message: `Checking index ${idx}: ${this.table[idx]}`,
                index: idx
            });

            await this.delay();

            if (this.table[idx] === key) {
                if (onStep) onStep({ 
                    type: 'found', 
                    message: `Found ${key} at index ${idx} after ${comparisons} comparison(s)`,
                    index: idx
                });
                return idx;
            }

            idx = (idx + 1) % this.size;
            if (idx === hashValue) break;
        }

        if (onStep) onStep({ 
            type: 'not_found', 
            message: `${key} not found in table`
        });
        return -1;
    }

    async delete(key, onStep) {
        const idx = await this.search(key, onStep);
        if (idx === -1) return false;

        this.table[idx] = null;
        this.count--;

        if (onStep) onStep({ 
            type: 'delete', 
            message: `Deleted ${key} from index ${idx}`,
            index: idx
        });

        return true;
    }

    clear() {
        this.table = new Array(this.size).fill(null);
        this.count = 0;
        this.collisions = 0;
    }

    resize(newSize) {
        const oldTable = this.table;
        this.size = newSize;
        this.table = new Array(newSize).fill(null);
        this.count = 0;
        this.collisions = 0;

        for (const value of oldTable) {
            if (value !== null) {
                this.insert(value, null);
            }
        }
    }

    getLoadFactor() {
        return (this.count / this.size * 100).toFixed(1);
    }

    delay() {
        return new Promise(resolve => setTimeout(resolve, this.animationSpeed));
    }
}

class HashTableVisualizer {
    constructor(containerId, logId) {
        this.container = document.getElementById(containerId);
        this.logContainer = document.getElementById(logId);
        this.hashTable = new HashTable(11);
    }

    render(highlightIndex = null, highlightType = null) {
        this.container.innerHTML = '';
        
        const table = document.createElement('div');
        table.className = 'ht-table';

        for (let i = 0; i < this.hashTable.size; i++) {
            const cell = document.createElement('div');
            cell.className = 'ht-cell';
            
            if (i === highlightIndex) {
                cell.classList.add(`ht-${highlightType || 'highlight'}`);
            }
            
            const indexSpan = document.createElement('span');
            indexSpan.className = 'ht-index';
            indexSpan.textContent = i;
            
            const valueSpan = document.createElement('span');
            valueSpan.className = 'ht-value';
            valueSpan.textContent = this.hashTable.table[i] !== null ? this.hashTable.table[i] : '';
            
            cell.appendChild(indexSpan);
            cell.appendChild(valueSpan);
            table.appendChild(cell);
        }

        this.container.appendChild(table);
        this.updateStats();
    }

    updateStats() {
        document.getElementById('htCount').textContent = this.hashTable.count;
        document.getElementById('htLoadFactor').textContent = this.hashTable.getLoadFactor() + '%';
        document.getElementById('htCollisions').textContent = this.hashTable.collisions;
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

    async insert(value) {
        this.log(`Inserting ${value}...`, 'info');
        
        await this.hashTable.insert(value, (step) => {
            this.render(step.index, step.type);
            this.log(step.message, step.type);
        });
        
        this.render();
    }

    async search(value) {
        this.log(`Searching for ${value}...`, 'info');
        
        const result = await this.hashTable.search(value, (step) => {
            this.render(step.index, step.type);
            this.log(step.message, step.type);
        });
        
        this.render(result >= 0 ? result : null, result >= 0 ? 'found' : null);
        return result;
    }

    async delete(value) {
        this.log(`Deleting ${value}...`, 'info');
        
        await this.hashTable.delete(value, (step) => {
            this.render(step.index, step.type);
            this.log(step.message, step.type);
        });
        
        this.render();
    }

    clear() {
        this.hashTable.clear();
        this.render();
        this.clearLog();
        this.log('Table cleared', 'info');
    }

    async demo() {
        this.clear();
        const values = [15, 26, 37, 48, 59];
        
        this.log('Starting demo with values that cause collisions...', 'info');
        
        for (const val of values) {
            await this.insert(val);
            await new Promise(r => setTimeout(r, 500));
        }
        
        this.log('Demo complete!', 'info');
    }

    setSpeed(speed) {
        this.hashTable.animationSpeed = speed;
    }
}

if (typeof window !== 'undefined') {
    window.HashTable = HashTable;
    window.HashTableVisualizer = HashTableVisualizer;
}
