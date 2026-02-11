document.addEventListener('DOMContentLoaded', () => {
    let currentAlgo = 'bst';
    
    const navButtons = document.querySelectorAll('.nav-btn');
    const algoSections = document.querySelectorAll('.algo-section');
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');

    let animationSpeed = 500;

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const algo = btn.dataset.algo;
            switchAlgorithm(algo);
        });
    });

    function switchAlgorithm(algo) {
        currentAlgo = algo;
        
        navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.algo === algo);
        });
        
        algoSections.forEach(section => {
            section.classList.toggle('active', section.id === `${algo}-section`);
        });
    }

    speedSlider.addEventListener('input', () => {
        animationSpeed = parseInt(speedSlider.value);
        speedValue.textContent = `${animationSpeed}ms`;
        
        if (bst) bst.animationSpeed = animationSpeed;
        if (htVisualizer) htVisualizer.setSpeed(animationSpeed);
        if (sortVisualizer) sortVisualizer.setSpeed(animationSpeed);
        if (heapVisualizer) heapVisualizer.setSpeed(animationSpeed);
    });

    const bst = new BinarySearchTree();
    const treeViz = new TreeVisualizer('treeCanvas');
    const memoryView = new MemoryView('stackView', 'heapView');
    
    const bstValueInput = document.getElementById('bstValueInput');
    const bstInsertBtn = document.getElementById('bstInsertBtn');
    const bstSearchBtn = document.getElementById('bstSearchBtn');
    const bstDeleteBtn = document.getElementById('bstDeleteBtn');
    const bstRandomBtn = document.getElementById('bstRandomBtn');
    const bstClearBtn = document.getElementById('bstClearBtn');
    const bstDemoBtn = document.getElementById('bstDemoBtn');
    const logView = document.getElementById('logView');
    
    const nodeCount = document.getElementById('nodeCount');
    const treeHeight = document.getElementById('treeHeight');
    const opCount = document.getElementById('opCount');
    const compCount = document.getElementById('compCount');
    
    const inorderBtn = document.getElementById('inorderBtn');
    const preorderBtn = document.getElementById('preorderBtn');
    const postorderBtn = document.getElementById('postorderBtn');
    const traversalResult = document.getElementById('traversalResult');

    let isAnimating = false;

    function log(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logView.appendChild(entry);
        logView.scrollTop = logView.scrollHeight;
    }

    function updateStats() {
        nodeCount.textContent = bst.size;
        treeHeight.textContent = bst.getHeight();
        opCount.textContent = bst.operations;
        compCount.textContent = bst.comparisons;
    }

    function render() {
        treeViz.animate(bst.root);
        memoryView.syncWithTree(bst.root);
        updateStats();
    }

    async function animateSteps(steps, operation) {
        isAnimating = true;
        setButtonsEnabled(false);

        memoryView.pushStackFrame(operation, {});

        for (const step of steps) {
            bst.clearHighlights();
            
            if (step.node) {
                if (step.type === 'found') {
                    treeViz.highlightNode(step.node, 'found');
                } else {
                    treeViz.highlightNode(step.node, 'highlight');
                }
            }

            log(step.message, step.type === 'found' ? 'success' : step.type === 'not_found' ? 'highlight' : 'info');

            if (step.node) {
                memoryView.updateStackVariable('current', step.node.address);
            }

            treeViz.draw(bst.root);
            memoryView.syncWithTree(bst.root);

            await sleep(animationSpeed);
        }

        bst.clearHighlights();
        memoryView.popStackFrame();
        render();
        
        isAnimating = false;
        setButtonsEnabled(true);
    }

    function setButtonsEnabled(enabled) {
        [bstInsertBtn, bstSearchBtn, bstDeleteBtn, bstRandomBtn, bstClearBtn, bstDemoBtn].forEach(btn => {
            btn.disabled = !enabled;
        });
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    bstInsertBtn.addEventListener('click', async () => {
        const value = parseInt(bstValueInput.value);
        if (isNaN(value)) {
            log('Please enter a valid number', 'highlight');
            return;
        }

        log(`INSERT(${value}) - Starting`, 'info');
        const result = bst.insert(value);
        await animateSteps(result.steps, `insert(${value})`);
        log(`INSERT(${value}) - Completed`, 'success');
        
        bstValueInput.value = '';
    });

    bstSearchBtn.addEventListener('click', async () => {
        const value = parseInt(bstValueInput.value);
        if (isNaN(value)) {
            log('Please enter a valid number', 'highlight');
            return;
        }

        log(`SEARCH(${value}) - Starting`, 'info');
        const result = bst.search(value);
        await animateSteps(result.steps, `search(${value})`);
        
        if (result.found) {
            log(`SEARCH(${value}) - FOUND!`, 'success');
        } else {
            log(`SEARCH(${value}) - NOT FOUND`, 'highlight');
        }
    });

    bstDeleteBtn.addEventListener('click', async () => {
        const value = parseInt(bstValueInput.value);
        if (isNaN(value)) {
            log('Please enter a valid number', 'highlight');
            return;
        }

        log(`DELETE(${value}) - Starting`, 'info');
        const result = bst.delete(value);
        await animateSteps(result.steps, `delete(${value})`);
        
        if (result.deleted) {
            log(`DELETE(${value}) - Completed`, 'success');
        } else {
            log(`DELETE(${value}) - Node not found`, 'highlight');
        }
    });

    bstRandomBtn.addEventListener('click', async () => {
        const value = Math.floor(Math.random() * 100) + 1;
        log(`Random INSERT(${value})`, 'info');
        const result = bst.insert(value);
        await animateSteps(result.steps, `insert(${value})`);
        log(`INSERT(${value}) - Completed`, 'success');
    });

    bstClearBtn.addEventListener('click', () => {
        bst.clear();
        memoryView.clear();
        logView.innerHTML = '';
        render();
        log('Tree cleared', 'info');
    });

    bstDemoBtn.addEventListener('click', async () => {
        bst.clear();
        memoryView.clear();
        logView.innerHTML = '';
        render();
        
        log('=== DEMO MODE ===', 'info');
        log('Inserting: 50, 30, 70, 20, 40, 60, 80', 'info');

        const values = [50, 30, 70, 20, 40, 60, 80];
        
        for (const value of values) {
            const result = bst.insert(value);
            await animateSteps(result.steps, `insert(${value})`);
            await sleep(300);
        }

        log('=== Searching for 40 ===', 'info');
        await sleep(500);
        const searchResult = bst.search(40);
        await animateSteps(searchResult.steps, 'search(40)');

        log('=== Deleting 30 (node with two children) ===', 'info');
        await sleep(500);
        const deleteResult = bst.delete(30);
        await animateSteps(deleteResult.steps, 'delete(30)');

        log('=== DEMO COMPLETED ===', 'success');
    });

    inorderBtn.addEventListener('click', () => {
        const result = bst.inorder();
        traversalResult.textContent = `Inorder: [${result.join(', ')}]`;
        log(`Inorder traversal: [${result.join(', ')}]`, 'info');
    });

    preorderBtn.addEventListener('click', () => {
        const result = bst.preorder();
        traversalResult.textContent = `Preorder: [${result.join(', ')}]`;
        log(`Preorder traversal: [${result.join(', ')}]`, 'info');
    });

    postorderBtn.addEventListener('click', () => {
        const result = bst.postorder();
        traversalResult.textContent = `Postorder: [${result.join(', ')}]`;
        log(`Postorder traversal: [${result.join(', ')}]`, 'info');
    });

    bstValueInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isAnimating) {
            bstInsertBtn.click();
        }
    });

    render();
    log('BST Simulator ready. Enter a value and click Insert to begin.', 'info');

    const htVisualizer = new HashTableVisualizer('hashtableView', 'htLogView');
    
    const htValueInput = document.getElementById('htValueInput');
    const htInsertBtn = document.getElementById('htInsertBtn');
    const htSearchBtn = document.getElementById('htSearchBtn');
    const htDeleteBtn = document.getElementById('htDeleteBtn');
    const htSizeInput = document.getElementById('htSizeInput');
    const htClearBtn = document.getElementById('htClearBtn');
    const htDemoBtn = document.getElementById('htDemoBtn');

    htVisualizer.render();

    htInsertBtn.addEventListener('click', async () => {
        const value = parseInt(htValueInput.value);
        if (isNaN(value)) return;
        await htVisualizer.insert(value);
        htValueInput.value = '';
    });

    htSearchBtn.addEventListener('click', async () => {
        const value = parseInt(htValueInput.value);
        if (isNaN(value)) return;
        await htVisualizer.search(value);
    });

    htDeleteBtn.addEventListener('click', async () => {
        const value = parseInt(htValueInput.value);
        if (isNaN(value)) return;
        await htVisualizer.delete(value);
        htValueInput.value = '';
    });

    htClearBtn.addEventListener('click', () => {
        const newSize = parseInt(htSizeInput.value) || 11;
        htVisualizer.hashTable.resize(newSize);
        htVisualizer.clear();
    });

    htDemoBtn.addEventListener('click', () => {
        htVisualizer.demo();
    });

    htValueInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') htInsertBtn.click();
    });

    const sortVisualizer = new SortingVisualizer('sortArrayView', 'sortLogView');
    
    const sortArrayInput = document.getElementById('sortArrayInput');
    const sortSetBtn = document.getElementById('sortSetBtn');
    const sortRandomBtn = document.getElementById('sortRandomBtn');
    const quickSortBtn = document.getElementById('quickSortBtn');
    const mergeSortBtn = document.getElementById('mergeSortBtn');
    const heapSortBtn = document.getElementById('heapSortBtn');
    const sortResetBtn = document.getElementById('sortResetBtn');

    sortVisualizer.randomArray(10, 50);

    sortSetBtn.addEventListener('click', () => {
        const input = sortArrayInput.value;
        const arr = input.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (arr.length > 0) {
            sortVisualizer.setArray(arr);
        }
    });

    sortRandomBtn.addEventListener('click', () => {
        sortVisualizer.randomArray(10, 50);
    });

    quickSortBtn.addEventListener('click', () => {
        sortVisualizer.reset();
        sortVisualizer.quickSort();
    });

    mergeSortBtn.addEventListener('click', () => {
        sortVisualizer.reset();
        sortVisualizer.mergeSort();
    });

    heapSortBtn.addEventListener('click', () => {
        sortVisualizer.reset();
        sortVisualizer.heapSort();
    });

    sortResetBtn.addEventListener('click', () => {
        sortVisualizer.reset();
    });

    sortArrayInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sortSetBtn.click();
    });

    const heapVisualizer = new HeapVisualizer('heapCanvas', 'heapArrayView', 'heapLogView');
    
    const heapValueInput = document.getElementById('heapValueInput');
    const heapInsertBtn = document.getElementById('heapInsertBtn');
    const heapExtractBtn = document.getElementById('heapExtractBtn');
    const heapTypeSelect = document.getElementById('heapTypeSelect');
    const heapBuildBtn = document.getElementById('heapBuildBtn');
    const heapClearBtn = document.getElementById('heapClearBtn');
    const heapDemoBtn = document.getElementById('heapDemoBtn');

    heapInsertBtn.addEventListener('click', async () => {
        const value = parseInt(heapValueInput.value);
        if (isNaN(value)) return;
        await heapVisualizer.insert(value);
        heapValueInput.value = '';
    });

    heapExtractBtn.addEventListener('click', async () => {
        await heapVisualizer.extract();
    });

    heapTypeSelect.addEventListener('change', () => {
        heapVisualizer.setHeapType(heapTypeSelect.value);
    });

    heapBuildBtn.addEventListener('click', async () => {
        const arr = [30, 20, 40, 10, 50, 25, 35];
        await heapVisualizer.buildHeap(arr);
    });

    heapClearBtn.addEventListener('click', () => {
        heapVisualizer.clear();
    });

    heapDemoBtn.addEventListener('click', () => {
        heapVisualizer.demo();
    });

    heapValueInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') heapInsertBtn.click();
    });
});
