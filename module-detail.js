(function () {
  const data = typeof window !== "undefined" ? window.SHIP_MODULE_DETAIL : null;
  if (!data) return;

  function norm(s) {
    return String(s ?? "").trim();
  }

  function stripLineNumbering(line) {
    let t = line.replace(/^\uFEFF/, "").trim();
    for (let i = 0; i < 14 && t.length; i++) {
      const prev = t;
      t = t
        .replace(/^\s*\d{1,3}[.．]\s+/, "")
        .replace(/^\s*\d{1,3}[.．](?=[\u4e00-\u9fff])/, "")
        .replace(/^\s*\d{1,3}(?:[ \t\u00a0\u3000])+/, "")
        .replace(/^\s*[\uFF10-\uFF19]{1,3}(?:[ \t\u00a0\u3000])+/, "")
        .replace(/^\s*\d{1,2}\.\d{1,2}[.．]?\s+/, "")
        .replace(/^\s*\d{1,2}\.\d{1,2}[.．]?(?=[\u4e00-\u9fff])/, "")
        .replace(/^\s*\d{1,3}、\s*/, "")
        .replace(/^\s*\d+\.\d+\.?\s*/, "")
        .replace(/^\s*[（(]\s*\d{1,3}\s*[）)]\s*/, "")
        .replace(/^\s*[（(][一二三四五六七八九十百千]+[）)]\s*/, "")
        .replace(/^\s*[①②③④⑤⑥⑦⑧⑨⑩]\s*/, "")
        .replace(/^\s*[一二三四五六七八九十]+[、．]\s*/, "")
        .replace(/^\s*第[一二三四五六七八九十\d]+章[、．。\s]*/, "")
        .replace(/^\s*[（(]第[一二三四五六七八九十\d]+[章节条][）)]\s*/, "")
        .trim();
      if (t === prev) break;
    }
    return t;
  }

  function splitToItems(raw) {
    const s0 = norm(raw);
    if (!s0) return [];
    const normalized = s0.replace(/\r\n/g, "\n");
    let parts = normalized
      .split(/\n+/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (parts.length === 1 && /[；;]/.test(parts[0]) && parts[0].length > 35) {
      parts = parts[0]
        .split(/[；;]+/)
        .map((x) => x.trim())
        .filter((x) => x.length >= 2);
    }
    const out = [];
    for (const p of parts) {
      const c = stripLineNumbering(p);
      if (c.length >= 2) out.push(c);
    }
    return out;
  }

  function dedupeOrdered(items) {
    const seen = new Set();
    const out = [];
    for (const x of items) {
      const k = x.replace(/\s+/g, " ");
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(x);
    }
    return out;
  }

  function aggregateField(rows, key) {
    const acc = [];
    rows.forEach((r) => {
      splitToItems(r[key]).forEach((t) => acc.push(t));
    });
    return dedupeOrdered(acc);
  }

  const CATEGORIES = [
    ["req", "需求点"],
    ["core", "需求核心技术"],
    ["problem", "解决的核心问题"],
    ["func", "功能分解"],
    ["devices", "关键设备"],
    ["tech", "关键技术"],
    ["approach", "实现途径"],
    ["resources", "现有资源"],
    ["people_need", "人员队伍需求"],
    ["people_now", "现有人员能力"],
    ["group", "集团协同"],
  ];

  const DIM_LABEL = Object.fromEntries(CATEGORIES);
  function catTitle(key) {
    return DIM_LABEL[key] || key;
  }

  /** 04 自主航行：第一级 Tab 与《一张图内容规划（0514）》能力线对齐（不按原 maj 分栏） */
  const AUTONOMY_PILLARS = [
    "航行环境全域数据采集",
    "多源感知数据融合与置信度评估",
    "全局航迹智能规划",
    "局部动态避碰规划",
    "航迹精准跟踪与协同控制",
  ];

  function stripLeadingProblemNum(s) {
    return norm(s).replace(/^\d+\.\d+\s*/, "").trim();
  }

  function autonomyPillarForRow(r) {
    const probTail = stripLeadingProblemNum(r.problem);
    for (const p of AUTONOMY_PILLARS) {
      if (probTail === p || probTail.startsWith(p)) return p;
    }
    const f = norm(r.func);
    const fm = f.match(/^(\d+)\.(\d+)\.\d+/);
    if (fm) {
      const a = fm[1];
      const b = fm[2];
      if (a === "1" && b === "1") return AUTONOMY_PILLARS[0];
      if (a === "1" && b === "2") return AUTONOMY_PILLARS[1];
      if (a === "2" && b === "1") return AUTONOMY_PILLARS[2];
      if (a === "2" && b === "2") return AUTONOMY_PILLARS[3];
      if (a === "2" && b === "3") return AUTONOMY_PILLARS[4];
    }
    const req = norm(r.req);
    if (!f && /多源|融合|孪生|协同处理/.test(req)) return AUTONOMY_PILLARS[1];
    if (!f && !probTail && /海图|数据库|S-100|IHO/.test(req)) return AUTONOMY_PILLARS[0];
    return AUTONOMY_PILLARS[0];
  }

  document.querySelectorAll("[data-module-detail]").forEach((root) => {
    const key = root.getAttribute("data-module-detail");
    const rows = data[key];
    if (!Array.isArray(rows) || rows.length === 0) {
      root.remove();
      return;
    }

    let majBlocks;
    if (key === "autonomy") {
      const buckets = new Map(AUTONOMY_PILLARS.map((p) => [p, []]));
      rows.forEach((r) => {
        const pillar = autonomyPillarForRow(r);
        buckets.get(pillar).push(r);
      });
      majBlocks = AUTONOMY_PILLARS.map((name) => {
        const list = buckets.get(name) || [];
        const dims = {};
        CATEGORIES.forEach(([fieldKey]) => {
          dims[fieldKey] = aggregateField(list, fieldKey);
        });
        return { name, list, dims };
      }).filter((b) => b.list.length > 0);
    } else {
      const byMaj = new Map();
      rows.forEach((r) => {
        const m = norm(r.maj) || "其他";
        if (!byMaj.has(m)) byMaj.set(m, []);
        byMaj.get(m).push(r);
      });
      majBlocks = Array.from(byMaj.entries()).map(([name, list]) => {
        const dims = {};
        CATEGORIES.forEach(([fieldKey]) => {
          dims[fieldKey] = aggregateField(list, fieldKey);
        });
        return { name, list, dims };
      });
    }

    function firstNonEmptyDimKey(dims) {
      for (const [fieldKey] of CATEGORIES) {
        if (dims[fieldKey].length) return fieldKey;
      }
      return CATEGORIES[0][0];
    }

    let majIndex = 0;
    let dimKey = firstNonEmptyDimKey(majBlocks[0].dims);

    const shell = document.createElement("div");
    shell.className = "md-shell";

    const railMaj = document.createElement("div");
    railMaj.className = "md-rail md-rail-maj";
    railMaj.setAttribute("role", "tablist");
    railMaj.setAttribute(
      "aria-label",
      key === "autonomy" ? "自主航行能力分层（内容规划 0514）" : "需求大类"
    );

    const railDim = document.createElement("div");
    railDim.className = "md-rail md-rail-dim";
    railDim.setAttribute("role", "tablist");
    railDim.setAttribute("aria-label", "信息维度");

    const panel = document.createElement("div");
    panel.className = "md-panel";
    panel.setAttribute("role", "tabpanel");

    const meta = document.createElement("p");
    meta.className = "md-panel-meta";
    panel.appendChild(meta);

    const listHost = document.createElement("div");
    listHost.className = "md-panel-list-host";
    panel.appendChild(listHost);

    function scrollRailActive(rail, selector) {
      const el = rail.querySelector(selector);
      if (el) {
        try {
          el.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
        } catch (e) {
          el.scrollIntoView();
        }
      }
    }

    function syncMajTabs() {
      railMaj.textContent = "";
      if (majBlocks.length <= 1) {
        railMaj.classList.add("md-rail-maj-single");
        const lab = document.createElement("div");
        lab.className = "md-maj-single-label";
        lab.textContent = majBlocks[0].name;
        railMaj.appendChild(lab);
        return;
      }
      railMaj.classList.remove("md-rail-maj-single");
      majBlocks.forEach((b, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "md-tab md-tab-maj";
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-selected", i === majIndex ? "true" : "false");
        btn.textContent = b.name;
        btn.addEventListener("click", () => {
          majIndex = i;
          dimKey = firstNonEmptyDimKey(majBlocks[majIndex].dims);
          syncMajTabs();
          syncDimTabs();
          renderPanel();
        });
        railMaj.appendChild(btn);
      });
      scrollRailActive(railMaj, ".md-tab-maj[aria-selected='true']");
    }

    function syncDimTabs() {
      railDim.textContent = "";
      const dims = majBlocks[majIndex].dims;
      CATEGORIES.forEach(([fieldKey, title]) => {
        const n = dims[fieldKey].length;
        if (!n) return;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "md-tab md-tab-dim";
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-selected", fieldKey === dimKey ? "true" : "false");
        btn.dataset.dim = fieldKey;
        btn.innerHTML =
          "<span class='md-tab-dim-title'>" +
          title +
          "</span><span class='md-tab-count'>" +
          n +
          "</span>";
        btn.addEventListener("click", () => {
          dimKey = fieldKey;
          syncDimTabs();
          renderPanel();
        });
        railDim.appendChild(btn);
      });
      if (!railDim.firstChild) {
        const span = document.createElement("span");
        span.className = "md-rail-empty";
        span.textContent = "本大类下暂无可切换的维度摘录。";
        railDim.appendChild(span);
      }
      scrollRailActive(railDim, ".md-tab-dim[aria-selected='true']");
    }

    function renderPanel() {
      const dims = majBlocks[majIndex].dims;
      const items = dims[dimKey] || [];
      const title = catTitle(dimKey);

      listHost.textContent = "";
      meta.textContent =
        majBlocks.length > 1
          ? "「" + majBlocks[majIndex].name + "」· " + title + " · 共 " + items.length + " 条"
          : title + " · 共 " + items.length + " 条";

      if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "md-panel-empty";
        empty.textContent = "当前维度暂无摘录条目。";
        listHost.appendChild(empty);
        return;
      }

      const ol = document.createElement("ol");
      ol.className = "md-panel-items";
      items.forEach((text) => {
        const li = document.createElement("li");
        const cleaned = stripLineNumbering(text);
        li.textContent = cleaned.length >= 2 ? cleaned : text;
        ol.appendChild(li);
      });
      listHost.appendChild(ol);
    }

    syncMajTabs();
    syncDimTabs();
    renderPanel();

    root.textContent = "";
    root.appendChild(shell);
    shell.appendChild(railMaj);
    shell.appendChild(railDim);
    shell.appendChild(panel);
  });
})();
