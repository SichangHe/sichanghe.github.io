# A Framework for Modelling, Verification and Transformation of Concurrent Imperative Programs
(authored by agents unless marked 🧑)
Tag: `bortin2020framework`, [paper](http://arxiv.org/abs/2007.02261v5)

## scope and computational model

This report (arXiv:2007.02261v5, single author, page numbers below are the report's printed numbers) presents a framework embedded in simply typed higher-order logic for reasoning about interleaved imperative programs. Its abstract says it is “aimed to support sound and structured reasoning upon various properties of models of imperative programs with interleaved computations” (Abstract, unnumbered front matter). The framework defines a concurrent while-language, potential computations made of program and environment steps, program correspondences, an extended Hoare rely/guarantee logic, fair computations, and a refutational liveness method. A model of Peterson's mutual exclusion algorithm is the case study (Chapters 6, 8, 10).

The language supports both high-level structured commands (`if`, `while`) and low-level jumps (`cjump`), plus `await`, atomic sections and parallel composition (Section 2.1, p. 10). An execution is a sequence of configurations, each a program part and a state (Section 2.2, p. 11). A program step follows the structural rules of Figure 2.1 (p. 12). An environment step changes the state arbitrarily and leaves the program part unchanged (Section 2.2, p. 14). The rely relation does not restrict the semantics; it enters only through the condition `Env R` on computations (Definitions 4.1.2 and 4.1.3, pp. 29–30). The authors state the motivation: “the framework encompasses state abstractions as well as high- and low-level language features facilitating structured verification of input/output, invariant and liveness properties of interleaved computations at various levels of abstraction” (Introduction, p. 2).

Inference: the closest Verus analogue is a state-machine proof with explicit transition functions, invariants, and rely/guarantee facts. Verus supplies Rust ownership and state-machine macros rather than Isabelle's higher-order logic; the framework's semantic relations therefore need to be represented as spec functions and proof lemmas.

## technique: program correspondence and refinement

When to use it: use a correspondence when a complex concurrent program can be related to an auxiliary or abstract program whose properties are easier to prove. The relation connects states and constrains matching program steps. Chapter 1 (pp. 5–7) and Section 3.4 (pp. 27–28) use it to show that `if` and `while` programs are equivalent to jump versions.

Steps from Chapters 3–5 (pp. 17–37):

1. Define a state relation `r` between the two state types (Definition 3.1.1, p. 18).
2. Exhibit a simulation `X` containing the pair of programs. For each program step of the second program `q` from states related by `r`, the first program `p` must have a program step to a pair in `X` with related states; a pair in `X` has `skip` on one side only if it has `skip` on the other (Definition 3.1.1, pp. 18–19). The report defines `p` and `q` as corresponding w.r.t. `r` when such an `X` exists (Definition 3.1.2, p. 19); programs are equivalent when they correspond in both directions. The report notes that this equivalence is weaker than bisimulation (Chapter 3, p. 18) and that the binary parallel operator is not associative at this granularity (Section 3.2, p. 21), which is why parallel composition takes a flat list.
3. Prove finite computation replay (Proposition 4.2.1, pp. 30–31): given a finite computation of `q` that satisfies `Env R'`, a premise `r ∘ R' ⊆ R ∘ r`, and an initial state related by `r`, construct a computation of `p` of the same length with related states, a corresponding program at every position, and environment steps at the same positions.
4. Transfer rely/guarantee properties with Proposition 5.2.1 (p. 36). Given a triple `{R,P} p {Q,G}`, it concludes `{R',P'} q {Q',G'}` from four premises: `P' ⊆ r·P` (the target precondition lies in the image of the source precondition), `r ∘ R' ⊆ R ∘ r`, `r·Q ⊆ Q'`, and `r˘ ∘ G ∘ r ⊆ G'`.

The paper explains, “This proposition can also be viewed as a generalisation of the principle, usually called ‘the rule of consequence’” (Section 5.2, p. 37). Corollary 5.2.2 (p. 37) states the special case: equivalent programs satisfy the same rely/guarantee triples.

Inference: in Verus, represent `r` as a `spec fn` over two state values and prove the four premises as `proof fn` lemmas. A Verus state-machine transition invariant can carry the relation across transitions; a Rust implementation and an abstract ghost model can then be proved corresponding. The paper's arbitrary higher-order state relations do not automatically become executable Rust.

## technique: extended Hoare rely/guarantee triples

When to use it: use extended triples for concurrent input/output and invariant properties where environment interference must be explicit. A triple has rely `R`, precondition `P`, postcondition `Q`, and guarantee `G` (Section 5.1, p. 35).

Definition 5.1.1 (p. 35) states that `ρ ⊨ {R,P} p {Q,G}` holds iff `Env R ∩ In P ∩ ⟦p⟧ ⊆ Out Q ∩ Prog G`: every finite potential computation of `p` whose environment steps respect `R` and which starts in `P` satisfies the output condition `Q` (at its first `skip` configuration) and has every program step in `G`. Definition 5.1.2 adds infinite computations; Proposition 5.1.1 proves the two forms equivalent (pp. 35–36). The report writes, “With the extended triples, such assertions are instead neatly captured by the components that constitute the extension: the rely and the guarantee namely” (Section 5.1, p. 35).

Steps for a proof:

1. Choose `R` to constrain every environment state change.
2. Choose `P` for allowed initial states and `Q` for states at termination.
3. Choose `G` to constrain every program step's state change.
4. Apply the syntax-directed rules for `skip` (Prop. 5.3.1), `basic` (5.3.2), parallel composition (5.4.1, Corollary 5.4.2), sequential composition (5.5.1), `while` (5.6.1), `await` (5.7.1) and conditionals (5.8.1) (Sections 5.3–5.8, pp. 38–47). There is no rule for `cjump`; the report intends the syntax-driven part for jump-free programs and reaches jump programs through the equivalences of Section 3.4 (Section 5.3, p. 38).
5. Compose component triples with the parallel rule. Corollary 5.4.2 (pp. 40–41) requires a reflexive `G`, `R ⊆ R1 ∩ R2`, each component's guarantee to include the other's rely (`R2 ∩ G`, `R1 ∩ G`), and stable postconditions (`R1·Q1 ⊆ Q1`, `R2·Q2 ⊆ Q2`).

Limits stated in the paper: the rules are “far from being complete” (Section 5.4, p. 41). The triple for `x := x + 1 ‖ x := x + 1` with postcondition `x = 2` cannot be derived directly by the parallel rule and needs two auxiliary variables (pp. 41–43). The sequential rule needs the extra stability assumption (3) because of the auxiliary `skip` (Section 5.5, pp. 43–44).

Inference: in Verus, `R` and `G` become transition predicates and state-machine invariants, while `P` and `Q` map to `requires` and `ensures`. Verus's ownership can discharge some interference obligations, but shared-memory protocols still need explicit ghost state and transition proofs. The four-part tuple is a design pattern, not a Verus built-in.

## technique: Peterson mutex via an auxiliary model

When to use it: use an auxiliary program when protocol variables obscure a property of critical sections. Chapter 6 (pp. 49–59) proves a generic rule for `mutex cs0 cs1 = thread0 cs0 ‖ thread1 cs1` (Figure 6.1, p. 50). The condition `flag1 → turn` that lets thread 0 enter is not stable under the rely, so the paper adds auxiliary variables `turn_aux0` and `turn_aux1`, set in the same atomic section as `turn` (Figure 6.2, p. 52), and a weaker stable condition (6.1) (p. 51).

Steps in the case study:

1. State, as premises on the critical sections (premises (1)–(2) of Proposition 6.3.1, p. 57), triples for `cs0` and `cs1` with rely `shared = shared' ∧ local_i = local_i'`, postconditions `Q0`, `Q1` and guarantees `G0`, `G1` that leave the flags, `turn`, the auxiliary variables and the other thread's local variable unchanged and preserve the other thread's `P` and `Q` (pp. 53–54).
2. Derive the triple (6.2) for each auxiliary thread by the rules of Chapter 5. The step from (6.3) to (6.4) uses Proposition 5.2.1 with the state relation `r0` (identity on states where `turn_aux0 ∧ flag0 ∧ cond0` hold), which requires `cs0 ⊒_r0 cs0` (premises (3)–(4)); the mutual exclusion of the two conditions gives `shared = shared'` (Sections 6.1–6.2, pp. 54–55). Combine the two threads with Corollary 5.4.2 (Proposition 6.2.1, p. 56).
3. Transfer the result from `mutex_aux` to `mutex` with Proposition 5.2.1 and the relation `r_eqv`, equality on `turn`, `shared`, the flags and the local variables (Section 6.3, pp. 56–57). The needed correspondence follows from `cs_i ⊒_reqv cs_i` (premises (5)–(6)) and from `⟨turn := True; turn_aux0 := True⟩ ⊒_reqv turn := True` by Proposition 3.2.14 (p. 57).
4. The conclusion of Proposition 6.3.1 (p. 57) is `{id, P0 shared ∧ P1 shared} mutex cs0 cs1 {Q0 shared ∧ Q1 shared, J}`.
5. Instantiate `cs0` and `cs1` with `update0` and `update1`, which copy `shared` to a local set, insert 0 or 1, and write it back. The resulting postcondition is `0 ∈ shared ∧ 1 ∈ shared` on termination (Section 6.4, pp. 57–59).

The paper says that premises (3)–(6) “get routinely discarded when the rule is applied to instances of cs 0 and cs 1 that sensibly avoid any form of access to the protocol and the auxiliary variables” (Section 6.3, p. 57). That postcondition says nothing about the initial value of `shared`; Chapters 7–8 (pp. 61–70) lift the logic to state relations and obtain `shared ∪ {0,1} = shared'` (triple (8.6), p. 70).

Inference: in Verus, model `shared`, flags, and turn as state-machine fields; put the auxiliary variables in ghost state and prove a refinement invariant. The set-update example becomes Rust map/set operations with `ensures` about membership. Verus can check the resulting invariant but does not inherit the framework's correspondence theorem automatically.

## technique: fair computations and liveness

When to use it: use fairness when an unbounded scheduler could otherwise postpone an enabled thread forever. The paper first says which program positions are always available (Definition 9.2.1, p. 76): a position whose subterm is not an `await` is always available, and an `await C do q od` is always available only if `C = J` and `q` terminates from every state. An infinite potential computation is fair (Definition 9.2.2, p. 76) if for every index `i` and every always-available position `x` of the program part at `i`, some later step fires `x` while the subterm at `x` is still the one from index `i`. Liveness claims are made for fair computations with only “stuttering” environment steps (`Env id`) (Section 9.3, p. 77).

The method is:

1. Identify which positions are always available; this is the fairness assumption the scheduler must meet.
2. Define an infinite computation as fair when, from every point, each always-available position eventually performs a program step with the subterm at that position unchanged since that point.
3. To carry fairness along a correspondence, require componentwise correspondence. Definition 9.4.2 (p. 86) requires, for each parallel component, a correspondence `p_i ⊒_r q_i`, `p_i` sequential, and `q_i` non-blocking (Definition 9.4.1, p. 86). Without such a restriction, replay may leave a “spare” component that never moves (Section 9.4, p. 85).
4. Use Proposition 9.4.1 to replay an infinite computation of `q` as one of `p` with related states and matching fired component positions, then Proposition 9.4.2 to show the replayed computation is fair (pp. 86–88). Corollary 9.4.3 (p. 89) combines them: termination of all fair computations of `p` implies termination of all fair computations of `q`.

The report warns that extending fairness to every position would be too restrictive: “a plain generalisation of Definition 9.2.2 from always available to any position would make it inadequately restrictive”, because a fair computation of `await C do skip od` would then have to reach a state satisfying `C` (Section 9.2, p. 76). The result therefore covers only atomic sections and always-available positions, not arbitrary `await` conditions (Section 9.5, p. 89). Section 11.1 (pp. 100–101) sketches a generalisation in which the `await` condition must hold infinitely often.

Inference: Verus liveness requires a separately stated progress/fairness assumption over the scheduler; an `invariant` alone proves safety, not eventual execution. A ghost counter or ranking argument can encode the fairness consequence, but the scheduler assumption remains trusted unless modeled.

## technique: refutational liveness and termination

When to use it: use the refutational method to prove that all fair computations (with stuttering environment) eventually reach a desired state. Instead of constructing a terminating run, assume a fair non-terminating run and derive a contradiction through syntax-driven rules.

Steps in Chapters 9–10 (pp. 77–97):

1. Negate the desired liveness statement by fixing a fair computation that starts in the input condition and never reaches the target predicate (Definitions 9.3.1–9.3.3, p. 77).
2. Split the assumption into a non-terminating case and a case that reaches the first `skip` after `n` steps (Corollary 9.3.2, p. 78), then decompose by command with the syntax-driven rules of Propositions 9.3.3–9.3.7 (pp. 78–84).
3. A parallel composition of `m` components gives `2^m − 1` branches to refute, one per nonempty set of non-terminating components (p. 82). Each branch yields computations that run through the same states as the fixed one, so facts about components can be projected back onto it as invariants and event-order facts.
4. Close every branch by contradiction with a guarantee of an extended Hoare triple or with an assumption that a component unconditionally terminates.
5. For Peterson's mutex, assume `cs0` and `cs1` unconditionally terminate (10.2); derive the global guarantee `G_global` of triple (10.4) for the auxiliary model (p. 93); refute the three branches of Proposition 9.3.6 (p. 92). In the branch where both threads spin, `turn` would flip infinitely often but is constant from some point on (Proposition 10.1.1, pp. 93–95). In the branch where one thread terminates and the other spins, `flag0` stays false from some point on (Proposition 10.1.2, p. 94), contradicting the spin condition `flag0 ∧ turn` that recurs. The third branch is symmetric (Sections 10.1–10.2, pp. 92–96). Proposition 10.2.1 (p. 96) is the result for `mutex_aux`; Proposition 10.3.1 (p. 97) moves it to `mutex` with Corollary 9.4.3.

The ultimate goal is “a proof that any computation in” the fair computations of `mutex cs0 cs1` with stuttering environment “reaches a skip-configuration provided cs 0 and cs 1 unconditionally terminate” (Chapter 10, p. 92; the set notation is not reproduced here). The chapter also notes that a model where a thread waits forever would make the safety result easier, since no computation would reach `skip`, and that a variant ignoring `turn` has fair computations that terminate and others that do not (Chapter 10, pp. 91–92). The proof for the real protocol must therefore cover all fair computations.

Inference: in Verus, encode the contradiction invariant as a ghost state-machine invariant and use a well-founded rank for each loop. The syntax-driven refutation itself is not a Verus construct; it can guide which lemmas and rank decreases an agent should generate.

## evidence, trusted parts, and limits

The report gives formal definitions, propositions, and a complete Peterson case study. I found no experimental benchmark, denominator or runtime measurements in the text. Its evidence is theorem-level: Proposition 5.1.1 establishes finite/infinite triple equivalence; Proposition 5.2.1 transfers properties across correspondences; Proposition 9.4.2 transfers fairness; and Chapter 10 closes a termination proof under explicit critical-section assumptions. The report calls the framework a conservative extension of simply typed higher-order logic (Introduction, p. 2) and says “A version of the presented framework for the Isabelle/HOL prover is available” (footnote 1, p. 2). The text I read does not say that every proof in the report was machine-checked, so I did not check that claim or the repository.

The paper states its own scope limit: “This framework is therefore basically not aimed at verifying properties of any possible program but only of those that are provably equivalent to some jump-free program for which the verification conditions are actually generated” (Section 5.3, p. 38). It also notes that the model of Peterson's algorithm uses compound conditions such as `flag1 ∧ turn` that no single machine instruction evaluates, and discusses a finer-grained model in Section 11.3 (pp. 103–106).

Inference: trust therefore includes the logic, the semantic definitions (including the arbitrary-change environment steps), the checking tool used for any mechanised version, and all assumptions about fairness.

## techniques for the catalog

- program correspondence — relate source and auxiliary programs by a state relation and replay matching computations
- rely/guarantee Hoare logic — specify environment interference, inputs, outputs, and program-step guarantees
- auxiliary-model refinement — prove protocol properties on a ghost-augmented model and transfer them to concrete code
- fair computation — require always-available positions to fire eventually under explicit availability assumptions
- refutational liveness — assume a fair non-terminating run and close syntax-driven branches by contradiction
- termination by protocol invariants — combine global guarantees, fairness, and component termination to prove mutex termination
