import BPTree from "./bptree.js";
import { instance } from "./node_modules/@viz-js/viz/lib/viz-standalone.mjs";

// initialize the B+ tree
const DEFAULT_DEGREE = 5;
let tree = new BPTree(DEFAULT_DEGREE);

// initialize Viz.js
const viz = await instance();

// array to hold the history of inserts/deletes/degree changes
// (needed for the 'undo' functionality)
const history = [];

updateViz(tree);

export function setDegree(n_, updateViz_ = true) {
  const n = n_ ?? parseInt(document.getElementById("n").value);

  if (isNaN(n)) {
    document.getElementById("err-msg").innerText =
      "The degree must be an integer.";
    return;
  }

  if (n < 3) {
    document.getElementById("err-msg").innerText =
      "The degree of the tree must be no less than 3.";
    return;
  }

  tree = new BPTree(n);

  if (n_ === undefined) history.push(["degree", n]);
  if (updateViz_) updateViz(tree);
  document.getElementById("err-msg").innerText = "";
}

export function insertKey(key_, updateViz_ = true) {
  const key = key_ ?? getKeyInput();
  if (key === null) return;

  const success = tree.insert(key);
  document.getElementById("key").value = "";

  if (success) {
    if (key_ === undefined) history.push(["insert", key]);
    if (updateViz_) updateViz(tree, key);
    document.getElementById("err-msg").innerText = "";
  } else {
    document.getElementById("err-msg").innerText =
      "The key is already present in the tree.";
  }
}

export function deleteKey(key_, updateViz_ = true) {
  const key = key_ ?? getKeyInput();
  if (key === null) return;

  const success = tree.delete(key);
  document.getElementById("key").value = "";

  if (success) {
    if (key_ === undefined) history.push(["delete", key]);
    if (updateViz_) updateViz(tree, key);
    document.getElementById("err-msg").innerText = "";
  } else {
    document.getElementById("err-msg").innerText =
      "The key is not present in the tree.";
  }
}

export function undo() {
  history.pop(); // remove last action

  // reset the tree and update the visualization only if there
  // are no commands left to execute
  setDegree(DEFAULT_DEGREE, history.length === 0);

  for (const action of history) {
    // only update the visualization on the last command
    const updateViz = action === history[history.length - 1];
    const [command, arg] = action;

    if (command === "insert") insertKey(arg, updateViz);
    else if (command === "delete") deleteKey(arg, updateViz);
    else if (command === "degree") setDegree(arg, updateViz);
    else console.error("Unknown command:", command, arg);
  }
}

export function resetTree(updateViz_ = true) {
  while (history.length > 0) {
    history.pop();
  }

  tree = new BPTree(tree.n);
  if (updateViz_) updateViz(tree);
}

export function randomTree() {
  resetTree(false);

  const totalKeys = randomIntInRange(16, 64);

  const existing = [];
  for (let i = 0; i < totalKeys; ++i) {
    let key;
    do {
      key = randomIntInRange(8, 128);
    } while (existing.includes(key));
    existing.push(key);
    insertKey(key, i === totalKeys - 1);
    history.push(["insert", key]);
  }
}

// for debugging purposes
export function printTree() {
  console.log(JSON.stringify(tree.toArray()));
}

function getKeyInput() {
  const key = parseInt(document.getElementById("key").value);

  if (isNaN(key)) {
    document.getElementById("err-msg").innerText =
      "The key must be an integer.";
    return null;
  }

  return key;
}

function randomIntInRange(min, max) {
  return Math.ceil(Math.random() * (max - min) + min);
}

// visualization-related functions
export function updateViz(tree, key) {
  // remove all children of the visualization element
  const vizElem = document.getElementById("viz");
  while (vizElem.firstChild) {
    vizElem.removeChild(vizElem.firstChild);
  }

  if (tree.isEmpty()) {
    const msg = document.createTextNode("The tree is empty.");
    vizElem.appendChild(msg);
    return;
  }

  const dotScript = generateDotScript(tree, key);
  const svg = viz.renderSVGElement(dotScript);
  svg.style.width = "96%";
  vizElem.appendChild(svg);
}

// taken from https://github.com/roy2220/bptree/blob/master/docs/visualization/main.js
function generateDotScript(tree, newKey) {
  let arrayTree = tree.toArray();
  let nodePathsByLevel = [];
  let previousLeafPath = "";

  function traverseAndGenerateDotScript(node, nodePath, level) {
    // ensure there's an array for the current level
    if (level == nodePathsByLevel.length) {
      nodePathsByLevel.push([]);
    }

    nodePathsByLevel[level].push(nodePath);

    // initialize the list of lines for the current node
    const lines = [];

    // if the node has a parent, add a line connecting the parent to this node
    const parentPathIndex = nodePath.lastIndexOf("_");
    if (parentPathIndex >= 0) {
      lines.push(
        "  " +
          nodePath.substring(0, parentPathIndex) +
          ":c" +
          nodePath.substring(parentPathIndex + 1) +
          " -> " +
          nodePath
      );
    }

    // check if the node is a leaf node (it has no children that are arrays)
    const isLeafNode = node.every((ch) => !(ch instanceof Array));

    // if it's a leaf node, add a line connecting the previous leaf node to this one
    if (isLeafNode) {
      if (previousLeafPath !== "") {
        lines.push("  " + previousLeafPath + " -> " + nodePath);
      }

      previousLeafPath = nodePath;
    }

    // start building the label for the current node
    let nodeLabel = "  " + nodePath + ' [label = "';
    let childIndex = 0;

    for (let element of node) {
      if (element instanceof Array) {
        // if the element is an array, it's a child node
        nodeLabel += "<c" + childIndex.toString() + ">|";
        childIndex++;
      } else {
        // if the element is not an array, it's a key in the node
        // console.log(element, newKey);
        if (isLeafNode && element === newKey) {
          // add a label to the newly inserted key (a text pointing to it)
          lines.push('  new_key [label = "New Key", shape = plaintext]');
          lines.push("  new_key -> " + nodePath + ":nk");
          nodeLabel += "<nk>" + element.toString() + "|";
        } else {
          nodeLabel += element.toString() + "|";
        }
      }
    }

    // remove the trailing '|' and close the label
    nodeLabel = nodeLabel.substring(0, nodeLabel.length - 1);
    nodeLabel += '"]';
    lines.push(nodeLabel);

    // if the node has children, recursively process each child
    if (!isLeafNode) {
      childIndex = 0;

      for (let element of node) {
        if (element instanceof Array) {
          lines.push(
            ...traverseAndGenerateDotScript(
              element,
              nodePath + "_" + childIndex.toString(),
              level + 1
            )
          );

          childIndex++;
        }
      }
    }

    return lines;
  }

  // first line of DOT script
  let lines = ["digraph G {", "  node [shape = record]"];

  // check if the arrayTree has at least one element
  if (arrayTree.length >= 1) {
    // generate DOT script for the arrayTree and append to lines
    lines.push(...traverseAndGenerateDotScript(arrayTree, "n", 0));

    // add lines to ensure nodes at the same level are displayed on the same rank
    for (let nodePathsOfLevel of nodePathsByLevel) {
      lines.push("  { rank = same; " + nodePathsOfLevel.join("; ") + "; }");
    }
  }

  // close the digraph
  lines.push("}");

  // turn the lines into a string and return it
  return lines.join("\n");
}
