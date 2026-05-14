(function () {
  const root = document.getElementById("requirement-catalog-root");
  const data = typeof window !== "undefined" ? window.SHIP_REQUIREMENTS : null;
  if (!root || !Array.isArray(data) || data.length === 0) return;

  const CAT_ORDER = [
    "数据治理与安全类",
    "智能系统研发与数据应用类",
    "基础设施建设类",
    "协同与标准类",
    "船员智能培训类",
  ];

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const extra = [];
  const seen = new Set(CAT_ORDER);
  data.forEach((d) => {
    const c = d.category;
    if (c && !seen.has(c)) {
      seen.add(c);
      extra.push(c);
    }
  });
  extra.sort((a, b) => a.localeCompare(b, "zh-CN"));
  const categories = [...CAT_ORDER.filter((c) => data.some((d) => d.category === c)), ...extra];

  /** @type {{ cat: string, rows: typeof data, idx: number }[]} */
  const blocks = [];
  categories.forEach((cat, idx) => {
    const rows = data.filter((d) => d.category === cat);
    if (rows.length > 0) blocks.push({ cat, rows, idx: blocks.length });
  });
  if (blocks.length === 0) return;

  root.innerHTML = "";

  const hint = document.createElement("p");
  hint.className = "req-catalog-lead";
  hint.textContent = "按业务分类查看需求说明。";
  root.appendChild(hint);

  const shell = document.createElement("div");
  shell.className = "req-shell";

  const rail = document.createElement("div");
  rail.className = "req-tab-rail";

  const scroll = document.createElement("div");
  scroll.className = "req-tab-scroll";
  const tabList = document.createElement("div");
  tabList.className = "req-tab-list";
  tabList.setAttribute("role", "tablist");
  tabList.setAttribute("aria-label", "业务分类");

  const stage = document.createElement("div");
  stage.className = "req-stage";

  let active = 0;

  function buildPanel(b, i) {
    const panel = document.createElement("section");
    panel.className = "req-tabpanel";
    panel.id = "req-panel-" + i;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", "req-tab-" + i);
    if (i !== 0) panel.hidden = true;

    if (b.cat === "智能系统研发与数据应用类") {
      panel.classList.add("req-panel-wide-theme");
    }

    const head = document.createElement("header");
    head.className = "req-cat-head";
    head.innerHTML =
      "<h3 class='req-cat-title' id='req-tab-heading-" +
      i +
      "'>" +
      esc(b.cat) +
      "</h3><p class='req-cat-meta'>本类 <strong>" +
      b.rows.length +
      "</strong> 条</p>";

    const tableWrap = document.createElement("div");
    tableWrap.className = "req-block-scroll";
    const table = document.createElement("table");
    table.className = "req-block-table";
    table.innerHTML =
      "<thead><tr><th scope='col' class='col-no'>序号</th><th scope='col' class='col-theme'>需求主题</th><th scope='col' class='col-sub'>子类 / 维度</th><th scope='col' class='col-detail'>需求说明</th></tr></thead><tbody></tbody>";
    const tbody = table.querySelector("tbody");
    b.rows.forEach((d, j) => {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td class='col-no'>" +
        (j + 1) +
        "</td><td class='col-theme'>" +
        esc(d.theme) +
        "</td><td class='col-sub'>" +
        esc(d.sub || "—") +
        "</td><td class='col-detail'>" +
        esc(d.detail) +
        "</td>";
      tbody.appendChild(tr);
    });
    tableWrap.appendChild(table);
    panel.appendChild(head);
    panel.appendChild(tableWrap);
    return panel;
  }

  const tabs = [];
  blocks.forEach((b, i) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "req-tab" + (i === 0 ? " is-active" : "");
    tab.id = "req-tab-" + i;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", i === 0 ? "true" : "false");
    tab.setAttribute("aria-controls", "req-panel-" + i);
    tab.setAttribute("tabindex", i === 0 ? "0" : "-1");
    tab.textContent = b.cat + " · " + b.rows.length;
    tab.addEventListener("click", () => setActive(i));
    tab.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setActive(i + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActive(i - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        setActive(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActive(blocks.length - 1);
      }
    });
    tabs.push(tab);
    tabList.appendChild(tab);
    stage.appendChild(buildPanel(b, i));
  });

  const panels = Array.from(stage.querySelectorAll(".req-tabpanel"));

  function setActive(i) {
    const n = blocks.length;
    active = ((i % n) + n) % n;
    tabs.forEach((t, j) => {
      const on = j === active;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.setAttribute("tabindex", on ? "0" : "-1");
    });
    panels.forEach((p, j) => {
      p.hidden = j !== active;
    });
    tabs[active].focus({ preventScroll: true });
    tabs[active].scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }

  scroll.appendChild(tabList);
  rail.appendChild(scroll);
  shell.appendChild(rail);
  shell.appendChild(stage);
  root.appendChild(shell);
})();
