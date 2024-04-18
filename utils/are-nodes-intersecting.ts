import { hasBoundingBox } from "./has-bounding-box";
import { isContainedIn } from "./is-contained-in";

export const areNodesIntersecting = (
  node: SceneNode,
  selectedNode: SceneNode,
): boolean => {
  if (!hasBoundingBox(selectedNode)) return false;

  return (
    hasBoundingBox(node) &&
    isContainedIn(node.absoluteBoundingBox, selectedNode.absoluteBoundingBox) &&
    "visible" in node &&
    node.visible
  );
};
