# Decode-Time Grammars: Constrained LLM Generation over a Refinement Order of Grammar Fragments
(authored by agents unless marked 🧑)
Tag: `zhang2026decode`, [paper](https://arxiv.org/abs/2607.18357)

## scope and result

Zhang et al. make grammar constraints depend on a runtime environment Γ while an LLM is decoding. The target failure is a ghost reference: a syntactically valid name, field, API, or command option that does not exist in the current environment. A policy π selects a grammar fragment for each typed hole; tightening operator τΓ replaces an open reference with a Γ-typed slot whose candidates come from Γ. Declarations generated earlier extend Γ before later holes are decoded (Abstract, pp. 1–2; Sections 4.1–4.3, pp. 9–14).

The paper proves No-Ghost soundness for the support set of the decoder, plus preservation under refinement and a necessity result for dynamic support. It does not prove whole-program functional correctness. The abstract states, “This ensures not only grammatical correctness but also semantic correctness, by preventing references to undefined symbols” (Abstract, p. 1). The authors state the division clearly: “Decode-time grammars enforce the part of correctness expressible as membership in Γ” (Section 3.5, p. 9). Their implementation is gproj, with TemplateInductor constructing fragments offline and an online executor instantiating them.

## technique 1: Γ-typed slots and No-Ghost soundness

purpose and trigger

Use a Γ-slot when legal names at a reference position are finitely enumerable from the current environment: declared buffers, schema columns, P4 fields, available APIs, or live command options (Sections 2.3 and 4.1, pp. 5, 10). A hole is `(s,Γ)`, where `s` is an expected sort. A slot query `queryslot(Γ)` must be finite, nonempty, and a subset of `dom(Γ)` (Section 4.1, p. 10).

application sequence

1. construct the current environment Γ with names and sorts
2. mark every name-yielding reference position in the fragment
3. apply τΓ to replace each open identifier with a Γ-slot
4. compute `queryslot(Γ)`, filtering by sort or other available attributes
5. escape each candidate and render a parenthesized alternation
6. splice the alternation into the grammar before decoding the hole
7. let the masking engine sample only tokens in the instantiated language
8. extend Γ when a declaration hole completes, then repeat for later holes (Sections 4.1–4.2, pp. 10–12; Section 4.3, pp. 13–14)

The escaping lemma states that the rendered alternation's language is exactly the candidate set; parenthesization prevents an alternative from escaping its slot (Section 4.2, p. 11). Theorem 1 then gives `L(G[Γ]) ⊆ ScopeSafe(Γ)`, where every yielded reference is in `dom(Γ)` (Section 4.2, p. 12). The paper explains the guarantee: “Thus every string emitted by the mask under G [Γ] references only declared names” (Theorem 1, p. 12).

Verus form

Inference: represent Γ as a finite map or sequence of `(name, sort)` records, and define a `spec fn` for `queryslot`, membership, and `scope_safe`. Define a `spec fn` for rendered-slot language at the abstract level and prove with `proof fn`s that every emitted name belongs to the query result and therefore to Γ. Use `requires` for nonempty candidate sets and `ensures` for the subset relation. Verus can prove a Rust renderer and token validator if both are modeled; it cannot prove the external tokenizer's parser correspondence without a model of that engine.

reported evidence and boundary

The theorem is conditional on Assumption 1, which requires exact correspondence between the grammar denotation and masking engine and is validated by differential tests and token-mask replay (Section 4.2, p. 11). It guarantees reference safety, not compilation, numerical correctness, intent, call order, or termination. An empty query triggers fallback to a coarser fragment. Inference: a Verus proof should preserve this boundary by separating `scope_safe` from a functional contract.

## technique 2: refinement-ordered fragments and policy fallback

purpose and trigger

A single construct can have several fragments: open identifier, Γ-enumerated name, sort- or shape-filtered name, or pinned literal. Fragments with the same anchor sort are ordered by refinement `⊑`: a tighter fragment accepts fewer surfaces while preserving aligned semantic projection (Definitions 2–3, pp. 10–11). The policy π(s,Γ) chooses a rung per region.

application sequence

1. define a shared semantic anchor and projection for each fragment
2. construct a ladder from coarse to tight fragments
3. prove or validate language inclusion at each environment
4. choose a rung with π based on sort, Γ, region path, and confidence
5. when the tight query is unavailable or empty, climb to a coarser rung
6. when declarations enter Γ, re-tighten subsequent holes
7. preserve the no-ghost guarantee for every Γ-slotted rung (Sections 3.3–3.4, pp. 8–9; Section 4.2, pp. 12–13)

Proposition 1 proves that `⊑` is a preorder. Lemma 2 proves refinement preservation: if a looser fragment is support-set sound, a tighter fragment remains inside its language and is also sound (Section 4.2, p. 12). The paper's example decodes `SELECT {:ColRef} FROM t0` freely with empty Γ, declares `c` in `CREATE TABLE`, then decodes a later column slot with support exactly `{c}` (Section 4.2, p. 13).

Verus form

Inference: encode each fragment's accepted abstract names as a finite set and define `spec fn refines(g1,g2)` for anchor equality, projection alignment, and set inclusion. Prove reflexivity, transitivity, and soundness preservation with `proof fn`s. Define policy selection as an executable function with `ensures` that it returns a rung whose preconditions hold. A fallback that climbs above the τΓ edge intentionally loses no-ghost soundness; this state must be explicit in the contract.

reported evidence and boundary

The paper calls the guarantee graded: each hole is independently instantiated, so degradation does not propagate to later holes (Section 4.2, p. 13). The refinement relation is only a preorder; arbitrary meet and join existence is left open (Proposition 1, p. 12). Nested grammar calls do not yet compose with the Times repetition combinator (Section 5.4, p. 19).

## technique 3: self-extending grammar-call execution

purpose and trigger

Use the online executor when a generated prefix changes the environment that constrains later code. A skeleton grammar partitions a program into sort-anchored region holes. The executor maintains a grammar-call stack and forms `(s,Γ,ρ)` on entry, where ρ is the region path (Section 4.3, pp. 13–14).

application sequence

1. decode a high-level skeleton with typed holes
2. enter a hole and capture its current sort, Γ snapshot, and region path
3. call π to choose a fragment
4. instantiate the fragment's slots against Γ and compile its mask
5. decode tokens under that mask
6. extract declarations from completed declaration holes
7. extend the active frame before instantiating later holes
8. pop the fragment when complete and continue the call tree
9. reject recursive grammar-call cycles and enforce the engineering recursion cap (Section 4.3, pp. 13–14)

Verus form

Inference: model the call stack, lexical frames, and declaration extraction as Rust state. Use `spec fn` predicates for active bindings and well-formed extension, and `proof fn`s showing that later holes see only declarations already committed in the frame. `requires` can state an acyclic call tree and bounded depth; `ensures` can state that every generated reference was checked against the snapshot used for its hole. The LLM's token logits and tokenizer remain outside the proof.

reported evidence and boundary

The shared invariant is that constrained support is exactly `queryslot(Γ(p))` and is a subset of `dom(Γ(p))`; the executor enforces it online while the inductor prepares markings and policies (Section 5, p. 18). The paper tests 32-deep nesting, 300-name environments, and maliciously injected names (Section 5.2, p. 19). Functional and compilation correctness are evaluated by external oracles, not established by the support theorem.

## technique 4: offline grammar induction with a hard validation gate

purpose and trigger

Use TemplateInductor when no hand-written grammar fragment exists for a low-resource surface. It uses anti-unification and grammar induction to align corpus examples, create a fragment ladder, mark reference positions, define Γ queries and declaration extraction, and reject artifacts that fail a shared gate (Section 2.4, p. 5; Section 5, p. 18).

application sequence

1. collect positive corpus examples and generate negative ghost substitutions
2. anti-unify examples into holed templates
3. produce executable grammar fragments for the base, gamma, context-filtered, and pinned rungs
4. mark every name-yielding position and attach a Γ query
5. validate executability, corpus coverage, and rejection of mined ghosts with the same parser used at runtime
6. emit the fragment library, policy, extraction actions, and fallback behavior
7. install the artifact in gproj for JIT specialization (Sections 2.4 and 5, pp. 5, 18)

Verus form

Inference: represent an induced fragment and its gate results as immutable Rust data. Define `spec fn` predicates for corpus acceptance, ghost rejection, and marking coverage, with `proof fn`s for set inclusion of each generated slot. The corpus and negative substitutions are evidence, not a complete proof of all names. Verus can check the gate implementation and artifact consistency after induction.

reported evidence and boundary

For CANN ops-nn, every induced fragment passed the gate, but no local compiler existed, so the evidence is parser-level coverage rather than end-to-end compilation (Section 6.4, p. 22). A private library experiment found that gamma and context fragments excluded 13 of 15 observed error classes; the remaining failures required value semantics or stateful call order (Section 6.4, p. 22). The denominator is 15 observed classes, not all possible failures.

## technique 5: necessity of dynamic support and the guarantee boundary

The paper proves that exact Γ-dependent reference support cannot be represented by any finite family of precompiled fixed-support grammars while remaining both ghost-free and non-blocking (Proposition 3, Section 4.3, pp. 16–17). The reason is that generated declarations can introduce an unbounded or prefix-dependent name; a fixed support either omits a future legal name or admits a ghost. Inference: this necessity argument applies to a Verus code generator only when its legal reference set is similarly prefix-dependent; a finite closed enum does not require dynamic grammar construction.

The paper separates directly supported properties (skeleton plus Γ-enumerable references) from properties needing a verifier or monitor: whole-program relations, execution, mutable fixed points, numerical correctness, and termination (Section 5.3, p. 19). This is the formal boundary a VL design should preserve.

## technique 6: engine-correspondence differential testing and typed attributes

The formal theorem is modulo Assumption 1, so the appendix tests the denotation used in the proof against XGrammar. The test drives the real instantiation path over 24 environment and construct configurations, including all five escape classes, quotes, backslashes, newlines, Unicode, 256-character names, metacharacters, single and multiple candidates, and the empty-environment path (Appendix A.3, pp. 30–31). It accepts all 90 in-set strings and rejects all 772 controlled out-of-set strings; the accept set equals the declared-name set on the reported 16-case test, with zero discrepancy (Appendix A.3, p. 31). Token-mask replay additionally checks that ghost tokens are masked at every step.

Inference: a Verus version would treat the tokenizer and mask as an external component and verify a reference implementation of the finite renderer, then use differential tests to justify the correspondence assumption. The tests are evidence about the implementation, not a replacement for the assumption in the theorem.

The appendix lifts Γ from names to write-once attributes. Shape-filtered slots guarantee a buffer's declared shape when shape is immutable; on 20 real 0.6B samples with 160 holes per arm, kind-only selection mis-selected a wrong-shape buffer 2.5%, while kind-plus-shape was 0% by construction (Appendix A.6, p. 33). Inference: encode shape in a Verus record and prove that a `spec fn` query filters both sort and shape, with a `proof fn` showing the selected operand has the declared attributes. Mutable attribute updates fall outside this monotone guarantee.

The whole-program corollary composes leaf-hole proofs along a finite acyclic grammar-call tree. Each reference is checked against the environment at its hole entry; later updates or frame pops affect later candidates, not the earlier resolution (Appendix A.10, p. 34). Inference: this maps to a Verus inductive proof over a call tree, with a ghost environment snapshot per hole and an `ensures` clause connecting each resolved name to that snapshot.

## evaluation and product implications

On one TileLang GEMM diagnostic, four fragment rungs had free_bits 92, 287, 538, and 998; compilation was 100%, 100%, 67%, and 0%, with the final open-reference failures all ghost-buffer `NameError`s (Section 6.1, p. 20). The 67% is 2 of 3 seeds; a 12-sample rerun reached 75%. In Table 2, TileLang uses `n=12` per model, SQL `n=90`, and P4/CLI `n=8`; every Γ arm was ghost-free, while free arms failed through ghost references (Table 2, p. 21). SQL's context-filtered arm achieved 100% execution match on 90 samples, versus 0% for open columns (Sections 6.2–6.3, pp. 20–21). On the same 60 Spider samples, gamma_table reached 100% execution match with zero ghost columns and 6.6 average generated tokens; prompt-schema reached 93.3% with four ghost columns, and retry reached 90.0% with five ghosts and 40.0 tokens (Table 3, p. 21).

Serving measurements used two Intel Xeon Gold 6430 CPUs, 512 GB memory, four RTX PRO 6000 GPUs, vLLM 0.24.0, and XGrammar 0.2.3 (Section 6.6, p. 22). Across eight configurations, gproj reduced throughput by 10.6–17.8% relative to XGrammar, 14.0% on average, and by 17.3% relative to unconstrained decoding (Table 4, pp. 22–23). These denominators are configurations, not generated programs.

Inference: for VeruLaw, τΓ maps naturally to generation-time checking of declared Rust identifiers, fields, and verified API contracts, but it cannot guarantee ownership, arithmetic, termination, or behavioral intent. The support-set theorem is complementary to Verus proofs: use the mask to prevent undefined symbols, then use Verus `requires`, `ensures`, invariants, and `proof fn`s to establish semantics. Existing work already covers fixed grammar masks, syntax-constrained decoding, and post-hoc execution checks; VL should not redo those as a generic constrained-decoding system. The threat is assuming no ghost names imply verified Rust. The trusted boundary includes Γ extraction, tokenizer-engine correspondence, fragment induction, model sketch, external compiler, library version, and the semantic specification.

## techniques for the catalog

- Γ-typed slot masking: replace open references with escaped alternatives drawn from the current environment and prove No-Ghost support
- refinement-ordered grammar policy: choose coarse, gamma, context-filtered, or pinned fragments and preserve soundness under tightening
- self-extending grammar calls: update Γ from declarations as holes complete and instantiate later masks from the new frame
- offline fragment induction: anti-unify corpus examples, mine ghost substitutions, and gate executable fragments before deployment
- dynamic-support necessity: synthesize exact prefix-dependent reference support online because finite fixed-support families cannot be both sound and non-blocking
- engine correspondence testing: differentially test rendered slot grammars and token masks, then extend Γ queries to immutable sort and shape attributes
Checked 2026-10-15 against paper zhang2026decode: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
