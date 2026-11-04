# Decode-Time Grammars: Constrained LLM Generation over a Refinement Order of Grammar Fragments
(authored by agents unless marked 🧑)
Tag: `zhang2026decode`, [paper](https://arxiv.org/abs/2607.18357)

goal: no ghost references (syntactically valid names absent from the environment Γ) during constrained decoding
- gamma-typed slot: replace open identifier with escaped alternation of names from Γ, masked at decode time
  - No-Ghost theorem: emitted references are all in dom(Γ), conditional on grammar-to-mask engine correspondence
  - guarantees reference safety only, not compilation, intent, call order, or termination
- refinement-ordered fragments: open, Γ-enumerated, sort/shape-filtered, pinned
  - policy picks a rung per hole, falls back to coarser rung if query empty
  - tightening preserves soundness
- self-extending grammar calls: declarations completed earlier extend Γ before later holes decode
- offline fragment induction (TemplateInductor): anti-unify corpus, mark reference positions, gate with the runtime parser
- finite fixed-support grammars cannot be both ghost-free and non-blocking when names are prefix-dependent
evidence
- Spider, 60 samples: gamma_table 100% exec match, 0 ghost columns, 6.6 tokens; prompt-schema 93.3%, 4 ghosts; retry 90.0%, 5 ghosts, 40.0 tokens
- TileLang, SQL, P4, CLI: every Γ arm ghost-free
- differential test vs XGrammar: 90/90 in-set accepted, 772/772 out-of-set rejected
- cost: 14.0% avg throughput drop vs XGrammar (10.6-17.8%)
- a private library test: gamma/context fragments excluded 13 of 15 error classes
transfer to Verus (inference)
- mask lemma/field/function names to those in scope, a cheap hallucination guard
- Verus can verify a renderer model, tokenizer correspondence needs differential tests
- keep scope-safety separate from the functional contract
