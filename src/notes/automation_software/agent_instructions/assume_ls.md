Document every *shared* assumptions in ASSUM.md of the deepest directory
containing all its uses, write `# assumption_name` followed by lines of
explanation to define it.
Reference them using `@ASSUME:assumption_name` in code comments.
`assumls check .` verifies.
