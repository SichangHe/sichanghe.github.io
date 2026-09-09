Document every *shared* assumptions in ASSUM.md of the deepest directory where
the assumption is used, write `# assumptions_name` followed by lines of
explanation to define it.
Reference them using `@ASSUME:asssumptions_name` in code comments.
`assumls check .` verifies.
