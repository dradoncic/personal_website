async function loadPosts() {
  const postsContainer = document.getElementById("posts");

  // 1. Load manifest of posts (GitHub Pages compatible)
  const files = await fetch("posts/index.json").then(r => r.json());

  const posts = [];

  for (const file of files) {
      const md = await fetch(`posts/${file}`).then(r => r.text());
      const post = parseMarkdownWithMetadata(md);
      post.filename = file;
      posts.push(post);
  }

  // sort by date
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // render post cards
  postsContainer.innerHTML = posts.map(post => `
      <article class="post-card">
          <div class="post-meta">
              <p class="post-date">${post.date}</p>
              <div class="post-tags">
                  ${post.tags.map(t => `<span class="tag">${t}</span>`).join("")}
              </div>
          </div>
          <h3 class="post-title">
              <a href="#post-${slug(post.filename)}">${post.title}</a>
          </h3>
          <p class="post-excerpt">${post.excerpt}</p>
      </article>
  `).join("");

  // Add full post sections
  const contentRoot = document.querySelector("main");

  posts.forEach(post => {
      const section = document.createElement("section");
      section.id = `post-${slug(post.filename)}`;
      section.className = "blog-post";
      section.innerHTML = `
          <a href="#blog" class="home-link"><-</a>
          <div class="blog-container">
              <article>
                  <div class="post-header">
                      <h2>${post.title}</h2>
                      <div class="post-meta">
                          <p class="post-date">${post.date}</p>
                          <div class="post-tags">
                              ${post.tags.map(t => `<span class="tag">${t}</span>`).join("")}
                          </div>
                      </div>
                  </div>
                  <div class="post-content">
                      ${markdownToHTML(post.body)}
                  </div>
              </article>
          </div>
      `;
      contentRoot.appendChild(section);
  });
}

function slug(filename) {
  return filename.replace(".md", "");
}

function parseMarkdownWithMetadata(md) {
  const [, metaBlock, body] = md.split(/---\s*/).map(s => s.trim());
  const metaLines = metaBlock.split("\n");

  const meta = {};
  metaLines.forEach(line => {
      const [key, val] = line.split(":");
      meta[key.trim()] = eval(val.trim());
  });

  meta.body = body;
  return meta;
}

function markdownToHTML(md) {
  let html = md;
  
  // Normalize line endings
  html = html.replace(/\r\n/g, "\n");

  // 1) GITHUB-FENCED CODE BLOCKS (```lang\n...\n```)
  html = html.replace(/```(\w+)?\n([\s\S]*?)\n?```/g, (m, lang, code) => {
    const escaped = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const languageClass = lang ? ` class="language-${lang}"` : "";
    return `<pre><code${languageClass}>${escaped}</code></pre>`;
  });

  // 2) HEADINGS (before inline processing)
  html = html
    .replace(/^### (.*)$/gim, "<h3>$1</h3>")
    .replace(/^## (.*)$/gim, "<h2>$1</h2>")
    .replace(/^# (.*)$/gim, "<h1>$1</h1>");

  // 3) HORIZONTAL RULES
  html = html.replace(/^\s*(?:---|\*\*\*)\s*$/gim, "<hr>");

  // 4) UNORDERED LISTS (before inline processing)
  html = html.replace(/((?:^\s*[-*]\s+.*(?:\n|$))+)/gm, (listBlock) => {
    const items = listBlock
      .trim()
      .split("\n")
      .map(line => line.replace(/^\s*[-*]\s+(.*)/, "<li>$1</li>"))
      .join("");
    return `<ul>${items}</ul>`;
  });

  // 5) ORDERED LISTS (before inline processing)
  html = html.replace(/((?:^\s*\d+\.\s+.*(?:\n|$))+)/gm, (listBlock) => {
    const items = listBlock
      .trim()
      .split("\n")
      .map(line => line.replace(/^\s*\d+\.\s+(.*)/, "<li>$1</li>"))
      .join("");
    return `<ol>${items}</ol>`;
  });

  // 6) LINKS (do before emphasis)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // 7) BOLD (before italic)
  html = html
    .replace(/\*\*(.+?)\*\*/gim, "<strong>$1</strong>")
    .replace(/__(.+?)__/gim, "<strong>$1</strong>");

  // 8) ITALIC
  html = html
    .replace(/(^|[^*])\*(?!\*)(.+?)\*(?!\*)/gim, "$1<em>$2</em>")
    .replace(/(^|[^_])_(?!_)(.+?)_(?!_)/gim, "$1<em>$2</em>");

  // 9) INLINE CODE (after other inline processing)
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // 10) PARAGRAPHS & LINE BREAKS (last)
  html = html
    .replace(/\n{2,}/g, "</p><p>");   // double newlines => paragraph separator

  if (html.includes("</p><p>")) {
    html = "<p>" + html + "</p>";
  }

  html = html.replace(/([^\n])\n([^\n])/g, "$1<br>$2");

  return html;
}

loadPosts();