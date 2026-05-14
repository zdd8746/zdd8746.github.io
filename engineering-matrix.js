(function () {
  const root = document.getElementById("engineering-matrix-root");
  const data = typeof window !== "undefined" ? window.SHIP_CONTENT_PLAN_ENGINEERING : null;
  if (!root || !Array.isArray(data) || data.length === 0) return;

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function norm(s) {
    return String(s ?? "")
      .replace(/\r\n/g, "\n")
      .replace(/\s+\n/g, "\n")
      .trim();
  }

  function preview(s, n) {
    const t = norm(s).replace(/\n+/g, " ");
    if (t.length <= n) return t;
    return t.slice(0, n) + "…";
  }

  const categories = [];
  const seenCat = new Set();
  data.forEach((r) => {
    const m = r.maj || "（未分类）";
    if (!seenCat.has(m)) {
      seenCat.add(m);
      categories.push(m);
    }
  });

  const blocks = categories.map((cat) => ({
    cat,
    rows: data.filter((r) => (r.maj || "（未分类）") === cat),
  }));

  root.innerHTML = "";

  const legend = document.createElement("div");
  legend.className = "plan-legend";
  legend.innerHTML =
    "<div class='plan-legend-inner'>" +
    "<span class='plan-legend-tag plan-legend-req'>需求</span><span>调研点 · 待解决问题</span>" +
    "<span class='plan-legend-tag plan-legend-now'>现状</span><span>资源与已有能力</span>" +
    "<span class='plan-legend-tag plan-legend-gap'>差距</span><span>人员能力需求对照</span>" +
    "<span class='plan-legend-tag plan-legend-sol'>方案</span><span>技术路径与设备</span>" +
    "</div>";
  root.appendChild(legend);

  const shell = document.createElement("div");
  shell.className = "req-shell plan-shell";

  const rail = document.createElement("div");
  rail.className = "req-tab-rail plan-tab-rail";

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "req-tab-arrow";
  prevBtn.setAttribute("aria-label", "上一需求大类");
  prevBtn.textContent = "‹";

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "req-tab-arrow";
  nextBtn.setAttribute("aria-label", "下一需求大类");
  nextBtn.textContent = "›";

  const scroll = document.createElement("div");
  scroll.className = "req-tab-scroll";
  const tabList = document.createElement("div");
  tabList.className = "req-tab-list";
  tabList.setAttribute("role", "tablist");
  tabList.setAttribute("aria-label", "需求大类");

  const stage = document.createElement("div");
  stage.className = "req-stage plan-stage";

  let active = 0;

  function detailBlock(row, localIdx) {
    const gapSection =
      norm(row.people_need) || norm(row.people_now)
        ? "<section class='plan-dl-section plan-gap-section'><h5>人员能力：需求与现状</h5>" +
          "<div class='plan-gap-grid'>" +
          "<div><span class='plan-dt'>能力需求</span><p class='plan-dd'>" +
          esc(norm(row.people_need) || "—") +
          "</p></div>" +
          "<div><span class='plan-dt'>现有情况</span><p class='plan-dd'>" +
          esc(norm(row.people_now) || "—") +
          "</p></div></div></section>"
        : "";

    return (
      "<div class='plan-detail-body'>" +
      "<div class='plan-dl-grid'>" +
      "<section><h5>待解决的核心问题</h5><p class='plan-pre'>" +
      esc(norm(row.problem)) +
      "</p></section>" +
      "<section><h5>需求核心技术</h5><p class='plan-pre'>" +
      esc(norm(row.core_tech)) +
      "</p></section>" +
      "<section><h5>功能分解</h5><p class='plan-pre'>" +
      esc(norm(row.func_tree)) +
      "</p></section>" +
      "<section><h5>关键设备</h5><p class='plan-pre'>" +
      esc(norm(row.devices)) +
      "</p></section>" +
      "<section><h5>关键技术</h5><p class='plan-pre'>" +
      esc(norm(row.key_tech)) +
      "</p></section>" +
      "<section class='plan-solution'><h5>技术实现途径</h5><p class='plan-pre'>" +
      esc(norm(row.approach)) +
      "</p></section>" +
      "<section><h5>现有内外部资源</h5><p class='plan-pre'>" +
      esc(norm(row.resources_now)) +
      "</p></section>" +
      gapSection +
      "<section><h5>集团协同需求</h5><p class='plan-pre'>" +
      esc(norm(row.group_sync)) +
      "</p></section>" +
      "</div></div>"
    );
  }

  function buildPanel(b, i) {
    const panel = document.createElement("section");
    panel.className = "req-tabpanel plan-tabpanel";
    panel.id = "plan-panel-" + i;
    panel.setAttribute("role", "tabpanel");
    if (i !== 0) panel.hidden = true;

    const head = document.createElement("header");
    head.className = "req-cat-head plan-cat-head";
    head.innerHTML =
      "<h3 class='req-cat-title'>" +
      esc(b.cat) +
      "</h3><p class='req-cat-meta'>本类共 <strong>" +
      b.rows.length +
      "</strong> 条分解行，点击「展开」查看全文。</p>";

    const wrap = document.createElement("div");
    wrap.className = "plan-table-wrap";
    const table = document.createElement("table");
    table.className = "plan-matrix-table";
    table.innerHTML =
      "<thead><tr>" +
      "<th scope='col' class='col-plan-no'>序号</th>" +
      "<th scope='col' class='col-plan-req'>调研需求 / 具体需求点</th>" +
      "<th scope='col' class='col-plan-sys'>落地系统</th>" +
      "<th scope='col' class='col-plan-now'>现状与资源</th>" +
      "<th scope='col' class='col-plan-path'>技术路径（摘要）</th>" +
      "<th scope='col' class='col-plan-act'>操作</th>" +
      "</tr></thead><tbody></tbody>";
    const tbody = table.querySelector("tbody");

    b.rows.forEach((row, j) => {
      const tr = document.createElement("tr");
      tr.className = "plan-row-head";
      const idx = j + 1;
      const nowBlob = [norm(row.resources_now), norm(row.people_now)].filter(Boolean).join("\n");
      tr.innerHTML =
        "<td class='col-plan-no'>" +
        idx +
        "</td>" +
        "<td class='col-plan-req'><span class='plan-cell-req'>" +
        esc(preview(row.req_point, 220) || preview(row.problem, 220) || "—") +
        "</span></td>" +
        "<td class='col-plan-sys'>" +
        esc(preview(row.sys, 80) || "—") +
        "</td>" +
        "<td class='col-plan-now'><span class='plan-cell-now'>" +
        esc(preview(nowBlob, 180) || "—") +
        "</span></td>" +
        "<td class='col-plan-path'><span class='plan-cell-path'>" +
        esc(preview(row.approach, 140) || preview(row.key_tech, 120) || "—") +
        "</span></td>" +
        "<td class='col-plan-act'><button type='button' class='button ghost plan-expand-btn' aria-expanded='false' aria-controls='plan-detail-" +
        i +
        "-" +
        j +
        "' id='plan-trigger-" +
        i +
        "-" +
        j +
        "'>展开</button></td>";

      const trDetail = document.createElement("tr");
      trDetail.className = "plan-row-detail";
      trDetail.id = "plan-detail-" + i + "-" + j;
      trDetail.hidden = true;
      const td = document.createElement("td");
      td.colSpan = 6;
      td.className = "plan-detail-cell";
      td.innerHTML = detailBlock(row, j);
      trDetail.appendChild(td);

      const btn = tr.querySelector(".plan-expand-btn");
      btn?.addEventListener("click", () => {
        const open = trDetail.hidden;
        trDetail.hidden = !open;
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        btn.textContent = open ? "收起" : "展开";
      });

      tbody.appendChild(tr);
      tbody.appendChild(trDetail);
    });

    wrap.appendChild(table);
    panel.appendChild(head);
    panel.appendChild(wrap);
    return panel;
  }

  blocks.forEach((b, i) => {
    stage.appendChild(buildPanel(b, i));

    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "req-tab plan-tab";
    tab.id = "plan-tab-" + i;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", i === 0 ? "true" : "false");
    tab.setAttribute("aria-controls", "plan-panel-" + i);
    tab.dataset.planIndex = String(i);
    const short = b.cat.length > 16 ? b.cat.slice(0, 15) + "…" : b.cat;
    tab.innerHTML = esc(short) + "<span class='req-tab-count'>" + b.rows.length + "</span>";
    tab.title = b.cat;
    tabList.appendChild(tab);
  });

  scroll.appendChild(tabList);
  rail.appendChild(prevBtn);
  rail.appendChild(scroll);
  rail.appendChild(nextBtn);
  shell.appendChild(rail);
  shell.appendChild(stage);
  root.appendChild(shell);

  function goTo(next) {
    if (!blocks.length) return;
    active = (next + blocks.length) % blocks.length;
    blocks.forEach((_, i) => {
      document.getElementById("plan-panel-" + i).hidden = i !== active;
      const t = document.getElementById("plan-tab-" + i);
      if (t) t.setAttribute("aria-selected", i === active ? "true" : "false");
    });
    document.getElementById("plan-tab-" + active)?.scrollIntoView({ block: "nearest", inline: "center" });
  }

  tabList.querySelectorAll(".plan-tab").forEach((tab) => {
    tab.addEventListener("click", () => goTo(Number(tab.dataset.planIndex)));
  });
  prevBtn.addEventListener("click", () => goTo(active - 1));
  nextBtn.addEventListener("click", () => goTo(active + 1));
})();
