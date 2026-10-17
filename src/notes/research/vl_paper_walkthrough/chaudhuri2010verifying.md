# Verifying Safety Properties With the TLA+ Proof System
(authored by agents unless marked 🧑)
Tag: `chaudhuri2010verifying`, [paper](http://arxiv.org/abs/1011.2560v1)

## result and architecture

TLAPS is a proof manager for TLA+ safety proofs. A declarative hierarchical proof is translated into leaf proof obligations; backend theorem provers, proof assistants, SMT solvers, and decision procedures discharge those obligations. The paper states: “A proof manager interprets a TLA+ proof as a collection of proof obligations to be verified, which it sends to backend verifiers that include theorem provers, proof assistants, SMT solvers, and decision procedures.” (§1, p.1)

The first release handles non-temporal TLA+ and temporal reasoning for invariance and step simulation, but not liveness (§1, p.1). Its proof language remains independent of a chosen backend. Inference: this separation is a direct model for a Verus orchestration layer that preserves one source proof while selecting Z3, arithmetic procedures, or certifying proof-producing backends for individual obligations.

## technique 1: hierarchical proof decomposition

What it is. A hierarchical proof is a sequence of steps with proofs, or a leaf proof that cites facts, definitions, previous steps, and theorems. The paper says: “A hierarchical proof is either a sequence of steps together with their proofs, or a leaf (lowest-level) proof that simply states the known facts (previous steps and theorems) and definitions from which the desired conclusion follows.” (§2, p.2)

When to use it. The authors find the hierarchical, non-linear proof process "indispensable for larger proofs" (§5, p.6). Inference: it suits large invariance or refinement arguments where one monolithic solver query is hard to debug. In the paper, the highest-level steps are derived almost without thinking from the structure of the theorem, and lower-level steps simplify the assertion until a final qed step verifies (§5, p.6).

How to apply it.

1. Start from the theorem to be proved; derive the top-level steps from its structure. Example in the paper: a step P1 ∨ ... ∨ Pn ⇒ Q is proved by steps asserting Pi ⇒ Q for each i (§5, p.6).
2. At a simple enough step, first try a fully automatic leaf proof citing the facts and definitions that appear relevant (§5, p.6).
3. If that fails, begin a new level: a sequence of proof-less assertion steps that simplify the assertion, and a final qed step asserting that the goal follows from them (§5, p.6).
4. Tune the lower-level steps until the qed step verifies (§5, p.6).
5. Then prove the steps in any order; the user can ask TLAPM which steps have no proofs (§5, p.6).
6. If a leaf proof fails, TLAPM prints the usable hypotheses and the goal with usable definitions expanded; the most common cause is a forgotten fact or definition (§5, p.6).

Verus form. Inference: use small `proof fn` lemmas as hierarchical steps, each with `requires` and `ensures`, and compose them in a top-level proof function. Use `assert` for intermediate facts and `invariant` clauses for induction over transitions. Inference: Verus has no TLAPS proof manager syntax; an external orchestration script can map each failed proof obligation to a lemma or solver configuration.

Evidence. The authors report proofs of Peterson's algorithm (~130 lines), the N-process Bakery algorithm (800 lines), and Paxos: a first refinement proof of 550 lines, completed, and a second refinement proof, mostly completed, that they estimate will be somewhat over 1000 lines (§5.1, pp.6–7). The whole high-level Paxos specification and refinements total 100 lines of TLA+ (§5.1, p.7). These are proof lengths, not runtime measurements.

Limits. The paper says machine-checked proof writing remains tiresome and more time-consuming than desired (§5.1, p.7). The paper adds that it "has not turned out to be difficult once the proof idea has been understood" (§5.1, p.7). Inference: hierarchy does not remove the need for a correct proof idea.

## technique 2: proof-manager preprocessing and obligation dispatch

What it is. TLAPM is run on a root module, flattens the module structure, expands usable definitions, resolves subexpression references, and invokes backends on leaf obligations (§3, pp.2–4). The paper states: “TLAPS is run by invoking the Proof Manager (TLAPM) on the root module and telling it which proofs to check.” (§3, p.2)

How to apply it. Keep specifications and proofs in the same language. User-defined operators are hidden by default; a definition is made usable in one leaf proof by citing it, or for the rest of the current subproof by a use step (§3, p.3). Positional or labelled references to earlier subexpressions are replaced by the expressions they resolve to; a labelled reference keeps referring to the same expression even if the definition is later modified (§3, p.3). Let TLAPM rewrite prime expressions syntactically and then send the resulting constant-fragment obligation to a backend (§3, p.3).

Verus form. Inference: preserve proof locality with modules and private `proof fn` lemmas. Expose only the lemmas needed by a proof context; avoid globally broadcasting every fact because solver context size affects automation. Inference: a VL manager could flatten module dependencies, collect proof obligations from Verus diagnostics, and route arithmetic or nonlinear subgoals to specialized lemma templates while leaving the final Verus checker authoritative.

Evidence. TLAPM invokes Zenon first, then Isabelle/TLA+ automation when Zenon fails; pragmas can bypass Zenon, use particular Isabelle tactics, or use other backends (§3, pp.3–4). TLAPM flattens the module structure because the module language of TLA+ is not supported by backend verifiers (§3, p.2).

Limits and trust. Prime rewriting is trusted in TLAPM (§3, p.3). The authors explicitly prefer certifying backends but include non-certifying automation for important theories (§2, p.2). Inference: the routing layer and rewrite engine are part of the trusted computing base unless their outputs are independently checked.

## technique 3: certifying and non-certifying backend portfolio

What it is. Isabelle/TLA+ embeds the constant fragment of TLA+ in Isabelle and checks proof scripts. Zenon produces Isabelle/Isar proof scripts, so Zenon is outside the trusted code base. SMT-LIB and Presburger backends automate arithmetic but were non-certifying in this release. The paper states: “Zenon is therefore not part of the trusted code base of TLAPS.” (§4.2, p.5)

When to use it. Inference: use a certifying backend when the obligation is in a theory covered by a proof-producing prover, and a non-certifying backend when no certifying one covers the theory, while recording the trust boundary. The paper says: "we prefer certifying backends whenever possible, we include non-certifying backends for automated reasoning in important theories such as arithmetic" (§2, p.2).

How to apply it. Try Zenon first; if it succeeds, it produces an Isabelle/Isar proof script checked by Isabelle/TLA+. Otherwise instruct Isabelle/TLA+ to use an automated proof method, or select another backend via pragmas (§3, pp.3–4). Using the theorem SimpleArithmetic in a leaf proof invokes the Presburger decision procedure (§3, p.4). For SMT-LIB, obligations are rewritten into the AUFLIRA theory, which generally requires omitting assumptions outside that theory (§4.3, p.5).

Verus form. Inference: Verus already emits solver obligations and checks solver responses through its verifier pipeline. A VL portfolio can supply proof lemmas for arithmetic and algebra, but must not treat an unverified external answer as a proof. Use `proof fn` lemmas with `ensures` as the certifying artifact; keep `assume` only for explicitly documented environment axioms, never to discharge the target property.

Evidence. The paper lists successful use of Yices, CVC3, Z3, veriT, and Alt-Ergo through the SMT backend (§4.3, p.5). Isabelle/TLA+ provides rewriting, tableau, resolution, and combinations of those methods, and its standard library provides more than 1400 lemmas and theorems (§4.1, p.4).

Limits. Both the SMT-LIB and Presburger backends are non-certifying, and the authors plan to replace them with certifying backends, in particular by integrating the proof-producing SMT solver veriT (§4.3, p.5). Inference: a proof accepted in this release may therefore rely on a backend outside the checker chain. TLA+ is untyped; many lemmas require explicit typing hypotheses (§4.1, p.4).

## technique 4: model checking before proof writing

What it is. The authors first run TLC on finite instances, then write TLAPS proofs. The paper says: “Before attempting to prove correctness of a TLA+ specification, we first check finite instances with the TLC model checker.” (§5, p.6)

How to apply it. Check finite instances with TLC; "Only after TLC can find no more errors do we try to write a proof" (§5, p.6). Assumed facts about data structures such as sequences should be model-checked with TLC rather than silently trusted (§5, p.6). Inference: choosing the finite bounds (participants, values) is left to the user; the paper gives no guidance.

Verus form. Inference: pair Verus proofs with bounded executable tests or a separate finite-state model. Use tests to find specification and implementation mistakes, then encode the discovered invariant in `requires`, `ensures`, and loop `invariant` clauses. Inference: tests do not replace the Verus proof and cannot establish unbounded safety.

Evidence. The paper reports that finite checking catches numerous errors more quickly than attempting a proof (§5, p.6). No denominator or benchmark-wide detection rate is provided.

Limits. TLC explores only the selected finite instances. The authors warn that unchecked assumptions are a likely source of errors and should be model-checked (§5, p.6).

## what is proved and what remains trusted

The release handles temporal reasoning needed for standard safety properties, in particular invariance and step simulation, but not liveness properties (§1, p.1). The backends prove leaf obligations under TLA+ semantics; they do not establish that the specification captures the intended system. The paper warns: “It is far more likely for a system error to be caused by an incomplete or incorrect specification than by an incorrect proof inadvertently accepted as correct due to bugs in TLAPS.” (§2, p.2)

Inference: for VL, the reusable lesson is a layered workflow: finite counterexample search, hierarchical proof decomposition, obligation dispatch, and an explicit certifying/non-certifying trust ledger. The paper predates Verus and does not prove Rust, ownership, unsafe code, compiler behavior, or hardware. Inference: VL should not redo a generic proof-manager portfolio without a Rust/Verus integration or measured reliability benefit; the product threat is accepting a proof of the wrong or incomplete contract.

## techniques for the catalog

- hierarchical proof decomposition — break system invariants and refinements into named intermediate steps and leaf obligations
- obligation dispatch — flatten modules, resolve definitions and references, and route each leaf to an appropriate backend
- certifying backend chain — have a proof-producing prover emit scripts checked by a trusted proof assistant
- explicit non-certifying boundary — record SMT and decision procedures that automate obligations without a checked proof
- finite model-checking preflight — test bounded instances and assumptions before investing in an unbounded proof
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Tuples and sequences are defined as functions whose domains are initial intervals of the natural numbers."): read all 7 pages of the paper text; checked every quotation, number (130, 800, 550, over 1000, 1400, 100 lines), section and page reference, and the technique steps against the paper; changed several page references (§3 begins on p.2, so the TLAPM quote and module flattening are p.2; subexpression references are p.3; the Zenon-then-Isabelle procedure spans pp.3-4), rewrote the hierarchical steps to follow the paper's §5 description, removed claims the paper does not make (recursive flattening, named steps, "Mark operators hidden", finite-bound guidance, hierarchy improving maintenance) or marked them as Inference, and added that the second Paxos proof was incomplete; did not check the Verus-side inferences against Verus documentation, the cited references, or the unverified claims about TLAPS outside this paper.
