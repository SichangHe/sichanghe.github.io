# Verifying Safety Properties With the TLA+ Proof System
(authored by agents unless marked 🧑)
Tag: `chaudhuri2010verifying`, [paper](http://arxiv.org/abs/1011.2560v1)

## result and architecture

TLAPS is a proof manager for TLA+ safety proofs. A declarative hierarchical proof is translated into leaf proof obligations; backend theorem provers, proof assistants, SMT solvers, and decision procedures discharge those obligations. The paper states: “A proof manager interprets a TLA+ proof as a collection of proof obligations to be verified, which it sends to backend verifiers that include theorem provers, proof assistants, SMT solvers, and decision procedures.” (§1, p.1)

The first release handles non-temporal TLA+ and temporal reasoning for invariance and step simulation, but not liveness (§1, p.1). Its proof language remains independent of a chosen backend. Inference: this separation is a direct model for a Verus orchestration layer that preserves one source proof while selecting Z3, arithmetic procedures, or certifying proof-producing backends for individual obligations.

## technique 1: hierarchical proof decomposition

What it is. A hierarchical proof is a sequence of steps with proofs, or a leaf proof that cites facts, definitions, previous steps, and theorems. The paper says: “A hierarchical proof is either a sequence of steps together with their proofs, or a leaf (lowest-level) proof that simply states the known facts (previous steps and theorems) and definitions from which the desired conclusion follows.” (§2, p.2)

When to use it. Use it for large invariance or refinement arguments where one monolithic SMT query is difficult to debug. High-level steps follow the theorem structure; lower-level steps simplify a goal until a backend can solve it (§5, p.6).

How to apply it.

1. Write a theorem over the TLA+ state-transition actions.
2. Split disjunctions, cases, or refinement layers into named intermediate steps (§5, p.6).
3. At a simple goal, try a leaf proof citing relevant facts and definitions.
4. If it fails, add assertion steps that expose missing algebra or state facts, then finish with a `qed` step (§5, p.6).
5. Prove steps in any order; TLAPM reports unproved steps (§5, p.6).

Verus form. Inference: use small `proof fn` lemmas as hierarchical steps, each with `requires` and `ensures`, and compose them in a top-level proof function. Use `assert` for intermediate facts and `invariant` clauses for induction over transitions. Inference: Verus has no TLAPS proof manager syntax; an external orchestration script can map each failed proof obligation to a lemma or solver configuration.

Evidence. The authors report proofs of Peterson's algorithm (~130 lines), the N-process Bakery algorithm (800 lines), and Paxos refinements of 550 lines plus an estimated second proof over 1,000 lines (§5.1, pp.6–7). These are proof lengths, not runtime measurements.

Limits. The paper says machine-checked proof writing remains tiresome and more time-consuming than desired (§5.1, p.7). Hierarchy improves maintenance and diagnosis but does not remove the need for a correct proof idea.

## technique 2: proof-manager preprocessing and obligation dispatch

What it is. TLAPM loads a root module, recursively flattens imported modules, expands selected definitions, resolves subexpression references, and invokes backends on leaf obligations. The paper states: “TLAPS is run by invoking the Proof Manager (TLAPM) on the root module and telling it which proofs to check.” (§3, p.3)

How to apply it. Keep specifications and proofs in the same language. Mark operators hidden by default; expose a definition only in the leaf proof that needs it, or use a scoped `use` step (§3, p.3). Use positional or labelled references to earlier subexpressions so proof steps survive later definition changes (§3, pp.3–4). Let TLAPM rewrite prime expressions syntactically and then send the resulting constant-fragment obligation to a backend (§3, p.3).

Verus form. Inference: preserve proof locality with modules and private `proof fn` lemmas. Expose only the lemmas needed by a proof context; avoid globally broadcasting every fact because solver context size affects automation. Inference: a VL manager could flatten module dependencies, collect proof obligations from Verus diagnostics, and route arithmetic or nonlinear subgoals to specialized lemma templates while leaving the final Verus checker authoritative.

Evidence. TLAPM invokes Zenon first, then Isabelle/TLA+ automation when Zenon fails; pragmas can bypass Zenon or choose tactics (§3, p.4). The system's module flattening is required because backends do not support TLA+ module language (§3, p.3).

Limits and trust. Prime rewriting is trusted in TLAPM (§3, p.3). The authors explicitly prefer certifying backends but include non-certifying automation for important theories (§2, p.2). Inference: the routing layer and rewrite engine are part of the trusted computing base unless their outputs are independently checked.

## technique 3: certifying and non-certifying backend portfolio

What it is. Isabelle/TLA+ embeds the constant fragment of TLA+ in Isabelle and checks proof scripts. Zenon produces Isabelle/Isar proof scripts, so Zenon is outside the trusted code base. SMT-LIB and Presburger backends automate arithmetic but were non-certifying in this release. The paper states: “Zenon is therefore not part of the trusted code base of TLAPS.” (§4.2, p.5)

When to use it. Use a certifying backend when the proof obligation is in a theory with a proof-producing prover; use a fast non-certifying backend when a trusted checker or practical coverage is unavailable, while recording the trust boundary.

How to apply it. Translate an obligation into the backend's supported logic, retaining hypotheses in the supported fragment. Try Zenon; if it succeeds, pass its generated Isar script to Isabelle/TLA+. Otherwise invoke Isabelle automation or a selected arithmetic backend (§3, p.4). For SMT-LIB, rewrite into AUFLIRA and conservatively omit assumptions outside that theory (§4.3, p.5).

Verus form. Inference: Verus already emits solver obligations and checks solver responses through its verifier pipeline. A VL portfolio can supply proof lemmas for arithmetic and algebra, but must not treat an unverified external answer as a proof. Use `proof fn` lemmas with `ensures` as the certifying artifact; keep `assume` only for explicitly documented environment axioms, never to discharge the target property.

Evidence. The paper lists successful use of Yices, CVC3, Z3, veriT, and Alt-Ergo through the SMT backend (§4.3, p.5). Isabelle/TLA+ provides rewriting, tableau, resolution, and combinations of those methods, with more than 1,400 library lemmas (§4.1, p.4).

Limits. Non-certifying arithmetic backends were planned for replacement by certifying veriT integration (§4.3, p.5), so a proof accepted in this release may rely on a backend outside the checker chain. TLA+ is untyped; many lemmas require explicit typing hypotheses (§4.1, p.4).

## technique 4: model checking before proof writing

What it is. The authors first run TLC on finite instances, then write TLAPS proofs. The paper says: “Before attempting to prove correctness of a TLA+ specification, we first check finite instances with the TLC model checker.” (§5, p.6)

How to apply it. Choose finite bounds for participants, values, and state space; run TLC to find specification errors; repair the specification; only then develop the inductive proof. Model-check assumptions about common data-structure facts rather than silently trusting them (§5, p.6).

Verus form. Inference: pair Verus proofs with bounded executable tests or a separate finite-state model. Use tests to find specification and implementation mistakes, then encode the discovered invariant in `requires`, `ensures`, and loop `invariant` clauses. Inference: tests do not replace the Verus proof and cannot establish unbounded safety.

Evidence. The paper reports that finite checking catches numerous errors more quickly than attempting a proof (§5, p.6). No denominator or benchmark-wide detection rate is provided.

Limits. TLC explores only the selected finite instances. The authors warn that unchecked assumptions are a likely source of errors and should be model-checked (§5, p.6).

## what is proved and what remains trusted

The proof system supports safety properties such as invariance and step simulation, and does not support liveness in the reported release (§1, p.1). The backends prove leaf obligations under TLA+ semantics; they do not establish that the specification captures the intended system. The paper warns: “It is far more likely for a system error to be caused by an incomplete or incorrect specification than by an incorrect proof inadvertently accepted as correct due to bugs in TLAPS.” (§2, p.2)

Inference: for VL, the reusable lesson is a layered workflow: finite counterexample search, hierarchical proof decomposition, obligation dispatch, and an explicit certifying/non-certifying trust ledger. The paper predates Verus and does not prove Rust, ownership, unsafe code, compiler behavior, or hardware. Inference: VL should not redo a generic proof-manager portfolio without a Rust/Verus integration or measured reliability benefit; the product threat is accepting a proof of the wrong or incomplete contract.

## techniques for the catalog

- hierarchical proof decomposition — break system invariants and refinements into named intermediate steps and leaf obligations
- obligation dispatch — flatten modules, resolve definitions and references, and route each leaf to an appropriate backend
- certifying backend chain — have a proof-producing prover emit scripts checked by a trusted proof assistant
- explicit non-certifying boundary — record SMT and decision procedures that automate obligations without a checked proof
- finite model-checking preflight — test bounded instances and assumptions before investing in an unbounded proof
Checked 2026-10-14: audit record chaudhuri2010verifying; paper-study comparison complete; gate executed; experiments not rerun
