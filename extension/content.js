// LiReader content script.
// Extracts the main article text and renders an immersive reader overlay with
// an Office-style ribbon (File / Edit / Focus / Layout), bionic reading,
// spotlight focus, colored highlighting, and PDF export with a linked outline.
(() => {
  "use strict";
  if (window.__lireader) return;
  window.__lireader = true;

  // ---------------------------------------------------------------------------
  // Styles (injected once into <head>)
  // ---------------------------------------------------------------------------
  const CSS = `
    #lireader-overlay {
      position: fixed; inset: 0; z-index: 2147483647;
      background-color: #fcfbfa; color: #1f1f1f; color-scheme: light;
      display: none; flex-direction: column;
      font-family: var(--lr-family, Georgia, serif);
    }
    /* ---- Ribbon ---- */
    #lireader-overlay .lr-ribbon {
      background: #C3C4D6; border-bottom: 1px solid #b0b1c4; flex: 0 0 auto;
    }
    #lireader-overlay .lr-tabstrip {
      display: flex; align-items: center; gap: 2px;
      padding: 4px 8px 0; border-bottom: 1px solid #b0b1c4;
    }
    #lireader-overlay .lr-title {
      flex: 1 1 200px; font: 600 13px system-ui, sans-serif;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      padding: 0 10px; color: #1f1f1f !important;
      -webkit-text-fill-color: #1f1f1f !important;
    }
    #lireader-overlay .lr-tab {
      border: 1px solid transparent; border-bottom: none; background: transparent;
      padding: 8px 14px; font: 13px system-ui, sans-serif; cursor: pointer;
      border-radius: 4px 4px 0 0; color: #333 !important;
      -webkit-text-fill-color: #333 !important; text-transform: none !important;
      letter-spacing: normal !important; opacity: 1 !important; visibility: visible !important;
    }
    #lireader-overlay .lr-tab.active {
      background: #eceef8; border-color: #b0b1c4; color: #1f6feb !important;
      -webkit-text-fill-color: #1f6feb !important; font-weight: 600;
    }
    #lireader-overlay .lr-panel {
      display: none; align-items: center; gap: 10px; padding: 10px 16px; flex-wrap: wrap;
    }
    #lireader-overlay .lr-panel.active { display: flex; }
    #lireader-overlay .lr-label {
      font: 12px system-ui, sans-serif; color: #666 !important;
      -webkit-text-fill-color: #666 !important;
    }
    #lireader-overlay .lr-hint {
      font: 12px system-ui, sans-serif; color: #888 !important;
      -webkit-text-fill-color: #888 !important;
    }
    #lireader-overlay .lr-size {
      font: 13px system-ui, sans-serif; color: #333 !important;
      -webkit-text-fill-color: #333 !important; min-width: 24px; text-align: center;
    }
    /* ---- Buttons / selects ---- */
    #lireader-overlay .lr-btn {
      border: 1px solid #ddd; background: #fff; border-radius: 6px;
      padding: 5px 10px; font: 13px system-ui, sans-serif; cursor: pointer;
      color: #1f1f1f !important; -webkit-text-fill-color: #1f1f1f !important;
      text-transform: none !important; letter-spacing: normal !important;
      opacity: 1 !important; visibility: visible !important;
    }
    #lireader-overlay .lr-btn.active {
      background: #1f6feb; color: #fff !important;
      -webkit-text-fill-color: #fff !important; border-color: #1f6feb;
    }
    #lireader-overlay .lr-btn-primary {
      background: #1f6feb; color: #fff !important;
      -webkit-text-fill-color: #fff !important; border-color: #1f6feb;
      font-weight: 600;
    }
    #lireader-overlay .lr-select {
      border: 1px solid #ddd; border-radius: 6px; padding: 5px;
      font: 13px system-ui, sans-serif; background: #fff;
      color: #1f1f1f !important; -webkit-text-fill-color: #1f1f1f !important;
    }
    #lireader-overlay .lr-input {
      border: 1px solid #ddd; border-radius: 6px; padding: 5px 8px;
      font: 13px system-ui, sans-serif; background: #fff; min-width: 180px;
      color: #1f1f1f !important; -webkit-text-fill-color: #1f1f1f !important;
    }
    #lireader-overlay .lr-close {
      border: none; background: transparent; font-size: 15px; padding: 8px 10px;
    }
    /* ---- Reading line / content ---- */
    #lireader-overlay .lr-reading-line {
      position: fixed; top: 50vh; left: 50%; width: var(--lr-width, 70%);
      transform: translateX(-50%);
      border-top: 2px dashed rgba(31,111,235,.7);
      pointer-events: none; display: none; z-index: 6;
    }
    #lireader-overlay .lr-content {
      flex: 1; overflow-y: auto; padding: 32px 24px;
      width: var(--lr-width, 70%); max-width: none;
      margin: 0 auto; box-sizing: border-box;
    }
    #lireader-overlay .lr-range { width: 180px; accent-color: #1f6feb; }
    #lireader-overlay .lr-content,
    #lireader-overlay .lr-para, #lireader-overlay .lr-heading {
      user-select: text !important; -webkit-user-select: text !important;
    }
    #lireader-overlay .lr-para, #lireader-overlay .lr-heading,
    #lireader-overlay .lr-figure, #lireader-overlay .lr-math { transition: color .18s ease, opacity .18s ease; }
    #lireader-overlay .lr-para::selection, #lireader-overlay .lr-para *::selection,
    #lireader-overlay .lr-heading::selection, #lireader-overlay .lr-heading *::selection {
      background: #b6d4fe !important; color: #1f1f1f !important;
      -webkit-text-fill-color: #1f1f1f !important;
    }
    #lireader-overlay .lr-para, #lireader-overlay .lr-heading {
      color: #1f1f1f !important; -webkit-text-fill-color: #1f1f1f !important;
      visibility: visible !important;
    }
    #lireader-overlay .lr-para {
      font-size: var(--lr-font-size, 18px) !important; line-height: 1.75 !important;
      margin: 0 0 1.1em; display: block !important;
    }
    #lireader-overlay .lr-heading {
      font-size: calc(var(--lr-font-size, 18px) * 1.35); line-height: 1.3;
      margin: 1.5em 0 .6em; font-family: var(--lr-family, Georgia, serif);
      scroll-margin-top: 110px;
    }
    #lireader-overlay .lr-bionic { font-weight: 700; }
    /* ---- Citation markers (distinct from body text, links preserved) ---- */
    #lireader-overlay .lr-para sup.lr-cite, #lireader-overlay .lr-para sub.lr-cite {
      font-size: 0.68em; font-weight: 400; line-height: 0;
      color: #3b6fc0 !important; -webkit-text-fill-color: #3b6fc0 !important;
      vertical-align: super;
    }
    #lireader-overlay .lr-para a.lr-cite-link {
      color: #3b6fc0 !important; -webkit-text-fill-color: #3b6fc0 !important;
      text-decoration: none; font-weight: 400;
    }
    #lireader-overlay .lr-para a.lr-cite-link:hover { text-decoration: underline; }
    #lireader-overlay .lr-para a:not(.lr-cite-link) {
      color: #3b6fc0; text-decoration: underline dotted rgba(59,111,192,.45);
    }
    #lireader-overlay .lr-figure { margin: 1.2em 0; text-align: center; }
    #lireader-overlay img {
      max-width: 100% !important; height: auto !important;
      visibility: visible !important; opacity: 1 !important;
      position: static !important; transform: none !important; filter: none !important;
    }
    #lireader-overlay .lr-figure img, #lireader-overlay .lr-para img {
      display: block !important; width: auto !important; margin: 0.45em auto !important;
      border-radius: 4px; background: #fff;
    }
    #lireader-overlay .lr-figcaption {
      font: 13px/1.5 system-ui, sans-serif; color: #555 !important;
      -webkit-text-fill-color: #555 !important; margin-top: 6px; text-align: left;
    }
    #lireader-overlay .lr-math { margin: 0.8em 0; }
    #lireader-overlay .lr-math-display { text-align: center; overflow-x: auto; }
    #lireader-overlay .lr-math math { font-size: 1.05em; }
    #lireader-overlay .lr-xsnow-hint {
      display: none; padding: 6px 16px; font: 12px system-ui, sans-serif;
      color: #333; background: #eef0f8; border-top: 1px solid #d9dbe8;
    }
    /* ---- Outline (jump links) ---- */
    #lireader-overlay .lr-outline {
      border: 1px solid #e5e5e5; border-radius: 8px; background: #fff;
      padding: 14px 18px; margin: 0 0 1.6em;
    }
    #lireader-overlay .lr-outline-title {
      font: 700 12px system-ui, sans-serif; text-transform: uppercase;
      letter-spacing: .04em; color: #666; margin-bottom: 6px;
    }
    #lireader-overlay .lr-outline ul { margin: 0; padding-left: 1.3em; list-style: none; }
    #lireader-overlay .lr-outline li { font: 15px system-ui, sans-serif; margin: 3px 0; }
    #lireader-overlay .lr-outline details { margin: 2px 0; }
    #lireader-overlay .lr-outline details > summary { cursor: pointer; user-select: none; }
    #lireader-overlay .lr-outline details[open] > summary { margin-bottom: 2px; }
    #lireader-overlay .lr-outline a {
      color: #1f6feb !important; -webkit-text-fill-color: #1f6feb !important;
      text-decoration: none;
    }
    #lireader-overlay .lr-outline a:hover { text-decoration: underline; }
    /* ---- Spotlight states ----
       Text is dimmed with color, not opacity, so selection and highlight
       marks stay visible and clickable. Figures still fade as a whole. */
    #lireader-overlay .lr-para.lr-focus, #lireader-overlay .lr-heading.lr-focus {
      opacity: 1 !important;
      color: #1f1f1f !important; -webkit-text-fill-color: #1f1f1f !important;
    }
    #lireader-overlay .lr-para.lr-near, #lireader-overlay .lr-heading.lr-near {
      opacity: 1 !important;
      color: rgba(31,31,31,.48) !important; -webkit-text-fill-color: rgba(31,31,31,.48) !important;
    }
    #lireader-overlay .lr-para.lr-dim, #lireader-overlay .lr-heading.lr-dim {
      opacity: 1 !important;
      color: rgba(31,31,31,.22) !important; -webkit-text-fill-color: rgba(31,31,31,.22) !important;
    }
    #lireader-overlay .lr-figure.lr-focus, #lireader-overlay .lr-math.lr-focus { opacity: 1 !important; }
    #lireader-overlay .lr-figure.lr-near, #lireader-overlay .lr-math.lr-near { opacity: .6 !important; }
    #lireader-overlay .lr-figure.lr-dim, #lireader-overlay .lr-math.lr-dim { opacity: .28 !important; }
    /* ---- Selection bar ---- */
    #lireader-overlay .lr-selection-bar {
      position: fixed; display: none; align-items: center; gap: 6px; background: #fff;
      border: 1px solid #ddd; border-radius: 8px; padding: 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,.14); z-index: 2147483647;
    }
    #lireader-overlay .lr-color {
      width: 22px; height: 22px; border-radius: 4px; padding: 0; border: 1px solid #bbb;
    }
    #lireader-overlay .lr-sep { width: 1px; height: 22px; background: #e0e0e0; }
    #lireader-overlay mark.lr-hl,
    #lireader-overlay .lr-para.lr-dim mark.lr-hl,
    #lireader-overlay .lr-para.lr-near mark.lr-hl,
    #lireader-overlay .lr-heading.lr-dim mark.lr-hl,
    #lireader-overlay .lr-heading.lr-near mark.lr-hl {
      background-color: var(--lr-hl, #ffe08a) !important;
      color: #1f1f1f !important; -webkit-text-fill-color: #1f1f1f !important;
      opacity: 1 !important;
    }
    /* ---- Lookup card (dictionary / Wikipedia / translate) ---- */
    #lireader-overlay .lr-card {
      position: fixed; display: none; width: 380px; max-width: 90vw; max-height: 62vh;
      overflow-y: auto; background: #fff; border: 1px solid #ddd; border-radius: 10px;
      box-shadow: 0 8px 30px rgba(0,0,0,.18); padding: 14px 16px; z-index: 2147483647;
      font: 14px/1.55 system-ui, sans-serif; color: #1f1f1f;
    }
    #lireader-overlay .lr-card-title { font-weight: 700; font-size: 17px; margin-bottom: 4px; }
    #lireader-overlay .lr-card-phonetic { color: #666; margin-bottom: 8px; }
    #lireader-overlay .lr-card-pos { font-style: italic; color: #1f6feb; margin: 8px 0 2px; }
    #lireader-overlay .lr-card-def { margin: 3px 0; }
    #lireader-overlay .lr-card-example { color: #777; margin: 2px 0 6px; }
    #lireader-overlay .lr-card-thumb { max-width: 100%; border-radius: 6px; margin: 6px 0; }
    #lireader-overlay .lr-card-body { margin-top: 6px; }
    #lireader-overlay .lr-card-link { color: #1f6feb; text-decoration: none; display: inline-block; margin-top: 10px; }
    #lireader-overlay .lr-card-source { color: #666; border-bottom: 1px solid #eee; padding-bottom: 6px; margin-bottom: 8px; }
    #lireader-overlay .lr-card-translated { font-size: 15px; }
    #lireader-overlay .lr-card-empty { color: #888; }
    #lireader-overlay .lr-card-close {
      position: absolute; top: 8px; right: 10px; border: none; background: transparent;
      font-size: 15px; cursor: pointer; color: #888;
    }
    #lireader-overlay .lr-card-loading { display: flex; align-items: center; gap: 8px; color: #888; padding: 8px 0; }
    #lireader-overlay .lr-spinner {
      width: 16px; height: 16px; border: 2px solid #ddd; border-top-color: #1f6feb;
      border-radius: 50%; animation: lr-spin .8s linear infinite; display: inline-block;
    }
    @keyframes lr-spin { to { transform: rotate(360deg); } }
  `;

  // ---------------------------------------------------------------------------
  // Bionic reading helpers
  // ---------------------------------------------------------------------------
  const FUNCTION_WORDS = new Set([
    // prepositions
    "about","above","across","after","against","along","among","around","at","before",
    "behind","below","beneath","beside","between","beyond","by","down","during","except",
    "for","from","in","inside","into","near","of","off","on","onto","out","over","past",
    "since","through","to","toward","under","until","up","upon","with","within","without",
    // conjunctions
    "and","but","or","nor","so","yet","because","although","though","while","whereas",
    "if","unless","than","as","whether","either","neither",
    // articles / determiners
    "a","an","the","this","that","these","those","each","every","some","any","no",
    "many","much","more","most","few","several","such","both","all",
    // pronouns
    "i","you","he","she","it","we","they","me","him","her","us","them","my","your",
    "his","its","our","their","mine","yours","hers","ours","theirs","who","whom",
    "whose","which","what","one",
    // auxiliaries / copula
    "is","am","are","was","were","be","been","being","have","has","had","do","does",
    "did","will","would","shall","should","can","could","may","might","must","ought",
  ]);

  const VOWELS = "aeiouy";

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function firstSyllable(word) {
    const w = word.toLowerCase();
    let i = 0;
    while (i < w.length && !VOWELS.includes(w[i])) i++;
    if (i >= w.length) return Math.max(1, Math.floor(w.length / 2));
    let j = i;
    while (j < w.length && VOWELS.includes(w[j])) j++;
    while (j < w.length && !VOWELS.includes(w[j])) j++;
    return j;
  }

  function bionicWord(word) {
    const core = word.replace(/^[^A-Za-z]+/, "").replace(/[^A-Za-z]+$/, "");
    if (!/^[A-Za-z]+$/.test(core)) return null;
    if (core.length < 3 || FUNCTION_WORDS.has(core.toLowerCase())) return null;
    const idx = firstSyllable(core);
    if (idx <= 0 || idx >= core.length) return null;
    const start = word.indexOf(core);
    return {
      lead: word.slice(0, start),
      prefix: core.slice(0, idx),
      rest: core.slice(idx),
      trail: word.slice(start + core.length),
    };
  }

  function bionicHtml(text) {
    const escaped = escapeHtml(text);
    return escaped.replace(/[A-Za-z][A-Za-z'-]*/g, (word) => {
      const r = bionicWord(word);
      if (!r) return word;
      return `${r.lead}<b class="lr-bionic">${r.prefix}</b>${r.rest}${r.trail}`;
    });
  }

  // ---- DOM-based paragraph rendering: citations + bionic on real text only ----

  const BRACKET_CITE_RE = /\[\s*\d+(?:\s*[-,–]\s*\d+)*(?:\s*,\s*\d+(?:\s*[-,–]\s*\d+)*)*\s*\]/g;

  function bionicTextToNodes(text) {
    const frag = document.createDocumentFragment();
    const re = /[A-Za-z][A-Za-z'-]*/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const word = m[0];
      const r = bionicWord(word);
      if (r) {
        const b = document.createElement("b");
        b.className = "lr-bionic";
        b.textContent = r.lead + r.prefix;
        frag.appendChild(b);
        frag.appendChild(document.createTextNode(r.rest + r.trail));
      } else {
        frag.appendChild(document.createTextNode(word));
      }
      last = m.index + word.length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    return frag;
  }

  // Bold first syllables of text nodes, but leave links and citation markers
  // (which are not body prose) untouched.
  function bionicize(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      let p = walker.currentNode.parentElement;
      let skip = false;
      while (p && p !== root) {
        const t = p.tagName;
        if (t === "A" || t === "SUP" || t === "SUB" || t === "MATH") { skip = true; break; }
        p = p.parentElement;
      }
      if (!skip) nodes.push(walker.currentNode);
    }
    for (const n of nodes) {
      const frag = bionicTextToNodes(n.nodeValue);
      n.parentNode.replaceChild(frag, n);
    }
  }

  // Turn bracketed citations like [1,2] or [1-3] into styled superscripts.
  function wrapBracketCitations(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const p = walker.currentNode.parentElement;
      if (p && (p.tagName === "A" || p.tagName === "SUP" || p.tagName === "SUB" || p.tagName === "MATH")) continue;
      nodes.push(walker.currentNode);
    }
    for (const n of nodes) {
      const text = n.nodeValue;
      BRACKET_CITE_RE.lastIndex = 0;
      if (!BRACKET_CITE_RE.test(text)) continue;
      BRACKET_CITE_RE.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0, m;
      while ((m = BRACKET_CITE_RE.exec(text))) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const sup = document.createElement("sup");
        sup.className = "lr-cite";
        sup.textContent = m[0];
        frag.appendChild(sup);
        last = m.index + m[0].length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      n.parentNode.replaceChild(frag, n);
    }
  }

  // Style existing <sup>/<sub> and any anchor that is a citation link.
  function styleCitationLinks(root) {
    root.querySelectorAll("sup, sub").forEach((el) => el.classList.add("lr-cite"));
    root.querySelectorAll("a").forEach((a) => {
      const t = (a.textContent || "").trim();
      if (/^\[?\s*\d/.test(t) || a.closest("sup, sub")) a.classList.add("lr-cite-link");
    });
  }

  function renderParagraph(el, html, bionic) {
    el.innerHTML = html;
    wrapBracketCitations(el);
    styleCitationLinks(el);
    if (bionic) bionicize(el);
  }

  // ---------------------------------------------------------------------------
  // Article extraction (Readability-lite)
  // ---------------------------------------------------------------------------
  const NOISE_SELECTOR = [
    "script", "style", "noscript", "iframe", "form", "button", "input", "select", "textarea",
    "nav", "footer", "[role='navigation']", "[role='banner']", "[role='contentinfo']",
    ".ref-list", ".references", "#references", ".bibliography", ".citation-list",
    ".related-articles", ".recommended-articles", ".further-reading", ".related-articles-list",
    ".article-tools", ".social-share", ".share-buttons", ".metrics", ".author-information",
  ].join(",");

  const BLOCK_TAGS = new Set([
    "P", "DIV", "SECTION", "ARTICLE", "LI", "BLOCKQUOTE", "UL", "OL", "TABLE",
    "PRE", "H1", "H2", "H3", "H4", "H5", "H6", "FIGURE", "PICTURE",
  ]);

  // Publisher full-text containers. Several sections that share a selector
  // (Wiley, PMC) are grouped and scored together.
  const BODY_SELECTORS = [
    "[itemprop='articleBody']",
    "#body", "div.Body", ".article__body", "#bodymatter",
    "div.c-article-body", ".c-article-body", "section.ArticleBody",
    ".article-body", "#article-body", "div.article-body",
    "section.article-section__content", "#article__content",
    ".hlFld-Fulltext", "#pnlArticleContent", ".JournalFullText",
    ".tsec", "#mc", "#articleBody", ".article__sections", ".ArticleBody",
    "#html-body", ".html-body", "#html-content",
    ".fulltext-view", "#fulltext",
    ".ltx_page_content", "article.ltx_document",
    "#articleContent", ".article_content", ".article-content", ".document-content",
    "section.body", ".j-body", ".article-text", ".article-fulltext",
    "#article-fulltext", ".widget-ArticleFulltext", ".NLM_sec",
    ".article-section__content",
  ];

  const LAZY_ATTRS = [
    "data-src", "data-original", "data-original-src", "data-lazy-src", "data-lazy",
    "data-full-src", "data-full", "data-large", "data-large-src", "data-zoom-src",
    "data-high-res-src", "data-hi-res-src", "data-hires", "data-href", "data-url",
    "data-image", "data-actualsrc",
  ];

  function looksLikeImageUrl(url) {
    return /\.(png|jpe?g|gif|webp|svg|bmp|tiff?)($|[?#])/i.test(url) ||
      /[?&](format|ext)=(png|jpe?g|webp)/i.test(url);
  }

  function bestSrcsetUrl(srcset) {
    let best = "", bestW = -1;
    for (const part of String(srcset || "").split(",")) {
      const bits = part.trim().split(/\s+/);
      if (!bits[0] || /^data:/i.test(bits[0])) continue;
      const desc = bits[1] || "";
      let w = 100;
      if (/^\d+(\.\d+)?w$/i.test(desc)) w = parseFloat(desc);
      else if (/^\d+(\.\d+)?x$/i.test(desc)) w = parseFloat(desc) * 1600;
      if (w >= bestW) { bestW = w; best = bits[0]; }
    }
    return best;
  }

  function isJunkImage(url, alt, img) {
    const blob = ((url || "") + " " + (alt || "")).toLowerCase();
    if (/(\/|\b)(logo|icon|sprite|badge|avatar|spinner|placeholder|pixel|tracking|favicon)s?(\/|\b|\.)/.test(blob)) return true;
    const w = img ? parseInt(img.getAttribute("width") || "0", 10) : 0;
    const h = img ? parseInt(img.getAttribute("height") || "0", 10) : 0;
    if (w && h && w <= 40 && h <= 40) return true;
    if (/^data:image\/gif/i.test(url || "") && (url || "").length < 800) return true;
    return false;
  }

  function imageCandidates(img, scope) {
    if (!img) return [];
    const urls = [];
    const push = (u) => {
      if (!u) return;
      const v = String(u).trim();
      if (!v || /^blob:/i.test(v)) return;
      if (/^data:/i.test(v)) {
        if (/^data:image\/(?:png|jpe?g|webp)/i.test(v) && v.length > 1500) urls.push(v);
        return;
      }
      urls.push(v);
    };
    const sources = [];
    const picture = img.closest && img.closest("picture");
    if (picture) picture.querySelectorAll("source").forEach((s) => sources.push(s));
    sources.push(img);
    for (const el of sources) {
      push(bestSrcsetUrl(el.getAttribute("srcset") || el.getAttribute("data-srcset") || ""));
    }
    for (const attr of LAZY_ATTRS) push(img.getAttribute(attr));
    const box = scope || (img.closest && (img.closest("figure") || img.parentElement)) || img;
    if (box && box.querySelectorAll) {
      box.querySelectorAll("a[href]").forEach((a) => {
        const href = a.getAttribute("href") || "";
        if (looksLikeImageUrl(href)) push(href);
      });
    }
    push(img.getAttribute("src"));
    const seen = new Set();
    const unique = [];
    for (const u of urls) {
      if (seen.has(u)) continue;
      seen.add(u);
      unique.push(u);
    }
    unique.sort((a, b) => {
      const aj = /thumb|thumbnail|\/small\/|preview|icon/i.test(a) ? 1 : 0;
      const bj = /thumb|thumbnail|\/small\/|preview|icon/i.test(b) ? 1 : 0;
      return aj - bj;
    });
    return unique;
  }

  function pickImageUrl(img, scope) {
    const list = imageCandidates(img, scope);
    return list.length ? list[0] : "";
  }

  function styleBackgroundUrl(el) {
    const style = (el && el.getAttribute && el.getAttribute("style")) || "";
    const m = style.match(/url\(\s*(['"]?)([^"')]+)\1\s*\)/i);
    return m ? m[2] : "";
  }

  function backgroundImageUrl(el) {
    if (!el || el.nodeType !== 1) return "";
    const own = styleBackgroundUrl(el);
    if (own && !/^data:/i.test(own)) return own;
    if (!el.querySelectorAll) return "";
    const nodes = el.querySelectorAll("[style*='url(']");
    for (const n of nodes) {
      const u = styleBackgroundUrl(n);
      if (u && !/^data:/i.test(u)) return u;
    }
    return "";
  }

  function extractImg(el) {
    const imgEls = el.tagName === "IMG" ? [el] : Array.from(el.querySelectorAll("img"));
    const images = [];
    const seen = new Set();
    for (const img of imgEls) {
      const alts = imageCandidates(img, el).filter((src) => !isJunkImage(src, img.getAttribute("alt") || "", img));
      const src = alts[0];
      if (!src || seen.has(src)) continue;
      seen.add(src);
      images.push({ src, alt: img.getAttribute("alt") || "", alts });
    }
    if (!images.length) {
      const bg = backgroundImageUrl(el);
      if (bg && !isJunkImage(bg, "", null)) images.push({ src: bg, alt: "" });
    }
    if (!images.length) return null;
    const capEl = el.querySelector && (
      el.querySelector("figcaption") ||
      el.querySelector(".caption, .figure-caption, .figcaption, .c-article-figure__caption")
    );
    const caption = capEl ? (capEl.innerText || capEl.textContent || "").trim() : "";
    return { type: "img", src: images[0].src, alt: images[0].alt, images, caption };
  }

  function nodeText(el) {
    const visible = (el.innerText || "").replace(/\s+/g, " ").trim();
    if (visible) return visible;
    return (el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function isFigureLike(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName === "IMG" || el.tagName === "PICTURE" || el.tagName === "FIGURE") return true;
    if (!el.querySelector || !el.querySelector("img")) {
      return !!backgroundImageUrl(el) && /figure|graphic|illustration/i.test((el.className || "") + " " + (el.id || ""));
    }
    const idc = ((el.className || "") + " " + (el.id || "")).toString();
    if (!/figure|fig\b|graphic|illustration|image-panel/i.test(idc)) return false;
    if (el.querySelectorAll("p").length > 2 && nodeText(el).length > 900) return false;
    return true;
  }

  function isMathBlock(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName === "MATH") return true;
    const c = (el.className || "").toString();
    if (/katex-display|MathJax|mjx-container/.test(c)) return true;
    if (/\bformula\b|display-math|equation/i.test(c) && el.querySelector("math, .katex, mjx-container, img")) return true;
    return false;
  }

  function collectBlocks(root) {
    const out = [];
    function walk(el) {
      if (!el || el.nodeType !== 1) return;
      if (isFigureLike(el)) {
        const im = extractImg(el);
        if (im) { out.push(im); return; }
        if (el.querySelector && el.querySelector("svg")) {
          out.push({ type: "math", html: el.outerHTML, display: true });
          return;
        }
        if (el.tagName === "FIGURE" || el.tagName === "PICTURE" || el.tagName === "IMG") return;
      }
      if (el.tagName === "SVG" && el.querySelector("path, text")) {
        out.push({ type: "math", html: el.outerHTML, display: true });
        return;
      }
      if (isMathBlock(el) && el.tagName !== "P") {
        out.push({ type: "math", html: el.outerHTML, display: true });
        return;
      }
      const tag = el.tagName;
      const text = nodeText(el);
      if (!text && tag !== "TABLE" && tag !== "PRE") return;
      if (/^H[1-6]$/.test(tag)) {
        out.push({ type: "h", level: Number(tag[1]), text, html: el.innerHTML });
        return;
      }
      if (tag === "TABLE" || tag === "PRE" || tag === "BLOCKQUOTE") {
        out.push({ type: "p", text, html: el.outerHTML });
        return;
      }
      const kids = Array.from(el.children).filter((c) => c.nodeType === 1);
      const hasBlockChild = kids.some((c) => BLOCK_TAGS.has(c.tagName) || isFigureLike(c));
      if (!hasBlockChild) {
        if (text) out.push({ type: "p", text, html: el.innerHTML });
        return;
      }
      kids.forEach(walk);
    }
    walk(root);
    return out;
  }

  function normHeading(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .replace(/^\d+(\.\d+)*[\s.:)\-]*/, "")
      .trim();
  }

  function isStartHeading(text) {
    const t = normHeading(text);
    if (t.length > 48) return false;
    return /^(abstract|summary|synopsis|precis)$/i.test(t) || /^(摘要|概要|文摘)$/.test(t);
  }

  function isEndHeading(text) {
    const t = normHeading(text);
    if (t.length > 72) return false;
    return /^(references|reference list|bibliography|literature cited|works cited|cited literature|notes and references|references and notes)$/i.test(t) ||
      /^(参考文献|引用文献|相关文章|推荐阅读)$/.test(t) ||
      /^(related articles|recommended articles|similar articles)$/i.test(t);
  }

  // Keep Abstract → just before References. A "reference" prefix match used to
  // cut the paper at headings like "Reference frames"; only real section
  // titles count, and only after the article has actually started.
  function trimToAbstractReference(blocks) {
    let start = 0;
    let end = blocks.length;
    const earlyLimit = Math.max(8, Math.floor(blocks.length * 0.25));
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].type !== "h") continue;
      const raw = blocks[i].text || "";
      if (start === 0 && i <= earlyLimit && isStartHeading(raw)) start = i;
      if (i > start + 2 && i > Math.max(4, blocks.length * 0.12) && isEndHeading(raw)) {
        end = i;
        break;
      }
    }
    if (end < start) end = blocks.length;
    return blocks.slice(start, end);
  }

  function hasAbstractHeading(blocks) {
    return blocks.some((b) => b.type === "h" && isStartHeading(b.text || ""));
  }

  function findAbstractElement() {
    const sels = [
      "#abstract", "#Abs1", "#abs001", "#abstracts", "#abstract-1",
      "section.abstract", "[role='doc-abstract']", ".article-abstract",
      ".JournalAbstract", "section[data-title='Abstract']", "#ab-abstract",
    ];
    for (const sel of sels) {
      let el = null;
      try { el = document.querySelector(sel); } catch (e) { el = null; }
      if (el && !inReader(el) && nodeText(el).length > 80) return el;
    }
    const heads = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"));
    const h = heads.find((x) => !inReader(x) && isStartHeading(x.innerText || x.textContent || ""));
    if (!h) return null;
    const box = h.closest("section, .abstract, #abstract") || h.parentElement;
    return box && nodeText(box).length > 80 ? box : null;
  }

  function extractAbstractFromOriginal() {
    const abs = findAbstractElement();
    if (!abs) return [];
    const clone = abs.cloneNode(true);
    clone.querySelectorAll("script,style,nav,sup,sub,svg,img,button").forEach((n) => n.remove());
    const text = nodeText(clone).replace(/^(abstract|summary|摘要|概要)\s*:?\s*/i, "").trim();
    if (!text) return [];
    const paras = text.split(/\n{2,}|\n/).map((s) => s.trim()).filter((s) => s.length > 40).slice(0, 8);
    return paras.map((t) => ({ type: "p", text: t, html: escapeHtml(t) }));
  }

  function unhideTree(root) {
    const nodes = [root].concat(Array.from(root.querySelectorAll("[hidden], [style]")));
    for (const el of nodes) {
      if (!el || el.nodeType !== 1) continue;
      el.removeAttribute("hidden");
      el.removeAttribute("aria-hidden");
      const s = el.getAttribute("style");
      if (!s) continue;
      if (/display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0/i.test(s)) {
        const next = s
          .replace(/display\s*:\s*none\s*;?/gi, "")
          .replace(/visibility\s*:\s*hidden\s*;?/gi, "")
          .replace(/opacity\s*:\s*0(?:\.0+)?\s*;?/gi, "");
        if (next.trim()) el.setAttribute("style", next);
        else el.removeAttribute("style");
      }
    }
  }

  function cleanNode(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll(NOISE_SELECTOR).forEach((n) => n.remove());
    clone.querySelectorAll("header").forEach((h) => {
      const idc = ((h.className || "") + " " + (h.id || "")).toString();
      if (h.querySelector("nav") || /site|page|banner|journal-header|topbar/i.test(idc)) h.remove();
    });
    unhideTree(clone);
    return clone;
  }

  function paragraphChars(el) {
    let n = 0;
    el.querySelectorAll("p").forEach((p) => { n += nodeText(p).length; });
    if (n < 200) n = Math.max(n, nodeText(el).length);
    return n;
  }

  function scoreElements(els) {
    let chars = 0, imgs = 0, heads = 0, links = 0;
    for (const el of els) {
      chars += paragraphChars(el);
      imgs += el.querySelectorAll("img, figure").length;
      heads += el.querySelectorAll("h1,h2,h3,h4,h5,h6").length;
      links += el.querySelectorAll("a").length;
    }
    const linkPenalty = chars > 0 ? Math.min(chars * 0.45, links * 25) : links * 25;
    return chars + imgs * 280 + heads * 40 - linkPenalty;
  }

  function findBestRootGroup() {
    const seen = new Set();
    const groups = [];
    function addGroup(els) {
      const uniq = [];
      for (const el of els) {
        if (!el || seen.has(el)) continue;
        if (uniq.some((u) => u.contains(el) || el.contains(u))) continue;
        uniq.push(el);
      }
      if (!uniq.length) return;
      uniq.forEach((el) => seen.add(el));
      groups.push(uniq);
    }
    for (const sel of BODY_SELECTORS) {
      let els = [];
      try { els = Array.from(document.querySelectorAll(sel)); } catch (e) { els = []; }
      els = els.filter((el) => !inReader(el) && nodeText(el).length > 180);
      if (!els.length) continue;
      const disjoint = els.filter((el) => !els.some((other) => other !== el && other.contains(el)));
      if (disjoint.length > 1) addGroup(disjoint);
      else disjoint.forEach((el) => addGroup([el]));
    }
    Array.from(document.querySelectorAll("article, main, [role='main']")).forEach((el) => {
      if (!inReader(el) && nodeText(el).length > 180) addGroup([el]);
    });
    let best = null;
    let bestScore = 700;
    for (const group of groups) {
      const score = scoreElements(group);
      if (score > bestScore) { bestScore = score; best = group; }
    }
    return best;
  }

  function materializeGroup(group) {
    const holder = document.createElement("div");
    const abs = findAbstractElement();
    const coversAbs = abs && group.some((el) => el === abs || el.contains(abs) || abs.contains(el));
    const bodyText = group.map((el) => nodeText(el)).join(" ").replace(/\s+/g, " ").toLowerCase();
    const absText = abs ? nodeText(abs).replace(/\s+/g, " ").trim() : "";
    const absKey = absText.replace(/^(abstract|summary|摘要|概要)\s*:?\s*/i, "").slice(0, 80).toLowerCase();
    const absInBody = absKey.length > 40 && bodyText.includes(absKey);
    if (abs && !coversAbs && !absInBody) holder.appendChild(cleanNode(abs));
    for (const el of group) {
      if (abs && el === abs) continue;
      holder.appendChild(cleanNode(el));
    }
    return holder;
  }

  function richness(blocks) {
    let chars = 0, imgs = 0, paras = 0;
    for (const b of blocks) {
      if (b.type === "p" || b.type === "h") chars += (b.text || "").length;
      if (b.type === "img") imgs += (b.images && b.images.length) || 1;
      if (b.type === "p") paras += 1;
    }
    return { chars, imgs, paras, score: chars + imgs * 450 + paras * 20 };
  }

  function mergeMissingImages(blocks, donor) {
    if (!donor) return blocks;
    if (blocks.some((b) => b.type === "img")) return blocks;
    const imgs = donor.filter((b) => b.type === "img");
    if (!imgs.length) return blocks;
    const out = blocks.slice();
    for (const img of imgs) {
      const cap = (img.caption || img.alt || "").replace(/\s+/g, " ").trim().slice(0, 48).toLowerCase();
      let at = out.length;
      if (cap.length > 8) {
        const found = out.findIndex((b) => (b.text || "").replace(/\s+/g, " ").toLowerCase().includes(cap));
        if (found >= 0) at = found;
      }
      out.splice(at, 0, img);
    }
    return out;
  }

  function inReader(el) {
    return !!(el && el.closest && el.closest("#lireader-overlay"));
  }

  function readerFreeDocument() {
    const clone = document.cloneNode(true);
    clone.querySelectorAll("#lireader-overlay, #lireader-style").forEach((n) => n.remove());
    return clone;
  }

  function readabilityBlocks() {
    if (typeof Readability === "undefined") return { title: "", blocks: [] };
    try {
      const article = new Readability(readerFreeDocument(), { charThreshold: 280 }).parse();
      if (!article || !article.content) return { title: "", blocks: [] };
      const holder = document.createElement("div");
      holder.innerHTML = article.content;
      unhideTree(holder);
      return { title: article.title || "", blocks: collectBlocks(holder) };
    } catch (e) {
      return { title: "", blocks: [] };
    }
  }

  function extractArticle() {
    const h1 = document.querySelector("h1");
    let title = (h1 && (h1.innerText || h1.textContent || "").trim()) || document.title || "Untitled";

    let domBlocks = [];
    const group = findBestRootGroup();
    if (group) domBlocks = collectBlocks(materializeGroup(group));

    const readable = readabilityBlocks();
    if (readable.title) title = readable.title;

    const domR = richness(domBlocks);
    const rdR = richness(readable.blocks);
    let blocks;
    if (domR.paras >= 2 && (domR.chars >= 500 || domR.imgs > 0) &&
        (domR.score + (domR.imgs > rdR.imgs ? 400 : 0) >= rdR.score * 0.82)) {
      blocks = domBlocks;
      if (rdR.chars > domR.chars * 1.35 && rdR.chars > 1200) {
        blocks = mergeMissingImages(readable.blocks, domBlocks);
      }
    } else if (rdR.paras >= 1 && rdR.chars >= domR.chars) {
      blocks = mergeMissingImages(readable.blocks, domBlocks);
    } else {
      blocks = domBlocks.length ? domBlocks : readable.blocks;
    }

    if (blocks[0] && blocks[0].type === "h" &&
        blocks[0].text.trim().toLowerCase() === title.trim().toLowerCase()) {
      blocks.shift();
    }
    if (blocks.length && !hasAbstractHeading(blocks)) {
      const firstHead = blocks.findIndex((b) => b.type === "h");
      if (firstHead === 0) {
        const abs = extractAbstractFromOriginal();
        const already = abs.length && blocks.some((b) => b.type === "p" && abs[0].text.slice(0, 48) &&
          (b.text || "").includes(abs[0].text.slice(0, 48)));
        if (abs.length && !already) {
          blocks = [{ type: "h", level: 2, text: "Abstract", html: "Abstract" }].concat(abs, blocks);
        }
      }
    }
    blocks = trimToAbstractReference(blocks);
    return { title, blocks };
  }

  function slug(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "section";
  }

  function resolveUrl(src) {
    try { return new URL(src, location.href).href; } catch (e) { return src; }
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const state = {
    tab: "file",
    bionic: false,
    spotlight: false,
    fontSize: 20,
    fontFamily: "serif",
    margin: 75,
    translateTo: "zh-Hans",
    translateEngine: "microsoft",
    dictEngine: "freedictionary",
    msKey: "",
    title: "",
    blocks: [],
    selectedText: "",
    selRect: null,
    xsnow: false,
    xsnowWords: null,
    xsnowIndex: -1,
    xsnowAnchor: -1,
    xsnowSavedIndex: -1,
    xsnowPinning: false,
    cardType: null,
  };
  let overlay = null;
  let content = null;

  // ---------------------------------------------------------------------------
  // Overlay construction
  // ---------------------------------------------------------------------------
  function ensureOverlay() {
    if (overlay) return overlay;
    let style = document.getElementById("lireader-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "lireader-style";
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    overlay = document.createElement("div");
    overlay.id = "lireader-overlay";
    // Use the bundled background image for the reading view.
    try {
      const bg = chrome.runtime.getURL("imgs/background.png");
      overlay.style.backgroundImage = 'url("' + bg + '")';
      overlay.style.backgroundSize = "cover";
      overlay.style.backgroundPosition = "center";
      overlay.style.backgroundRepeat = "no-repeat";
      overlay.style.backgroundAttachment = "fixed";
    } catch (e) { /* keep the fallback background color */ }
    overlay.innerHTML = `
      <div class="lr-ribbon">
        <div class="lr-tabstrip">
          <span class="lr-title"></span>
          <button class="lr-tab active" data-tab="file">File</button>
          <button class="lr-tab" data-tab="edit">Edit</button>
          <button class="lr-tab" data-tab="focus">Focus</button>
          <button class="lr-tab" data-tab="layout">Layout</button>
          <button class="lr-tab" data-tab="settings">Settings</button>
          <button class="lr-btn lr-close" data-act="close">✕</button>
        </div>
        <div class="lr-panel active" data-panel="file">
          <button class="lr-btn lr-btn-primary" data-act="export-pdf">Save as PDF</button>
          <span class="lr-hint">Saves the text, your highlights, and a linked outline.</span>
        </div>
        <div class="lr-panel" data-panel="edit">
          <span class="lr-label">Font</span>
          <button class="lr-btn" data-act="font-">A−</button>
          <span class="lr-size">20</span>
          <button class="lr-btn" data-act="font+">A+</button>
          <select class="lr-select" data-act="family">
            <option value="serif">Serif</option>
            <option value="sans-serif">Sans</option>
            <option value="monospace">Mono</option>
          </select>
        </div>
        <div class="lr-panel" data-panel="focus">
          <button class="lr-btn" data-act="bionic">Bionic</button>
          <button class="lr-btn" data-act="spotlight">Spotlight</button>
          <button class="lr-btn" data-act="xsnow">XSnow</button>
        </div>
        <div class="lr-panel" data-panel="layout">
          <span class="lr-label">Margin</span>
          <input type="range" class="lr-range" data-act="margin" min="50" max="90" step="1" value="75">
          <span class="lr-size lr-margin-value">75%</span>
        </div>
        <div class="lr-panel" data-panel="settings">
          <span class="lr-label">Dictionary</span>
          <select class="lr-select" data-act="dictEngine">
            <option value="freedictionary">Free Dictionary</option>
            <option value="wiktionary">Wiktionary</option>
            <option value="datamuse">Datamuse</option>
          </select>
          <span class="lr-label">Translator</span>
          <select class="lr-select" data-act="translateEngine">
            <option value="microsoft">Microsoft</option>
            <option value="google">Google</option>
            <option value="lingva">Lingva</option>
          </select>
          <span class="lr-label">Translate to</span>
          <select class="lr-select" data-act="translateTo">
            <option value="zh-Hans">Chinese (Simplified)</option>
            <option value="zh-Hant">Chinese (Traditional)</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="es">Spanish</option>
          </select>
          <span class="lr-label">MS key</span>
          <input type="password" class="lr-input" data-act="msKey" placeholder="Microsoft Translator key">
        </div>
        <div class="lr-xsnow-hint">XSnow: ←→↑↓ move · Shift select · Enter link · Y/U/I highlight · J bold · K italic · L underline · Q/W/E lookup · R bionic · T spotlight · Esc exit</div>
      </div>
      <div class="lr-reading-line"></div>
      <div class="lr-content"></div>
      <div class="lr-selection-bar">
        <button class="lr-btn lr-color" data-edit="hl" data-color="#ffe08a" title="Highlight yellow" style="background:#ffe08a"></button>
        <button class="lr-btn lr-color" data-edit="hl" data-color="#aad4ff" title="Highlight blue" style="background:#aad4ff"></button>
        <button class="lr-btn lr-color" data-edit="hl" data-color="#ffb6d9" title="Highlight pink" style="background:#ffb6d9"></button>
        <span class="lr-sep"></span>
        <button class="lr-btn" data-edit="b" title="Bold">B</button>
        <button class="lr-btn" data-edit="i" title="Italic">I</button>
        <button class="lr-btn" data-edit="u" title="Underline">U</button>
        <span class="lr-sep"></span>
        <button class="lr-btn" data-lookup="dictionary" title="Dictionary">Dict</button>
        <button class="lr-btn" data-lookup="wiki" title="Wikipedia">Wiki</button>
        <button class="lr-btn" data-lookup="translate" title="Translate">Translate</button>
      </div>
      <div class="lr-card"></div>
    `;
    document.documentElement.appendChild(overlay);
    content = overlay.querySelector(".lr-content");

    // Tab switching + ribbon actions.
    overlay.querySelector(".lr-ribbon").addEventListener("click", (e) => {
      const tab = e.target.closest(".lr-tab");
      if (tab) { switchTab(tab.dataset.tab); return; }
      const actEl = e.target.closest("[data-act]");
      if (!actEl) return;
      const act = actEl.dataset.act;
      if (act === "close") toggleReader(false);
      else if (act === "bionic") toggleBionic();
      else if (act === "spotlight") toggleSpotlight();
      else if (act === "xsnow") toggleXSnow();
      else if (act === "font+") { setFontSize(1); }
      else if (act === "font-") { setFontSize(-1); }
      else if (act === "export-pdf") exportPDF();
    });

    overlay.querySelector(".lr-ribbon").addEventListener("change", (e) => {
      const act = e.target.dataset && e.target.dataset.act;
      if (act === "family") { state.fontFamily = e.target.value; applyFont(); saveSettings(); }
      else if (act === "margin") { state.margin = Number(e.target.value); applyMargin(); saveSettings(); }
      else if (act === "dictEngine") { state.dictEngine = e.target.value; saveSettings(); }
      else if (act === "translateEngine") { state.translateEngine = e.target.value; saveSettings(); }
      else if (act === "translateTo") { state.translateTo = e.target.value; saveSettings(); }
      else if (act === "msKey") { state.msKey = e.target.value.trim(); saveSettings(); }
    });

    // Live-update the margin while the slider is being dragged.
    overlay.querySelector(".lr-ribbon").addEventListener("input", (e) => {
      if (e.target.dataset && e.target.dataset.act === "margin") {
        state.margin = Number(e.target.value);
        applyMargin();
      }
    });

    const selectionBar = overlay.querySelector(".lr-selection-bar");
    selectionBar.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });
    selectionBar.addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit]");
      if (edit) { applyEdit(edit.dataset.edit, edit.dataset.color); return; }
      const lookup = e.target.closest("[data-lookup]");
      if (lookup) { hideSelectionBar(); doLookup(lookup.dataset.lookup); }
    });

    content.addEventListener("scroll", onContentScroll, { passive: true });
    window.addEventListener("resize", () => {
      if (!overlay || overlay.style.display !== "flex") return;
      if (state.xsnow && state.xsnowWords && state.xsnowIndex >= 0) {
        state.xsnowPinning = true;
        pinWordToLine(state.xsnowWords[state.xsnowIndex]);
        state.xsnowPinning = false;
      }
      updateSpotlight();
    });
    content.addEventListener("mouseup", onSelection);
    content.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href").slice(1);
      const target = content.querySelector('[id="' + id.replace(/"/g, '\\"') + '"]');
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: "smooth", block: "start" }); }
    });
    document.addEventListener("keydown", handleKey);

    const card = overlay.querySelector(".lr-card");
    card.addEventListener("click", (e) => {
      if (e.target.closest(".lr-card-close")) { card.style.display = "none"; state.cardType = null; }
    });
    document.addEventListener("mousedown", (e) => {
      if (overlay.style.display !== "flex") return;
      if (card.style.display === "block" &&
          !card.contains(e.target) && !e.target.closest(".lr-selection-bar")) {
        card.style.display = "none";
        state.cardType = null;
      }
    });
    return overlay;
  }

  function switchTab(tab) {
    state.tab = tab;
    overlay.querySelectorAll(".lr-tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
    overlay.querySelectorAll(".lr-panel").forEach((p) => p.classList.toggle("active", p.dataset.panel === tab));
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  function computeHeadingIds() {
    const used = new Map();
    return state.blocks.filter((b) => b.type === "h").map((h) => {
      const base = slug(h.text);
      const n = (used.get(base) || 0) + 1;
      used.set(base, n);
      return n === 1 ? base : base + "-" + n;
    });
  }

  // Build a nested heading tree from a flat heading list + their ids.
  function buildHeadingTree(heads, ids) {
    const nodes = heads.map((h, i) => ({
      text: h.text, level: h.level, id: ids[i], children: [],
    }));
    if (!nodes.length) return [];
    const base = Math.min(...nodes.map((n) => n.level));
    const root = { level: base - 1, children: [] };
    const stack = [root];
    for (const n of nodes) {
      while (stack.length > 1 && stack[stack.length - 1].level >= n.level) stack.pop();
      stack[stack.length - 1].children.push(n);
      stack.push(n);
    }
    return root.children;
  }

  function renderOutlineTree(nodes) {
    return "<ul>" + nodes.map(renderOutlineNode).join("") + "</ul>";
  }

  function renderOutlineNode(node) {
    const link = `<a href="#${node.id}">${escapeHtml(node.text)}</a>`;
    if (!node.children.length) return `<li>${link}</li>`;
    return `<li><details open><summary>${link}</summary>${renderOutlineTree(node.children)}</details></li>`;
  }

  function renderContent() {
    overlay.querySelector(".lr-title").textContent = state.title;
    content.innerHTML = "";
    const frag = document.createDocumentFragment();

    const heads = state.blocks.filter((b) => b.type === "h");
    const ids = computeHeadingIds();
    if (heads.length) {
      const nav = document.createElement("nav");
      nav.className = "lr-outline";
      nav.innerHTML =
        '<div class="lr-outline-title">Outline</div>' +
        renderOutlineTree(buildHeadingTree(heads, ids));
      frag.appendChild(nav);
    }

    let hi = 0;
    for (const b of state.blocks) {
      if (b.type === "h") {
        const el = document.createElement("h" + Math.min(b.level + 1, 6));
        el.className = "lr-block lr-heading";
        el.id = ids[hi++];
        el.innerHTML = b.editHtml != null ? b.editHtml : escapeHtml(b.text || "");
        wrapBracketCitations(el);
        styleCitationLinks(el);
        if (state.bionic) bionicize(el);
        frag.appendChild(el);
      } else if (b.type === "img") {
        const fig = document.createElement("figure");
        fig.className = "lr-block lr-figure";
        const list = (b.images && b.images.length) ? b.images : [{ src: b.src, alt: b.alt || "" }];
        for (const im of list) {
          if (!im || !im.src) continue;
          const img = document.createElement("img");
          img.alt = im.alt || b.alt || "";
          img.decoding = "async";
          img.referrerPolicy = "no-referrer-when-downgrade";
          if (im.alts && im.alts.length > 1) img.dataset.lrAlts = im.alts.slice(1).join("\n");
          img.src = resolveUrl(im.src);
          fig.appendChild(img);
        }
        if (b.caption) {
          const cap = document.createElement("figcaption");
          cap.className = "lr-figcaption";
          cap.textContent = b.caption;
          fig.appendChild(cap);
        }
        if (fig.querySelector("img")) frag.appendChild(fig);
      } else if (b.type === "math") {
        const wrap = document.createElement("div");
        wrap.className = "lr-block lr-math" + (b.display ? " lr-math-display" : "");
        wrap.innerHTML = b.html;
        frag.appendChild(wrap);
      } else {
        const html = b.html || escapeHtml(b.text || "");
        const blockish = /<(table|div|ul|ol|blockquote|pre|figure|math)\b/i.test(html);
        const el = document.createElement(blockish ? "div" : "p");
        el.className = "lr-block lr-para";
        renderParagraph(el, html, state.bionic);
        frag.appendChild(el);
      }
    }
    content.appendChild(frag);
    upgradeReaderImages(content);
    updateSpotlight();
    refreshXsnowWords();
  }

  function upgradeReaderImages(root) {
    root.querySelectorAll("img").forEach((img) => {
      const scope = img.closest("figure, .lr-para, .lr-heading") || img.parentElement;
      const prior = (img.dataset.lrAlts || "").split("\n").filter(Boolean);
      const seen = new Set();
      const alts = [];
      for (const src of imageCandidates(img, scope).concat(prior)) {
        if (!src || seen.has(src) || isJunkImage(src, img.getAttribute("alt") || "", img)) continue;
        seen.add(src);
        alts.push(src);
      }
      if (!alts.length) {
        img.remove();
        return;
      }
      img.removeAttribute("class");
      img.removeAttribute("style");
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      LAZY_ATTRS.forEach((attr) => img.removeAttribute(attr));
      img.dataset.lrAlts = alts.slice(1).join("\n");
      img.loading = "eager";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer-when-downgrade";
      img.addEventListener("error", () => {
        const rest = (img.dataset.lrAlts || "").split("\n").filter(Boolean);
        const next = rest.shift();
        img.dataset.lrAlts = rest.join("\n");
        if (next) img.src = resolveUrl(next);
      });
      img.src = resolveUrl(alts[0]);
    });
  }

  function applyFont() {
    overlay.style.setProperty("--lr-font-size", state.fontSize + "px");
    overlay.style.setProperty("--lr-family", state.fontFamily);
    overlay.querySelector(".lr-size").textContent = state.fontSize;
    overlay.querySelector("[data-act='family']").value = state.fontFamily;
  }

  function applyMargin() {
    overlay.style.setProperty("--lr-width", state.margin + "%");
    const range = overlay.querySelector("[data-act='margin']");
    if (range) range.value = state.margin;
    const val = overlay.querySelector(".lr-margin-value");
    if (val) val.textContent = state.margin + "%";
  }

  function applySettingsUI() {
    const dict = overlay.querySelector("[data-act='dictEngine']");
    if (dict) dict.value = state.dictEngine;
    const engine = overlay.querySelector("[data-act='translateEngine']");
    if (engine) engine.value = state.translateEngine;
    const sel = overlay.querySelector("[data-act='translateTo']");
    if (sel) sel.value = state.translateTo;
    const inp = overlay.querySelector("[data-act='msKey']");
    if (inp) inp.value = state.msKey || "";
  }

  function spotlightBlocks() {
    return Array.from(content.querySelectorAll(".lr-para, .lr-heading, .lr-figure, .lr-math"));
  }

  function readingLineY() {
    const line = overlay.querySelector(".lr-reading-line");
    const box = content.getBoundingClientRect();
    let y = window.innerHeight * 0.5;
    const minY = box.top + 28;
    const maxY = Math.max(minY, box.bottom - 36);
    if (y < minY) y = minY;
    if (y > maxY) y = maxY;
    if (line && line.style.display !== "none") line.style.top = y + "px";
    return y;
  }

  function syncReadingLine() {
    const on = !!(state.spotlight || state.xsnow);
    const line = overlay.querySelector(".lr-reading-line");
    if (!line) return;
    line.style.display = on ? "block" : "none";
    if (on) readingLineY();
  }

  function blockFromNode(node) {
    const el = node && (node.nodeType === 1 ? node : node.parentElement);
    return el && el.closest ? el.closest(".lr-para, .lr-heading, .lr-figure, .lr-math") : null;
  }

  function blockIndexAtLine(blocks, lineY) {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < blocks.length; i++) {
      const r = blocks[i].getBoundingClientRect();
      if (!r.height) continue;
      if (r.top <= lineY && r.bottom >= lineY) return i;
      const dist = r.bottom < lineY ? lineY - r.bottom : r.top - lineY;
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    return best;
  }

  function updateSpotlight() {
    if (!overlay || !content) return;
    const blocks = spotlightBlocks();
    const active = state.spotlight || state.xsnow;
    if (!active) {
      blocks.forEach((p) => p.classList.remove("lr-focus", "lr-near", "lr-dim"));
      return;
    }
    syncReadingLine();
    let bestIdx = 0;
    if (state.xsnow && state.xsnowWords && state.xsnowIndex >= 0) {
      const w = state.xsnowWords[state.xsnowIndex];
      const host = w && (w.block && w.block.isConnected ? w.block : blockFromNode(w.startContainer));
      const idx = host ? blocks.indexOf(host) : -1;
      bestIdx = idx >= 0 ? idx : blockIndexAtLine(blocks, readingLineY());
    } else {
      bestIdx = blockIndexAtLine(blocks, readingLineY());
    }
    blocks.forEach((p, i) => {
      p.classList.remove("lr-focus", "lr-near", "lr-dim");
      if (i === bestIdx) p.classList.add("lr-focus");
      else if (Math.abs(i - bestIdx) === 1) p.classList.add("lr-near");
      else p.classList.add("lr-dim");
    });
  }

  function onContentScroll() {
    if (state.xsnow && !state.xsnowPinning) followLineWithWord();
    updateSpotlight();
  }

  // ---------------------------------------------------------------------------
  // Selection + editing
  // ---------------------------------------------------------------------------
  function onSelection(e) {
    if (e.target.closest(".lr-selection-bar")) return;
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !content.contains(sel.anchorNode)) { hideSelectionBar(); return; }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      state.selectedText = sel.toString().trim();
      state.selRect = rect;
      const bar = overlay.querySelector(".lr-selection-bar");
      bar.style.display = "flex";
      const bw = bar.offsetWidth;
      bar.style.left = Math.max(8, Math.min(rect.left + rect.width / 2 - bw / 2, window.innerWidth - bw - 8)) + "px";
      bar.style.top = Math.max(8, rect.top - 44) + "px";
    }, 0);
  }

  function hideSelectionBar() {
    if (overlay) overlay.querySelector(".lr-selection-bar").style.display = "none";
  }

  function editTagFor(kind, color) {
    if (kind === "hl") {
      const m = document.createElement("mark");
      m.className = "lr-hl";
      m.style.setProperty("--lr-hl", color || "#ffe08a");
      m.style.backgroundColor = color || "#ffe08a";
      m.style.color = "inherit";
      return m;
    }
    if (kind === "b") return document.createElement("strong");
    if (kind === "i") return document.createElement("em");
    if (kind === "u") return document.createElement("u");
    return null;
  }

  function editTagMatches(el, kind) {
    if (!el || el.nodeType !== 1) return false;
    if (kind === "hl") return el.tagName === "MARK" && el.classList.contains("lr-hl");
    if (kind === "b") return el.tagName === "STRONG";
    if (kind === "i") return el.tagName === "EM";
    if (kind === "u") return el.tagName === "U";
    return false;
  }

  function unwrapElement(el) {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  }

  function wrapperAroundRange(range, kind) {
    let el = range.commonAncestorContainer;
    if (!el) return null;
    if (el.nodeType !== 1) el = el.parentElement;
    while (el && content && el !== content) {
      if (editTagMatches(el, kind)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function applyEdit(kind, color) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { hideSelectionBar(); return; }
    const range = sel.getRangeAt(0);
    if (!content.contains(range.commonAncestorContainer)) { hideSelectionBar(); return; }
    const startBlock = blockFromNode(range.startContainer);
    const endBlock = blockFromNode(range.endContainer);
    if (!startBlock || startBlock !== endBlock) { hideSelectionBar(); return; }
    const existing = wrapperAroundRange(range, kind);
    if (existing) {
      unwrapElement(existing);
      if (startBlock.normalize) startBlock.normalize();
      sel.removeAllRanges();
      hideSelectionBar();
      commitReaderEdits();
      return;
    }
    const el = editTagFor(kind, color);
    if (!el) { hideSelectionBar(); return; }
    try {
      const contents = range.extractContents();
      if (!contents.textContent) { hideSelectionBar(); return; }
      el.appendChild(contents);
      range.insertNode(el);
    } catch (err) { /* selection crossed a block boundary */ }
    sel.removeAllRanges();
    hideSelectionBar();
    commitReaderEdits();
  }

  function unwrapBionic(root) {
    root.querySelectorAll("b.lr-bionic").forEach((node) => {
      unwrapElement(node);
    });
    if (root.normalize) root.normalize();
  }

  // Write the live paragraphs back into the article model, with bionic
  // syllables removed, so highlights and other marks survive a re-render.
  function commitReaderEdits() {
    if (!content || !state.blocks) return;
    const nodes = content.querySelectorAll(".lr-heading, .lr-para");
    let i = 0;
    for (const block of state.blocks) {
      if (block.type === "img" || block.type === "math") continue;
      const el = nodes[i++];
      if (!el) break;
      const clone = el.cloneNode(true);
      unwrapBionic(clone);
      if (block.type === "h") block.editHtml = clone.innerHTML;
      else block.html = clone.innerHTML;
      block.text = clone.textContent || "";
    }
  }

  // ---- XSnow: keyboard-driven word navigation & hotkey actions ----

  function setFontSize(delta) {
    state.fontSize = Math.max(12, Math.min(32, state.fontSize + delta));
    applyFont();
    saveSettings();
    if (state.xsnow && state.xsnowWords && state.xsnowIndex >= 0) {
      state.xsnowPinning = true;
      pinWordToLine(state.xsnowWords[state.xsnowIndex]);
      updateSpotlight();
      state.xsnowPinning = false;
    }
  }

  function toggleBionic() {
    commitReaderEdits();
    state.bionic = !state.bionic;
    const btn = overlay.querySelector("[data-act='bionic']");
    if (btn) btn.classList.toggle("active", state.bionic);
    renderContent();
  }

  function toggleSpotlight() {
    state.spotlight = !state.spotlight;
    const btn = overlay.querySelector("[data-act='spotlight']");
    if (btn) btn.classList.toggle("active", state.spotlight);
    syncReadingLine();
    updateSpotlight();
  }

  function setXsnowHint(on) {
    const hint = overlay.querySelector(".lr-xsnow-hint");
    if (hint) hint.style.display = on ? "block" : "none";
  }

  // Locate the segment (text node + offset) containing a character index.
  function segAt(segs, charIndex) {
    let lo = 0, hi = segs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (segs[mid].start <= charIndex) lo = mid; else hi = mid - 1;
    }
    return segs[lo];
  }

  // Build an ordered list of words with their DOM range boundaries. Text inside
  // citations (sup/sub) and links is skipped; inline markup (<b>, <mark>, etc.)
  // is treated as transparent so a word is never split by bionic/edits.
  function collectWordRanges(root) {
    const ranges = [];
    const paras = root.querySelectorAll(".lr-para, .lr-heading");
    const blocks = paras.length ? Array.from(paras) : [root];
    const re = /[A-Za-z][A-Za-z'-]*/g;
    for (const block of blocks) {
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      const segs = [];
      let full = "";
      while (walker.nextNode()) {
        const n = walker.currentNode;
        let p = n.parentElement, skip = false;
        while (p && p !== block) {
          const t = p.tagName;
          if (t === "SUP" || t === "SUB" || t === "MATH") { skip = true; break; }
          p = p.parentElement;
        }
        if (skip) continue;
        const text = n.nodeValue;
        segs.push({ node: n, start: full.length, len: text.length });
        full += text;
      }
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(full))) {
        const s = m.index, e = m.index + m[0].length;
        const sSeg = segAt(segs, s);
        const eSeg = segAt(segs, e - 1);
        ranges.push({
          text: m[0],
          block,
          startContainer: sSeg.node,
          startOffset: s - sSeg.start,
          endContainer: eSeg.node,
          endOffset: (e - 1) - eSeg.start + 1,
        });
      }
    }
    return ranges;
  }

  function wordRect(w) {
    if (!w || !w.startContainer || !w.endContainer) return null;
    try {
      const r = document.createRange();
      r.setStart(w.startContainer, w.startOffset);
      r.setEnd(w.endContainer, w.endOffset);
      const rects = r.getClientRects();
      return rects.length ? rects[0] : null;
    } catch (e) {
      return null;
    }
  }

  function firstVisibleWordIndex() {
    if (!state.xsnowWords || !state.xsnowWords.length) return -1;
    const ctop = content.getBoundingClientRect().top;
    for (let i = 0; i < state.xsnowWords.length; i++) {
      const r = wordRect(state.xsnowWords[i]);
      if (r && r.bottom >= ctop) return i;
    }
    return state.xsnowWords.length - 1;
  }

  function openLinkUnderCursor() {
    const w = state.xsnowWords && state.xsnowWords[state.xsnowIndex];
    if (!w) return;
    const el = w.startContainer.nodeType === 1 ? w.startContainer : w.startContainer.parentElement;
    const a = el && el.closest ? el.closest("a[href]") : null;
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href) return;
    if (href.startsWith("#")) {
      const target = content.querySelector('[id="' + href.slice(1).replace(/"/g, '\\"') + '"]');
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.open(href, "_blank", "noopener");
    }
  }

  function selectWordRange(w) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    const r = document.createRange();
    r.setStart(w.startContainer, w.startOffset);
    r.setEnd(w.endContainer, w.endOffset);
    sel.addRange(r);
  }

  function selectRange(a, b) {
    if (!state.xsnowWords || !state.xsnowWords.length) return;
    const top = content.scrollTop;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const wl = state.xsnowWords[lo], wr = state.xsnowWords[hi];
    if (!wl || !wr || !wl.startContainer || !wr.endContainer) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    try {
      const r = document.createRange();
      r.setStart(wl.startContainer, wl.startOffset);
      r.setEnd(wr.endContainer, wr.endOffset);
      sel.addRange(r);
    } catch (e) { /* range detached after a re-render */ }
    if (content.scrollTop !== top) content.scrollTop = top;
  }

  function pinWordToLine(w) {
    if (!w) return;
    syncReadingLine();
    const rect = wordRect(w);
    if (!rect || !rect.height) return;
    const delta = (rect.top + rect.height / 2) - readingLineY();
    if (Math.abs(delta) < 1.5) return;
    content.scrollTop += delta;
  }

  function wordIndexNearestLine() {
    if (!state.xsnowWords || !state.xsnowWords.length) return -1;
    const y = readingLineY();
    const cur = state.xsnowWords[state.xsnowIndex];
    const curRect = cur ? wordRect(cur) : null;
    const anchorX = curRect ? curRect.left + curRect.width / 2 : content.getBoundingClientRect().left + 48;
    const blocks = spotlightBlocks();
    const host = blocks[blockIndexAtLine(blocks, y)] || null;
    function search(filterHost) {
      let best = -1, bestKey = Infinity;
      for (let i = 0; i < state.xsnowWords.length; i++) {
        const w = state.xsnowWords[i];
        if (filterHost && host && w.block && w.block !== host && !host.contains(w.block)) continue;
        const r = wordRect(w);
        if (!r || r.height < 1) continue;
        const dy = Math.abs((r.top + r.height / 2) - y);
        const dx = Math.abs((r.left + r.width / 2) - anchorX);
        const key = dy * 10000 + dx;
        if (key < bestKey) { bestKey = key; best = i; }
      }
      return best;
    }
    const hit = host ? search(true) : -1;
    return hit >= 0 ? hit : search(false);
  }

  function followLineWithWord() {
    if (!state.xsnowWords || !state.xsnowWords.length) return;
    if (state.xsnowAnchor !== state.xsnowIndex) return;
    const i = wordIndexNearestLine();
    if (i < 0 || i === state.xsnowIndex) return;
    state.xsnowIndex = i;
    state.xsnowAnchor = i;
    selectRange(i, i);
  }

  let xsnowPinToken = 0;
  function setXsnowIndex(i, shift) {
    if (!shift) state.xsnowAnchor = i;
    state.xsnowIndex = i;
    const w = state.xsnowWords[i];
    if (!w) return;
    const token = ++xsnowPinToken;
    state.xsnowPinning = true;
    selectRange(state.xsnowAnchor, state.xsnowIndex);
    pinWordToLine(w);
    updateSpotlight();
    requestAnimationFrame(() => {
      if (token !== xsnowPinToken) return;
      const cur = state.xsnowWords && state.xsnowWords[state.xsnowIndex];
      if (cur) pinWordToLine(cur);
      updateSpotlight();
      requestAnimationFrame(() => {
        if (token === xsnowPinToken) state.xsnowPinning = false;
      });
    });
  }

  function refreshXsnowWords() {
    if (!state.xsnow) return;
    const prev = state.xsnowIndex;
    state.xsnowWords = collectWordRanges(content);
    if (!state.xsnowWords.length) {
      state.xsnowIndex = -1;
      state.xsnowAnchor = -1;
      return;
    }
    state.xsnowIndex = Math.min(Math.max(prev, 0), state.xsnowWords.length - 1);
    state.xsnowAnchor = Math.min(Math.max(state.xsnowAnchor, 0), state.xsnowWords.length - 1);
    setXsnowIndex(state.xsnowIndex, state.xsnowAnchor !== state.xsnowIndex);
  }

  function moveVertical(dir, shift) {
    const cur = wordRect(state.xsnowWords[state.xsnowIndex]);
    if (!cur) return;
    const cx = cur.left + cur.width / 2;
    let best = null, bestKey = Infinity;
    for (let i = 0; i < state.xsnowWords.length; i++) {
      if (i === state.xsnowIndex) continue;
      const r = wordRect(state.xsnowWords[i]);
      if (!r) continue;
      const horiz = Math.abs((r.left + r.width / 2) - cx);
      if (dir === 1) { // down
        if (r.top <= cur.bottom) continue;
        const key = (r.top - cur.bottom) * 10000 + horiz;
        if (key < bestKey) { bestKey = key; best = i; }
      } else { // up
        if (r.bottom >= cur.top) continue;
        const key = (cur.top - r.bottom) * 10000 + horiz;
        if (key < bestKey) { bestKey = key; best = i; }
      }
    }
    if (best != null) setXsnowIndex(best, shift);
  }

  function toggleXSnow() {
    if (state.xsnow) { deactivateXSnow(); return; }
    state.xsnow = true;
    setXsnowHint(true);
    syncReadingLine();
    const btn = overlay.querySelector("[data-act='xsnow']");
    if (btn) btn.classList.add("active");
    state.xsnowWords = collectWordRanges(content);
    if (!state.xsnowWords.length) {
      state.xsnowIndex = -1;
      state.xsnowAnchor = -1;
      return;
    }
    let startIdx = state.xsnowSavedIndex;
    if (!(startIdx >= 0 && startIdx < state.xsnowWords.length)) startIdx = firstVisibleWordIndex();
    state.xsnowIndex = startIdx;
    state.xsnowAnchor = startIdx;
    setXsnowIndex(startIdx);
  }

  function deactivateXSnow() {
    state.xsnowSavedIndex = state.xsnowIndex;
    state.xsnow = false;
    state.xsnowWords = null;
    state.xsnowIndex = -1;
    state.xsnowAnchor = -1;
    setXsnowHint(false);
    syncReadingLine();
    updateSpotlight();
    const btn = overlay.querySelector("[data-act='xsnow']");
    if (btn) btn.classList.remove("active");
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
  }

  function wordWrapper(kind, color) {
    if (kind === "hl") {
      const m = document.createElement("mark");
      m.className = "lr-hl";
      m.style.setProperty("--lr-hl", color);
      m.style.backgroundColor = color;
      m.style.color = "inherit";
      return m;
    }
    if (kind === "b") return document.createElement("strong");
    if (kind === "i") return document.createElement("em");
    if (kind === "u") return document.createElement("u");
    return null;
  }

  function wordWrapperMatches(el, kind) {
    if (!el || el.nodeType !== 1) return false;
    if (kind === "hl") return el.tagName === "MARK" && el.classList.contains("lr-hl");
    if (kind === "b") return el.tagName === "STRONG";
    if (kind === "i") return el.tagName === "EM";
    if (kind === "u") return el.tagName === "U";
    return false;
  }

  function wrapSelectionWith(el) {
    if (!state.xsnowWords || !state.xsnowWords.length) return;
    const lo = Math.min(state.xsnowAnchor, state.xsnowIndex);
    const hi = Math.max(state.xsnowAnchor, state.xsnowIndex);
    const wl = state.xsnowWords[lo], wr = state.xsnowWords[hi];
    const r = document.createRange();
    r.setStart(wl.startContainer, wl.startOffset);
    r.setEnd(wr.endContainer, wr.endOffset);
    const text = r.toString();
    if (!text) return;
    r.deleteContents();
    el.textContent = text;
    r.insertNode(el);
    commitReaderEdits();
    // The DOM changed — rebuild word ranges and keep the cursor/selection.
    state.xsnowWords = collectWordRanges(content);
    state.xsnowIndex = Math.min(state.xsnowIndex, state.xsnowWords.length - 1);
    state.xsnowAnchor = Math.min(state.xsnowAnchor, state.xsnowWords.length - 1);
    if (state.xsnowIndex >= 0) selectRange(state.xsnowAnchor, state.xsnowIndex);
  }

  function toggleWordEdit(kind, color) {
    const w = state.xsnowWords && state.xsnowWords[state.xsnowIndex];
    if (!w) return;
    const el = w.startContainer.nodeType === 1 ? w.startContainer : w.startContainer.parentElement;
    // Toggle off if the current word is already wrapped in the matching tag.
    if (el && wordWrapperMatches(el, kind) && el.textContent.trim() === w.text.trim()) {
      el.replaceWith(document.createTextNode(el.textContent));
      commitReaderEdits();
      state.xsnowWords = collectWordRanges(content);
      state.xsnowIndex = Math.min(state.xsnowIndex, state.xsnowWords.length - 1);
      state.xsnowAnchor = Math.min(state.xsnowAnchor, state.xsnowWords.length - 1);
      if (state.xsnowIndex >= 0) selectRange(state.xsnowAnchor, state.xsnowIndex);
      return;
    }
    wrapSelectionWith(wordWrapper(kind, color));
  }

  function lookupWord(type) {
    if (!state.xsnowWords || !state.xsnowWords.length) return;
    const lo = Math.min(state.xsnowAnchor, state.xsnowIndex);
    const hi = Math.max(state.xsnowAnchor, state.xsnowIndex);
    const cur = state.xsnowWords[state.xsnowIndex];
    if (!cur) return;
    let text;
    if (type === "translate") {
      text = state.xsnowWords.slice(lo, hi + 1).map((w) => w.text).join(" ");
    } else {
      text = cur.text;
    }
    state.selectedText = text;
    state.selRect = wordRect(cur);
    doLookup(type);
  }

  function toggleLookup(type) {
    const card = overlay.querySelector(".lr-card");
    if (state.cardType === type && card && card.style.display === "block") {
      card.style.display = "none";
      state.cardType = null;
      return;
    }
    state.cardType = type;
    lookupWord(type);
  }

  function handleKey(e) {
    if (e.key === "Escape" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (state.xsnow) { e.preventDefault(); deactivateXSnow(); }
      else { toggleReader(false); }
      return;
    }
    if (!state.xsnow) return;
    // Let browser shortcuts (Ctrl / Meta / Alt) pass through untouched.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const el = document.activeElement;
    if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA")) return;
    const k = e.key;
    if (k === "Enter") {
      e.preventDefault();
      openLinkUnderCursor();
      return;
    }
    if (k === "ArrowRight" || k === "ArrowLeft" || k === "ArrowUp" || k === "ArrowDown") {
      e.preventDefault();
      if (!state.xsnowWords || !state.xsnowWords.length) return;
      if (k === "ArrowRight") setXsnowIndex(Math.min(state.xsnowIndex + 1, state.xsnowWords.length - 1), e.shiftKey);
      else if (k === "ArrowLeft") setXsnowIndex(Math.max(0, state.xsnowIndex - 1), e.shiftKey);
      else if (k === "ArrowDown") moveVertical(1, e.shiftKey);
      else if (k === "ArrowUp") moveVertical(-1, e.shiftKey);
      return;
    }
    const code = e.code || "";
    if (code === "KeyY") { e.preventDefault(); toggleWordEdit("hl", "#ffe08a"); }
    else if (code === "KeyU") { e.preventDefault(); toggleWordEdit("hl", "#aad4ff"); }
    else if (code === "KeyI") { e.preventDefault(); toggleWordEdit("hl", "#ffb6d9"); }
    else if (code === "KeyQ") { e.preventDefault(); toggleLookup("translate"); }
    else if (code === "KeyW") { e.preventDefault(); toggleLookup("wiki"); }
    else if (code === "KeyE") { e.preventDefault(); toggleLookup("dictionary"); }
    else if (code === "KeyA") { e.preventDefault(); setFontSize(-1); }
    else if (code === "KeyD") { e.preventDefault(); setFontSize(1); }
    else if (code === "KeyR") { e.preventDefault(); toggleBionic(); }
    else if (code === "KeyT") { e.preventDefault(); toggleSpotlight(); }
    else if (code === "KeyJ") { e.preventDefault(); toggleWordEdit("b"); }
    else if (code === "KeyK") { e.preventDefault(); toggleWordEdit("i"); }
    else if (code === "KeyL") { e.preventDefault(); toggleWordEdit("u"); }
  }

  // ---- Lookup: dictionary / Wikipedia / translate ----

  function bgFetch(url, opts) {
    return new Promise((resolve, reject) => {
      try {
        const msg = Object.assign({ type: "lireader-fetch", url }, opts || {});
        chrome.runtime.sendMessage(msg, (resp) => {
          if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
          if (resp && resp.ok) resolve(resp.text);
          else if (resp && resp.status) reject(new Error("HTTP " + resp.status));
          else reject(new Error((resp && resp.error) || "fetch failed"));
        });
      } catch (e) { reject(e); }
    });
  }

  function getCache(key) {
    return new Promise((resolve) => {
      try { chrome.storage.local.get(key, (r) => resolve(r && r[key])); }
      catch (e) { resolve(null); }
    });
  }
  function setCache(key, val) {
    try { chrome.storage.local.set({ [key]: val }); } catch (e) { /* ignore */ }
  }

  function renderDictionaryCard(data) {
    const e = data && data[0];
    if (!e) return '<div class="lr-card-empty">No definition found.</div>';
    const ph = e.phonetic || ((e.phonetics || []).find((p) => p.text) || {}).text || "";
    let html = '<div class="lr-card-title">' + escapeHtml(e.word) + "</div>";
    if (ph) html += '<div class="lr-card-phonetic">' + escapeHtml(ph) + "</div>";
    (e.meanings || []).slice(0, 2).forEach((m) => {
      html += '<div class="lr-card-pos">' + escapeHtml(m.partOfSpeech) + "</div>";
      (m.definitions || []).slice(0, 3).forEach((d) => {
        html += '<div class="lr-card-def">' + escapeHtml(d.definition) + "</div>";
        if (d.example) html += '<div class="lr-card-example">“' + escapeHtml(d.example) + "”</div>";
      });
    });
    return html;
  }

  function renderWiktionaryCard(word, extract) {
    // Try to surface the IPA pronunciation line if Wiktionary includes one.
    const ipaMatch = extract.match(/\/[^\/\n]{2,40}\//);
    const ipa = ipaMatch ? ipaMatch[0] : "";
    const all = extract.split(/\s+/);
    const body = all.slice(0, 500).join(" ");
    let html = '<div class="lr-card-title">' + escapeHtml(word) + "</div>";
    if (ipa) html += '<div class="lr-card-phonetic">' + escapeHtml(ipa) + "</div>";
    html += '<div class="lr-card-pos">Wiktionary</div>' +
      '<div class="lr-card-body">' + escapeHtml(body) + (all.length > 500 ? "…" : "") + "</div>";
    return html;
  }

  function renderDatamuseCard(word, data) {
    const e = data && data[0];
    if (!e || !(e.defs && e.defs.length)) {
      return '<div class="lr-card-empty">No definition found for “' + escapeHtml(word) + '”.</div>';
    }
    let html = '<div class="lr-card-title">' + escapeHtml(e.word || word) + "</div>";
    html += '<div class="lr-card-pos">Datamuse</div>';
    e.defs.slice(0, 6).forEach((d) => {
      const tab = d.indexOf("\t");
      const pos = tab > -1 ? d.slice(0, tab) : "";
      const def = tab > -1 ? d.slice(tab + 1) : d;
      if (pos) html += '<div class="lr-card-pos">' + escapeHtml(pos) + "</div>";
      html += '<div class="lr-card-def">' + escapeHtml(def) + "</div>";
    });
    return html;
  }

  async function doDictionary(word) {
    // Use a clean single token (strip selection punctuation and extra words).
    const clean = (word.match(/[A-Za-z][A-Za-z'-]*/) || [word])[0];
    const engine = state.dictEngine || "freedictionary";
    try {
      if (engine === "freedictionary") {
        const url = "https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(clean);
        return renderDictionaryCard(JSON.parse(await bgFetch(url, { timeout: 0 })));
      }
      if (engine === "wiktionary") {
        const url = "https://en.wiktionary.org/w/api.php?action=query&format=json&prop=extracts&explaintext=1&origin=*&titles=" + encodeURIComponent(clean);
        const data = JSON.parse(await bgFetch(url, { timeout: 0 }));
        const pages = data && data.query && data.query.pages;
        const page = pages && Object.values(pages)[0];
        if (page && page.extract && !page.missing) return renderWiktionaryCard(clean, page.extract);
        return '<div class="lr-card-empty">No definition found for “' + escapeHtml(clean) + '”.</div>';
      }
      if (engine === "datamuse") {
        const url = "https://api.datamuse.com/words?sp=" + encodeURIComponent(clean) + "&md=d&max=1";
        const data = JSON.parse(await bgFetch(url, { timeout: 0 }));
        return renderDatamuseCard(clean, data);
      }
      return '<div class="lr-card-empty">Unknown dictionary engine.</div>';
    } catch (err) {
      return '<div class="lr-card-empty">Lookup failed: ' + escapeHtml(String((err && err.message) || err)) + "</div>";
    }
  }

  function renderWikiCard(data) {
    const pages = data && data.query && data.query.pages;
    const page = pages && Object.values(pages)[0];
    if (!page || page.missing) return '<div class="lr-card-empty">No Wikipedia article found.</div>';
    let html = '<div class="lr-card-title">' + escapeHtml(page.title) + "</div>";
    if (page.thumbnail && page.thumbnail.source) {
      html += '<img class="lr-card-thumb" src="' + escapeHtml(page.thumbnail.source) + '" alt="">';
    }
    const words = (page.extract || "").trim().split(/\s+/);
    const body = words.slice(0, 500).join(" ");
    html += '<div class="lr-card-body">' + escapeHtml(body) + (words.length > 500 ? "…" : "") + "</div>";
    html += '<a class="lr-card-link" target="_blank" rel="noopener" href="https://en.wikipedia.org/wiki/' +
      encodeURIComponent(page.title) + '">Open in Wikipedia →</a>';
    return html;
  }

  function renderTranslateCard(text, source) {
    if (!text) return '<div class="lr-card-empty">Translation failed.</div>';
    return '<div class="lr-card-title">Translate</div>' +
      '<div class="lr-card-source">' + escapeHtml(source) + "</div>" +
      '<div class="lr-card-translated">' + escapeHtml(text) + "</div>";
  }

  function setCard(html) {
    const card = overlay.querySelector(".lr-card");
    card.innerHTML = html + '<button class="lr-card-close" title="Close">✕</button>';
    positionCard();
    card.style.display = "block";
  }

  function showCard(html) {
    setCard(html);
  }

  function showCardLoading(word) {
    setCard(
      '<div class="lr-card-title">' + escapeHtml(word) + "</div>" +
      '<div class="lr-card-loading"><span class="lr-spinner"></span> Loading…</div>'
    );
  }

  function positionCard() {
    const card = overlay.querySelector(".lr-card");
    const r = state.selRect;
    const w = 380;
    let left, top;
    if (r) {
      left = Math.min(r.left, window.innerWidth - w - 16);
      top = r.bottom + 10;
      if (top + 320 > window.innerHeight) top = Math.max(8, r.top - 330);
    } else {
      left = Math.max(8, (window.innerWidth - w) / 2);
      top = Math.max(8, window.innerHeight * 0.25);
    }
    card.style.left = Math.max(8, left) + "px";
    card.style.top = top + "px";
  }

  async function doLookup(type) {
    const word = (state.selectedText || "").trim();
    if (!word) return;
    const key = "lrlookup:" + type +
      (type === "dictionary" ? ":" + (state.dictEngine || "freedictionary") : "") +
      ":" + word.toLowerCase();
    // Cached results render instantly — no spinner.
    const cached = await getCache(key);
    if (cached) { showCard(cached); return; }
    showCardLoading(word);
    try {
      let html;
      if (type === "dictionary") {
        html = await doDictionary(word);
      } else if (type === "wiki") {
        const url = "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts%7Cpageimages&exintro=1&explaintext=1&redirects=1&piprop=thumbnail&pithumbsize=220&origin=*&titles=" + encodeURIComponent(word);
        html = renderWikiCard(JSON.parse(await bgFetch(url)));
      } else if (type === "translate") {
        html = await doTranslate(word);
      }
      if (html && html.indexOf("lr-card-empty") === -1 && html.length < 8000) setCache(key, html);
      showCard(html || '<div class="lr-card-empty">Nothing found.</div>');
    } catch (err) {
      showCard('<div class="lr-card-empty">Lookup failed: ' + escapeHtml(String((err && err.message) || err)) + "</div>");
    }
  }

  const LINGVA_BASE = "https://lingva.ml/api/v1";

  // Canonical language id → engine-specific code.
  const ENGINE_LANGS = {
    microsoft: { "zh-Hans": "zh-Hans", "zh-Hant": "zh-Hant", ja: "ja", ko: "ko", fr: "fr", de: "de", es: "es" },
    google:    { "zh-Hans": "zh-CN", "zh-Hant": "zh-TW", ja: "ja", ko: "ko", fr: "fr", de: "de", es: "es" },
    lingva:    { "zh-Hans": "zh", "zh-Hant": "zh_HANT", ja: "ja", ko: "ko", fr: "fr", de: "de", es: "es" },
  };

  function engineLang(engine, lang) {
    const m = ENGINE_LANGS[engine] || {};
    return m[lang] || lang;
  }

  async function translateViaGoogle(word, tl) {
    const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" +
      encodeURIComponent(tl) + "&dt=t&q=" + encodeURIComponent(word);
    const data = JSON.parse(await bgFetch(url));
    const t = Array.isArray(data && data[0]) ? data[0].map((seg) => seg && seg[0]).join("") : "";
    return renderTranslateCard(t, word);
  }

  async function doTranslate(word) {
    const engine = state.translateEngine || "microsoft";
    const tl = engineLang(engine, state.translateTo);
    if (engine === "microsoft") {
      if (!state.msKey) {
        // No key configured — fall back to Google so translate always works.
        return translateViaGoogle(word, engineLang("google", state.translateTo));
      }
      try {
        const url = "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=" + encodeURIComponent(tl);
        const data = JSON.parse(await bgFetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Ocp-Apim-Subscription-Key": state.msKey,
          },
          body: JSON.stringify([{ Text: word }]),
        }));
        const t = data && data[0] && data[0].translations && data[0].translations[0] && data[0].translations[0].text;
        return renderTranslateCard(t, word);
      } catch (e) {
        // Microsoft failed (e.g. region-scoped key) — fall back to Google.
        return translateViaGoogle(word, engineLang("google", state.translateTo));
      }
    }
    if (engine === "google") return translateViaGoogle(word, tl);
    if (engine === "lingva") {
      const url = LINGVA_BASE + "/auto/" + encodeURIComponent(tl) + "/" + encodeURIComponent(word);
      const data = JSON.parse(await bgFetch(url));
      return renderTranslateCard(data && data.translation, word);
    }
    return '<div class="lr-card-empty">Unknown translation engine.</div>';
  }

  // ---------------------------------------------------------------------------
  // PDF export (linked outline + marks survive Edge's "Save as PDF")
  // ---------------------------------------------------------------------------
  function buildPrintHTML() {
    const heads = state.blocks.filter((b) => b.type === "h");
    const ids = computeHeadingIds();
    const items = heads.map((h, i) =>
      `<li><a href="#${ids[i]}">${escapeHtml(h.text)}</a></li>`).join("");
    const clone = content.cloneNode(true);
    const outlineEl = clone.querySelector(".lr-outline");
    if (outlineEl) outlineEl.remove();
    clone.querySelectorAll(".lr-focus, .lr-near, .lr-dim").forEach((el) => {
      el.classList.remove("lr-focus", "lr-near", "lr-dim");
    });
    clone.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (src) img.setAttribute("src", resolveUrl(src));
      img.setAttribute("referrerpolicy", "no-referrer");
      img.removeAttribute("srcset");
      img.removeAttribute("loading");
    });
    const bodyHTML = clone.innerHTML;
    return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(state.title)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; line-height: 1.65; margin: 0; }
  h1.doc-title { font-size: 1.6em; margin: 0 0 .4em; }
  .outline { border: 1px solid #bbb; border-radius: 6px; padding: 1rem 1.2rem; margin: 1rem 0 1.6rem; }
  .outline h2 { font-size: 1em; text-transform: uppercase; letter-spacing: .04em; color: #555; margin: 0 0 .5rem; }
  .outline ul, .outline ol { margin: 0; padding-left: 1.4rem; }
  .outline a { color: #0645ad; text-decoration: none; }
  .content h2, .content h3, .content h4, .content h5 { page-break-after: avoid; }
  .content h2 { font-size: 1.25em; margin-top: 1.6em; }
  .content h3 { font-size: 1.1em; margin-top: 1.3em; }
  .content p, .content .lr-para { margin: 0 0 1em; opacity: 1; color: #111; }
  .content img { max-width: 100%; height: auto; display: block; margin: .6em auto; }
  .content figure { margin: 1em 0; page-break-inside: avoid; text-align: center; }
  .content figcaption { font: 12px/1.45 sans-serif; color: #444; text-align: left; }
  mark { color: inherit; padding: 0 1px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  sup.lr-cite, sub.lr-cite { font-size: .68em; color: #3b6fc0; }
  a.lr-cite-link { color: #3b6fc0; text-decoration: none; }
  @page { margin: 1.6cm; }
</style></head>
<body>
<h1 class="doc-title">${escapeHtml(state.title)}</h1>
<div class="outline"><h2>Outline</h2><ol>${items}</ol></div>
<hr>
<div class="content">${bodyHTML}</div>
</body></html>`;
  }

  function exportPDF() {
    const btn = overlay.querySelector("[data-act='export-pdf']");
    if (btn) btn.disabled = true;
    let html = "";
    try { html = buildPrintHTML(); }
    catch (e) {
      if (btn) btn.disabled = false;
      alert("Could not build the PDF document.");
      return;
    }
    const finish = (resp) => {
      if (btn) btn.disabled = false;
      const err = chrome.runtime && chrome.runtime.lastError;
      if (err || !resp || !resp.ok) {
        alert("Could not open the print tab. Reload the LiReader extension and try again.");
      }
    };
    try {
      chrome.storage.local.set({ lireaderPrintHTML: html }, () => {
        if (chrome.runtime.lastError) { finish(null); return; }
        chrome.runtime.sendMessage({ type: "lireader-print-open" }, finish);
      });
    } catch (e) {
      if (btn) btn.disabled = false;
      alert("Could not open the print tab. Reload the LiReader extension and try again.");
    }
  }

  // ---------------------------------------------------------------------------
  // Settings + toggle
  // ---------------------------------------------------------------------------
  function saveSettings() {
    try {
      chrome.storage && chrome.storage.local && chrome.storage.local.set({
        lireader: {
          fontSize: state.fontSize,
          fontFamily: state.fontFamily,
          margin: state.margin,
          translateTo: state.translateTo,
          translateEngine: state.translateEngine,
          dictEngine: state.dictEngine,
          msKey: state.msKey,
        },
      });
    } catch (e) { /* storage unavailable */ }
  }

  function loadSettings() {
    try {
      chrome.storage && chrome.storage.local && chrome.storage.local.get("lireader", (r) => {
        if (r && r.lireader) {
          state.fontSize = r.lireader.fontSize || 20;
          state.fontFamily = r.lireader.fontFamily || "serif";
          state.margin = (typeof r.lireader.margin === "number") ? r.lireader.margin : 75;
          state.translateTo = r.lireader.translateTo || "zh-Hans";
          state.translateEngine = r.lireader.translateEngine || "microsoft";
          state.dictEngine = r.lireader.dictEngine || "freedictionary";
          state.msKey = r.lireader.msKey || "";
        }
      });
    } catch (e) { /* storage unavailable */ }
  }

  function toggleReader(force) {
    const show = force !== undefined ? force : !(overlay && overlay.style.display === "flex");
    if (show) {
      const o = ensureOverlay();
      const art = extractArticle();
      state.title = art.title;
      state.blocks = art.blocks;
      if (state.blocks.length === 0) {
        state.blocks = [{ type: "p", text: "(No readable article text found on this page. If this is a full-text article, refresh the page and try again.)" }];
      }
      o.style.display = "flex";
      o.querySelector("[data-act='bionic']").classList.toggle("active", state.bionic);
      o.querySelector("[data-act='spotlight']").classList.toggle("active", state.spotlight);
      syncReadingLine();
      applyFont();
      applyMargin();
      applySettingsUI();
      switchTab(state.tab);
      renderContent();
    } else if (overlay) {
      overlay.style.display = "none";
      hideSelectionBar();
      if (state.xsnow) deactivateXSnow();
      const card = overlay.querySelector(".lr-card");
      if (card) { card.style.display = "none"; state.cardType = null; }
    }
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === "toggle-reader") {
      toggleReader();
      sendResponse({ ok: true });
    }
  });

  loadSettings();
})();
