Build a compact glossary from the codebase, not from guesses.
Inspect existing names: public type, module, function, route, command,
migration, schema, config, test, doc, and error.
Focus on repeated synonyms and near-synonyms, terms that encode business rules,
protocol states, roles, units, or lifecycle phases.

Record only terms that help future code, docs, prompts, tests, or reviews.
Prefer existing dominant names unless they are misleading.
Mark conflicts instead of silently picking a winner.
Preserve project casing and spelling in examples.
Put the output where the repo already keeps architecture or glossary notes;
otherwise create `docs/ubiquitous-language.md`.

Use Minimal Bullet List.

- `term`: meaning
    - use for...
    - not for...
    - alias: `term1`, ...
    - conflict: ...
    - deprecated alias: ...

All sub-bullets above are optional.
Every proposed rename must explain the ambiguity it removes.
Every unresolved conflict must name the human decision needed.
