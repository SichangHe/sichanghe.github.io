# Structural Temporal Logic for Mechanized Program Verification
(authored by agents unless marked 🧑)
Tag: `ioannidis2025structural`, [paper](https://doi.org/10.1145/3763091)

## scope and contribution

The paper introduces Temporal Interaction and Choice Logic (Ticl), a structural temporal logic for mechanized safety and liveness proofs over effectful, nondeterministic, finite, and infinite programs. The abstract states: “Using Ticl, we encode complex (co-)inductive proof techniques as structural lemmas and focus our reasoning on variants and invariants.” (Abstract, p. 1) It reports mechanized examples for scheduling, shared memory, and distributed consensus in the Rocq proof assistant (Sec. 1, p. 2). The supplied version is the 2025 publication; its first page gives “33 pages. https://doi.org/10.1145/3763091”.

The motivating problem is a verification gap: conventional temporal logics reason over traces or automata, while Hoare-style logics reason over program constructs. Ticl extends CTL with program postconditions, supplies a denotational ICTree model, and provides 50 high-level structural lemmas that hide more than 20,000 lines of coinductive and inductive proof infrastructure (Sec. 1, p. 2). The paper’s formal development relies solely on the uniqueness-of-identity-proofs axiom (Sec. 1, p. 2).

## technique 1: model effectful programs with ICTrees

What it is. ICTree is a coinductive denotational model with visible event (Vis), silent (Tau), nondeterministic choice (Br), and return (Ret) nodes (Sec. 3.1, pp. 4–6). It supports sequencing (`bind`), iteration, choice, nontermination, and interaction. The transition relation hides finite sequences of Tau steps; an infinite Tau chain is stuck, so silent divergence remains distinct from termination (Secs. 3.1 and 4.1, pp. 4–8). The authors describe ICTrees as “expressive enough to formalize programming languages with nondeterminism, nontermination, and interaction” (Sec. 3, p. 4).

Inference: Use ICTrees when a program can run forever, make nondeterministic choices, or interact with an environment and the proof must talk about observable events while retaining structural composition.

How to do it.

1. Define the program’s event type E and response types. A visible event stores an action and has one child for each environment response. (Sec. 3.1, p. 4)
2. Encode internal computation as Tau, finite nondeterminism as Br, termination as Ret, and a blocked program as the stuck infinite Tau tree. (Sec. 3.1, pp. 4–5)
3. Define monadic `bind` and `Ret` and prove the monad laws so sequential composition is available. (Sec. 3.1, pp. 4–6)
4. Define a Kripke world that records no observation (Pure), an observed event (Obs), or a return (Val/Finish). (Sec. 4.1, pp. 7–8)
5. Define the transition relation over program/world pairs, skipping finite Tau prefixes and recording events and responses. Ret transitions to a done world with a stuck residual tree; done worlds cannot transition further. (Fig. 8, p. 8)

Inference: A Verus-oriented analogue can model an event log or ghost state alongside a Rust function and prove postconditions over each loop iteration. Verus does not provide a coinductive ICTree datatype as part of the paper; implementing one would require explicit ghost structures and lemmas. `old(...)` and `decreases` are Verus tools for state snapshots and termination, not ICTree semantics, so they cannot by themselves express the paper’s nondeterministic infinite traces.

Evidence. The round-robin scheduler is represented as an infinite sequence of pop/push events, and instrumenting it records each popped thread (Secs. 2–3, pp. 3–7). The paper’s later MeQ development gives concrete event types Pop and Push and a queue handler (Sec. 7.1, pp. 19–20).

Failure and assumptions. Ticl formulas do not observe finite Tau prefixes. Instrumentation also determines which events remain observable. The authors explain (Sec. 6.1, p. 17):

> For example, we cannot prove “an empty heap is read” using a handler that erases reads (ℎ M ).

Inference: choosing the wrong ghost observations can make a desired Verus property unexpressible even if the implementation is correct.

## technique 2: separate prefix and suffix temporal specifications

What it is. Ticl uses two formula classes: prefix formulas φ for ongoing or infinite behavior and suffix formulas ψX for terminating computations with postconditions. The entailment is ternary, ⟨t,w ⊨ p⟩, over an ICTree t, world w, and formula p (Sec. 4, p. 7). The dual syntax lets a sequential proof state both that a prefix property holds and that a terminating command returns a value satisfying a postcondition.

Why it matters. If only suffix formulas existed, an infinite program would need a postcondition (effectively false for liveness); if only prefix formulas existed, sequential composition would lose program postconditions (Sec. 4.2, pp. 8–10). Ticl therefore supports finite and infinite traces in one compositional language. Its operators include all-path and exists-path Next (AN/EN), Until (AU/EU), Globally (AG/EG), conjunction, disjunction, and derived Finally (AF/EF). Globally operators occur only in prefix formulas (Fig. 10, p. 10).

How to do it.

1. Describe an ongoing state with `now P`, and a terminating state with `done PX`, where PX relates return values and worlds. (Fig. 10, p. 10)
2. Use AN/EN to constrain the current state and one transition, AU/EU to require a condition until a target, and AG/EG for globally quantified behavior. Universal Next also requires `can_step`, which excludes vacuous success at stuck states. (Sec. 4.3, pp. 9–11)
3. Use suffix formulas on the right of temporal operators when the target is termination plus a postcondition. (Sec. 4.2, pp. 9–10)
4. Compose a sequential program by proving the first command’s suffix postcondition and then proving the continuation’s prefix or suffix goal for every returned value/world. (Secs. 4.2 and 5.1, pp. 9–14)

Inference: In Verus, a terminating suffix resembles a function `ensures` clause, while a prefix resembles a ghost event invariant over loop iterations. A wrapper can carry the post-state needed by a continuation, but Verus’s ordinary function contracts are not a temporal logic and do not automatically quantify over all paths or infinite executions.

Evidence. For the example ⟨x ← t;; k x, w ⊨L AF obs PRINTS⟩, either t prints, or t terminates with postcondition R and every continuation from R eventually prints (Sec. 5.1, p. 14). The authors describe the resulting subproofs as “analogous to the sequence rule for safety properties in Hoare logic” (Sec. 5.1, p. 13).

Failure and assumptions. Ticl’s temporal operators are not complete for all liveness properties; the authors state that some properties require Büchi automata or raw coinductive proofs (Sec. 8.4, p. 25).

## technique 3: structural lemmas for composition and iteration

What it is. The Ticl library turns low-level (co-)inductive arguments into rules over ICTree constructors. Figure 14 gives bidirectional rules for Ret, Br, Vis, and the stuck tree, plus backward rules for `bind` and `iter` across temporal operators. The paper says: “All rules are proven—that is, each rule of our logic is sound—and the collection of all proofs corresponds to a statement of soundness for ticl.” (Sec. 5, p. 13)

How to apply composition rules.

1. Match the program’s outer constructor or combinator. (Sec. 5, pp. 12–14)
2. For nondeterministic choice t ⊕ u, prove the left formula φ at the choice node itself, then prove φ AU φ′ for both branches or φ EU φ′ for one branch using BrAU and BrEU. The choice takes a transition. (Fig. 15, p. 13)
3. For a bind x ← t;; k x, prove that t satisfies φ until it terminates with the intermediate postcondition, then prove the continuation’s AU or AG goal for every result/world satisfying that postcondition. Use BindAU or BindAG. (Fig. 15, pp. 13–14)
4. For a sequential event that already satisfies the target, use BindL and discharge the continuation; otherwise use the continuation branch. (Sec. 5.1, p. 14)

Inference: In Verus, these become reusable proof lemmas over a Rust wrapper’s ghost state: prove each branch of a match, then prove the continuation under the returned state and contract. The paper’s `AU`/`AG` formulas are not Verus keywords; they are specifications that would need to be encoded as predicates and lemmas.

How to apply loop rules.

1. State a loop invariant R relating the iterator state and world. (Sec. 5.2, p. 14)
2. For termination, provide a well-founded variant Rv. Prove that the body terminates, satisfying φ until its return: a continuing return preserves R and decreases Rv; an exiting return establishes the loop postcondition via Ret. (IterAU𝑅, Sec. 5.2, pp. 14–15)
3. For liveness, prove either that the body reaches the target while satisfying φ beforehand, or that it terminates with a continuing return preserving R and decreasing Rv, also satisfying φ along that finite execution. This is IterAU𝐿. (Sec. 5.2, pp. 14–15)
4. For always properties of nonterminating loops, use IterAG. For every state satisfying R, prove the inner formula for the whole loop. Also prove that the body takes at least one transition, then satisfies φ until it terminates with a continuing return preserving R. For a nested infinite body, the paper instead suggests unfolding the outer loop and applying BindL. (Sec. 5.2 and footnote 3, p. 15)
5. Replace a relational variant with a natural-number ranking function when convenient; prove successive states strictly decrease it. (Sec. 5.2, p. 15)

Inference: This maps closely to Verus loop `invariant` plus `decreases` clauses, with proof functions establishing preservation and strict decrease. Verus termination proofs do not alone establish an always-eventually temporal property; a ghost event model and additional lemmas are needed.

Evidence. Figure 20 uses invariant m[c] ≤ v ∧ m[r] + m[c] = v and ranking function f(m) = v − m[r] (p. 18). The prose in Sec. 6.3 instead prints f(m) = v − m[c] (p. 19). Inference: the prose formula is a typo, since c decreases and r increases; Figure 20 supplies the decreasing measure. The proof checks the initial invariant, body preservation/decrease, and three cases for c = 0, c = 1, and c > 1 (Sec. 6.3, pp. 18–19). The paper reports the StImp syntax, denotation, instrumentation, and structural rules in 500 lines of Rocq definitions/proofs (Sec. 6, p. 16).

## technique 4: instrumentation as a proof-facing observation interface

What it is. An instrumentation handler maps program events to an instrumentation monad and chooses which ghost state to record. In StImp, hM logs writes but erases reads; in the queue scheduler, hQ logs popped values (Secs. 6.1 and 7.1, pp. 17 and 20). The handler is separate from the program denotation, allowing the same language to support different observable specifications.

How to do it.

1. Define syntax and denotational semantics into ICTrees. (Sec. 6, pp. 15–16)
2. Define a handler h from events to an instrumentation monad and choose the ghost state W. (Sec. 6, p. 16)
3. Apply h to the ICTree and define end-to-end entailment from source program, initial state/world, and Ticl formula. (Secs. 6.1 and 7.1, pp. 17 and 20)
4. Lift ICTree structural rules to language-specific rules. (Sec. 6.2, p. 17)

Inference: For Verus, an instrumentation layer can log ghost events such as queue pops, lock transitions, or message sends, then state temporal predicates over that log. The logged ghost state is trusted only insofar as the handler’s relation to concrete execution is proved; an `assume` in the handler would weaken the guarantee.

Evidence. The authors explicitly note that hM cannot prove “an empty heap is read” because reads are erased (Sec. 6.1, p. 17). The MeQ proof uses both queue state and logged popped elements because they differ (Sec. 7.1, p. 20).

## technique 5: liveness split for protocol phases

What it is. Liveness split decomposes one loop-liveness proof around an intermediate relation RI. Before reaching RI, a ranking function f decreases; after reaching RI, a separate proof establishes the original liveness goal. The theorem is introduced for the leader-election protocol where the natural modules are candidate aggregation and leader announcement rather than scheduler-loop iterations (Sec. 7.3, pp. 22–23).

How to do it.

1. Identify a phase boundary and define RI over the iterator/world. (Sec. 7.3, p. 23)
2. Establish R initially. For each state satisfying R, prove that the body satisfies φ until it terminates with a continuing return, either reaching RI or preserving R while decreasing f. These alternatives concern a whole body execution. (Theorem 5, p. 23)
3. Prove that from any RI state, the full loop eventually satisfies the target. (Theorem 5, p. 23)
4. Repeat splitting when smaller ranking functions make the proof manageable. (Sec. 7.3, p. 23)

Inference: In Verus, RI can be a ghost phase predicate for a protocol or scheduler. The first lemma decreases a natural-number measure to the phase boundary; the second establishes the post-boundary property. This is useful when one global `decreases` measure is difficult to state.

Evidence. The paper verifies leader election in a unidirectional ring with no network, process, or Byzantine failures (Sec. 7.3, p. 22). Appendix C states: “The proof in Figure 34 is for three processes (𝑛 = 3), but the techniques used generalize to any number.” (p. 31) The initial process is chosen nondeterministically; subsequent scheduling follows the ring. The proved target is eventual observation of E3 from initial mailboxes [C3, C1, C2] (Appendix C, pp. 31–33). The development uses 123 lines of Rocq definitions and 115 lines of proofs (Sec. 7.3, p. 23). These counts measure artifact size.

Failure and assumptions. The protocol model assumes failures are absent; the paper says modeling them with ICTree nondeterminism is possible but beyond scope (Sec. 7.3, p. 22). Inference: applying liveness split to a real distributed Rust system requires explicit failure and fairness assumptions.

## what is proved, measured, and trusted

The formal results are soundness of the Ticl rules, equivalence preservation under up-to-Tau rewriting, and mechanized safety/liveness proofs for the examples. The paper proves that up-to-Tau equivalent programs satisfy the same Ticl formulas (Theorem 4, Sec. 4.5, p. 12). Reported proof sizes include 137 lines of definitions and 362 lines of proofs for round-robin, 174/242 for shared-memory safety, and 123/115 for consensus (Secs. 7.1–7.3, pp. 21–23). The shared-memory theorem checks that reads access memory labels ≤ their instruction labels, under an invariant requiring every even address to contain a low-labelled cell (Appendix B, pp. 29–30). Inference: this theorem alone does not establish a general noninterference property comparing two executions.

The paper states that its Rocq formalization relies solely on the uniqueness-of-identity-proofs axiom (Sec. 1, p. 2). Inference: interpreting a theorem as a guarantee about an implementation also requires trusting that the definitions, event handlers, and specifications describe that implementation and its intended property. Erasing an event limits what the temporal formulas observe.

## techniques for the catalog

- ICTree semantic model: represent finite, infinite, effectful, and nondeterministic programs with compositional event trees
- dual temporal specifications: separate ongoing prefix properties from terminating postconditions so sequential proofs compose
- structural temporal lemmas: reduce temporal proofs over bind, choice, and iteration to reusable sound rules
- invariant and ranking proofs: establish loop termination, liveness, and invariance with preserved invariants and decreasing variants
- proof-facing instrumentation: choose ghost observations through event handlers and lift generic rules to a source language
- liveness split: divide phase-structured liveness into smaller proofs connected by an intermediate relation
