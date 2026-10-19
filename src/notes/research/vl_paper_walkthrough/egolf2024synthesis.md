# Efficient Synthesis of Symbolic Distributed Protocols by Sketching
(authored by agents unless marked 🧑)
Tag: `egolf2024synthesis`, [paper](http://arxiv.org/abs/2405.07807v1)

## problem and guarantees

S CYTHE completes holes in parameterized distributed protocols written in TLA+. A sketch fixes parameters, state variables, initial state, and most of the transition relation while leaving precondition or state-update expressions unknown. The paper defines sketching as “a completion problem: given a sketch (i.e., an incomplete system with holes) the goal is to complete the sketch such that the completion satisfies a given correctness specification” (§I, p. 1). The tool combines syntax-guided grammar enumeration with counterexample-guided inductive synthesis (CEGIS), using TLC as the verifier (§I, p. 1; §IV, p. 4).

Problem 1 asks for a completion correct for one specified parameter assignment; Problem 2 asks for a completion correct for every instance (§III-B, p. 4). Problem 1 does not itself require a finite instance: the authors say they can use a model checker “in cases where the instance has finitely many states” (§III-B, p. 4). The synthesis experiments use finite instances. Subsequent TLAPS proofs establish the key safety property for all instances of the reported protocols except Peterson, whose four variants need no extra verification because they involve only two processes (§V, p. 7). A TLC pass proves only the instance it exhaustively explored.

Inference: A possible Verus adaptation would search expressions for holes in Rust code or its specifications. The paper does not establish how to construct that adaptation. Its finite-instance guarantee would justify only the modeled instance, not every execution of a Rust implementation.

## technique 1: typed holes and grammars

Represent a sketch as `<PARAMS, VARS, HOLES, INIT, NEXT0>`. Each hole has a name, argument symbols, output type, and grammar, and appears once in exactly one associated action (§III-A, p. 3). A pre-hole returns Boolean and fills an action precondition; a post-hole returns the type of its state variable and fills the right-hand side of an update. The paper replaces the update with `vote_yes' = h(vote_yes, n)` and supplies the grammar `E ::= ∅ | {n} | vote_yes | (E ∪ E) | (E ∩ E) | (E \ E)` (§III-A, p. 3).

Step by step: decompose `NEXT` into actions; split each action into precondition and postcondition clauses; choose which guards or updates are unknown; declare argument domains and output types; write a grammar for each hole; and leave `INIT` fixed. The authors state, “We do not consider synthesis of the initial state predicate” (§III-A, p. 3). Restrict synthesized updates to `v' = e` where `e` has no primed variables, while leaving unsynthesized clauses arbitrary (§II-D, p. 3). Action-argument domains must be protocol parameter symbols of type `Domain` (§II-D, p. 3).

Inference: A Verus adaptation could use typed grammars to generate candidate specifications or implementation expressions. Which holes and grammars are useful would require a separate evaluation.

## technique 2: CEGIS with TLC counterexamples

The learner/verifier loop is: generate candidate completion X satisfying current pruning constraints; run TLC against property Φ; return X if Φ holds; otherwise receive a counterexample run r; generalize r into new pruning constraints; repeat until success or exhaustion (§IV, p. 4). The learner has three components: expression generator (EG), pruning-constraint checker (PCC), and counterexample generalizer (CXG) (§IV, p. 4).

The paper defines the trace precisely: “A counterexample is a run of the protocol annotated with actions” (§IV-B, p. 5). Safety/deadlock violations are paths; liveness violations are lassos (a path leading to a cycle) (§IV-B, p. 5). An annotated run lets the algorithm blame actions that caused the violation (§II-D, p. 3). A pruning constraint is a disjunction of terms `(hole, argument valuation, output value)`; a completion violates a term when its hole evaluates to that output on that valuation (§IV-B, p. 5). Maintain the conjunction of all constraints and pass a candidate to TLC only when it satisfies every constraint.

Step by step: obtain the annotated trace; for each transition, record each hole's argument valuation and output; form a disjunction requiring at least one evaluation to differ; add the constraint; and continue enumeration (§IV-C.1, p. 6). For deadlock, also allow a false pre-hole at the final state to change. For liveness, also allow a false pre-hole of a fair action to change at a cycle state. For stuttering, also allow post-holes of fair actions to change at the final state (§IV-C.2–4, p. 6). These additional changes may still fail to enable an action if several preconditions need changing. Theorem 1 states that safety constraints are optimal and deadlock, liveness, and stuttering constraints are sub-optimal (§IV-C, p. 6; proofs in Appendix A, p. 10). Here optimal means rejecting exactly the completions retaining the annotated violation; sub-optimal constraints may retain some such completions but never reject a completion that removes it (§IV-C, p. 5). The authors explain that over-pruning can cause the algorithm to “miss valid completions” (§IV-C, p. 5).

Inference: A Verus adaptation might turn failed candidate checks into constraints over contract or invariant fragments. It would need a justified method for extracting those constraints; the paper's construction depends on annotated protocol runs.

## technique 3: cache enumeration, equivalence reduction, and short-circuiting

Naive breadth-first enumeration expands partial expressions and was too slow in the authors' experiments (§IV-A.1, p. 4). S CYTHE instead caches complete expressions by size and non-terminal, generating size n before n+1 (§IV-A.2, p. 4). Expression size is the number of tree nodes. To reduce the cache, normalize each new expression and retain only one expression per normal form (§IV-A.3, p. 5). Normal forms cover set operations, Boolean operations, equality, and inequality. The authors state, “We use DNF as the normal form for boolean expressions” (§IV-A.3, p. 5). DNF means disjunctive normal form. Set equality is reduced to testing whether the symmetric difference is empty (§IV-A.3, p. 5).

Short-circuiting exploits commutativity by skipping reversed operand-size pairs. The paper illustrates this with `(1,4)` and `(2,3)` versus `(4,1)` and `(3,2)` (§IV-A.3, p. 5). Normal-form reduction separately discards expressions already represented in the cache. The paper illustrates redundancy with a Boolean grammar over two variables: it generates infinitely many expressions but only 16 Boolean functions (§IV-A.3, p. 5).

Inference: the paper's size-pair example illustrates operand ordering, but its arithmetic omits the operator node. Under its tree-node definition of size, the operand sizes of a size-five binary expression must sum to four.

Step by step: assign every expression a tree size; generate terminals; combine cached terms according to grammar productions while skipping reversed size pairs for commutative operators; compute a normal form; discard duplicates; cache surviving expressions; and send them to PCC (§IV-A, pp. 4–5). The implementation does not call an SMT or SyGuS solver; it evaluates candidates directly against pruning constraints (§VI, p. 8).

Inference: For Verus proof repair, caching normalized candidate predicates could reduce repeated work, provided the normalization preserves their meaning. The paper does not evaluate this adaptation or restrict every expression domain to be finite.

## evidence and boundaries

Table I contains 22 experiment rows covering decentralized lock, lock server, Peterson, two-phase commit, consensus, sharded key-value, and two Raft reconfiguration variants. With equivalence reduction, the column “generated/ model checked” reports 3020/117 for decentralized lock ID 486, 65994/23 for 2pc ID 303, and 3155/84 for raft-reconfig-big ID 708 (Table I, p. 8). The first count is generated completions; the second is completions checked by TLC. Times are seconds (§V, p. 7). For raft-reconfig ID 121, reduction generated 271 completions and took 31 seconds; without reduction, 694552 completions were generated before the one-hour timeout (Table I, p. 8). This supports the reported reduction of more than three orders of magnitude (§V, p. 7).

For raft-reconfig ID 343 and raft-reconfig-big ID 709, the initial completions were correct for up to three nodes but incorrect for four or more (§V, p. 7). The authors added an extra-check on larger instances before returning a solution; a failed extra-check resumes synthesis. ID 343 then found a solution safe for all instances in 750 seconds, including extra-checks (§V, p. 8). For ID 709 (304 TLA+ lines), the authors report finding a solution correct for all instances, “although it timed out after a total of four hours” during the final four-node extra-check, which took about two hours (§V, p. 8). The run timed out during that check. Inference: these two initial completions demonstrate that correctness on small instances does not imply correctness on larger ones.

For every protocol in Table I except Peterson, the authors used TLAPS to prove the key safety property for all instances. They explicitly state, “our TLAPS proofs did not consider liveness” (§V, p. 7). This limits the generalization guarantee to safety.

## trust, limits, and product threat

The authors modified benchmarks to separate the controllable protocol from its uncontrollable environment and restricted grammar array indices to prevent unimplementable updates (§V, p. 7). They also added liveness properties and fairness constraints because safety alone can admit trivial solutions, such as filling a pre-hole with `False` (§V, p. 7). Their conclusion claims: “We present the only, to our knowledge, truly syntax-guided synthesis method for symbolic, parameterized, infinite-state distributed protocols” (§VII, p. 8). This is the authors' comparison with prior work.

Inference: Trust in these results depends on the protocol model, grammars, expression evaluator and reductions, TLC checks, and subsequent TLAPS proofs. For VL, the reusable idea is counterexample-guided search over typed holes with equivalence reduction. A bounded model can omit behavior of a larger instance or the implementation's environment. Any proposed Verus adaptation should therefore state exactly which executions and properties its checks cover. The paper does not establish its effectiveness for Rust ownership, concurrency, or proof repair.

## techniques for the catalog

- typed protocol sketches — define pre- and post-holes with argument domains, output types, and grammar-generated expressions
- CEGIS with annotated traces — alternate candidate generation and TLC checking, encoding each counterexample as a pruning constraint
- cache-based enumeration — generate expressions by size and reuse cached subexpressions instead of expanding all partial trees
- semantic equivalence reduction — normalize set, Boolean, equality, and inequality expressions and keep one representative per normal form
- short-circuit enumeration — exploit commutativity to skip reversed operand-size combinations
- larger-instance extra-check — model-check larger instances before returning a candidate; separately prove all-instance safety with TLAPS
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Our primary goal is to avoid over-pruning constraints, since over-pruning results in an incomplete algorithm, i.e., an algorithm that might miss valid completions."): checked the complete paper, including Appendix A, against the study's quotations, counts, references, technique steps, and guarantee scope; corrected the table count, page and section references, hole-update example, enumeration details, and ID 709 timeout account, and qualified Verus analogies as inferences; did not rerun experiments, inspect the artifact or TLAPS proof files, or validate the proposed Verus adaptations.
