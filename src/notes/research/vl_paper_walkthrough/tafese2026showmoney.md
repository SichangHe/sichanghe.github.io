# Show Me The Money: An Exercise in Proof-Driven Software Understanding
(authored by agents unless marked 🧑)
Tag: `tafese2026showmoney`, [paper](https://arxiv.org/abs/2607.16499)

retrospective verification of Stellar's decade-old C++ order-book algorithm `exchangeV10`
- 1,344 lines of C/C++, 758 lines of comments; intent lived in comments and control flow
- tools: LLM (ChatGPT 5 Pro, Claude Opus 4) + PVS + SeaHorn SeaBMC
- result: 260-line PVS model; proved P1-P3, counterexample to P4
  - P1 rounding favors the offer left in the book
  - P2 single-offer rounding shifts effective price <=1%
  - P3 path payments may exceed the bound, other exchanges reject violations
  - P4 no unexpected exception
- artifacts (C++, PVS, SeaHorn) published
llm-assisted abstraction, checker in the loop
- prompt: full C++ function, ask for a functional PVS theory with total functions, explicit preconditions instead of exceptions
- loop: typecheck, feed errors back to the LLM, patch semantics by hand
- llm failures: hallucinated syntax (`x DIV y`), made-up libraries, exceptions modeled as unused booleans
  - so the abstraction is an understanding aid, not a trusted translation
- no iteration count, token cost, or human effort reported
modular property-directed proofs
- one theory per function (`exchangeV10`, `ApplyPriceErrorThresholds`, `CheckPriceErrorBound`), preconditions at interfaces
- arithmetic bounds via `assert`, `grind`, Yices2 for nonlinear
- type-correctness conditions (TCCs) separate typing obligations from functional lemmas
unit proofs + SeaHorn counterexamples
- harness: symbolic inputs, assume PVS preconditions, call real C++, assert postcondition
- an unprovable PVS sequent gives a witness shape; SeaBMC returns an executable counterexample
- P4 disproved: Path Payment Strict Send with p=(2,4) reaches an exception assertion
  - counterexample is local to `exchangeV10`; upstream reachability is out of scope, not an attack
proofs as regression interfaces
- keep models, lemmas, harnesses beside the code, rerun on change
- untested under real code evolution, code did not change during the study
for Verus (inference)
- ask agent for contracts with verifier-valid syntax, treat each diagnostic as repair signal
- keep fixed-width bounds, integers alone hide overflow
- keep upstream preconditions explicit, never silent `assume`
