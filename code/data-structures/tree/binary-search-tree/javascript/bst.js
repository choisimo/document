class Node {
  constructor(key) {
    this.key = key;
    this.left = null;
    this.right = null;
  }
}

class BinarySearchTree {
  constructor() {
    this._root = null;
    this._size = 0;
  }

  insert(key) {
    this._root = this._insertRecursive(this._root, key);
    this._size++;
  }

  _insertRecursive(node, key) {
    if (node === null) {
      return new Node(key);
    }

    if (key < node.key) {
      node.left = this._insertRecursive(node.left, key);
    } else if (key > node.key) {
      node.right = this._insertRecursive(node.right, key);
    }

    return node;
  }

  search(key) {
    return this._searchRecursive(this._root, key);
  }

  _searchRecursive(node, key) {
    if (node === null) return false;
    if (key === node.key) return true;
    if (key < node.key) return this._searchRecursive(node.left, key);
    return this._searchRecursive(node.right, key);
  }

  delete(key) {
    const { node, deleted } = this._deleteRecursive(this._root, key);
    this._root = node;
    if (deleted) this._size--;
  }

  _deleteRecursive(node, key) {
    if (node === null) return { node: null, deleted: false };

    let deleted = false;

    if (key < node.key) {
      const result = this._deleteRecursive(node.left, key);
      node.left = result.node;
      deleted = result.deleted;
    } else if (key > node.key) {
      const result = this._deleteRecursive(node.right, key);
      node.right = result.node;
      deleted = result.deleted;
    } else {
      deleted = true;
      if (node.left === null) return { node: node.right, deleted: true };
      if (node.right === null) return { node: node.left, deleted: true };

      const successor = this._findMin(node.right);
      node.key = successor.key;
      const result = this._deleteRecursive(node.right, successor.key);
      node.right = result.node;
    }

    return { node, deleted };
  }

  _findMin(node) {
    let current = node;
    while (current.left !== null) {
      current = current.left;
    }
    return current;
  }

  *inorder() {
    yield* this._inorderRecursive(this._root);
  }

  *_inorderRecursive(node) {
    if (node !== null) {
      yield* this._inorderRecursive(node.left);
      yield node.key;
      yield* this._inorderRecursive(node.right);
    }
  }

  *preorder() {
    yield* this._preorderRecursive(this._root);
  }

  *_preorderRecursive(node) {
    if (node !== null) {
      yield node.key;
      yield* this._preorderRecursive(node.left);
      yield* this._preorderRecursive(node.right);
    }
  }

  *postorder() {
    yield* this._postorderRecursive(this._root);
  }

  *_postorderRecursive(node) {
    if (node !== null) {
      yield* this._postorderRecursive(node.left);
      yield* this._postorderRecursive(node.right);
      yield node.key;
    }
  }

  get size() {
    return this._size;
  }

  get height() {
    return this._heightRecursive(this._root);
  }

  _heightRecursive(node) {
    if (node === null) return -1;
    return 1 + Math.max(
      this._heightRecursive(node.left),
      this._heightRecursive(node.right)
    );
  }

  isValidBST() {
    const validate = (node, minVal, maxVal) => {
      if (node === null) return true;
      if (node.key <= minVal || node.key >= maxVal) return false;
      return validate(node.left, minVal, node.key) &&
             validate(node.right, node.key, maxVal);
    };
    return validate(this._root, -Infinity, Infinity);
  }
}

function visualizeTree(bst) {
  const build = (node, prefix = '', isLeft = true) => {
    if (node === null) return '';

    let result = '';
    if (node.right !== null) {
      const newPrefix = prefix + (isLeft ? '│   ' : '    ');
      result += build(node.right, newPrefix, false);
    }

    result += prefix + (isLeft ? '└── ' : '┌── ') + node.key + '\n';

    if (node.left !== null) {
      const newPrefix = prefix + (isLeft ? '    ' : '│   ');
      result += build(node.left, newPrefix, true);
    }

    return result;
  };

  if (bst._root === null) return '(empty tree)';
  return build(bst._root, '', true);
}

if (typeof require !== 'undefined' && require.main === module) {
  console.log('='.repeat(60));
  console.log('Binary Search Tree - JavaScript Demo');
  console.log('='.repeat(60));

  const bst = new BinarySearchTree();
  const elements = [5, 3, 7, 1, 4, 6, 8];

  console.log(`\nInsertion order: [${elements.join(', ')}]\n`);

  for (const elem of elements) {
    bst.insert(elem);
  }

  console.log('Tree Structure:');
  console.log(visualizeTree(bst));

  console.log(`Size: ${bst.size}`);
  console.log(`Height: ${bst.height}`);
  console.log(`Is Valid BST: ${bst.isValidBST()}`);

  console.log(`\nInorder (sorted): [${[...bst.inorder()].join(', ')}]`);
  console.log(`Preorder: [${[...bst.preorder()].join(', ')}]`);
  console.log(`Postorder: [${[...bst.postorder()].join(', ')}]`);

  console.log(`\nSearch 4: ${bst.search(4)}`);
  console.log(`Search 10: ${bst.search(10)}`);

  console.log('\nAfter delete(5) - root deletion:');
  bst.delete(5);
  console.log(visualizeTree(bst));
}

module.exports = { Node, BinarySearchTree, visualizeTree };
