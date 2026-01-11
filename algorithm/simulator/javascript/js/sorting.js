class SortingVisualizer {
    constructor(containerId, logId) {
        this.container = document.getElementById(containerId);
        this.logContainer = document.getElementById(logId);
        this.array = [];
        this.originalArray = [];
        this.comparisons = 0;
        this.swaps = 0;
        this.animationSpeed = 500;
        this.isAnimating = false;
    }

    setArray(arr) {
        this.array = [...arr];
        this.originalArray = [...arr];
        this.comparisons = 0;
        this.swaps = 0;
        this.render();
        this.updateStats();
    }

    randomArray(size = 10, max = 100) {
        const arr = [];
        for (let i = 0; i < size; i++) {
            arr.push(Math.floor(Math.random() * max) + 1);
        }
        this.setArray(arr);
        this.log('Generated random array', 'info');
    }

    reset() {
        this.array = [...this.originalArray];
        this.comparisons = 0;
        this.swaps = 0;
        this.render();
        this.updateStats();
        this.log('Array reset to original', 'info');
    }

    render(highlights = {}) {
        this.container.innerHTML = '';
        
        const maxVal = Math.max(...this.array, 1);
        
        this.array.forEach((value, idx) => {
            const bar = document.createElement('div');
            bar.className = 'sort-bar';
            bar.style.height = `${(value / maxVal) * 250}px`;
            
            if (highlights.comparing && highlights.comparing.includes(idx)) {
                bar.classList.add('comparing');
            }
            if (highlights.swapping && highlights.swapping.includes(idx)) {
                bar.classList.add('swapping');
            }
            if (highlights.pivot === idx) {
                bar.classList.add('pivot');
            }
            if (highlights.sorted && highlights.sorted.includes(idx)) {
                bar.classList.add('sorted');
            }
            if (highlights.merging && highlights.merging.includes(idx)) {
                bar.classList.add('merging');
            }
            
            const label = document.createElement('span');
            label.className = 'sort-bar-label';
            label.textContent = value;
            bar.appendChild(label);
            
            this.container.appendChild(bar);
        });
    }

    updateStats() {
        document.getElementById('sortComparisons').textContent = this.comparisons;
        document.getElementById('sortSwaps').textContent = this.swaps;
    }

    setStatus(status) {
        document.getElementById('sortStatus').textContent = status;
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

    swap(i, j) {
        [this.array[i], this.array[j]] = [this.array[j], this.array[i]];
        this.swaps++;
    }

    async quickSort() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.setStatus('Running Quick Sort...');
        this.log('Starting Quick Sort', 'info');
        
        await this._quickSortHelper(0, this.array.length - 1);
        
        const sorted = this.array.map((_, i) => i);
        this.render({ sorted });
        
        this.setStatus('Complete');
        this.log(`Quick Sort complete! Comparisons: ${this.comparisons}, Swaps: ${this.swaps}`, 'success');
        this.isAnimating = false;
    }

    async _quickSortHelper(low, high) {
        if (low < high) {
            const pivotIdx = await this._partition(low, high);
            await this._quickSortHelper(low, pivotIdx - 1);
            await this._quickSortHelper(pivotIdx + 1, high);
        }
    }

    async _partition(low, high) {
        const pivot = this.array[high];
        this.log(`Partition [${low}..${high}], pivot = ${pivot}`, 'info');
        this.render({ pivot: high });
        await this.delay();

        let i = low - 1;

        for (let j = low; j < high; j++) {
            this.comparisons++;
            this.render({ comparing: [j, high], pivot: high });
            this.log(`Compare arr[${j}]=${this.array[j]} with pivot ${pivot}`, 'compare');
            await this.delay();

            if (this.array[j] < pivot) {
                i++;
                if (i !== j) {
                    this.log(`Swap arr[${i}]=${this.array[i]} <-> arr[${j}]=${this.array[j]}`, 'swap');
                    this.render({ swapping: [i, j], pivot: high });
                    await this.delay();
                    this.swap(i, j);
                    this.render({ pivot: high });
                    this.updateStats();
                }
            }
        }

        if (i + 1 !== high) {
            this.log(`Place pivot: Swap arr[${i+1}]=${this.array[i+1]} <-> arr[${high}]=${pivot}`, 'swap');
            this.render({ swapping: [i + 1, high] });
            await this.delay();
            this.swap(i + 1, high);
            this.render();
            this.updateStats();
        }

        return i + 1;
    }

    async mergeSort() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.setStatus('Running Merge Sort...');
        this.log('Starting Merge Sort', 'info');

        await this._mergeSortHelper(0, this.array.length - 1);

        const sorted = this.array.map((_, i) => i);
        this.render({ sorted });

        this.setStatus('Complete');
        this.log(`Merge Sort complete! Comparisons: ${this.comparisons}, Swaps: ${this.swaps}`, 'success');
        this.isAnimating = false;
    }

    async _mergeSortHelper(left, right) {
        if (left < right) {
            const mid = Math.floor((left + right) / 2);
            await this._mergeSortHelper(left, mid);
            await this._mergeSortHelper(mid + 1, right);
            await this._merge(left, mid, right);
        }
    }

    async _merge(left, mid, right) {
        this.log(`Merge [${left}..${mid}] and [${mid+1}..${right}]`, 'info');
        
        const leftArr = this.array.slice(left, mid + 1);
        const rightArr = this.array.slice(mid + 1, right + 1);
        
        let i = 0, j = 0, k = left;
        const merging = [];
        for (let idx = left; idx <= right; idx++) merging.push(idx);

        while (i < leftArr.length && j < rightArr.length) {
            this.comparisons++;
            this.render({ merging, comparing: [left + i, mid + 1 + j] });
            this.log(`Compare ${leftArr[i]} vs ${rightArr[j]}`, 'compare');
            await this.delay();

            if (leftArr[i] <= rightArr[j]) {
                this.array[k] = leftArr[i];
                i++;
            } else {
                this.array[k] = rightArr[j];
                j++;
                this.swaps++;
            }
            k++;
            this.render({ merging });
            this.updateStats();
        }

        while (i < leftArr.length) {
            this.array[k] = leftArr[i];
            i++;
            k++;
            this.render({ merging });
            await this.delay();
        }

        while (j < rightArr.length) {
            this.array[k] = rightArr[j];
            j++;
            k++;
            this.render({ merging });
            await this.delay();
        }
    }

    async heapSort() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.setStatus('Running Heap Sort...');
        this.log('Starting Heap Sort', 'info');
        
        const n = this.array.length;

        this.log('Building max heap...', 'info');
        for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
            await this._heapify(n, i);
        }

        this.log('Extracting elements from heap...', 'info');
        const sorted = [];
        for (let i = n - 1; i > 0; i--) {
            this.log(`Swap root ${this.array[0]} with arr[${i}]=${this.array[i]}`, 'swap');
            this.render({ swapping: [0, i], sorted });
            await this.delay();
            this.swap(0, i);
            sorted.unshift(i);
            this.render({ sorted });
            this.updateStats();
            await this._heapify(i, 0, sorted);
        }
        sorted.unshift(0);
        this.render({ sorted });

        this.setStatus('Complete');
        this.log(`Heap Sort complete! Comparisons: ${this.comparisons}, Swaps: ${this.swaps}`, 'success');
        this.isAnimating = false;
    }

    async _heapify(n, i, sorted = []) {
        let largest = i;
        const left = 2 * i + 1;
        const right = 2 * i + 2;

        if (left < n) {
            this.comparisons++;
            this.render({ comparing: [largest, left], sorted });
            await this.delay();
            if (this.array[left] > this.array[largest]) {
                largest = left;
            }
        }

        if (right < n) {
            this.comparisons++;
            this.render({ comparing: [largest, right], sorted });
            await this.delay();
            if (this.array[right] > this.array[largest]) {
                largest = right;
            }
        }

        if (largest !== i) {
            this.log(`Heapify: Swap arr[${i}]=${this.array[i]} <-> arr[${largest}]=${this.array[largest]}`, 'swap');
            this.render({ swapping: [i, largest], sorted });
            await this.delay();
            this.swap(i, largest);
            this.render({ sorted });
            this.updateStats();
            await this._heapify(n, largest, sorted);
        }
    }

    setSpeed(speed) {
        this.animationSpeed = speed;
    }
}

if (typeof window !== 'undefined') {
    window.SortingVisualizer = SortingVisualizer;
}
