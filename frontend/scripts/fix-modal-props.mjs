import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const modalsDir = path.join(root, "components", "app-modals");
const appPath = path.join(root, "App.jsx");

const RESERVED = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while", "do", "switch", "case",
  "break", "continue", "new", "typeof", "instanceof", "in", "of", "try", "catch", "finally", "throw",
  "async", "await", "import", "export", "default", "from", "class", "extends", "super", "this",
  "true", "false", "null", "undefined", "void", "delete", "yield", "static", "get", "set",
]);

const JSX_KEYWORDS = new Set([
  "className", "type", "value", "key", "style", "role", "aria", "open", "title", "confirmLabel",
  "cancelLabel", "onClose", "onConfirm", "onChange", "onClick", "placeholder", "disabled", "readOnly",
  "hideCancel", "confirmDisabled", "backdropClassName", "mode", "draft", "catalog", "inventoryItems",
  "visibleUsers", "sectionOptions", "activityCategoryOptions", "contextoConstructor", "currentUser",
  "passwordForm", "onPasswordChange", "onSubmit", "onUpdateIdentity", "currentTheme", "themeOptions",
  "onThemeChange", "currentFont", "fontOptions", "onFontChange", "currentFontSize", "fontSizeOptions",
  "onFontSizeChange", "onLogout", "socket", "user", "connectCount", "children", "htmlFor", "id", "name",
]);

const COMPONENTS = new Set([
  "Modal", "BoardBuilderModal", "BoardComponentStudioModal", "EmployeeProfileModal",
  "ForcedPasswordChangeModal", "InventoryActivityConsumptionEditor", "InventoryLookupInput",
  "Eye", "EyeOff", "Trash2",
]);

function isLikelyCodeIdentifier(id) {
  if (RESERVED.has(id) || JSX_KEYWORDS.has(id) || COMPONENTS.has(id)) return false;
  if (/^[A-Z][A-Z0-9_]+$/.test(id)) return true;
  if (/^(set|handle|use|is|can|get|format|create|open|close|submit|update|delete|normalize|apply|build|confirm|remove|toggle|read|write|parse|serialize|merge|append|load|save|evaluate|infer|with|make|find|sort|filter|map|reduce|Math|Number|String|Boolean|Array|Object|Date|Intl|JSON|console|globalThis|document|window|clearTimeout|setTimeout)\w*/.test(id)) return true;
  if (/Ref$|State$|Modal$|Map$|Options$|Seconds$|Ms$|Id$|Label$|Count$|Key$|Tab$|Form$|Logs$|Rows$|Board$|Item$|Items$|Index$|Type$|Value$|Values$|Fields$|Columns$|Draft$|Feedback$|Permissions$|Permission$/.test(id)) return true;
  if (/[A-Z]/.test(id)) return true;
  return false;
}

function extractCodeIdentifiers(jsx) {
  const stripped = jsx
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``");
  const matches = stripped.match(/\b[A-Za-z_$][\w$]*\b/g) || [];
  return [...new Set(matches)].filter(isLikelyCodeIdentifier).sort((a, b) => a.localeCompare(b));
}

const allProps = new Set();

for (const file of fs.readdirSync(modalsDir).filter((f) => f.endsWith(".jsx"))) {
  const content = fs.readFileSync(path.join(modalsDir, file), "utf8");
  const jsxStart = content.indexOf("return (");
  const jsxEnd = content.lastIndexOf("  );");
  const jsx = content.slice(jsxStart, jsxEnd);
  const props = extractCodeIdentifiers(jsx);
  props.forEach((p) => allProps.add(p));

  const name = path.basename(file, ".jsx");
  const propsDestruct = props.map((p) => `  ${p},`).join("\n");
  const importsEnd = content.indexOf("export function");
  const imports = content.slice(0, importsEnd).trim();

  const newContent = `${imports}

/** Modales extraidos de App.jsx � ${name} */
export function ${name}(props) {
  const {
${propsDestruct}
  } = props;

  return (
    <>
${jsx.replace(/^    /gm, "    ").trimStart()}
    </>
  );
}
`;

  fs.writeFileSync(path.join(modalsDir, file), newContent);
  console.log(`${name}: ${props.length} props`);
}

// Fix App.jsx � remove broken appModalContext inside return
let appLines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);
const ctxStart = appLines.findIndex((l) => l.trim() === "const appModalContext = {");
const returnBeforeCtx = appLines.findIndex((l, i) => i < ctxStart && l.trim() === "return (");
const mainStart = appLines.findIndex((l, i) => i > ctxStart && l.trim().startsWith("<main className="));

if (ctxStart === -1 || mainStart === -1) {
  console.error("App.jsx markers missing", { ctxStart, mainStart });
  process.exit(1);
}

const ctxEnd = appLines.findIndex((l, i) => i > ctxStart && i < mainStart && l.trim() === "};");

const sortedProps = [...allProps].sort((a, b) => a.localeCompare(b));
const ctxBlock = [
  "  const appModalContext = {",
  ...sortedProps.map((p) => `    ${p},`),
  "  };",
  "",
];

const fixed = [
  ...appLines.slice(0, returnBeforeCtx),
  ...ctxBlock,
  "  return (",
  ...appLines.slice(mainStart),
];

fs.writeFileSync(appPath, fixed.join("\n"));

// Regenerate aggregator
const names = fs.readdirSync(modalsDir).filter((f) => f.endsWith(".jsx")).map((f) => path.basename(f, ".jsx"));
const aggregatorImports = names.map((n) => `import { ${n} } from "./app-modals/${n}.jsx";`).join("\n");
const aggregatorBody = names.map((n) => `      <${n} {...props} />`).join("\n");

fs.writeFileSync(
  path.join(root, "components", "AppModals.jsx"),
  `${aggregatorImports}

export function AppModals(props) {
  return (
    <>
${aggregatorBody}
    </>
  );
}
`,
);

console.log("App.jsx fixed. Total props:", sortedProps.length);
