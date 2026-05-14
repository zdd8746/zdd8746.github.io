(function () {
  const root = document.getElementById("research-plan-root");
  const data = typeof window !== "undefined" ? window.SHIP_CONTENT_PLAN_RESEARCH : null;
  if (!root || !Array.isArray(data) || data.length === 0) {
    if (root) {
      root.innerHTML =
        "<p class='research-fallback'>科研条目数据未加载，请确认已引入 content-plan-research.js。</p>";
    }
    return;
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function norm(s) {
    return String(s ?? "").trim();
  }

  /**
   * 与《0.一张图内容规划（0514）》科研 sheet 列 C「需求落地系统」
   * 自上而下首次出现的顺序一致（空单元格沿用上一非空值，与 Excel 一致）。
   */
  const RESEARCH_SYS_TAB_ORDER = [
    "科研：自主航行/远程驾控系统",
    "特性技术研究",
    "MASS全流程测试验证系统",
    "智能运维",
    "智能船舶行业标准与 IMO MASS CODE 体系",
    "国际规则落地适配",
    "科研项目协同与成果全生命周期管理",
  ];

  // 按列 C 有效值分组（空 sys 继承上一条，与表内合并单元格逻辑一致）
  let carrySys = "";
  const groupMap = {};
  data.forEach((row) => {
    const s = norm(row.sys);
    if (s) carrySys = s;
    const key = carrySys || "其他";
    if (!groupMap[key]) groupMap[key] = [];
    groupMap[key].push(row);
  });

  const groups = [];
  RESEARCH_SYS_TAB_ORDER.forEach((k) => {
    if (groupMap[k] && groupMap[k].length) groups.push(k);
  });
  Object.keys(groupMap).forEach((k) => {
    if (!RESEARCH_SYS_TAB_ORDER.includes(k) && groupMap[k].length) groups.push(k);
  });

  root.innerHTML = "";

  // Tab rail
  const rail = document.createElement("div");
  rail.className = "req-tab-rail research-tab-rail";
  rail.setAttribute("role", "tablist");
  rail.setAttribute("aria-label", "科研攻关·需求落地系统");

  const scrollWrap = document.createElement("div");
  scrollWrap.className = "req-tab-scroll";
  const tabList = document.createElement("div");
  tabList.className = "req-tab-list";
  scrollWrap.appendChild(tabList);
  rail.appendChild(scrollWrap);
  root.appendChild(rail);

  // Tab panels container
  const stage = document.createElement("div");
  stage.className = "req-stage";
  root.appendChild(stage);

  function renderCard(row, idx) {
    const n = idx + 1;
    const art = document.createElement("article");
    art.className = "research-deep-card";
    art.setAttribute("aria-labelledby", "rt-title-" + idx);

    const sysLine = norm(row.sys)
      ? "<p class='research-sys'>" + esc(norm(row.sys)) + "</p>"
      : "";

    const impl = norm(row.impl_subject)
      ? "<section class='research-sec research-impl'><h4>实施主体与自研 / 合作属性</h4><p class='research-pre'>" +
        esc(norm(row.impl_subject)) +
        "</p></section>"
      : "";

    const gap =
      norm(row.people_need) || norm(row.people_now)
        ? "<section class='research-sec research-gap'><h4>人员能力：需求与现有</h4><div class='research-gap-grid'>" +
          "<div><span class='research-subhd'>能力需求</span><p class='research-pre'>" +
          esc(norm(row.people_need) || "—") +
          "</p></div>" +
          "<div><span class='research-subhd'>现有情况</span><p class='research-pre'>" +
          esc(norm(row.people_now) || "—") +
          "</p></div></div></section>"
        : "";

    art.innerHTML =
      "<header class='research-deep-head'>" +
      "<span class='research-num' aria-hidden='true'>R" +
      String(n).padStart(2, "0") +
      "</span>" +
      "<p class='research-cat'>" +
      esc(norm(row.maj) || "—") +
      "</p>" +
      "<h3 id='rt-title-" +
      idx +
      "'>" +
      esc(norm(row.core_tech) || "科研条目") +
      "</h3>" +
      "<p class='research-sub'>" +
      esc(norm(row.req_point) || "") +
      "</p>" +
      sysLine +
      "</header>" +
      "<div class='research-body'>" +
      "<section class='research-sec'><h4>攻关目标与待解决问题</h4><p class='research-pre'>" +
      esc(norm(row.problem)) +
      "</p></section>" +
      "<section class='research-sec'><h4>任务 / 功能分解</h4><p class='research-pre'>" +
      esc(norm(row.func_tree)) +
      "</p></section>" +
      "<section class='research-sec research-sol'><h4>技术实现途径</h4><p class='research-pre'>" +
      esc(norm(row.approach)) +
      "</p></section>" +
      "<section class='research-sec'><h4>关键设备</h4><p class='research-pre'>" +
      esc(norm(row.devices)) +
      "</p></section>" +
      "<section class='research-sec'><h4>关键技术清单</h4><p class='research-pre'>" +
      esc(norm(row.key_tech)) +
      "</p></section>" +
      impl +
      "<section class='research-sec'><h4>现有内外部资源</h4><p class='research-pre'>" +
      esc(norm(row.resources_now)) +
      "</p></section>" +
      gap +
      "<section class='research-sec'><h4>集团协同需求</h4><p class='research-pre'>" +
      esc(norm(row.group_sync)) +
      "</p></section>" +
      "</div>";

    return art;
  }

  // Build tabs & panels
  const panels = [];
  let globalIdx = 0;

  groups.forEach((key, gi) => {
    const rows = groupMap[key];

    // Tab button
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "req-tab" + (gi === 0 ? " is-active" : "");
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", gi === 0 ? "true" : "false");
    btn.setAttribute("aria-controls", "rt-panel-" + gi);
    btn.id = "rt-tab-" + gi;
    btn.textContent = key;
    btn.title = key;
    btn.setAttribute("aria-label", key + "，共 " + rows.length + " 条课题");

    tabList.appendChild(btn);

    // Panel
    const panel = document.createElement("div");
    panel.className = "req-tabpanel research-tabpanel" + (gi === 0 ? "" : " is-hidden");
    panel.id = "rt-panel-" + gi;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", "rt-tab-" + gi);

    // cards grid inside panel
    const grid = document.createElement("div");
    grid.className = "research-cards-grid";
    rows.forEach((row) => {
      grid.appendChild(renderCard(row, globalIdx++));
    });
    panel.appendChild(grid);
    stage.appendChild(panel);
    panels.push(panel);

    btn.addEventListener("click", () => {
      // update tabs
      tabList.querySelectorAll(".req-tab").forEach((t, ti) => {
        const active = ti === gi;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });
      // update panels
      panels.forEach((p, pi) => {
        p.classList.toggle("is-hidden", pi !== gi);
      });
      // scroll tab into view
      btn.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    });
  });
})();
