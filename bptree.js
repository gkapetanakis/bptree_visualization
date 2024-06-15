class BPTreeNode {
  constructor(isLeaf = false) {
    this.isLeaf = isLeaf;
    this.keys = [];

    if (isLeaf) {
      this.nextLeaf = null;
    } else {
      this.children = [];
    }
  }
}

export default class BPTree {
  constructor(n) {
    if (n < 3) {
      throw new Error("n must be at least 3");
    }

    this.root = new BPTreeNode(true);

    this.n = n;

    this.MIN_NONLEAF_CHILDREN = Math.ceil(n / 2);
    this.MAX_NONLEAF_CHILDREN = n;

    this.MIN_NONLEAF_KEYS = this.MIN_NONLEAF_CHILDREN - 1;
    this.MAX_NONLEAF_KEYS = this.MAX_NONLEAF_CHILDREN - 1;

    this.MIN_LEAF_KEYS = Math.ceil((n - 1) / 2);
    this.MAX_LEAF_KEYS = n - 1;

    // e.g. n === 4
    // split at 4 keys (3 is the maximum allowed)
    // LEAF_KEY_SPLIT_INDEX = 2, so [0, 1], [2, 3] will be the split
    //
    // e.g. n === 5
    // split at 5 keys (4 is the maximum allowed)
    // LEAF_KEY_SPLIT_INDEX = 3, so [0, 1, 2], [3, 4] will be the split
    this.LEAF_KEY_SPLIT_INDEX = Math.ceil(n / 2);

    // e.g. n === 4
    // split at 4 keys (3 is the maximum allowed)
    // NONLEAF_KEY_SPLIT_INDEX = 2, so [0, 1], [2, 3] will be the split
    // however the first key of the right node will be moved to the parent
    // so the final split will be [0, 1], [3]
    //
    // e.g. n === 5
    // split at 5 keys (4 is the maximum allowed)
    // NONLEAF_KEY_SPLIT_INDEX = 2, so [0, 1], [2, 3, 4] will be the split
    // however the first key of the right node will be moved to the parent
    // so the final split will be [0, 1], [3, 4]
    this.NONLEAF_KEY_SPLIT_INDEX = Math.ceil((n + 1) / 2) - 1;

    // e.g. n === 4
    // split at 5 children (3 is the maximum allowed)
    // NONLEAF_KEY_SPLIT_INDEX = 3, so [0, 1, 2], [3, 4] will be the split
    //
    // e.g. n === 5
    // split at 6 children (4 is the maximum allowed)
    // NONLEAF_KEY_SPLIT_INDEX = 3, so [0, 1, 2], [3, 4, 5] will be the split
    this.NONLEAF_CHILDREN_SPLIT_INDEX = Math.ceil((n + 1) / 2);
  }

  isEmpty() {
    return this.root.keys.length === 0;
  }

  // when this function is called, each node that is visited
  // in order to find a key is inserted into this.path
  // along with the index of the child that is followed to get to the next node
  // this information is then used by the insert() and delete() methods
  find(key) {
    this.path = [];

    // traverse the tree, starting at the root
    let node = this.root;
    while (!node.isLeaf) {
      // find the index of the first key that is greater than
      // the key we're searching for, which also corresponds
      // to the index of the pointer we need to follow
      let idx = node.keys.findIndex((k) => key < k);

      // findIndex() returns -1 if no element matches the predicate
      // in which case we need to follow the last pointer
      if (idx < 0) idx = node.keys.length;

      // keep track of the node and the index we followed
      this.path.push({ node, idx });

      // follow the pointer
      node = node.children[idx];
    }

    return node;
  }

  insert(key) {
    const leaf = this.find(key);
    const oldKeyCount = leaf.keys.length;
    this.insert_in_leaf(leaf, key);

    if (leaf.keys.length <= this.MAX_LEAF_KEYS)
      // the leaf does not need to be split
      return leaf.keys.length > oldKeyCount;

    // the leaf needs to be split
    const leftLeaf = leaf;
    const rightLeaf = new BPTreeNode(true);

    rightLeaf.nextLeaf = leftLeaf.nextLeaf;
    leftLeaf.nextLeaf = rightLeaf;

    rightLeaf.keys.push(...leftLeaf.keys.splice(this.LEAF_KEY_SPLIT_INDEX));

    this.insert_in_parent(leftLeaf, rightLeaf.keys[0], rightLeaf);
    return true;
  }

  insert_in_leaf(leaf, key) {
    // find the index of the first key that is greater than
    // the key we're inserting
    let idx = leaf.keys.findIndex((k) => key < k);

    // findIndex() returns -1 if no element matches the predicate
    // in which case we need to add the key at the end
    if (idx < 0) idx = leaf.keys.length;

    // the key already exists, don't do anything
    // (if the index is 0, then the leaf is empty)
    if (idx > 0 && leaf.keys[idx - 1] === key) {
      console.log(`Key '${key}' is already present in the tree`);
      return;
    }

    // splice() inserts the key at the end if the given index
    // is greater than or equal to the length of the array
    leaf.keys.splice(idx, 0, key);
    return;
  }

  insert_in_parent(leftChild, key, rightChild) {
    if (leftChild === this.root) {
      // the children have no parent (a new root needs to be created)
      this.root = new BPTreeNode();
      this.root.keys.push(key);
      this.root.children.push(leftChild, rightChild);
      return;
    }

    // get the parent and the index of the left child in the parent
    const { node: parent, idx } = this.path.pop();

    // insert the key after the key of the left child
    parent.keys.splice(idx, 0, key);

    // insert the right child after the pointer to the left child
    parent.children.splice(idx + 1, 0, rightChild);

    if (parent.children.length <= this.MAX_NONLEAF_CHILDREN) {
      // the parent does not need to be split
      return;
    }

    // the parent needs to be split
    const leftNode = parent;
    const rightNode = new BPTreeNode();

    rightNode.keys.push(...leftNode.keys.splice(this.NONLEAF_KEY_SPLIT_INDEX));
    rightNode.children.push(
      ...leftNode.children.splice(this.NONLEAF_CHILDREN_SPLIT_INDEX)
    );

    this.insert_in_parent(leftNode, rightNode.keys.shift(), rightNode);
  }

  delete(key) {
    const leaf = this.find(key);
    return this.delete_entry(leaf, key);
  }

  delete_entry(node, key) {
    const keyIdx = node.keys.findIndex((k) => key === k);

    // findIndex() returns -1 if no element matches the predicate
    if (keyIdx < 0) {
      console.log(`Key '${key}' is not present in the tree`);
      return false;
    }

    // delete the key from the node and the child (if one exists)
    node.keys.splice(keyIdx, 1);
    node.children?.splice(keyIdx + 1, 1);

    if (node === this.root) {
      // if the root has only one child, replace it with its child
      if (node.children?.length === 1) {
        this.root = node.children[0];
      }

      return true;
    }

    const MIN_KEYS = node.isLeaf ? this.MIN_LEAF_KEYS : this.MIN_NONLEAF_KEYS;
    const MAX_KEYS = node.isLeaf ? this.MAX_LEAF_KEYS : this.MAX_NONLEAF_KEYS;

    if (node.keys.length >= MIN_KEYS) {
      // the node is not underfull
      return true;
    }

    // the node is underfull
    const { node: parent, idx: childIdx } = this.path.pop();

    let leftChild,
      rightChild,
      inBetweenKey,
      canCoalesce = false;
    if (childIdx > 0) {
      leftChild = parent.children[childIdx - 1];
      inBetweenKey = parent.keys[childIdx - 1];
      rightChild = parent.children[childIdx];

      // check if the node and its left sibling can be coalesced
      canCoalesce = leftChild.keys.length + rightChild.keys.length <= MAX_KEYS;
    }

    if (!canCoalesce && childIdx + 1 < parent.children.length) {
      leftChild = parent.children[childIdx];
      inBetweenKey = parent.keys[childIdx];
      rightChild = parent.children[childIdx + 1];

      // check if the node and its right sibling can be coalesced
      canCoalesce = leftChild.keys.length + rightChild.keys.length <= MAX_KEYS;
    }

    if (canCoalesce) {
      // coalesce the node with a sibling if possible, priotitizing the left one
      if (!leftChild.isLeaf) {
        leftChild.keys.push(inBetweenKey, ...rightChild.keys);
        leftChild.children.push(...rightChild.children);
      } else {
        leftChild.keys.push(...rightChild.keys);
        leftChild.nextLeaf = rightChild.nextLeaf;
      }

      return this.delete_entry(parent, inBetweenKey);
    }

    // coalescing wasn't possible
    if (childIdx > 0) {
      // borrow a key from the left sibling
      const leftSibling = parent.children[childIdx - 1];
      const inBetweenKey = parent.keys[childIdx - 1];

      // rightmost key of left sibling
      const lastSiblingKey = leftSibling.keys.pop();
      parent.keys[childIdx - 1] = lastSiblingKey;

      if (!node.isLeaf) {
        node.keys.unshift(inBetweenKey);

        // rightmost child of left sibling
        const lastSiblingChild = leftSibling.children.pop();
        node.children.unshift(lastSiblingChild);
      } else {
        node.keys.unshift(lastSiblingKey);
      }
    } else {
      // borrow a key from the right sibling
      const inBetweenKey = parent.keys[childIdx];
      const rightSibling = parent.children[childIdx + 1];

      const firstSiblingKey = rightSibling.keys.shift();
      parent.keys[childIdx] = firstSiblingKey;

      if (!node.isLeaf) {
        node.keys.push(inBetweenKey);

        const firstRightChild = rightSibling.children.shift();
        node.children.push(firstRightChild);
      } else {
        node.keys.push(firstSiblingKey);
      }
    }

    // redistribution is always possible
    return true;
  }

  // traverses the tree in-order and returns
  // an array representation of it
  toArray() {
    function aux(node) {
      // if the node is a leaf, return a copy of its keys
      if (node.isLeaf) {
        return [...node.keys];
      }

      // if the node is not a leaf, recurse
      const arr = [];
      for (let i = 0; i < node.children.length; ++i) {
        // first the child
        arr.push(aux(node.children[i]));

        // then the key to the right of the child (if it exists)
        if (node.keys[i]) {
          arr.push(node.keys[i]);
        }
      }

      return arr;
    }

    return aux(this.root);
  }
}
