import test from "node:test";
import assert from "node:assert/strict";
import { collectByDeadline, collectMapDetailsChanges, toLocalInput } from "../src/utils.js";
import { scheduleReminder, cancelReminder } from "../src/notifications.js";
import { applyMapChange, editMapTree, editMapDetails, overlayMapSnapshot, isMapWriteAcknowledged } from "../src/map-state.js";

test("rapid edits to different fields keep the complete latest tree", () => {
  const initial = [{ id: "project", name: "Project", tree: { id: "root", text: "Project", description: "" } }];
  const titleEdit = applyMapChange(initial, "project", map => {
    const tree = { ...map.tree, text: "Complete title" };
    return [{ ...map, tree }, { tree }];
  });
  const descriptionEdit = applyMapChange(titleEdit.maps, "project", map => {
    const tree = { ...map.tree, description: "Complete description" };
    return [{ ...map, tree }, { tree }];
  });
  assert.equal(descriptionEdit.maps[0].tree.text, "Complete title");
  assert.equal(descriptionEdit.maps[0].tree.description, "Complete description");
  assert.equal(initial[0].tree.text, "Project");
});

test("editing the root title also updates the project name", () => {
  const map = { id: "project", name: "Old", tree: { id: "root", text: "Old", children: [] } };
  const [changed, patch] = editMapTree(map, tree => ({ ...tree, text: "New project name" }));
  assert.equal(changed.name, "New project name");
  assert.equal(patch.name, "New project name");
  assert.equal(patch.tree.text, "New project name");
});

test("saving a title preserves the exact text", () => {
  const map = { id: "project", name: "Old", tree: { id: "root", text: "Old" } };
  const [changed] = editMapTree(map, tree => ({ ...tree, text: "  Full title  " }));
  assert.equal(changed.name, "  Full title  ");
  assert.equal(changed.tree.text, "  Full title  ");
});

test("editing one project field preserves newer values in the others", () => {
  const current = { id: "project", name: "Current", tree: {
    id: "root", text: "Current", description: "Newer description", deadline: "2026-10-23T12:34:56.000Z",
  } };
  const [changed] = editMapDetails(current, { name: "Renamed" });
  assert.equal(changed.name, "Renamed");
  assert.equal(changed.tree.text, "Renamed");
  assert.equal(changed.tree.description, "Newer description");
  assert.equal(changed.tree.deadline, "2026-10-23T12:34:56.000Z");
});

test("saving a project without changing its deadline keeps its seconds", () => {
  const original = { name: "Old", description: "", deadline: "2026-10-23T12:34:56.000Z", priority: null, colorIdx: 0 };
  const changes = collectMapDetailsChanges(original, {
    name: "New", description: "", deadline: toLocalInput(original.deadline), priority: null, colorIdx: 0,
  });
  assert.deepEqual(changes, { name: "New" });
});

test("a stale cloud snapshot cannot cut back queued or in-flight text", () => {
  const old = { name: "Old", tree: { text: "Old", description: "Old" } };
  const writing = { name: "Writing", tree: { text: "Writing", description: "Old" } };
  const latest = { tree: { text: "Writing", description: "Full new description" } };
  const merged = overlayMapSnapshot("project", old, latest, writing, () => null);
  assert.equal(merged.name, "Writing");
  assert.deepEqual(merged.tree, latest.tree);
  assert.deepEqual(overlayMapSnapshot("project", old, null, writing, () => null).tree, writing.tree);
});

test("a write stays protected until its own server acknowledgement", () => {
  const writing = { writeId: "edit-2" };
  assert.equal(isMapWriteAcknowledged({ clientWriteId: "edit-1" }, false, writing), false);
  assert.equal(isMapWriteAcknowledged({ clientWriteId: "edit-2" }, true, writing), false);
  assert.equal(isMapWriteAcknowledged({ clientWriteId: "edit-2" }, false, writing), true);
});

test("tasks due earlier today appear as overdue", () => {
  const now = new Date(2026, 9, 23, 12, 0);
  const maps = [{
    id: "project",
    name: "Project",
    tree: {
      id: "root",
      children: [
        { id: "past", text: "Past", deadline: new Date(2026, 9, 23, 10, 0).toISOString(), children: [] },
        { id: "next", text: "Next", deadline: new Date(2026, 9, 23, 14, 0).toISOString(), children: [] },
      ],
    },
  }];

  const tasks = collectByDeadline(maps, now);
  assert.deepEqual(tasks.map(({ id, bucket }) => [id, bucket]), [
    ["past", "overdue"],
    ["next", "today"],
  ]);
});

test("moving a web reminder beyond the timer limit cancels its old timer", async () => {
  const originalWindow = globalThis.window;
  const originalNotification = globalThis.Notification;
  let displayed = 0;
  class FakeNotification {
    static permission = "granted";
    constructor() { displayed++; }
  }
  globalThis.window = { Notification: FakeNotification };
  globalThis.Notification = FakeNotification;
  const taskId = "rescheduled-reminder-test";

  try {
    await scheduleReminder({ taskId, title: "Old", fireAt: new Date(Date.now() + 40) });
    await scheduleReminder({ taskId, title: "New", fireAt: new Date(Date.now() + 0x7fffffff + 60_000) });
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(displayed, 0);
  } finally {
    await cancelReminder(taskId);
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalNotification === undefined) delete globalThis.Notification;
    else globalThis.Notification = originalNotification;
  }
});
