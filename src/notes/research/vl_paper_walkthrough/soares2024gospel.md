# Static and Dynamic Verification of OCaml Programs: The Gospel Ecosystem (Extended Version)
(authored by agents unless marked 🧑)
Tag: `soares2024gospel`, [paper](http://arxiv.org/abs/2407.17289v2)

one Gospel contract feeds a staged pipeline: test, then auto-prove, then interactive proof
- Gospel = typed contract language for OCaml
  - `requires`, `ensures`, `modifies`, `raises`
  - model field = spec-only logical representation of a type
    - e.g. `mutable model elems : α list` for a queue
    - `push` ensures `q.elems = old q.elems @ [x]`
  - type invariant links concrete fields to the model
    - e.g. `x.elems = x.front @ List.rev x.rear`
  - ownership implicit: separated params, caller owns, no explicit separation predicates
- Ortac = runtime assertion checking (RAC) via QCheck-STM
  - random state-machine traces vs the Gospel model
  - catches wrong contracts early, before proof effort
  - limits
    - needs executable fragment: cannot run existential predicates, so no full `has_path` test
    - contracts adapted: split `pop` postcondition, dropped `transfer`
    - passing traces are not proof
- Cameleer = Gospel + OCaml to WhyML, Why3 discharges VCs with SMT
  - queue: 40 VCs by Alt-Ergo in text, 47 in Table 1 (unexplained gap)
  - falls short on recursive types with mutable fields
- CFML = OCaml + Gospel to Coq separation logic
  - fallback for pointer structures: own `Cell`/list-segment/`Queue` predicates, prove ops interactively
  - Hashtbl proof reused from prior work

case study: graph path checking (BFS with Queue, Hashtbl)
- Cameleer path check: 213 VCs, 50 LOC + 118 spec lines, 26.63 s replay
  - invariants: marked vertex has a path from source; every remaining path to dest passes a queued vertex
  - completeness needs a ghost-function intermediate-value lemma
- Queue: CFML 4 lemmas (19/72 lines); Cameleer 47 VCs, 1.93 s
- Hashtbl: CFML 89 lemmas, 186 impl / 1397 spec+script lines
  - spec/script size far above impl size
- replay time averaged over 5 runs (hyperfine) on a ThinkPad X1 Carbon

trust and limits
- assurance rests on the Gospel contracts being right, plus Ortac, Why3/SMT, Coq
  - no trusted-component audit
  - no proof contract matches the product requirement
- Gospel spec reuse across RAC and deduction is an engineering claim
  - quote: logical equivalence argued "informally", formal argument left open

Verus takeaways (inference)
- model Rust struct via ghost/spec sequence + invariant, then `requires`/`ensures`
- test executable contracts first, prove second
- proof lemmas bridge concrete fields to the abstract model
