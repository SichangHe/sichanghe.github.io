# Migration Provenance

skill source

- repository: `https://github.com/SichangHe/.config`
- commit: `b1e764ae8199f63f2428f2ec26505e160bd4b5b2`
- each instruction came from `agent_skills/NAME/SKILL.md`
- each target is `NAME.md` in this directory with hyphens changed to underscores

root source

- repository: `https://github.com/SichangHe/sichanghe.github.io`
- commit: `2030234f8b66d0326ab02c24788dc56ed1c95115`
- source: `src/notes/automation_software/AGENTS.md`

transformation

- copied each `SKILL.md` body exactly
- converted each skill name from kebab-case to snake_case for its target filename
- moved each description into the routing references
- moved the former root `Coding` instructions into the matching topic documents
- replaced the former persistent-skill loader block with the
  `persistent_agent_instructions` routing reference
- changed only the SVG extractor invocation
  - old: bundled `scripts/extract_svg.py`
  - new: PATH command `extract_chatgpt_svg`
  - removed the now-unused bundled skill-directory assignment

source blobs

- `assume-ls`: `7914e00c302a0031f49956c4df72139155590123`
- `avoid-sounding-like-llm`: `da0c09ea9b77f8ee525e35ed61c3393c9c5027f5`
- `convert-listenable-text`: `3fb73082eacafb69653dfae1683944df0b966901`
- `focused-source-synthesis`: `8195a3197aa82c6dd9b3d41e3978620e5934b8b2`
- `fragile-git-ops`: `81b53afd2074dd9a845393ad70eb176fffcee601`
- `grill-me`: `6b71475b06465fd754ced805cf1599289e9c57f1`
- `long-running-autonomy`: `1fbfc4a132eab2f34b8eacd424b6831951c1773d`
- `persistent-agent-instructions`: `1d8b1a8cae55c2675faf3cd81b6aac7bbaf56c6a`
- `prose-revision`: `ee6d188c8a5a659f9e828dc44dbadac979fbbb53`
- `python-coding`: `5fa357a2c9c2989497c64e34f28e21bbc3455657`
- `report-to-human`: `8ef4e9e6b95b87f641558c349f3d0c5900544165`
- `review`: `905c1a33c7c6af8c297ad0b59ce8877d65cec358`
- `rust-coding`: `ebef81473a27dc71ec3c0eda013701e0ce59d809`
- `software-system-design-values`: `f6ae4f1194d1246ee914d21736439e3788b05d7f`
- `sql-coding`: `e92802cb2ddce55d5dd93d35f55f833b8f72dd58`
- `svg-diagram-plotting`: `2af8d13366ed88935ec6d049007b089aabff0b66`
- `tmux-repl`: `d7587ba8151f6ce960f9b7073cdbd89288fe4c3c`
- `ubiquitous-language`: `582745392e35d706c98ebc450eea97fb445bee7c`
- SVG extractor: `d1ad3eb4a571619d78550189f590cfbafb7299ed`
- SVG extractor tests: `cff89a0f0a585421cd62b911ead6b78841b887e7`
