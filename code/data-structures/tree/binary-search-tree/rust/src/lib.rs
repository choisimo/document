use std::cmp::Ordering;
use std::fmt::Display;

#[derive(Debug)]
struct Node<T> {
    key: T,
    left: Option<Box<Node<T>>>,
    right: Option<Box<Node<T>>>,
}

impl<T> Node<T> {
    fn new(key: T) -> Self {
        Node {
            key,
            left: None,
            right: None,
        }
    }
}

#[derive(Debug, Default)]
pub struct BinarySearchTree<T> {
    root: Option<Box<Node<T>>>,
    size: usize,
}

impl<T: Ord> BinarySearchTree<T> {
    pub fn new() -> Self {
        BinarySearchTree {
            root: None,
            size: 0,
        }
    }

    pub fn insert(&mut self, key: T) {
        self.root = Self::insert_recursive(self.root.take(), key);
        self.size += 1;
    }

    fn insert_recursive(node: Option<Box<Node<T>>>, key: T) -> Option<Box<Node<T>>> {
        match node {
            None => Some(Box::new(Node::new(key))),
            Some(mut n) => {
                match key.cmp(&n.key) {
                    Ordering::Less => {
                        n.left = Self::insert_recursive(n.left.take(), key);
                    }
                    Ordering::Greater => {
                        n.right = Self::insert_recursive(n.right.take(), key);
                    }
                    Ordering::Equal => {}
                }
                Some(n)
            }
        }
    }

    pub fn search(&self, key: &T) -> bool {
        Self::search_recursive(&self.root, key)
    }

    fn search_recursive(node: &Option<Box<Node<T>>>, key: &T) -> bool {
        match node {
            None => false,
            Some(n) => match key.cmp(&n.key) {
                Ordering::Equal => true,
                Ordering::Less => Self::search_recursive(&n.left, key),
                Ordering::Greater => Self::search_recursive(&n.right, key),
            },
        }
    }

    pub fn delete(&mut self, key: &T)
    where
        T: Clone,
    {
        let (new_root, deleted) = Self::delete_recursive(self.root.take(), key);
        self.root = new_root;
        if deleted {
            self.size -= 1;
        }
    }

    fn delete_recursive(node: Option<Box<Node<T>>>, key: &T) -> (Option<Box<Node<T>>>, bool)
    where
        T: Clone,
    {
        match node {
            None => (None, false),
            Some(mut n) => match key.cmp(&n.key) {
                Ordering::Less => {
                    let (new_left, deleted) = Self::delete_recursive(n.left.take(), key);
                    n.left = new_left;
                    (Some(n), deleted)
                }
                Ordering::Greater => {
                    let (new_right, deleted) = Self::delete_recursive(n.right.take(), key);
                    n.right = new_right;
                    (Some(n), deleted)
                }
                Ordering::Equal => {
                    match (n.left.take(), n.right.take()) {
                        (None, None) => (None, true),
                        (Some(left), None) => (Some(left), true),
                        (None, Some(right)) => (Some(right), true),
                        (Some(left), Some(right)) => {
                            let min_key = Self::find_min(&right).clone();
                            n.key = min_key.clone();
                            n.left = Some(left);
                            let (new_right, _) = Self::delete_recursive(Some(right), &min_key);
                            n.right = new_right;
                            (Some(n), true)
                        }
                    }
                }
            },
        }
    }

    fn find_min(node: &Box<Node<T>>) -> &T {
        match &node.left {
            None => &node.key,
            Some(left) => Self::find_min(left),
        }
    }

    pub fn inorder(&self) -> Vec<&T> {
        let mut result = Vec::new();
        Self::inorder_recursive(&self.root, &mut result);
        result
    }

    fn inorder_recursive<'a>(node: &'a Option<Box<Node<T>>>, result: &mut Vec<&'a T>) {
        if let Some(n) = node {
            Self::inorder_recursive(&n.left, result);
            result.push(&n.key);
            Self::inorder_recursive(&n.right, result);
        }
    }

    pub fn preorder(&self) -> Vec<&T> {
        let mut result = Vec::new();
        Self::preorder_recursive(&self.root, &mut result);
        result
    }

    fn preorder_recursive<'a>(node: &'a Option<Box<Node<T>>>, result: &mut Vec<&'a T>) {
        if let Some(n) = node {
            result.push(&n.key);
            Self::preorder_recursive(&n.left, result);
            Self::preorder_recursive(&n.right, result);
        }
    }

    pub fn postorder(&self) -> Vec<&T> {
        let mut result = Vec::new();
        Self::postorder_recursive(&self.root, &mut result);
        result
    }

    fn postorder_recursive<'a>(node: &'a Option<Box<Node<T>>>, result: &mut Vec<&'a T>) {
        if let Some(n) = node {
            Self::postorder_recursive(&n.left, result);
            Self::postorder_recursive(&n.right, result);
            result.push(&n.key);
        }
    }

    pub fn size(&self) -> usize {
        self.size
    }

    pub fn height(&self) -> i32 {
        Self::height_recursive(&self.root)
    }

    fn height_recursive(node: &Option<Box<Node<T>>>) -> i32 {
        match node {
            None => -1,
            Some(n) => {
                1 + Self::height_recursive(&n.left).max(Self::height_recursive(&n.right))
            }
        }
    }

    pub fn is_valid_bst(&self) -> bool
    where
        T: Clone,
    {
        Self::validate(&self.root, None, None)
    }

    fn validate(node: &Option<Box<Node<T>>>, min: Option<&T>, max: Option<&T>) -> bool
    where
        T: Clone,
    {
        match node {
            None => true,
            Some(n) => {
                if let Some(min_val) = min {
                    if n.key <= *min_val {
                        return false;
                    }
                }
                if let Some(max_val) = max {
                    if n.key >= *max_val {
                        return false;
                    }
                }
                Self::validate(&n.left, min, Some(&n.key))
                    && Self::validate(&n.right, Some(&n.key), max)
            }
        }
    }

    pub fn is_empty(&self) -> bool {
        self.root.is_none()
    }
}

impl<T: Display> BinarySearchTree<T> {
    pub fn visualize(&self) -> String {
        if self.root.is_none() {
            return "(empty tree)".to_string();
        }
        let mut result = String::new();
        Self::visualize_helper(&self.root, String::new(), true, &mut result);
        result
    }

    fn visualize_helper(
        node: &Option<Box<Node<T>>>,
        prefix: String,
        is_left: bool,
        result: &mut String,
    ) {
        if let Some(n) = node {
            if n.right.is_some() {
                let new_prefix = format!("{}{}", prefix, if is_left { "│   " } else { "    " });
                Self::visualize_helper(&n.right, new_prefix, false, result);
            }
            result.push_str(&format!(
                "{}{}{}\n",
                prefix,
                if is_left { "└── " } else { "┌── " },
                n.key
            ));
            if n.left.is_some() {
                let new_prefix = format!("{}{}", prefix, if is_left { "    " } else { "│   " });
                Self::visualize_helper(&n.left, new_prefix, true, result);
            }
        }
    }
}

fn main() {
    println!("{}", "=".repeat(60));
    println!("Binary Search Tree - Rust Demo");
    println!("{}", "=".repeat(60));

    let mut bst: BinarySearchTree<i32> = BinarySearchTree::new();
    let elements = [5, 3, 7, 1, 4, 6, 8];

    println!("\nInsertion order: {:?}\n", elements);

    for &elem in &elements {
        bst.insert(elem);
    }

    println!("Tree Structure:");
    println!("{}", bst.visualize());

    println!("Size: {}", bst.size());
    println!("Height: {}", bst.height());
    println!("Is Valid BST: {}", bst.is_valid_bst());

    println!("\nInorder (sorted): {:?}", bst.inorder());
    println!("Preorder: {:?}", bst.preorder());
    println!("Postorder: {:?}", bst.postorder());

    println!("\nSearch 4: {}", bst.search(&4));
    println!("Search 10: {}", bst.search(&10));

    println!("\nAfter delete(5) - root deletion:");
    bst.delete(&5);
    println!("{}", bst.visualize());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_insert_and_search() {
        let mut bst = BinarySearchTree::new();
        bst.insert(5);
        bst.insert(3);
        bst.insert(7);

        assert!(bst.search(&5));
        assert!(bst.search(&3));
        assert!(bst.search(&7));
        assert!(!bst.search(&10));
    }

    #[test]
    fn test_delete() {
        let mut bst = BinarySearchTree::new();
        for &x in &[5, 3, 7, 1, 4] {
            bst.insert(x);
        }

        bst.delete(&3);
        assert!(!bst.search(&3));
        assert!(bst.search(&1));
        assert!(bst.search(&4));
    }

    #[test]
    fn test_inorder_sorted() {
        let mut bst = BinarySearchTree::new();
        for &x in &[5, 3, 7, 1, 4, 6, 8] {
            bst.insert(x);
        }

        let inorder: Vec<i32> = bst.inorder().iter().map(|&&x| x).collect();
        assert_eq!(inorder, vec![1, 3, 4, 5, 6, 7, 8]);
    }

    #[test]
    fn test_is_valid_bst() {
        let mut bst = BinarySearchTree::new();
        for &x in &[5, 3, 7] {
            bst.insert(x);
        }
        assert!(bst.is_valid_bst());
    }
}
