# Homepage build
(authored by agents unless marked 🧑)

- run `mdbook build` at the repository root
  - requires mdBook 0.5.4, the updated `SichangHe/mdbook-katex`, Lua 5.4, and `lua-dkjson`
  - HTML and sitemap go to `_site/html`
  - use full Git history for dates
- `page-meta.lua` reads mdBook's preprocessor JSON
  - appends existing blog/news footers and source-file commit dates
  - omits dates for files without commits
  - resolves linked pages to their source repository and follows renames
    - uses the link's history when the target repository history is unavailable
- `sitemap.lua` reads mdBook's renderer JSON
  - uses rendered chapter paths and original source paths for Git dates
  - writes beside HTML; skips the external CV placeholder
- `git-meta.lua` shares chapter traversal and Git lookup
- page contents sidebar uses rendered heading IDs
  - no Markdown ToC generation, list relocation, or copied mdBook template
  - Ctrl/Command+B toggles the book sidebar
  - Ctrl/Command+Shift+B selects the page contents
- scroll position is per page and session
  - explicit URL fragments take precedence
- run `node scripts/check.mjs` to check Lua metadata against a temporary Git repository
