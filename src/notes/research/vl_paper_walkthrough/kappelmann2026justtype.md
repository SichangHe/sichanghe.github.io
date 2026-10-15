# Just Type It in Isabelle! AI Agents Drafting, Mechanizing, and Generalizing from Human Hints
(authored by agents unless marked 🧑)
Tag: `kappelmann2026justtype`, [paper](http://arxiv.org/abs/2604.15713v3)

## what the paper proves and measures
The paper gives a formal specification of correct printing for rank-one polymorphic lambda-calculus terms and proves that the simplified Smolka–Blanchette algorithm produces a complete and annotation-minimal result. It defines a term as a correct printing when the original most-general typing is the unique most-general well-typed completion of the printed term (section 3, page 6). The stated results are Theorem 4 (completeness) and Theorem 5 (minimality), plus Proposition 6 and Corollary 7, which establish equivalence with a stronger unique-completion property (section 4.1, pages 8–9). The paper states: “Thm 4 (Completeness) If t is a typable unambiguous C-term and pickPos ∈ Compat, then smobla(pickPos, t) is a correct printing for t.” It also states: “Thm 5 (Minimality) If t is a typable unambiguous C-term and pickPos ∈ Compat, then smobla(pickPos, t) is ⊑-minimal among the correct printings for t.”

The implementation and proofs are mechanized in Isabelle/HOL. The paper reports two 1,938- and 2,071-line autoformalizations, with LLM usage costs of $139 and $140 respectively, using Claude Opus 4.6 at $5 per million input and $25 per million output tokens (section 6.4, page 18). The AI paper-proof phase cost $70, used two hours of computation and one day of human review; the human proof development took about five days (section 5.3, page 15). The paper explicitly limits what is trusted: Isabelle checks the generated proof terms, but human reviews were still needed to align formal statements with the intended paper. The authors write: “As the proofs themselves are checked for correctness by the proof assistant, the reviews were focused on aligning theorem statements and definitions with the underlying paper.”

## technique 1: define annotation-preserving printing as a typed completion problem

what it is and when to use it
Represent a partially annotated term with a maybe-type at every syntax position. Use `⊥` for no annotation, and define a well-typed completion as a fully typed term that adds annotations and satisfies the typing judgment. This is useful whenever a printer may remove type annotations but must preserve reparsing and type inference.

how to do it
1. Define types, substitutions, and typed terms. Terms have variables, constants, applications, and abstractions, each decorated by a type or `⊥` (section 2.2, pages 4–5).
2. Define annotation subsumption `t ⊑ s` to mean that `s` is obtained by adding annotations to `t`; define `erase(t)` to remove all annotations (page 5).
3. Define positions as paths into the syntax tree and `mtpOf(t,p)` as the maybe-type at a position (page 5; appendix A, pages 25–26).
4. Define well-typedness inductively and a completion as `t ⊑ u` with `⊢ u` (section 2.2, page 5).
5. Use a most-general completion `mgen(t)` as the semantic target. A correct printing `s` of `t` is one for which `mgen(t)` is the unique most-general well-typed completion of `s` (section 3, page 6).

The paper’s example shows why annotations matter: printing `(cα , dα)` as `(c, d)` lets inference produce the more general `(cα , dβ)` (introduction, pages 1–2). The paper says: “Achieving the round-trip hence requires type annotations.”

Verus form (inference)
Model the term AST as Rust datatypes and make `spec fn` definitions for `erase`, positions, substitutions, and annotation subsumption. State completion and uniqueness as `ensures` on proof functions; use recursive `proof fn` lemmas for substitution and position preservation. Executable parsing and printing remain ordinary Rust, while proof-only definitions are ghost/specification code. This is an inference because the paper uses Isabelle, not Verus.

what evidence shows it works and limits
The Isabelle development proves uniqueness for typable unambiguous C-terms (Proposition 2, page 6). The assumptions are essential: the result is restricted to rank-one polymorphism, unambiguous terms, and the paper’s typing model. Typing contexts are omitted by treating context variables as part of the signature (section 3, page 6), an abstraction that must be justified before applying the method to an implementation.

## technique 2: reverse-greedy annotation removal with a coverage test

what it is and when to use it
Start from a fully annotated most-general term and repeatedly erase an annotation when all type variables at that position remain covered by annotations elsewhere. This gives a tractable locally minimal printer instead of solving global minimum cost, which the paper notes is NP-hard (introduction, page 2).

how to do it
1. Compute `v = mgen(erase(t))`, the fixed completion whose type variables must stay represented (section 3, pages 6–7).
2. Set the changing term to `s = mgen(t)`.
3. Define `coverageTest(v,s,p)` to require that `p` exists in both terms, is annotated in `s`, and every type variable in `tpOf(v,p)` also occurs at another annotated position `q` in `s` (equation on page 7).
4. Choose a `pickPos` function compatible with the test: when any removable position exists, it must return one passing the test (page 7).
5. Define `decrease` to replace the chosen position by `⊥` and recurse; stop when no position passes (page 7; appendix B says termination follows because the number of annotated positions decreases by one).
6. Define `smobla(pickPos,t) = decrease(pickPos,mgen(erase(t)),mgen(t))` (page 7).

The algorithm separates a generic reverse-greedy component from an ad hoc coverage predicate. The paper says: “The algorithm starts with a fully annotated term mgen(t) and, via its decrease function, keeps removing annotations for positions p satisfying a given test, coverageTest, for as long as such annotation carrying positions exist.”

Verus form (inference)
Implement `decrease` as a terminating recursive `spec fn` over a finite set/list of positions, with a decreases measure equal to the count of non-`⊥` annotations. Prove a lemma that each removal decreases that count, and state that the result has no position satisfying the coverage predicate. Use `set`/sequence specifications and `forall`/`exists` quantifiers supported by the project’s Verus guide. Do not write `invariant(...)` as a call; loop invariants, if an executable loop is used, are attached with Verus loop syntax. This mapping is an inference.

what evidence shows it works and limits
Theorem 4 proves completeness and Theorem 5 proves `⊑`-minimality for any compatible choice function. The proof’s key sandwich lemma shows that if a completion lies between the current annotations and `v`, coverage determines it uniquely (Lemma 8, pages 10–11). The result is local minimality under the annotation order, not global minimum under an arbitrary cost function; implementation optimizations are deliberately omitted (section 3, page 6).

## technique 3: staged AI proof development with human review and Isabelle checking

The workflow gives an engineering pattern for using an LLM on formal verification. Provide background material, an experiment-specific `AGENTS.md`, the corrected implementation, and an execution trace; ask the agent for a complete LaTeX artifact; then run repeated human review and revision rounds (section 5.1–5.2, pages 13–15). The paper reports four rounds. Human review caught ground-term restrictions, missing definitions, contradictory statements, and an invalid sort claim that agent self-review missed (pages 14–15). The paper states: “Following the initial version, we ran three revision rounds in which the agent resolved the limitations while also adding proof details.”

For autoformalization, connect the coding agent to Isabelle through Isabelle/Q, provide an interaction guide, and require a formalization plan before editing theories (section 6.1, page 16). Human review checks alignment of theorem statements and definitions; Isabelle checks proof correctness. A remaining mismatch in the AI formalization fixed a concrete post-order enumeration while claiming order abstraction (section 6.2, pages 16–17), showing that solver-checked proofs do not validate the intended abstraction automatically.

Verus form (inference)
The analogous VL workflow would generate Rust/Verus specifications and proofs, run `verus` continuously, and require a separate reviewer to compare contracts with the intended behavior. Isabelle’s locale and inductive-predicate structure would correspond to Verus spec datatypes, `requires`/`ensures`, and proof lemmas. Human review remains necessary for specification alignment and model assumptions.

## threat and reuse for VL

Inference: The paper demonstrates that an agent can produce substantial verified metatheory, but its documented errors show a direct threat if VL accepts agent-written contracts without independent review. Isabelle found proof-valid artifacts whose statements were misaligned with the paper; analogous Verus proofs could establish an unintended Rust contract. The transferable practice is a three-part gate: executable artifact, mechanically checked proofs, and human or independent-agent audit of definitions, assumptions, and correspondence to the product requirement.

Inference: VL should reuse the coverage-test pattern for annotation or proof-obligation minimization only after defining the semantic preservation property. The paper’s own result depends on explicit assumptions, most-general completions, and a finite decreasing measure; none transfers automatically to Rust memory or concurrency semantics.

## techniques for the catalog
- maybe-type completion model — represent partial annotations with `⊥`, define well-typed completions, and specify printing by unique most-general completion
- coverage-test reverse greedy — repeatedly erase an annotation only when every type variable at its position remains covered elsewhere
- sandwich uniqueness proof — prove a completion is unique by bounding it between current annotations and a fixed most-general completion
- Isabelle agent workflow — iterate LLM-generated specifications through human review, Isabelle proof checking, and statement-alignment audits
- human-hinted autogeneralization — reduce an ad hoc algorithm to an independence-system greedy theorem and mechanize the reduction
Checked 2026-10-15 against paper kappelmann2026justtype: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
