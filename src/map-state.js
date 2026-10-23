// Pure helpers for applying local map edits and keeping them visible during sync.
export function applyMapChange(maps, mapId, change) {
  const index = maps.findIndex((map) => map.id === mapId);
  if (index < 0) return null;
  const [nextMap, patch] = change(maps[index]);
  const nextMaps = [...maps];
  nextMaps[index] = nextMap;
  return { maps: nextMaps, patch };
}

export function editMapTree(map, updater) {
  const tree = typeof updater === "function" ? updater(map.tree) : updater;
  const name = tree.text !== map.tree.text ? tree.text : map.name;
  return [{ ...map, name, tree }, { name, tree }];
}

export function editMapDetails(map, changes) {
  const nameChanged = Object.prototype.hasOwnProperty.call(changes, "name");
  const { name: nextName, ...treeChanges } = changes;
  const name = nameChanged ? nextName : map.name;
  const tree = { ...map.tree, ...treeChanges,
    ...(nameChanged ? { text: name } : {}) };
  return [{ ...map, name, tree }, { name, tree }];
}

export function overlayMapSnapshot(id, data, pending, inFlight, defaultTree, fallbackName = "") {
  const name = pending?.name ?? inFlight?.name ?? data.name ?? fallbackName;
  return {
    id,
    name,
    tree: pending?.tree ?? inFlight?.tree ?? data.tree ?? defaultTree(name),
  };
}

export function isMapWriteAcknowledged(data, hasPendingWrites, writing) {
  return !!writing && !hasPendingWrites && data.clientWriteId === writing.writeId;
}
