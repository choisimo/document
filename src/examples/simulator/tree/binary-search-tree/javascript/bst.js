class Node {
    constructor(key) {
        this.key = key;
        this.left = null;
        this.right = null;
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.address = `0x${(Math.random() * 0xFFFF | 0).toString(16).toUpperCase().padStart(4, '0')}`;
        this.highlighted = false;
        this.found = false;
    }
}

class BinarySearchTree {
    constructor() {
        this.root = null;
        this.size = 0;
        this.comparisons = 0;
        this.operations = 0;
    }

    insert(key) {
        this.operations++;
        const result = { steps: [], newNode: null };
        this.root = this._insertRecursive(this.root, key, result, 0);
        this.size++;
        return result;
    }

    _insertRecursive(node, key, result, depth) {
        this.comparisons++;
        
        if (node === null) {
            const newNode = new Node(key);
            result.newNode = newNode;
            result.steps.push({
                type: 'create',
                message: `Created new node with key ${key}`,
                node: newNode,
                depth: depth
            });
            return newNode;
        }

        result.steps.push({
            type: 'compare',
            message: `Comparing ${key} with ${node.key}`,
            node: node,
            depth: depth
        });

        if (key < node.key) {
            result.steps.push({
                type: 'direction',
                message: `${key} < ${node.key}, going LEFT`,
                node: node,
                direction: 'left'
            });
            node.left = this._insertRecursive(node.left, key, result, depth + 1);
        } else if (key > node.key) {
            result.steps.push({
                type: 'direction',
                message: `${key} > ${node.key}, going RIGHT`,
                node: node,
                direction: 'right'
            });
            node.right = this._insertRecursive(node.right, key, result, depth + 1);
        } else {
            result.steps.push({
                type: 'duplicate',
                message: `${key} already exists, ignoring`,
                node: node
            });
        }

        return node;
    }

    search(key) {
        this.operations++;
        const result = { steps: [], found: false, node: null };
        this._searchRecursive(this.root, key, result, 0);
        return result;
    }

    _searchRecursive(node, key, result, depth) {
        this.comparisons++;

        if (node === null) {
            result.steps.push({
                type: 'not_found',
                message: `Reached null - key ${key} not found`,
                depth: depth
            });
            return;
        }

        result.steps.push({
            type: 'visit',
            message: `Visiting node ${node.key}`,
            node: node,
            depth: depth
        });

        if (key === node.key) {
            result.found = true;
            result.node = node;
            result.steps.push({
                type: 'found',
                message: `Found key ${key}!`,
                node: node
            });
            return;
        }

        if (key < node.key) {
            result.steps.push({
                type: 'direction',
                message: `${key} < ${node.key}, searching LEFT`,
                node: node,
                direction: 'left'
            });
            this._searchRecursive(node.left, key, result, depth + 1);
        } else {
            result.steps.push({
                type: 'direction',
                message: `${key} > ${node.key}, searching RIGHT`,
                node: node,
                direction: 'right'
            });
            this._searchRecursive(node.right, key, result, depth + 1);
        }
    }

    delete(key) {
        this.operations++;
        const result = { steps: [], deleted: false };
        this.root = this._deleteRecursive(this.root, key, result, 0);
        if (result.deleted) this.size--;
        return result;
    }

    _deleteRecursive(node, key, result, depth) {
        if (node === null) {
            result.steps.push({
                type: 'not_found',
                message: `Key ${key} not found for deletion`,
                depth: depth
            });
            return null;
        }

        this.comparisons++;

        result.steps.push({
            type: 'visit',
            message: `Checking node ${node.key}`,
            node: node,
            depth: depth
        });

        if (key < node.key) {
            result.steps.push({
                type: 'direction',
                message: `${key} < ${node.key}, go LEFT`,
                node: node,
                direction: 'left'
            });
            node.left = this._deleteRecursive(node.left, key, result, depth + 1);
        } else if (key > node.key) {
            result.steps.push({
                type: 'direction',
                message: `${key} > ${node.key}, go RIGHT`,
                node: node,
                direction: 'right'
            });
            node.right = this._deleteRecursive(node.right, key, result, depth + 1);
        } else {
            result.deleted = true;
            result.steps.push({
                type: 'found',
                message: `Found node to delete: ${key}`,
                node: node
            });

            if (node.left === null && node.right === null) {
                result.steps.push({
                    type: 'delete_case',
                    message: 'Case 1: Leaf node - simply remove',
                    caseType: 'leaf'
                });
                return null;
            }

            if (node.left === null) {
                result.steps.push({
                    type: 'delete_case',
                    message: 'Case 2a: No left child - replace with right',
                    caseType: 'single_right'
                });
                return node.right;
            }

            if (node.right === null) {
                result.steps.push({
                    type: 'delete_case',
                    message: 'Case 2b: No right child - replace with left',
                    caseType: 'single_left'
                });
                return node.left;
            }

            result.steps.push({
                type: 'delete_case',
                message: 'Case 3: Two children - find in-order successor',
                caseType: 'two_children'
            });

            const successor = this._findMin(node.right);
            result.steps.push({
                type: 'successor',
                message: `In-order successor: ${successor.key}`,
                node: successor
            });

            node.key = successor.key;
            node.address = successor.address;
            node.right = this._deleteRecursive(node.right, successor.key, result, depth + 1);
        }

        return node;
    }

    _findMin(node) {
        while (node.left !== null) {
            node = node.left;
        }
        return node;
    }

    getHeight() {
        return this._heightRecursive(this.root);
    }

    _heightRecursive(node) {
        if (node === null) return -1;
        return 1 + Math.max(
            this._heightRecursive(node.left),
            this._heightRecursive(node.right)
        );
    }

    inorder() {
        const result = [];
        this._inorderRecursive(this.root, result);
        return result;
    }

    _inorderRecursive(node, result) {
        if (node !== null) {
            this._inorderRecursive(node.left, result);
            result.push(node.key);
            this._inorderRecursive(node.right, result);
        }
    }

    preorder() {
        const result = [];
        this._preorderRecursive(this.root, result);
        return result;
    }

    _preorderRecursive(node, result) {
        if (node !== null) {
            result.push(node.key);
            this._preorderRecursive(node.left, result);
            this._preorderRecursive(node.right, result);
        }
    }

    postorder() {
        const result = [];
        this._postorderRecursive(this.root, result);
        return result;
    }

    _postorderRecursive(node, result) {
        if (node !== null) {
            this._postorderRecursive(node.left, result);
            this._postorderRecursive(node.right, result);
            result.push(node.key);
        }
    }

    clear() {
        this.root = null;
        this.size = 0;
        this.comparisons = 0;
        this.operations = 0;
    }

    getAllNodes() {
        const nodes = [];
        this._collectNodes(this.root, nodes);
        return nodes;
    }

    _collectNodes(node, nodes) {
        if (node !== null) {
            nodes.push(node);
            this._collectNodes(node.left, nodes);
            this._collectNodes(node.right, nodes);
        }
    }

    clearHighlights() {
        const nodes = this.getAllNodes();
        nodes.forEach(node => {
            node.highlighted = false;
            node.found = false;
        });
    }
}

window.BinarySearchTree = BinarySearchTree;
window.Node = Node;
