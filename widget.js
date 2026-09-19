/*!
 * Review Notes Widget (review-pins widget)
 * ------------------------------------------------------------
 * Usage: add one line right before </body> on the site you want to review.
 *   <script src="widget.js"></script>
 *
 * Fill in SUPABASE_URL / SUPABASE_ANON_KEY below to store comments in
 * Supabase, so everyone with the link sees the same comments in real time.
 * Leave them blank to store comments only in this browser (localStorage).
 *
 * Turn on review mode (REQUIRE_REVIEW_PARAM) to keep the widget hidden
 * from regular visitors, showing it only to people who arrive with a
 * "?review=<code>" URL. ANY non-empty code works as a shared secret —
 * so giving each client their own unique code (e.g. ?review=jiyeon-8k2)
 * works as a simple per-client link, with no database or admin page
 * needed. (Once someone arrives with a valid ?review=<code> link it
 * stays on as they move to other pages, until "?review=0" turns it off.)
 * ------------------------------------------------------------
 */
(function () {
  "use strict";

  /* ====== Config: fill in your Supabase project details here ======
     Find these in the Supabase dashboard under Project Settings > API.
     Only ever use the anon (public) key here. Never put a service_role key in this file. */
  var SUPABASE_URL = "https://bkagianfkuexowijbrlo.supabase.co";       // e.g. https://xxxxxxxx.supabase.co
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYWdpYW5ma3VleG93aWpicmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MDExMzMsImV4cCI6MjEwNTI3NzEzM30.46fGwRjxkI5uXNmA5AeyRC689c7KLX5HIxSJCLc9tKQ";  // e.g. eyJhbGciOi... (anon/public key)

  /* ====== Config: review mode ======
     Set to true to require ?review=<anything> in the URL before the widget
     shows. (Regular visitors never see it.) Any non-empty value works —
     give each client their own made-up code as a simple, unique link, e.g.
     https://yoursite.com/?review=jiyeon-8k2
     https://yoursite.com/?review=minho-p91q
     Leave false (default) to keep the widget always visible on any page
     that loads this script. */
  var REQUIRE_REVIEW_PARAM = false;
  var REVIEW_PARAM_NAME = "review";

  // Testing / advanced use: to override config without editing this file,
  // set window.RV_SUPABASE_CONFIG = {url:'...', anonKey:'...'} before loading widget.js.
  var CONFIG = (window.RV_SUPABASE_CONFIG && window.RV_SUPABASE_CONFIG.url) ? window.RV_SUPABASE_CONFIG
    : { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };

  // Distinguishes this page from others. Override before loading via window.RV_PAGE_ID if needed.
  var PAGE_URL = window.RV_PAGE_ID || (location.origin + location.pathname);

  /* ---------- Review-mode check ----------
     Any non-empty ?review=<code> value counts as valid — the code itself
     never has to be registered anywhere. This is "unguessable link" style
     access control (the same model Google Docs/Figma "anyone with the
     link" sharing uses), not real authentication: it stops casual
     snooping, but whoever has the exact link can pass it on and it never
     expires on its own. That's a reasonable trade-off for design feedback
     at this stage; see the chat for how to go further later if needed. */
  function isReviewModeActive() {
    if (!REQUIRE_REVIEW_PARAM) return true;
    var val = null;
    try {
      val = new URLSearchParams(location.search).get(REVIEW_PARAM_NAME);
    } catch (e) {
      var m = location.search.match(new RegExp("[?&]" + REVIEW_PARAM_NAME + "=([^&]*)"));
      val = m ? decodeURIComponent(m[1]) : null;
    }
    if (val === "0") { try { localStorage.removeItem("rv:reviewMode"); } catch (e) {} return false; }
    if (val) { try { localStorage.setItem("rv:reviewMode", "1"); } catch (e) {} return true; }
    try { return localStorage.getItem("rv:reviewMode") === "1"; } catch (e) { return false; }
  }

  var SUPABASE_SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";

  /* ---------- Inject widget styles ---------- */
  var CSS = ''
    + ':root{'
    + '  --rv-paper:#ffffff; --rv-paper-2:#f5f4f0; --rv-ink:#20222b; --rv-ink-2:#5d606c;'
    + '  --rv-line:#e2e0d9; --rv-note:#ffd84d; --rv-note-ink:#20222b; --rv-done:#2f7d5c;'
    + '  --rv-pick:#2f6bff; --rv-warn:#b4541a; --rv-shadow:0 10px 30px rgba(32,34,43,.18);'
    + '  --rv-font:"IBM Plex Sans","Segoe UI",system-ui,sans-serif;'
    + '  --rv-side-w:340px;'
    + '}'
    + '@media (prefers-color-scheme: dark){'
    + '  :root:not([data-theme="light"]){'
    + '    --rv-paper:#25272f; --rv-paper-2:#1c1e25; --rv-ink:#f1efe8; --rv-ink-2:#a9acb8;'
    + '    --rv-line:#3b3e49; --rv-done:#5fc79a; --rv-pick:#7ea2ff; --rv-warn:#f0a36b;'
    + '    --rv-shadow:0 10px 30px rgba(0,0,0,.5);'
    + '  }'
    + '}'
    + ':root[data-theme="dark"]{'
    + '  --rv-paper:#25272f; --rv-paper-2:#1c1e25; --rv-ink:#f1efe8; --rv-ink-2:#a9acb8;'
    + '  --rv-line:#3b3e49; --rv-done:#5fc79a; --rv-pick:#7ea2ff; --rv-warn:#f0a36b;'
    + '  --rv-shadow:0 10px 30px rgba(0,0,0,.5);'
    + '}'
    + '[data-rv]{font-family:var(--rv-font);font-size:14px;line-height:1.5;color:var(--rv-ink);box-sizing:border-box}'
    + '[data-rv] *{box-sizing:border-box}'
    + '[data-rv] button{font:inherit;color:inherit;cursor:pointer}'
    + '[data-rv] :focus-visible{outline:2px solid var(--rv-pick);outline-offset:2px}'
    + '[data-rv] textarea,[data-rv] input{font:inherit;color:var(--rv-ink);background:var(--rv-paper);border:1px solid var(--rv-line);border-radius:6px;padding:8px 10px;width:100%}'
    + '[data-rv] textarea{resize:vertical;min-height:72px;display:block}'

    + '#rv-intro{position:fixed;top:0;left:0;right:0;z-index:1050;background:var(--rv-ink);color:var(--rv-paper);padding:10px 16px;display:flex;gap:12px;align-items:center}'
    + '#rv-intro p{margin:0;flex:1;color:inherit}'
    + '#rv-intro b{color:var(--rv-note);font-weight:600}'
    + '#rv-intro button{background:none;border:1px solid currentColor;border-radius:6px;padding:3px 10px;color:inherit;opacity:.8}'

    + '#rv-layer{position:absolute;top:0;left:0;width:0;height:0;z-index:900}'
    + '.rv-pin{position:absolute;border:0;padding:0;background:none;transform:translate(3px,calc(-100% - 3px));display:block}'
    + '.rv-pin::before{content:"";position:absolute;left:-6px;bottom:-6px;width:6px;height:6px;border-radius:50%;background:var(--rv-note-ink);box-shadow:0 0 0 1.5px #fff}'
    + '.rv-pin span{min-width:26px;height:26px;padding:0 6px;display:grid;place-items:center;'
    + '  background:var(--rv-note);color:var(--rv-note-ink);font:600 13px/1 var(--rv-font);'
    + '  transform:rotate(-4deg);transform-origin:bottom left;box-shadow:1px 3px 8px rgba(32,34,43,.35);'
    + '  clip-path:polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,0 100%);transition:transform .12s ease}'
    + '.rv-pin:hover span,.rv-pin.is-open span{transform:rotate(0) scale(1.18)}'
    + '.rv-pin.is-done span{background:var(--rv-done);color:#fff;opacity:.85}'
    + '.rv-pin.is-draft span{outline:2px dashed var(--rv-note-ink);outline-offset:2px}'

    + '#rv-hover{position:fixed;z-index:850;pointer-events:none;border:2px solid var(--rv-pick);border-radius:3px;display:none;background:rgba(47,107,255,.07)}'
    + '#rv-hover i{position:absolute;left:-2px;bottom:100%;background:var(--rv-pick);color:#fff;font:500 12px/1 var(--rv-font);font-style:normal;padding:4px 7px;border-radius:3px 3px 0 0;white-space:nowrap}'
    + 'html.rv-commenting, html.rv-commenting body{cursor:crosshair !important}'
    + 'html.rv-commenting [data-rv], html.rv-commenting [data-rv] *{cursor:auto !important}'
    + 'html.rv-commenting #rv-comment{cursor:pointer !important}'

    + '#rv-bar{position:fixed;z-index:1000;bottom:18px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;'
    + '  background:var(--rv-ink);padding:6px;border-radius:12px;box-shadow:var(--rv-shadow);transition:left .2s ease;max-width:calc(100vw - 16px)}'
    + '#rv-bar button{border:0;background:transparent;color:var(--rv-paper);padding:9px 14px;border-radius:8px;white-space:nowrap}'
    + '#rv-bar button[aria-pressed="true"]{background:var(--rv-note);color:var(--rv-note-ink);font-weight:600}'
    + '#rv-bar .sep{width:1px;height:20px;background:var(--rv-paper);opacity:.25}'
    + '#rv-bar kbd{font:inherit;font-size:12px;opacity:.6;margin-left:4px}'
    + '#rv-count{display:inline-block;min-width:20px;padding:1px 6px;margin-left:4px;border-radius:10px;background:var(--rv-note);color:var(--rv-note-ink);font-weight:600;font-size:12px;text-align:center}'

    + '#rv-side{position:fixed;z-index:950;top:0;right:0;bottom:0;width:var(--rv-side-w);max-width:100vw;background:var(--rv-paper);'
    + '  border-left:1px solid var(--rv-line);display:flex;flex-direction:column;transform:translateX(100%);transition:transform .2s ease;visibility:hidden;box-shadow:var(--rv-shadow)}'
    + 'html.rv-side-open #rv-side{transform:none;visibility:visible}'
    + '#rv-side header{padding:16px 16px 0}'
    + '#rv-side h2{margin:0 0 12px;font-size:17px;font-weight:600;display:flex;justify-content:space-between;align-items:center}'
    + '#rv-side h2 button{border:0;background:none;font-size:20px;line-height:1;padding:2px 6px;color:var(--rv-ink-2)}'
    + '.rv-name{display:flex;align-items:center;gap:8px;margin-bottom:14px}'
    + '.rv-name label{white-space:nowrap;color:var(--rv-ink-2)}'
    + '.rv-tabs{display:flex;border-bottom:1px solid var(--rv-line)}'
    + '.rv-tabs button{flex:1;border:0;background:none;padding:10px 4px;border-bottom:2px solid transparent;color:var(--rv-ink-2)}'
    + '.rv-tabs button[aria-selected="true"]{color:var(--rv-ink);border-bottom-color:var(--rv-ink);font-weight:600}'
    + '#rv-list{flex:1;overflow-y:auto;margin:0;padding:0;list-style:none}'
    + '#rv-list li{border-bottom:1px solid var(--rv-line)}'
    + '#rv-list button.row{display:grid;grid-template-columns:30px 1fr;gap:4px 10px;width:100%;text-align:left;border:0;background:none;padding:14px 16px}'
    + '#rv-list button.row:hover,#rv-list li.is-open button.row{background:var(--rv-paper-2)}'
    + '.rv-num{grid-row:1 / span 3;width:26px;height:26px;display:grid;place-items:center;background:var(--rv-note);color:var(--rv-note-ink);font-weight:600;font-size:13px}'
    + '.is-done .rv-num{background:var(--rv-done);color:#fff}'
    + '.rv-meta{color:var(--rv-ink-2);font-size:13px}'
    + '.rv-meta b{color:var(--rv-ink);font-weight:600}'
    + '.rv-text{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}'
    + '.rv-where{font-size:12.5px;color:var(--rv-ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.rv-where.lost{color:var(--rv-warn)}'
    + '.rv-empty{padding:32px 20px;color:var(--rv-ink-2)}'
    + '.rv-empty strong{display:block;color:var(--rv-ink);margin-bottom:6px;font-weight:600}'
    + '#rv-side footer{padding:10px 16px;border-top:1px solid var(--rv-line);font-size:12.5px;color:var(--rv-ink-2);background:var(--rv-paper-2)}'

    + '#rv-pop{position:absolute;z-index:980;width:320px;max-width:calc(100vw - 24px);background:var(--rv-paper);border:1px solid var(--rv-line);'
    + '  border-top:4px solid var(--rv-note);border-radius:4px 4px 10px 10px;box-shadow:var(--rv-shadow);display:none}'
    + '#rv-pop.is-sheet{position:fixed;left:12px !important;right:12px;top:auto !important;bottom:78px;width:auto;max-height:60vh;overflow-y:auto}'
    + '.rv-pop-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--rv-line);font-size:12.5px;color:var(--rv-ink-2)}'
    + '.rv-pop-head span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.rv-pop-head button{border:0;background:none;font-size:18px;line-height:1;padding:2px 6px;color:var(--rv-ink-2)}'
    + '.rv-msgs{max-height:240px;overflow-y:auto}'
    + '.rv-msg{padding:10px 12px}'
    + '.rv-msg + .rv-msg{border-top:1px dashed var(--rv-line)}'
    + '.rv-msg p{margin:2px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}'
    + '.rv-form{padding:10px 12px;border-top:1px solid var(--rv-line);display:grid;gap:8px}'
    + '.rv-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}'
    + '.rv-actions .grow{flex:1}'
    + '.rv-btn{border:1px solid var(--rv-line);background:var(--rv-paper);border-radius:6px;padding:7px 12px}'
    + '.rv-btn.primary{background:var(--rv-ink);color:var(--rv-paper);border-color:var(--rv-ink);font-weight:500}'
    + '.rv-btn.done{color:var(--rv-done);border-color:currentColor}'
    + '.rv-btn.danger{color:var(--rv-warn);border-color:transparent;background:none;padding:7px 6px}'
    + '.rv-hint{font-size:12px;color:var(--rv-ink-2)}'

    + '#rv-toast{position:fixed;z-index:1100;left:50%;top:16px;transform:translateX(-50%);background:var(--rv-ink);color:var(--rv-paper);padding:9px 14px;border-radius:8px;display:none;max-width:calc(100vw - 32px)}'

    + '@media (min-width:1100px){ html.rv-side-open #rv-bar{left:calc((100vw - var(--rv-side-w)) / 2)} }'
    + '@media (max-width:640px){ #rv-bar kbd{display:none} #rv-bar button{padding:9px 11px} }'
    + '@media (prefers-reduced-motion:reduce){ [data-rv], [data-rv] *{transition:none !important} }';

  function injectHead() {
    if (!document.getElementById("rv-fonts-preconnect")) {
      ["https://fonts.googleapis.com", "https://fonts.gstatic.com"].forEach(function (href, i) {
        var l = document.createElement("link");
        l.rel = "preconnect"; l.href = href;
        if (i === 1) l.crossOrigin = "";
        if (i === 0) l.id = "rv-fonts-preconnect";
        document.head.appendChild(l);
      });
      var f = document.createElement("link");
      f.rel = "stylesheet";
      f.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap";
      document.head.appendChild(f);
    }
    var style = document.createElement("style");
    style.id = "rv-widget-style";
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /* ---------- Inject widget markup ---------- */
  function injectBody() {
    var wrap = document.createElement("div");
    wrap.innerHTML = ''
      + '<div id="rv-intro" data-rv>'
      + '  <p>Review tool is on. Turn on <b>Leave a comment</b> below, then click anything on the page you\'d like to flag.</p>'
      + '  <button type="button" id="rv-intro-close">Close</button>'
      + '</div>'
      + '<div id="rv-layer" data-rv></div>'
      + '<div id="rv-hover" data-rv><i></i></div>'
      + '<div id="rv-pop" data-rv role="dialog" aria-label="Comment"></div>'
      + '<aside id="rv-side" data-rv aria-label="Comment list">'
      + '  <header>'
      + '    <h2>Comments <button type="button" id="rv-side-close" aria-label="Close list">×</button></h2>'
      + '    <div class="rv-name"><label for="rv-me">My name</label><input id="rv-me" type="text" maxlength="30" placeholder="e.g. Jane (client)"></div>'
      + '    <div class="rv-tabs" role="tablist">'
      + '      <button type="button" role="tab" id="rv-tab-open" aria-selected="true">Open</button>'
      + '      <button type="button" role="tab" id="rv-tab-done" aria-selected="false">Resolved</button>'
      + '    </div>'
      + '  </header>'
      + '  <ul id="rv-list"></ul>'
      + '  <footer id="rv-storage">Loading comments…</footer>'
      + '</aside>'
      + '<div id="rv-bar" data-rv role="toolbar" aria-label="Review tools">'
      + '  <button type="button" id="rv-browse" aria-pressed="true">Browse</button>'
      + '  <button type="button" id="rv-comment" aria-pressed="false">Leave a comment<kbd>C</kbd></button>'
      + '  <span class="sep"></span>'
      + '  <button type="button" id="rv-toggle-side">List<span id="rv-count">0</span></button>'
      + '</div>'
      + '<div id="rv-toast" data-rv role="status"></div>';
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
  }

  /* ---------- Widget logic ---------- */
  function boot() {
    var $ = function (s) { return document.querySelector(s); };
    var site = document.body, layer = $("#rv-layer"), hoverBox = $("#rv-hover"), pop = $("#rv-pop"),
      list = $("#rv-list"), meInput = $("#rv-me"), toast = $("#rv-toast");

    var mode = "browse", filter = "open", openId = null, draft = null, hoverEl = null, confirmDel = false;

    /* ---------- Small helpers ---------- */
    function h(tag, attrs) {
      var el = document.createElement(tag), i, k;
      if (attrs) for (k in attrs) {
        if (k === "text") el.textContent = attrs[k];
        else if (k === "on") for (var ev in attrs.on) el.addEventListener(ev, attrs.on[ev]);
        else el.setAttribute(k, attrs[k]);
      }
      for (i = 2; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
      return el;
    }
    function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function say(msg) { toast.textContent = msg; toast.style.display = "block"; clearTimeout(say.t); say.t = setTimeout(function () { toast.style.display = "none"; }, 2600); }
    function ago(ts) {
      var s = Math.max(0, (Date.now() - Number(ts || 0)) / 1000);
      if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + "m ago";
      if (s < 86400) return Math.floor(s / 3600) + "h ago"; return Math.floor(s / 86400) + "d ago";
    }
    function isSheet() { return window.innerWidth <= 640; }
    function uuid() {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    /* ---------- Identifying elements ---------- */
    var NAMES = { h1: "Heading", h2: "Heading", h3: "Heading", h4: "Heading", p: "Paragraph", a: "Link", button: "Button", img: "Image", svg: "Image",
      input: "Field", select: "Dropdown", textarea: "Field", li: "List item", nav: "Menu", footer: "Footer", dd: "Item", dt: "Item" };
    function labelFor(el) {
      var tag = el.tagName.toLowerCase();
      if (el.classList && el.classList.contains("btn")) return "Button";
      if (el.classList && el.classList.contains("price")) return "Price";
      return NAMES[tag] || "Area";
    }
    function snippetFor(el) {
      var t = (el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.textContent || "").replace(/\s+/g, " ").trim();
      return t.slice(0, 40);
    }
    function selectorFor(el) {
      var parts = [], n = el;
      while (n && n !== site) {
        if (n.id) { parts.unshift("#" + CSS_escape(n.id)); return parts.join(" > "); }
        var i = 1, s = n;
        while ((s = s.previousElementSibling)) if (s.tagName === n.tagName) i++;
        parts.unshift(n.tagName.toLowerCase() + ":nth-of-type(" + i + ")");
        n = n.parentElement;
      }
      parts.unshift("body");
      return parts.join(" > ");
    }
    function CSS_escape(s) { return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/([^\w-])/g, "\\$1"); }
    function pickTarget(e) {
      var el = e.target;
      if (!el || !el.closest || el.closest("[data-rv]") || !site.contains(el)) return null;
      var svg = el.closest("svg"); if (svg) el = svg;
      if (el.tagName === "OPTION") el = el.parentElement;
      if (el.tagName === "BR") el = el.parentElement;
      return el === site ? null : el;
    }
    /* Re-find the element a saved comment points to: try the selector first, then fall back to matching text on the same tag. */
    function findEl(t) {
      var el = null;
      try { el = document.querySelector(t.sel); } catch (e) {}
      if (el && site.contains(el) && !el.closest("[data-rv]")) return el;
      if (t.snippet && t.tag) {
        var c = site.getElementsByTagName(t.tag);
        for (var i = 0; i < c.length; i++) if (!c[i].closest("[data-rv]") && snippetFor(c[i]) === t.snippet) return c[i];
      }
      return null;
    }
    function docPos(el, rx, ry) {
      var r = el.getBoundingClientRect();
      return { x: r.left + window.scrollX + r.width * rx, y: r.top + window.scrollY + r.height * ry };
    }

    /* ---------- Storage: shared via Supabase when configured, otherwise this browser only ---------- */
    var Store = {
      kind: "loading", threads: [], client: null, channel: null,
      init: function () {
        var self = this;
        if (!CONFIG.url || !CONFIG.anonKey) { this.goLocal(); return; }
        loadSupabaseSdk(function (ok) {
          if (!ok) { self.goLocal(); say("Couldn't load the Supabase library — saving to this browser only."); return; }
          try {
            self.client = window.supabase.createClient(CONFIG.url, CONFIG.anonKey);
            self.goShared();
          } catch (e) { self.goLocal(); }
        });
      },
      goShared: function () {
        var self = this; this.kind = "shared";
        this.client.from("threads").select("*").eq("page_url", PAGE_URL).then(function (res) {
          if (res.error) { self.goLocal(); say("Couldn't reach the shared store — saving to this browser only."); return; }
          self.threads = (res.data || []).map(function (d) { return clean(d.id, d); });
          refresh();
          self.subscribe();
        }, function () { self.goLocal(); say("Couldn't reach the shared store — saving to this browser only."); });
      },
      subscribe: function () {
        var self = this;
        this.channel = this.client.channel("rv-threads-" + PAGE_URL)
          .on("postgres_changes", { event: "*", schema: "public", table: "threads", filter: "page_url=eq." + PAGE_URL }, function (payload) {
            self.applyChange(payload);
          })
          .subscribe();
      },
      applyChange: function (payload) {
        if (payload.eventType === "DELETE") {
          this.threads = this.threads.filter(function (t) { return t.id !== payload.old.id; });
        } else {
          var t = clean(payload.new.id, payload.new);
          var idx = -1;
          for (var i = 0; i < this.threads.length; i++) if (this.threads[i].id === t.id) idx = i;
          if (idx >= 0) this.threads[idx] = t; else this.threads.push(t);
        }
        refresh();
      },
      goLocal: function () {
        this.kind = "local"; this.client = null;
        var raw = []; try { raw = JSON.parse(lsGet("rv:threads") || "[]"); } catch (e) {}
        this.threads = (Array.isArray(raw) ? raw : []).map(function (t) { return clean(t.id, t); });
        refresh();
      },
      saveLocal: function () { lsSet("rv:threads", JSON.stringify(this.threads)); },
      newId: function () { return uuid(); },
      add: function (id, data) {
        var row = { id: id, sel: data.sel, tag: data.tag, label: data.label, snippet: data.snippet,
          rx: data.rx, ry: data.ry, vw: data.vw, author: data.author, text: data.text,
          createdAt: data.createdAt, resolved: data.resolved, replies: data.replies, page_url: PAGE_URL };
        if (this.client) {
          this.threads.push(clean(id, row)); refresh(); // reflect immediately; the realtime event will reconcile it
          return this.client.from("threads").insert(row).then(function (res) { if (res.error) throw res.error; });
        }
        this.threads.push(clean(id, row)); this.saveLocal(); refresh(); return Promise.resolve();
      },
      patch: function (id, patch) {
        if (this.client) {
          var t = byId(id); if (t) { for (var k in patch) t[k] = patch[k]; refresh(); }
          return this.client.from("threads").update(patch).eq("id", id).then(function (res) { if (res.error) throw res.error; });
        }
        var t2 = byId(id); if (t2) { for (var k2 in patch) t2[k2] = patch[k2]; this.saveLocal(); refresh(); } return Promise.resolve();
      },
      remove: function (id) {
        if (this.client) {
          this.threads = this.threads.filter(function (t) { return t.id !== id; }); refresh();
          return this.client.from("threads").delete().eq("id", id).then(function (res) { if (res.error) throw res.error; });
        }
        this.threads = this.threads.filter(function (t) { return t.id !== id; }); this.saveLocal(); refresh(); return Promise.resolve();
      }
    };
    function loadSupabaseSdk(cb) {
      if (window.supabase && window.supabase.createClient) { cb(true); return; }
      var existing = document.querySelector('script[data-rv-supabase-sdk]');
      if (existing) { existing.addEventListener("load", function () { cb(true); }); existing.addEventListener("error", function () { cb(false); }); return; }
      var s = document.createElement("script");
      s.src = SUPABASE_SDK_URL; s.setAttribute("data-rv-supabase-sdk", "1");
      s.onload = function () { cb(true); };
      s.onerror = function () { cb(false); };
      document.head.appendChild(s);
    }
    function clean(id, d) {   /* pin down the shape of a thread regardless of where it came from */
      return { id: String(id), sel: String(d.sel || ""), tag: String(d.tag || ""), label: String(d.label || "Area"), snippet: String(d.snippet || ""),
        rx: Math.min(1, Math.max(0, Number(d.rx) || 0)), ry: Math.min(1, Math.max(0, Number(d.ry) || 0)), vw: Number(d.vw) || 0,
        author: String(d.author || "Unnamed").slice(0, 30), text: String(d.text || "").slice(0, 2000), createdAt: Number(d.createdAt) || 0,
        resolved: !!d.resolved,
        replies: (Array.isArray(d.replies) ? d.replies : []).slice(0, 100).map(function (r) { return { author: String(r.author || "Unnamed").slice(0, 30), text: String(r.text || "").slice(0, 2000), at: Number(r.at) || 0 }; }) };
    }
    function byId(id) { for (var i = 0; i < Store.threads.length; i++) if (Store.threads[i].id === id) return Store.threads[i]; return null; }
    function sorted() { return Store.threads.slice().sort(function (a, b) { return a.createdAt - b.createdAt; }); }
    function numberOf(id) { var s = sorted(); for (var i = 0; i < s.length; i++) if (s[i].id === id) return i + 1; return 0; }
    function failed() { say("Couldn't save. Please check your Supabase connection and permissions."); }

    /* ---------- Rendering ---------- */
    function refresh() { renderPins(); renderList(); renderPop(); }

    function renderPins() {
      layer.textContent = "";
      sorted().forEach(function (t, i) {
        var el = findEl(t); if (!el) return;
        var p = docPos(el, t.rx, t.ry);
        var b = h("button", { type: "button", "class": "rv-pin" + (t.resolved ? " is-done" : "") + (t.id === openId ? " is-open" : ""),
          "aria-label": "Comment " + (i + 1) + ": " + t.text.slice(0, 40), on: { click: function () { openThread(t.id, false); } } },
          h("span", { text: t.resolved ? "✓" : String(i + 1) }));
        b.style.left = p.x + "px"; b.style.top = p.y + "px";
        layer.appendChild(b);
      });
      if (draft) {
        var dp = docPos(draft.el, draft.rx, draft.ry);
        var d = h("div", { "class": "rv-pin is-draft" }, h("span", { text: "+" }));
        d.style.left = dp.x + "px"; d.style.top = dp.y + "px"; layer.appendChild(d);
      }
      updateHighlight();
    }

    function renderList() {
      var all = sorted(), open = all.filter(function (t) { return !t.resolved; }), done = all.filter(function (t) { return t.resolved; });
      $("#rv-count").textContent = String(open.length);
      $("#rv-tab-open").textContent = "Open " + open.length;
      $("#rv-tab-done").textContent = "Resolved " + done.length;
      $("#rv-tab-open").setAttribute("aria-selected", String(filter === "open"));
      $("#rv-tab-done").setAttribute("aria-selected", String(filter === "done"));
      $("#rv-storage").textContent = Store.kind === "shared" ? "Anyone with this link sees the same comments in real time."
        : Store.kind === "local" ? "Comments are saved only in this browser right now." : "Loading comments…";
      list.textContent = "";
      var rows = filter === "open" ? open : done;
      if (!rows.length) {
        list.appendChild(h("li", { "class": "rv-empty" },
          h("strong", { text: filter === "open" ? "No open comments yet" : "No resolved comments yet" }),
          h("span", { text: filter === "open" ? "Turn on comment mode in the bar below, then click what you'd like to flag." : "Resolve a comment to see it here." })));
        return;
      }
      rows.forEach(function (t) {
        var found = !!findEl(t), n = numberOf(t.id);
        var meta = h("div", { "class": "rv-meta" }, h("b", { text: t.author }));
        meta.appendChild(document.createTextNode("  " + ago(t.createdAt) + (t.replies.length ? "  " + t.replies.length + " replies" : "")));
        var row = h("button", { type: "button", "class": "row", on: { click: function () { openThread(t.id, true); } } },
          h("span", { "class": "rv-num", text: t.resolved ? "✓" : String(n) }), meta,
          h("div", { "class": "rv-text", text: t.text }),
          h("div", { "class": "rv-where" + (found ? "" : " lost"), text: found ? t.label + (t.snippet ? ": " + t.snippet : "") : "Couldn't find this on the page (" + t.label + ")" }));
        list.appendChild(h("li", { "class": (t.resolved ? "is-done" : "") + (t.id === openId ? " is-open" : "") }, row));
      });
    }

    function nameField() {
      if (meInput.value.trim()) return null;
      return h("input", { type: "text", id: "rv-pop-name", maxlength: "30", placeholder: "Name (e.g. Jane)", "aria-label": "Name" });
    }
    function takeName() {
      var f = $("#rv-pop-name"), v = (f ? f.value : meInput.value).trim();
      if (!v) { if (f) f.focus(); say("Please enter a name so people know who left this."); return null; }
      meInput.value = v; lsSet("rv:name", v); return v;
    }
    function submitKeys(fn) { return function (e) { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); fn(); } }; }

    function renderPop() {
      var t = openId ? byId(openId) : null;
      if (openId && !t) openId = null;
      if (!draft && !t) { pop.style.display = "none"; updateHighlight(); return; }
      var keepText = (pop.querySelector("textarea") || {}).value || "", keepName = ($("#rv-pop-name") || {}).value || "";
      pop.textContent = "";
      var target = draft ? draft.el : findEl(t);
      var label = draft ? draft.label + (draft.snippet ? ": " + draft.snippet : "") : t.label + (t.snippet ? ": " + t.snippet : "");
      pop.appendChild(h("div", { "class": "rv-pop-head" },
        h("span", { text: (draft ? "New comment  " : "#" + numberOf(t.id) + "  ") + label }),
        h("button", { type: "button", "aria-label": "Close", on: { click: closePop } }, document.createTextNode("×"))));

      var ta = h("textarea", { "aria-label": draft ? "Comment text" : "Reply text", placeholder: draft ? "What would you like changed?" : "Write a reply" });
      ta.value = keepText;
      var nf = nameField(); if (nf) nf.value = keepName;

      if (draft) {
        ta.addEventListener("keydown", submitKeys(saveDraft));
        pop.appendChild(h("div", { "class": "rv-form" }, nf, ta,
          h("div", { "class": "rv-actions" }, h("span", { "class": "rv-hint grow", text: "Ctrl/⌘ + Enter to save" }),
            h("button", { type: "button", "class": "rv-btn", text: "Cancel", on: { click: closePop } }),
            h("button", { type: "button", "class": "rv-btn primary", text: "Save comment", on: { click: saveDraft } }))));
      } else {
        var msgs = h("div", { "class": "rv-msgs" });
        [{ author: t.author, text: t.text, at: t.createdAt }].concat(t.replies).forEach(function (m) {
          var meta = h("div", { "class": "rv-meta" }, h("b", { text: m.author })); meta.appendChild(document.createTextNode("  " + ago(m.at)));
          msgs.appendChild(h("div", { "class": "rv-msg" }, meta, h("p", { text: m.text })));
        });
        pop.appendChild(msgs);
        var send = function () { saveReply(t.id); };
        ta.addEventListener("keydown", submitKeys(send)); ta.style.minHeight = "52px";
        pop.appendChild(h("div", { "class": "rv-form" }, nf, ta,
          h("div", { "class": "rv-actions" },
            h("button", { type: "button", "class": "rv-btn danger", text: confirmDel ? "Confirm delete" : "Delete", on: { click: function () { removeThread(t.id); } } }),
            h("span", { "class": "grow" }),
            h("button", { type: "button", "class": "rv-btn done", text: t.resolved ? "Reopen" : "Mark resolved", on: { click: function () { toggleResolved(t.id); } } }),
            h("button", { type: "button", "class": "rv-btn primary", text: "Save reply", on: { click: send } }))));
        setTimeout(function () { msgs.scrollTop = msgs.scrollHeight; }, 0);
      }
      pop.style.display = "block";
      placePop(target, draft ? draft.rx : (t ? t.rx : 0), draft ? draft.ry : (t ? t.ry : 0));
      updateHighlight();
    }

    function placePop(target, rx, ry) {
      if (!target || isSheet()) { pop.classList.add("is-sheet"); pop.style.left = ""; pop.style.top = ""; return; }
      pop.classList.remove("is-sheet");
      var p = docPos(target, rx, ry), w = pop.offsetWidth, ph = pop.offsetHeight;
      var sideW = (document.documentElement.classList.contains("rv-side-open") ? 340 : 0);
      var maxX = window.scrollX + window.innerWidth - sideW - w - 12;
      var x = Math.max(window.scrollX + 12, Math.min(p.x + 16, maxX));
      var y = p.y + 14;
      if (y + ph > window.scrollY + window.innerHeight - 70 && p.y - ph - 36 > window.scrollY) y = p.y - ph - 36;
      pop.style.left = x + "px"; pop.style.top = y + "px";
    }

    function updateHighlight() {
      var t = openId ? byId(openId) : null;
      var el = (mode === "comment" && hoverEl && !draft) ? hoverEl : draft ? draft.el : t ? findEl(t) : null;
      if (!el) { hoverBox.style.display = "none"; return; }
      var r = el.getBoundingClientRect();
      hoverBox.style.display = "block";
      hoverBox.style.left = r.left + "px"; hoverBox.style.top = r.top + "px"; hoverBox.style.width = r.width + "px"; hoverBox.style.height = r.height + "px";
      hoverBox.firstElementChild.textContent = labelFor(el);
    }

    /* ---------- Actions ---------- */
    function setMode(m) {
      mode = m; hoverEl = null;
      document.documentElement.classList.toggle("rv-commenting", m === "comment");
      $("#rv-browse").setAttribute("aria-pressed", String(m === "browse"));
      $("#rv-comment").setAttribute("aria-pressed", String(m === "comment"));
      if (m === "browse" && draft) { draft = null; refresh(); } else updateHighlight();
    }
    function setSide(open) { document.documentElement.classList.toggle("rv-side-open", open); setTimeout(refresh, 220); }
    function closePop() { draft = null; openId = null; confirmDel = false; refresh(); }

    function startDraft(el, cx, cy) {
      var r = el.getBoundingClientRect();
      openId = null; confirmDel = false;
      draft = { el: el, sel: selectorFor(el), tag: el.tagName.toLowerCase(), label: labelFor(el), snippet: snippetFor(el),
        rx: r.width ? Math.min(1, Math.max(0, (cx - r.left) / r.width)) : 0, ry: r.height ? Math.min(1, Math.max(0, (cy - r.top) / r.height)) : 0 };
      refresh();
      var f = $("#rv-pop-name") || pop.querySelector("textarea"); if (f) f.focus();
    }
    function saveDraft() {
      if (!draft) return;
      var ta = pop.querySelector("textarea"), text = ta.value.trim();
      if (!text) { ta.focus(); return; }
      var name = takeName(); if (!name) return;
      var id = Store.newId();
      var data = { sel: draft.sel, tag: draft.tag, label: draft.label, snippet: draft.snippet, rx: draft.rx, ry: draft.ry,
        vw: window.innerWidth, author: name, text: text, createdAt: Date.now(), resolved: false, replies: [] };
      draft = null; ta.value = ""; filter = "open";
      Store.add(id, data).then(function () { say("Comment saved."); }, failed);
      refresh();
    }
    function saveReply(id) {
      var t = byId(id), ta = pop.querySelector("textarea"); if (!t || !ta) return;
      var text = ta.value.trim(); if (!text) { ta.focus(); return; }
      var name = takeName(); if (!name) return;
      ta.value = "";
      Store.patch(id, { replies: t.replies.concat([{ author: name, text: text, at: Date.now() }]) }).then(null, failed);
    }
    function toggleResolved(id) {
      var t = byId(id); if (!t) return; var next = !t.resolved;
      Store.patch(id, { resolved: next }).then(function () { say(next ? "Marked as resolved." : "Reopened the comment."); }, failed);
      if (next) { openId = null; refresh(); }
    }
    function removeThread(id) {
      if (!confirmDel) { confirmDel = true; renderPop(); return; }
      confirmDel = false; openId = null;
      Store.remove(id).then(function () { say("Comment deleted."); }, failed);
      refresh();
    }
    function openThread(id, scroll) {
      var t = byId(id); if (!t) return;
      draft = null; confirmDel = false; openId = id;
      var el = findEl(t);
      if (scroll && el) {
        var y = docPos(el, t.rx, t.ry).y - window.innerHeight * 0.3;
        var rm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: Math.max(0, y), behavior: rm ? "auto" : "smooth" });
        if (isSheet()) setSide(false);
      }
      refresh();
    }

    /* ---------- Event wiring ---------- */
    document.addEventListener("mousemove", function (e) {
      if (mode !== "comment" || draft) return;
      var el = pickTarget(e); if (el !== hoverEl) { hoverEl = el; updateHighlight(); }
    });
    document.addEventListener("click", function (e) {
      if (mode !== "comment") return;
      if (e.target.closest && e.target.closest("[data-rv]")) return;
      e.preventDefault(); e.stopPropagation();          /* while in comment mode, don't let links/buttons on the page actually fire */
      var el = pickTarget(e); if (el) startDraft(el, e.clientX, e.clientY);
    }, true);
    document.addEventListener("keydown", function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || "");
      if (e.key === "Escape") { if (draft || openId) closePop(); else if (mode === "comment") setMode("browse"); return; }
      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && (e.key === "c" || e.key === "C")) setMode(mode === "comment" ? "browse" : "comment");
    });
    window.addEventListener("scroll", updateHighlight, { passive: true });
    window.addEventListener("resize", function () { clearTimeout(refresh.t); refresh.t = setTimeout(refresh, 80); });
    if (window.ResizeObserver) new ResizeObserver(function () { renderPins(); }).observe(site);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { renderPins(); });

    $("#rv-browse").addEventListener("click", function () { setMode("browse"); });
    $("#rv-comment").addEventListener("click", function () { setMode("comment"); });
    $("#rv-toggle-side").addEventListener("click", function () { setSide(!document.documentElement.classList.contains("rv-side-open")); });
    $("#rv-side-close").addEventListener("click", function () { setSide(false); });
    $("#rv-tab-open").addEventListener("click", function () { filter = "open"; renderList(); });
    $("#rv-tab-done").addEventListener("click", function () { filter = "done"; renderList(); });
    $("#rv-intro-close").addEventListener("click", function () { $("#rv-intro").style.display = "none"; lsSet("rv:introDismissed", "1"); setTimeout(refresh, 0); });
    meInput.addEventListener("change", function () { lsSet("rv:name", meInput.value.trim()); });

    meInput.value = lsGet("rv:name") || "";
    if (lsGet("rv:introDismissed")) $("#rv-intro").style.display = "none";
    if (window.innerWidth >= 1100) document.documentElement.classList.add("rv-side-open");
    refresh();
    Store.init();
    setInterval(function () { if (!pop.contains(document.activeElement)) renderList(); }, 60000);
  }

  function start() {
    if (!isReviewModeActive()) return;
    injectHead();
    injectBody();
    boot();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
