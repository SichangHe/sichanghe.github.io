# Efficient Synthesis of Symbolic Distributed Protocols by Sketching
(authored by agents unless marked 🧑)
Tag: `egolf2024synthesis`, [paper](http://arxiv.org/abs/2405.07807v1)

## problem and guarantees

S CYTHE completes holes in parameterized distributed protocols written in TLA+. A sketch fixes parameters, state variables, initial state, and most of the transition relation while leaving precondition or state-update expressions unknown. The paper defines sketching as “a completion problem: given a sketch (i.e., an incomplete system with holes) the goal is to complete the sketch such that the completion satisfies a given correctness specification” (§1, p. 1). The tool combines syntax-guided grammar enumeration with counterexample-guided inductive synthesis (CEGIS), using TLC as the verifier (§1, p. 1; §IV, p. 4).

The main formal distinction is important. Problem 1 asks for a completion correct for one finite parameter assignment; Problem 2 asks for a completion correct for every instance (§III-B, p. 4). The synthesis loop solves Problem 1. The authors later use TLAPS to prove that most resulting protocols generalize to arbitrary node counts (§V, pp. 7–8). A TLC pass alone therefore proves only the finite instance it exhaustively explored.

Inference: In Verus, the sketch is a Rust implementation with holes represented by candidate expressions, ghost functions, or generated proof obligations. TLC's finite-instance check corresponds to running Verus on a bounded model or concrete instantiation; a general Verus proof still requires quantified invariants and contracts. Do not describe a finite counterexample-free search as a proof for all Rust executions.

## technique 1: typed holes and grammars

Represent a sketch as `<PARAMS, VARS, HOLES, INIT, NEXT0>`. Each hole has a name, argument symbols, output type, and grammar, and appears once in an associated action (§III-A, p. 3). A pre-hole returns Boolean and fills an action guard; a post-hole returns the type of its state variable and fills the right-hand side of an update. The paper's example replaces `vote_yes'` with `h(vote_yes, n)` and supplies the grammar `E ::= ∅ | {n} | vote_yes | (E ∪ E) | (E ∩ E) | (E \ E)` (§III-A, p. 3).

Step by step: decompose `NEXT` into actions; split each action into precondition and postcondition clauses; choose which guards or updates are unknown; declare argument domains and output types; write a finite or recursively generative grammar for each hole; and leave `INIT` fixed (the paper does not synthesize the initial predicate, §III-A, p. 3). Restrict synthesized updates to `v' = e` where `e` has no primed variables, while leaving unsynthesized clauses arbitrary (§III-A, p. 3).

Inference: In Verus, represent a hole's expression in a typed Rust/specification generator. Use `spec fn` for pure candidate expressions and put the selected expression into `ensures` or loop/state invariants. A Verus `spec fn` is not executable Rust, so generated proof terms must not be called at runtime.

## technique 2: CEGIS with TLC counterexamples

The learner/verifier loop is: generate candidate completion X satisfying current pruning constraints; run TLC against property Φ; return X if Φ holds; otherwise receive a counterexample run r; generalize r into new pruning constraints; repeat until success or exhaustion (§IV, p. 4). The learner has three components: expression generator (EG), pruning-constraint checker (PCC), and counterexample generalizer (CXG) (§IV, p. 4).

The paper defines the trace precisely: “A counterexample is a run of the protocol annotated with actions” (§IV-B, p. 5). Safety/deadlock violations are paths; liveness violations are lassos (a path leading to a cycle) (§IV-B, p. 5). An annotated run lets the algorithm blame actions that caused the violation (§II-D, p. 3). A pruning constraint is a disjunction of terms `(hole, argument valuation, output value)`; a completion violates a term when its hole evaluates to that output on that valuation (§IV-B, pp. 5–6). Maintain the conjunction of all constraints and pass a candidate to TLC only when it satisfies every constraint.

Step by step: obtain the checker trace; identify each action and hole valuation in the trace; encode the output that would reproduce the violation; form a constraint that requires at least one relevant hole evaluation to differ; add it to the constraint set; and continue enumeration. The paper proves safety constraints optimal, while deadlock and liveness constraints are sub-optimal but useful (§IV-B, p. 6). Avoid over-pruning: an over-pruning constraint can remove every valid completion and make the algorithm incomplete (§IV-C, p. 6).

Inference: The Verus analogue is to turn a failing proof obligation or counterexample execution into a constraint over candidate contract/invariant fragments. Because Verus proofs are symbolic rather than finite traces in the usual case, this requires a bounded harness or model extraction; that adaptation is not in the paper.

## technique 3: cache enumeration, equivalence reduction, and short-circuiting

Naive breadth-first enumeration expands every partial expression and quickly becomes too slow (§IV-A, p. 4). S CYTHE instead caches all non-partial expressions by size and non-terminal, generating size n before n+1. To avoid duplicate semantic expressions, normalize each new expression and retain only one expression per normal form (§IV-A.3, pp. 5–6). Normal forms cover set operations, Boolean operations, equality, and inequality; Boolean expressions use disjunctive normal form, and set equality is reduced to symmetric difference (§IV-A.3, p. 6).

Short-circuiting exploits commutativity. For a commutative operator, enumerate only size pairs `(1,4)` and `(2,3)`, not `(4,1)` and `(3,2)`, and avoid generating terms whose normal form is already cached (§IV-A.3, p. 6). In the paper's expression grammar, equivalence reduction changes an infinite grammar with exponentially many syntax trees into a small set of semantic representatives.

Step by step: assign every expression a tree size; generate terminal and previously cached terms; combine cached terms according to grammar productions; compute a normal form; discard a duplicate normal form; exploit commutativity and constant short-circuit rules; and send surviving expressions to PCC. The implementation does not call an SMT or SyGuS solver; it evaluates candidates directly against pruning constraints (§VI, p. 8).

Inference: For Verus proof repair, cache normalized candidate predicates or lemma combinations and reuse solver results only when the normalization preserves the proof obligation. This is an engineering analogy; Verus's quantifiers and trigger behavior make semantic equivalence harder than the paper's finite expression domains.

## evidence and boundaries

Table I evaluates 21 benchmark configurations covering decentralized lock, lock server, Peterson, two-phase commit, consensus, sharded key-value, and Raft reconfiguration. With equivalence reduction, generated/model-checked counts include 3020/117 for decentralized lock, 65994/23 for one 2pc case, and 3155/84 for raft-reconfig-big ID 708 (Table I, p. 7). The denominators are generated candidates and TLC-checked candidates for each configuration; times are seconds. The paper reports reductions of more than three orders of magnitude in generated expressions (§I, p. 2).

The largest Raft configuration (304 TLA+ lines, ID 709) required a final four-node extra-check that took about two hours; the full run is marked TO** after four hours (Table I and §V, p. 8). Two initial solutions (Raft IDs 343 and 709) were correct for up to three nodes but failed for four or more. The authors added a larger-instance extra-check; ID 343 then found an all-instance-correct solution in 750 seconds, while ID 709 eventually found one after the four-hour run (§V, p. 8). This is direct evidence that small-instance synthesis can overgeneralize.

For all benchmarks except Peterson, the authors used TLAPS to prove the key safety property for arbitrary instances; the four Peterson variants involve two processes and needed no extra verification (§V, p. 8). Liveness was not included in those TLAPS proofs (§V, p. 8). The authors' claim that synthesized protocols are safe for all instances therefore applies to the stated safety properties and proof scope, not to every temporal behavior.

## trust, limits, and product threat

Trusted components include the TLA+ semantics, TLC's exhaustive finite-state exploration, the grammars and typing assumptions, and the TLAPS proofs used after synthesis. Environment behavior must be modeled explicitly: the authors modified benchmarks to separate controllable protocol state from uncontrollable environment state and restricted grammars to prevent unimplementable updates (§V, p. 7). Their conclusion says the tool “is the only, to our knowledge, truly syntax-guided synthesis method for symbolic, parameterized, infinite-state distributed protocols” (§VII, p. 8), a comparative claim bounded by the cited prior work.

Inference: For VL, the strongest reusable idea is counterexample-guided search over typed proof holes with aggressive equivalence reduction. The product threat is incomplete modeling: a generated Verus proof can pass for a bounded state space while missing an unmodeled environment, larger collection, or liveness requirement. VL should not redo generic syntax-guided CEGIS; it should measure which Rust/Verus proof-hole abstractions preserve soundness under unbounded ownership and concurrency, and should require an explicit generalization proof after bounded search.

## techniques for the catalog

- typed protocol sketches — define pre- and post-holes with argument domains, output types, and grammar-generated expressions
- CEGIS with annotated traces — alternate candidate generation and TLC checking, encoding each counterexample as a pruning constraint
- cache-based enumeration — generate expressions by size and reuse cached subexpressions instead of expanding all partial trees
- semantic equivalence reduction — normalize set, Boolean, equality, and inequality expressions and keep one representative per normal form
- short-circuit pruning — exploit commutativity and constraint evaluation to skip redundant candidate combinations
- generalization extra-check — model-check larger instances and discharge all-instance safety with TLAPS after finite synthesis
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
