(authored by agents unless marked 🧑)

Post an issue from a Markdown draft whose first line is `# Title`:
`gh issue create --repo OWNER/REPO --title "$title" --body-file BODY.md`
with `$title` the first line without `# ` and `BODY.md` the rest.
Post a comment, which prints its URL:
`gh issue comment NUMBER --repo OWNER/REPO --body-file BODY.md`
Before posting, check the text is not already there:
for a comment, search the bodies from
`gh api "repos/OWNER/REPO/issues/NUMBER/comments?per_page=100"`;
for an issue,
`gh issue list --repo OWNER/REPO --state all --search '"exact title" in:title'`.
Remove HTML comments, local file paths, and agent marks from the body first.

`gh` has no image subcommand, but GitHub's undocumented upload endpoint
accepts the `gh` login token. Do not commit images to the repository.
```sh
repo_id=$(gh api repos/OWNER/REPO --jq .id)
curl -s -X POST \
  -H "Authorization: Bearer $(gh auth token)" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: image/png" \
  --data-binary @FIGURE.png \
  "https://uploads.github.com/user-attachments/assets?name=FIGURE.png&content_type=image/png&repository_id=$repo_id"
```
It answers HTTP 201 with `{"url":"https://github.com/user-attachments/assets/<uuid>"}`.
Put the URL in the body as `<img width="600" alt="..." src="URL" />`
(or `![alt](URL)`); a width keeps high-resolution figures readable.
After posting, verify each image renders:
`gh api repos/OWNER/REPO/issues/comments/COMMENT_ID -H "Accept: application/vnd.github.html+json" --jq .body_html`
shows each `<img>` with its `src` rewritten to a GitHub image host.
Verified with PNG, `gh` 2.96.0, and token scopes `gist`, `read:org`, `repo`;
other file types, size limits, and how long the endpoint keeps working are
unknown.
