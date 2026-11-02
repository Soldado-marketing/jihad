#!/usr/bin/env python3
"""
MAOS live progress panel generator (owner request 2026-11-03).

Reads the three planning files (the source of truth) and an optional PR status
JSON, and writes one self-contained HTML page for the Claude side panel
(published as an Artifact). It never changes the planning files.

Usage:
  python3 docs/tools/progress_panel.py --docs docs --prs prs.json --out panel.html
  prs.json: [{"n":137,"state":"OPEN","draft":true,"merged":false,"ci":"SUCCESS"}, ...]
  (gh pr list --state all --json number,state,isDraft,mergedAt,statusCheckRollup ... )
"""
import argparse, html, json, re, datetime, subprocess
from pathlib import Path

DEPT_RE = re.compile(r"^## ([A-M]) — (.+)$")
ROW_RE = re.compile(r"^\| ([A-M]\d{2}) \|")
PR_RE = re.compile(r"#(\d{2,4})")

def bucket(status: str) -> str:
    s = status.strip()
    u = s.upper()
    if "AWAITING MERGE" in u:
        return "awaiting"
    if u.startswith("IN_PROGRESS"):
        return "active"
    if "BLOCKED_OWNER" in u and not u.startswith("N/A"):
        return "blocked"
    if u.startswith("N/A"):
        return "blocked" if "BLOCKED_OWNER" in u else "na"
    if u.startswith("DONE_ISOLATED") or u.startswith("DONE (ISOLATED") or u.startswith("DONE (VISUAL"):
        return "unverified"
    if u.startswith("DONE"):
        if "NOT_STARTED" in u or "NOT VERIFIED" in u:
            return "unverified"
        return "done"
    if u.startswith("PARTIAL"):
        return "partial"
    if u.startswith("READY"):
        return "ready"
    return "todo"

LABEL = {
    "done": "DONE", "unverified": "NOT VERIFIED", "awaiting": "AWAITING APPROVAL", "active": "IN PROGRESS",
    "blocked": "BLOCKED (owner)", "partial": "PARTIAL", "ready": "READY", "todo": "TODO", "na": "N/A",
}
ORDER = ["done", "unverified", "awaiting", "active", "blocked", "partial", "ready", "todo", "na"]

def parse_tasks(text: str):
    depts, cur = [], None
    for line in text.splitlines():
        m = DEPT_RE.match(line)
        if m:
            cur = {"key": m.group(1), "name": m.group(2).strip(), "tasks": []}
            depts.append(cur)
            continue
        if cur and ROW_RE.match(line):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            # 8-column tables: ID|Task|Status|Deps|Notes|Tests|PR|Production ; H/K tables are shorter.
            row = {"id": cells[0], "task": cells[1], "status": cells[2] if len(cells) > 2 else "",
                   "deps": cells[3] if len(cells) > 3 else "", "notes": cells[4] if len(cells) > 4 else "",
                   "tests": cells[5] if len(cells) > 5 else "", "pr": cells[6] if len(cells) > 6 else "",
                   "prod": cells[7] if len(cells) > 7 else ""}
            row["bucket"] = bucket(row["status"])
            row["prs"] = sorted({int(n) for n in PR_RE.findall(row["pr"])})
            cur["tasks"].append(row)
    return depts

def parse_resume(text: str):
    out = {}
    for line in text.splitlines():
        m = re.match(r"^\| ([A-Z_ ()]+?) \| (.*) \|$", line)
        if m:
            out[m.group(1).strip()] = m.group(2).strip()
    return out

def parse_decisions(text: str):
    tail = text[text.find("### Outstanding owner decisions"):]
    out = []
    for line in tail.splitlines():
        m = re.match(r"^\| (O\d+) \| (.*) \| (.*) \|$", line)
        if m:
            out.append({"id": m.group(1), "text": m.group(2).strip(), "unblocks": m.group(3).strip()})
    return out

def md_inline(s: str) -> str:
    s = html.escape(s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"#(\d{2,4})", r'<a href="https://github.com/Soldado-marketing/jihad/pull/\1" target="_blank" rel="noopener">#\1</a>', s)
    return s

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--docs", default="docs")
    ap.add_argument("--prs", default=None)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    docs = Path(a.docs)
    tasks_md = (docs / "MAOS_MASTER_TASK_LIST.md").read_text(encoding="utf-8")
    resume = parse_resume((docs / "MAOS_RESUME.md").read_text(encoding="utf-8"))
    decisions = parse_decisions((docs / "MAOS_PROGRESS.md").read_text(encoding="utf-8"))
    prs = {}
    if a.prs and Path(a.prs).exists():
        for p in json.loads(Path(a.prs).read_text()):
            prs[int(p["n"])] = p
    depts = parse_tasks(tasks_md)
    try:
        head = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True, cwd=str(docs.parent)).stdout.strip()
        branch = subprocess.run(["git", "branch", "--show-current"], capture_output=True, text=True, cwd=str(docs.parent)).stdout.strip()
    except Exception:
        head, branch = "", ""

    waiting_ids = set()
    for d in decisions:
        waiting_ids.update(re.findall(r"\b[A-M]\d{2}\b", d["unblocks"]))

    all_tasks = [t for d in depts for t in d["tasks"]]
    total = len(all_tasks)
    counts = {b: sum(1 for t in all_tasks if t["bucket"] == b) for b in ORDER}
    verified = counts["done"]
    delivered = verified + counts["unverified"] + counts["awaiting"]

    def pr_chip(n: int) -> str:
        p = prs.get(n)
        if not p:
            return f'<a class="pr" href="https://github.com/Soldado-marketing/jihad/pull/{n}" target="_blank" rel="noopener">#{n}</a>'
        if p.get("merged"):
            state, cls = "merged", "merged"
        elif p.get("state") == "CLOSED":
            state, cls = "closed", "closed"
        else:
            state, cls = ("draft" if p.get("draft") else "open"), ("draft" if p.get("draft") else "open")
        ci = p.get("ci", "none")
        cicls = {"SUCCESS": "ok", "FAILURE": "bad", "PENDING": "pend"}.get(ci, "none")
        return (f'<a class="pr {cls}" href="https://github.com/Soldado-marketing/jihad/pull/{n}" target="_blank" rel="noopener">'
                f'#{n} <span class="prstate">{state}</span><span class="ci {cicls}" title="CI {ci}"></span></a>')

    def task_row(t):
        waiting = t["bucket"] in ("awaiting", "blocked") or t["id"] in waiting_ids
        cls = f'task b-{t["bucket"]}' + (" waiting" if waiting else "")
        chips = " ".join(pr_chip(n) for n in t["prs"])
        prod = t["prod"] if t["prod"] not in ("", "—", "||") else ""
        meta = []
        if chips:
            meta.append(chips)
        if prod:
            meta.append(f'<span class="prod">{md_inline(prod)}</span>')
        if t["deps"] and t["deps"] not in ("—", ""):
            meta.append(f'<span class="deps">after {md_inline(t["deps"])}</span>')
        return (f'<li class="{cls}" id="{t["id"]}"><div class="line"><span class="tid">{t["id"]}</span>'
                f'<span class="tname">{md_inline(t["task"])}</span>'
                f'<span class="chip {t["bucket"]}">{LABEL[t["bucket"]]}</span></div>'
                f'<div class="raw">{md_inline(t["status"])}</div>'
                + (f'<div class="meta">{" · ".join(meta)}</div>' if meta else "")
                + (f'<div class="wait">Needs your decision</div>' if waiting else "")
                + "</li>")

    def dept_block(d):
        n = len(d["tasks"])
        c = {b: sum(1 for t in d["tasks"] if t["bucket"] == b) for b in ORDER}
        done = c["done"]
        seg = "".join(f'<i class="s-{b}" style="width:{100*c[b]/n:.1f}%"></i>' for b in ORDER if c[b])
        waiting = sum(1 for t in d["tasks"] if t["bucket"] in ("awaiting", "blocked") or t["id"] in waiting_ids)
        rows = "".join(task_row(t) for t in d["tasks"])
        return (f'<details class="dept" data-key="{d["key"]}"><summary><span class="dkey">{d["key"]}</span>'
                f'<span class="dname">{html.escape(d["name"])}</span>'
                f'<span class="dcount"><b>{done}</b>/{n} verified' + (f' · <em>{waiting} waiting on you</em>' if waiting else "") + '</span>'
                f'<span class="bar">{seg}</span></summary><ul class="tasks">{rows}</ul></details>')

    legend = "".join(f'<span class="chip {b}">{LABEL[b]} <b>{counts[b]}</b></span>' for b in ORDER if counts[b])
    decisions_html = "".join(f'<li><span class="oid">{d["id"]}</span><span>{md_inline(d["text"])}</span><span class="unb">{md_inline(d["unblocks"])}</span></li>' for d in decisions)
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%MZ")
    pct = round(100 * verified / total) if total else 0
    pct_delivered = round(100 * delivered / total) if total else 0

    page = f"""<title>MAOS Master Progress</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap">
<style>
/* Layout: one narrow column for a side panel; summary first, departments as collapsible ledgers, decisions last. */
:root {{
  --bg:#f5f6f8; --panel:#ffffff; --fg:#141a26; --muted:#5a6475; --line:#dde2ea; --accent:#0f5f6b;
  --ok:#1f7a3f; --warn:#b26a00; --crit:#b3261e; --info:#2d5bd1; --wait:#fff4d6; --waitline:#e3b94f;
  --font:'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',sans-serif; --mono:'IBM Plex Mono',ui-monospace,Menlo,monospace;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{
  --bg:#0f141c; --panel:#171e29; --fg:#e8ecf2; --muted:#98a3b5; --line:#2a3443; --accent:#5fc3cf;
  --ok:#5ccb7f; --warn:#f0b24a; --crit:#ff7a70; --info:#7ea2ff; --wait:#2b2410; --waitline:#b8902f; color-scheme:dark }} }}
:root[data-theme="dark"] {{
  --bg:#0f141c; --panel:#171e29; --fg:#e8ecf2; --muted:#98a3b5; --line:#2a3443; --accent:#5fc3cf;
  --ok:#5ccb7f; --warn:#f0b24a; --crit:#ff7a70; --info:#7ea2ff; --wait:#2b2410; --waitline:#b8902f; color-scheme:dark }}
body {{ background:var(--bg); color:var(--fg); font-family:var(--font); font-size:13px; line-height:1.45;
  padding-block:12px; padding-left:max(16px,env(safe-area-inset-left,0px)); padding-right:max(16px,env(safe-area-inset-right,0px)); }}
* {{ box-sizing:border-box; min-width:0 }}
a {{ color:var(--accent) }}
code {{ font-family:var(--mono); font-size:0.92em; background:color-mix(in srgb,var(--line) 55%,transparent); padding:0 3px; border-radius:3px }}
header h1 {{ font-size:17px; margin:0; font-weight:700; letter-spacing:-0.01em; text-wrap:balance }}
header .sub {{ color:var(--muted); font-size:11.5px; margin-top:2px }}
.summary {{ display:grid; gap:8px; margin-top:12px }}
.total {{ background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:10px 12px }}
.total .big {{ font-size:26px; font-weight:700; font-variant-numeric:tabular-nums; line-height:1 }}
.total .big small {{ font-size:12px; color:var(--muted); font-weight:500; margin-inline-start:6px }}
.bar {{ display:flex; height:8px; border-radius:4px; overflow:hidden; background:var(--line); margin-top:8px }}
.bar i {{ display:block; height:100% }}
.s-done {{ background:var(--ok) }} .s-unverified {{ background:color-mix(in srgb,var(--ok) 45%,var(--bg)) }} .s-awaiting {{ background:var(--warn) }}
.s-active {{ background:var(--info) }} .s-blocked {{ background:var(--crit) }} .s-partial {{ background:color-mix(in srgb,var(--info) 45%,var(--bg)) }}
.s-ready, .s-todo, .s-na {{ background:transparent }}
.legend {{ display:flex; flex-wrap:wrap; gap:4px; margin-top:8px }}
.chip {{ display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; padding:2px 7px; border-radius:999px; border:1px solid var(--line); color:var(--muted); white-space:nowrap }}
.chip b {{ font-weight:700; color:var(--fg) }}
.chip.done {{ color:var(--ok); border-color:var(--ok) }} .chip.unverified {{ color:var(--ok); border-style:dashed }}
.chip.awaiting {{ color:var(--warn); border-color:var(--warn) }} .chip.active {{ color:var(--info); border-color:var(--info) }}
.chip.blocked {{ color:var(--crit); border-color:var(--crit) }} .chip.partial {{ color:var(--info); border-style:dashed }}
.now {{ background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:10px 12px; display:grid; gap:8px }}
.now .k {{ font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted) }}
.now .v {{ font-size:12.5px }}
.now .active-task {{ border-inline-start:3px solid var(--info); padding-inline-start:8px }}
.now .next-task {{ border-inline-start:3px solid var(--accent); padding-inline-start:8px }}
.now .last-task {{ border-inline-start:3px solid var(--ok); padding-inline-start:8px }}
h2 {{ font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); margin:16px 0 6px }}
.dept {{ background:var(--panel); border:1px solid var(--line); border-radius:8px; margin-top:6px }}
.dept summary {{ list-style:none; cursor:pointer; display:grid; grid-template-columns:auto 1fr auto; gap:4px 8px; align-items:center; padding:9px 12px }}
.dept summary::-webkit-details-marker {{ display:none }}
.dept summary:focus-visible {{ outline:2px solid var(--accent); outline-offset:-2px; border-radius:8px }}
.dkey {{ font-family:var(--mono); font-weight:600; font-size:12px; background:var(--accent); color:#fff; border-radius:4px; padding:1px 6px }}
.dname {{ font-weight:600; font-size:12.5px }}
.dcount {{ font-size:11px; color:var(--muted); font-variant-numeric:tabular-nums; white-space:nowrap }}
.dcount em {{ color:var(--warn); font-style:normal; font-weight:600 }}
.dept summary .bar {{ grid-column:1 / -1; margin-top:2px; height:5px }}
.dept[open] summary {{ border-bottom:1px solid var(--line) }}
.tasks {{ list-style:none; margin:0; padding:0 }}
.task {{ padding:8px 12px; border-bottom:1px solid var(--line) }}
.task:last-child {{ border-bottom:0 }}
.task.waiting {{ background:var(--wait); box-shadow:inset 3px 0 0 var(--waitline) }}
.task.b-active {{ box-shadow:inset 3px 0 0 var(--info) }}
.line {{ display:flex; flex-wrap:wrap; gap:4px 8px; align-items:baseline }}
.tid {{ font-family:var(--mono); font-weight:600; font-size:11.5px; color:var(--accent) }}
.tname {{ flex:1 1 180px; font-weight:500 }}
.raw {{ font-size:11px; color:var(--muted); margin-top:2px }}
.meta {{ font-size:11px; color:var(--muted); margin-top:4px; display:flex; flex-wrap:wrap; gap:4px 6px; align-items:center }}
.pr {{ display:inline-flex; align-items:center; gap:4px; font-family:var(--mono); font-size:11px; text-decoration:none; border:1px solid var(--line); border-radius:4px; padding:0 5px; color:var(--fg) }}
.pr.merged {{ border-color:var(--ok) }} .pr.draft {{ border-style:dashed }} .pr.closed {{ opacity:0.6; text-decoration:line-through }}
.prstate {{ font-family:var(--font); font-size:10px; color:var(--muted) }}
.ci {{ width:7px; height:7px; border-radius:50%; background:var(--line) }} .ci.ok {{ background:var(--ok) }} .ci.bad {{ background:var(--crit) }} .ci.pend {{ background:var(--warn) }}
.wait {{ font-size:10.5px; font-weight:600; color:var(--warn); margin-top:4px; text-transform:uppercase; letter-spacing:0.05em }}
.decisions {{ list-style:none; margin:0; padding:0; background:var(--panel); border:1px solid var(--line); border-radius:8px }}
.decisions li {{ display:grid; grid-template-columns:auto 1fr; gap:2px 8px; padding:7px 12px; border-bottom:1px solid var(--line); font-size:12px }}
.decisions li:last-child {{ border-bottom:0 }}
.oid {{ font-family:var(--mono); font-weight:600; color:var(--warn) }}
.unb {{ grid-column:2; font-size:11px; color:var(--muted) }}
footer {{ color:var(--muted); font-size:11px; margin-top:14px; line-height:1.5 }}
.tools {{ display:flex; gap:6px; margin:8px 0 0 }}
.tools button {{ font:inherit; font-size:11px; padding:3px 9px; border:1px solid var(--line); background:var(--panel); color:var(--fg); border-radius:6px; cursor:pointer }}
.tools button:focus-visible {{ outline:2px solid var(--accent) }}
@media (prefers-reduced-motion: no-preference) {{ .bar i {{ transition:width .3s ease }} }}
</style>
<header>
  <h1>MAOS Master Progress</h1>
  <div class="sub">Source: <code>docs/MAOS_MASTER_TASK_LIST.md</code>, <code>MAOS_PROGRESS.md</code>, <code>MAOS_RESUME.md</code> on <code>{html.escape(branch)}</code> {html.escape(head)} · generated {now}</div>
</header>
<section class="summary">
  <div class="total">
    <div class="big">{pct}%<small>verified in production · {verified} of {total} tasks</small></div>
    <div class="big" style="font-size:15px;margin-top:4px">{pct_delivered}%<small>delivered (verified + not verified + awaiting merge) · {delivered} of {total}</small></div>
    <div class="bar">{"".join(f'<i class="s-{b}" style="width:{100*counts[b]/total:.1f}%"></i>' for b in ORDER if counts[b])}</div>
    <div class="legend">{legend}</div>
  </div>
  <div class="now">
    <div class="active-task"><div class="k">Active task</div><div class="v">{md_inline(resume.get("CURRENT_TASK_ID", "—"))}</div></div>
    <div class="last-task"><div class="k">Latest completed</div><div class="v">{md_inline(resume.get("LAST_COMPLETED_TASK", "—"))}</div></div>
    <div class="next-task"><div class="k">Exact next action</div><div class="v">{md_inline(resume.get("EXACT_NEXT_ACTION", "—"))}</div></div>
    <div><div class="k">Production</div><div class="v">{md_inline(resume.get("PRODUCTION", "—"))}</div></div>
    <div><div class="k">Blockers</div><div class="v">{md_inline(resume.get("KNOWN_BLOCKERS", "—"))}</div></div>
  </div>
</section>
<h2>Departments A–M</h2>
<div class="tools"><button type="button" id="expand-all">Expand all</button><button type="button" id="collapse-all">Collapse all</button><button type="button" id="only-waiting">Only waiting on you</button></div>
{"".join(dept_block(d) for d in depts)}
<h2>Owner decisions open ({len(decisions)})</h2>
<ul class="decisions">{decisions_html}</ul>
<footer>Status words come from the task list verbatim (shown under each task). "Verified" counts only rows marked DONE and verified in production; draft PRs are never shown as deployed. Checkpoint last updated {html.escape(resume.get("LAST_UPDATED", "—"))}.</footer>
<script>
(function () {{
  var KEY = 'maos-panel-open';
  var depts = Array.prototype.slice.call(document.querySelectorAll('details.dept'));
  var saved = null;
  try {{ saved = JSON.parse(localStorage.getItem(KEY) || 'null'); }} catch (e) {{ saved = null; }}
  depts.forEach(function (d) {{
    var key = d.getAttribute('data-key');
    if (saved && typeof saved === 'object') d.open = !!saved[key];
    else d.open = d.querySelector('.task.b-active, .task.waiting') !== null;
    d.addEventListener('toggle', function () {{
      var state = {{}};
      depts.forEach(function (x) {{ state[x.getAttribute('data-key')] = x.open; }});
      try {{ localStorage.setItem(KEY, JSON.stringify(state)); }} catch (e) {{}}
    }});
  }});
  document.getElementById('expand-all').addEventListener('click', function () {{ depts.forEach(function (d) {{ d.open = true; }}); showAll(); }});
  document.getElementById('collapse-all').addEventListener('click', function () {{ depts.forEach(function (d) {{ d.open = false; }}); showAll(); }});
  var onlyWaiting = false;
  function showAll() {{ onlyWaiting = false; document.querySelectorAll('.task').forEach(function (t) {{ t.hidden = false; }}); document.getElementById('only-waiting').textContent = 'Only waiting on you'; }}
  document.getElementById('only-waiting').addEventListener('click', function () {{
    if (onlyWaiting) return showAll();
    onlyWaiting = true;
    document.querySelectorAll('.task').forEach(function (t) {{ t.hidden = !t.classList.contains('waiting'); }});
    depts.forEach(function (d) {{ d.open = d.querySelector('.task.waiting') !== null; }});
    this.textContent = 'Show every task';
  }});
  if (location.hash) {{ var el = document.getElementById(location.hash.slice(1)); if (el) {{ var p = el.closest('details'); if (p) p.open = true; el.scrollIntoView(); }} }}
}})();
</script>
"""
    Path(a.out).write_text(page, encoding="utf-8")
    print(f"wrote {a.out}: {total} tasks, {verified} verified, {delivered} delivered, {len(decisions)} decisions")

if __name__ == "__main__":
    main()
