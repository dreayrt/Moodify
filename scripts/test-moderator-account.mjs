// Execute the real account form handlers with API doubles; never edit a real account.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const code = ts.transpileModule(fs.readFileSync(new URL(
  "../features/dashboard/moderator/components/moderator-account-tab.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const user = { id: 101, fullName: "Moderator", username: "moderator01", email: "moderator@example.test",
  phone: "0901234567", avatarUrl: "/uploads/avatars/original.png", role: "MODERATOR" };
const profile = { ...user, id: "101", staffId: "MOD-101", roleTitle: "Reviewer", department: "Music",
  joinedDate: "01/01/2026", totalReviewed: 0, approvalRate: 100, avgReviewTimeMin: 0 };

function account(apiOverrides = {}) {
  const calls = { updates: [], toasts: [] };
  const api = { getValidAccessToken: async () => "test-token", changePassword: async () => {},
    updateCurrentUserProfile: async () => user, uploadAvatar: async () => user, ...apiOverrides };
  const hooks = [];
  let cursor, effects, dirty, tree;
  const props = { profile, onUpdateProfile(value) { calls.updates.push(value); props.profile = value; },
    onShowToast(message, type) { calls.toasts.push({ message, type }); } };
  const react = {
    useState(initial) {
      const index = cursor++;
      hooks[index] ??= { value: initial };
      return [hooks[index].value, value => {
        hooks[index].value = typeof value === "function" ? value(hooks[index].value) : value;
        dirty = true;
      }];
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (!hooks[index] || dependencies.some((value, i) => !Object.is(value, hooks[index].dependencies[i]))) {
        hooks[index] = { dependencies };
        effects.push(effect);
      }
    },
  };
  const exports = {};
  vm.runInNewContext(code, { exports, Error, require(id) {
    if (id === "react") return react;
    if (id === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (id === "lucide-react") return new Proxy({}, { get: () => () => null });
    if (id === "@/lib/auth/auth-client") return api;
    throw new Error(`Unexpected dependency: ${id}`);
  } });
  function render() {
    let iterations = 0;
    do {
      assert.ok(iterations++ < 5, "effects settle without a render loop");
      dirty = false; cursor = 0; effects = [];
      tree = exports.ModeratorAccountTab(props);
      effects.forEach(effect => effect());
    } while (dirty);
  }
  function nodes(type) {
    const found = [];
    const visit = node => {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node || typeof node !== "object") return;
      if (node.type === type) found.push(node);
      visit(node.props?.children);
    };
    visit(tree); return found;
  }
  function change(input, value) { input.props.onChange({ target: { value } }); render(); }
  function passwords() {
    for (const [index, value] of ["current-password", "new-password", "new-password"].entries()) {
      change(nodes("input").filter(input => input.props.type === "password")[index], value);
    }
  }
  render();
  return { calls, nodes, render, change, passwords, props,
    submitProfile: () => nodes("form")[0].props.onSubmit({ preventDefault() {} }),
    submitPassword: () => nodes("form")[1].props.onSubmit({ preventDefault() {} }) };
}

test("profile save waits for the API and displays the canonical saved data", async () => {
  let finish;
  const sent = [];
  const tab = account({ updateCurrentUserProfile: value => {
    sent.push(value); return new Promise(resolve => { finish = resolve; });
  } });
  tab.change(tab.nodes("input").find(input => input.props.value === "Moderator"), "New name");
  const saving = tab.submitProfile();
  assert.equal(sent[0].fullName, "New name");
  assert.equal(tab.calls.toasts.length, 0);
  assert.equal(tab.calls.updates.length, 0);
  finish({ ...user, fullName: "Canonical server name" });
  await saving;
  tab.render();
  assert.equal(tab.calls.updates[0].fullName, "Canonical server name");
  assert.equal(tab.calls.toasts[0].type, "success");
  assert.ok(tab.nodes("input").some(input => input.props.value === "Canonical server name"));
});

test("failed profile saves never update the parent or show success", async () => {
  const tab = account({ updateCurrentUserProfile: async () => { throw new Error("Số điện thoại đã được sử dụng."); } });
  await tab.submitProfile();
  assert.equal(tab.calls.updates.length, 0);
  assert.deepEqual(tab.calls.toasts, [{ message: "Số điện thoại đã được sử dụng.", type: "error" }]);
});

test("password success waits for the API before clearing password fields", async () => {
  let finish;
  const sent = [];
  const tab = account({ changePassword: (...values) => {
    sent.push(values); return new Promise(resolve => { finish = resolve; });
  } });
  tab.passwords();
  const changing = tab.submitPassword();
  assert.deepEqual(sent, [["current-password", "new-password"]]);
  assert.equal(tab.calls.toasts.length, 0);
  finish(); await changing; tab.render();
  assert.ok(tab.nodes("input").filter(input => input.props.type === "password").every(input => input.props.value === ""));
  assert.equal(tab.calls.toasts[0].type, "success");
});

test("network failure keeps password input and shows a connection error", async () => {
  const tab = account({ changePassword: async () => { throw new Error("Failed to fetch"); } });
  tab.passwords();
  await tab.submitPassword(); tab.render();
  assert.equal(tab.calls.toasts[0].type, "error");
  assert.match(tab.calls.toasts[0].message, /Không nhận được phản hồi từ máy chủ/);
  assert.equal(tab.nodes("input").filter(input => input.props.type === "password")[1].props.value, "new-password");
});

test("avatar upload saves a server URL without discarding unsaved name edits", async () => {
  const sent = [];
  const tab = account({ uploadAvatar: async (...values) => {
    sent.push(values); return { ...user, avatarUrl: "/uploads/avatars/new.png" };
  } });
  tab.change(tab.nodes("input").find(input => input.props.value === "Moderator"), "Unsaved name");
  const file = { type: "image/png", name: "avatar.png" };
  await tab.nodes("input").find(input => input.props.type === "file").props.onChange({ target: { files: [file], value: "avatar.png" } });
  tab.render();
  assert.equal(sent[0][0], "test-token");
  assert.equal(sent[0][1], file);
  assert.equal(tab.calls.updates[0].avatarUrl, "/uploads/avatars/new.png");
  assert.ok(tab.nodes("input").some(input => input.props.value === "Unsaved name"));
});

test("server hydration updates account fields and statistics while identity fields remain read-only", () => {
  const tab = account();
  tab.props.profile = { ...profile, fullName: "Saved name after reload", phone: "", totalReviewed: 42 };
  tab.render();
  assert.ok(tab.nodes("input").some(input => input.props.value === "Saved name after reload"));
  assert.ok(tab.nodes("p").some(node => node.props.children === 42));
  for (const value of [profile.username, profile.email]) {
    assert.equal(tab.nodes("input").find(input => input.props.value === value).props.readOnly, true);
  }
});
