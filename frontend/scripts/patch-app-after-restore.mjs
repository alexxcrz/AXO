import fs from "node:fs";

const appPath = "src/App.jsx";
let content = fs.readFileSync(appPath, "utf8");

// Remove unused dashboard imports from utilidades block
const unusedImports = [
  "getDashboardPeriodRange,",
  "getDashboardPeriodKey,",
  "formatDashboardPeriodLabel,",
  "getDashboardFilterStartDate,",
  "getDashboardFilterEndDate,",
  "getIshikawaCategory,",
  "getNormalizedBoardVisibility,",
  "getLivePauseOverflowSeconds,",
];
for (const imp of unusedImports) {
  content = content.replace(new RegExp(`\\n\\s*${imp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"), "\n");
}

// useDashboardMetrics: add selectedHistoryWeekId + destructure activeWeek/historyWeek
if (!content.includes("selectedHistoryWeekId,")) {
  content = content.replace(
    /selectedWeekId,\n(\s*)dashboardFilters,/,
    "selectedWeekId,\n$1selectedHistoryWeekId,\n$1dashboardFilters,",
  );
  content = content.replace(
    /const \{\n(\s*)catalogMap,\n(\s*)userMap,/,
    "const {\n$1catalogMap,\n$2userMap,\n$2activeWeek,\n$2historyWeek,",
  );
}

// Replace paginasContexto object with buildPaginasContexto call
const ctxPath = "src/app/buildPageContext.js";
const ctx = fs.readFileSync(ctxPath, "utf8");
const appKeys = [];
for (const line of ctx.split(/\r?\n/)) {
  const m = line.match(/^\s+([A-Za-z_$][\w$]*):\s+d\.([A-Za-z_$][\w$]*),?\s*$/);
  if (m && m[1] === m[2]) appKeys.push(m[1]);
}
if (ctx.includes("currentInventorySupplyableItems")) appKeys.push("currentInventorySupplyableItems");
const uniqueKeys = [...new Set(appKeys)].sort((a, b) => a.localeCompare(b));

const lines = content.split(/\r?\n/);
const ctxStart = lines.findIndex((l) => l.trim() === "const paginasContexto = {");
if (ctxStart !== -1) {
  const ctxEnd = lines.findIndex((l, i) => {
    if (i <= ctxStart || l.trim() !== "};") return false;
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j += 1) {
      const next = lines[j].trim();
      if (!next) continue;
      return next.includes("Socket.IO");
    }
    return false;
  });
  if (ctxEnd !== -1) {
    const buildCall = [
      "  const paginasContexto = buildPaginasContexto({",
      ...uniqueKeys.map((k) => `    ${k},`),
      "  });",
    ];
    content = [...lines.slice(0, ctxStart), ...buildCall, ...lines.slice(ctxEnd + 1)].join("\n");
    console.log("paginasContexto -> buildPaginasContexto,", uniqueKeys.length, "keys");
  }
}

// Modals -> AppModals if not already
if (!content.includes("<AppModals")) {
  const modalStart = content.split(/\r?\n/).findIndex((l, i) => i > 7000 && l.trim().startsWith("<Modal open={pauseState.open}"));
  const lines2 = content.split(/\r?\n/);
  const mStart = lines2.findIndex((l, i) => i > 7000 && l.trim().startsWith("<Modal open={pauseState.open}"));
  const copmecIdx = lines2.findIndex((l, i) => i > mStart && l.trim().startsWith("<CopmecAIWidget"));
  const chatStart = lines2.findIndex((l) => l.includes("<AlertModalProvider>"));
  const chatEnd = lines2.findIndex(
    (l, i) => i > chatStart && l.trim() === ") : null}" && lines2[i - 1]?.includes("ChatPro"),
  );

  if (mStart !== -1 && copmecIdx !== -1) {
    const modalIds = fs.readFileSync("src/components/AppModals.jsx", "utf8");
    const ctxIds = new Set();
    for (const f of fs.readdirSync("src/components/app-modals")) {
      if (!f.endsWith(".jsx")) continue;
      const body = fs.readFileSync(`src/components/app-modals/${f}`, "utf8");
      const jsxStart = body.indexOf("return (");
      const jsx = body.slice(jsxStart);
      const stripped = jsx.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''");
      const RESERVED = new Set(["const", "let", "var", "function", "return", "if", "else", "for", "while", "true", "false", "null", "undefined"]);
      for (const m of stripped.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
        const id = m[1];
        if (RESERVED.has(id)) continue;
        if (/^[A-Z][A-Z0-9_]+$/.test(id)) ctxIds.add(id);
        else if (/^(set|handle|use|is|can|get|format|create|open|close|submit|update|delete|normalize|apply|build|confirm|remove|toggle|merge|append|load|save|evaluate|Math|Number|String|Boolean|Array|Object|Date|Intl|JSON|clearTimeout|setTimeout)\w*/.test(id)) ctxIds.add(id);
        else if (/Ref$|State$|Modal$|Map$|Options$|Seconds$|Ms$|Id$|Label$|Count$|Key$|Tab$|Form$|Logs$|Rows$|Board$|Item$|Items$|Index$|Type$|Value$|Fields$|Columns$|Draft$|Feedback$|Permissions$|Permission$/.test(id)) ctxIds.add(id);
        else if (/[A-Z]/.test(id)) ctxIds.add(id);
      }
    }
    const modalKeys = [...ctxIds].sort((a, b) => a.localeCompare(b));
    const returnIdx = lines2.findIndex((l, i) => i > 7000 && l.includes("warehouse-app") && lines2[i - 1]?.trim() === "return (");
    const newLines = [
      ...lines2.slice(0, returnIdx),
      "  const appModalContext = {",
      ...modalKeys.map((k) => `    ${k},`),
      "  };",
      "",
      ...lines2.slice(returnIdx, mStart),
      "      <AppModals {...appModalContext} />",
      "",
    ];
    if (chatStart > mStart && chatStart < copmecIdx) {
      newLines.push(...lines2.slice(chatStart, chatEnd + 1));
    }
    newLines.push(...lines2.slice(copmecIdx));
    content = newLines.join("\n");
    console.log("Modals -> AppModals,", modalKeys.length, "context keys");
  }
}

fs.writeFileSync(appPath, content);
console.log("App.jsx size", fs.statSync(appPath).size);
