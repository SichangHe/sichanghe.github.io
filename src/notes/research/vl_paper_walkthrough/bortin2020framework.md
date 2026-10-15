# A Framework for Modelling, Verification and Transformation of Concurrent Imperative Programs
(authored by agents unless marked 🧑)
Tag: `bortin2020framework`, [paper](http://arxiv.org/abs/2007.02261v5)

## scope and computational model

This report presents an Isabelle/HOL-oriented framework for sound reasoning about interleaved imperative programs. Its abstract says it is “aimed to support sound and structured reasoning upon various properties of models of imperative programs with interleaved computations” (Abstract, p. 5). The framework defines a concurrent while-language, potential computations controlled by program and environment steps, program correspondences, an extended Hoare rely/guarantee logic, fair computations, and a refutational liveness method. Peterson's mutual exclusion algorithm is the case study.

The framework deliberately supports both high-level structured commands and low-level jumps. It treats an execution as a sequence of configurations containing a program part and a state; environment steps may change state according to a rely relation, while program steps are constrained by the program semantics. The authors explain the motivation: “the framework encompasses state abstractions as well as high- and low-level language features facilitating structured verification of input/output, invariant and liveness properties of interleaved computations at various levels of abstraction” (Chapter 1, p. 2).

Inference: the closest Verus analogue is a state-machine proof with explicit transition functions, invariants, and rely/guarantee facts. Verus supplies Rust ownership and state-machine macros rather than Isabelle's higher-order logic; the framework's semantic relations therefore need to be represented as spec functions and proof lemmas.

## technique: program correspondence and refinement

When to use it: use a correspondence when a complex concurrent program can be related to an auxiliary or abstract program whose properties are easier to prove. The relation connects states and constrains matching program steps.

Steps from Chapters 3–4 (pp. 17–34):

1. Define a state relation `r` between the source and target state types.
2. Define a simulation or correspondence requiring related initial states, matching environment behavior, and a source program step whenever the target makes a matching step. The report defines program correspondence as a relation between programs with potentially different state spaces (Definition 3.1.1, p. 18).
3. Prove finite computation replay: from a target computation and an initial related state, construct a source computation with related states at every position (Chapter 4, pp. 29–34).
4. Transfer state predicates by relational image. If a source postcondition is mapped into the target postcondition and guarantees are preserved under the relation, apply the program correspondence rule.

The rule is Proposition 5.2.1 (p. 36). Its four premises require the target precondition to be included in the relation image of the source precondition, rely relations to commute through the correspondence, the source postcondition image to be included in the target postcondition, and guarantees to be preserved. The paper gives the conclusion in words through the formal rule and explains, “This proposition can also be viewed as a generalisation of the principle, usually called ‘the rule of consequence’” (Section 5.2, p. 37).

Inference: in Verus, represent `r` as a `spec fn` over two state values and prove the four premises as `proof fn` lemmas. A Verus state-machine transition invariant can carry the relation across transitions; a Rust implementation and an abstract ghost model can then be proved corresponding. The paper's arbitrary higher-order state relations do not automatically become executable Rust.

## technique: extended Hoare rely/guarantee triples

When to use it: use extended triples for concurrent input/output and invariant properties where environment interference must be explicit. A triple has rely `R`, precondition `P`, postcondition `Q`, and guarantee `G`.

Definition 5.1.1 (p. 35) states `ρ ⊨ {R,P} p {Q,G}` exactly when computations satisfying the environment rely and input condition are included in those satisfying the output and program guarantee. Definition 5.1.2 adds infinite computations; Proposition 5.1.1 proves the finite and infinite forms equivalent (pp. 35–36). The report writes, “With the extended triples, such assertions are instead neatly captured by the components that constitute the extension: the rely and the guarantee namely” (Section 5.1, p. 35).

Steps for a proof:

1. Choose `R` to constrain every environment state change.
2. Choose `P` for allowed initial states and `Q` for states at termination.
3. Choose `G` to constrain every program step's state change.
4. Apply the syntax-directed rules for `skip`, basic commands, parallel composition, sequential composition, `while`, `await`, and conditionals (Sections 5.3–5.8, pp. 38–47).
5. Compose component triples with the parallel rule, discharging stability and non-interference premises.

Inference: in Verus, `R` and `G` become transition predicates and state-machine invariants, while `P` and `Q` map to `requires` and `ensures`. Verus's ownership can discharge some interference obligations, but shared-memory protocols still need explicit ghost state and transition proofs. The four-part tuple is a design pattern, not a Verus built-in.

## technique: Peterson mutex via an auxiliary model

When to use it: use an auxiliary program when protocol variables obscure a property of critical sections. The paper defines `mutex_aux` with additional turn variables and relates it to the actual `mutex` by state equivalence that preserves `turn`, `shared`, flags, and local states (Section 6.3, pp. 56–57).

Steps in the case study:

1. Prove input/output triples for each critical section in the auxiliary model.
2. Prove that each critical section corresponds to its auxiliary version (premises (1)–(4) of Proposition 6.3.1, p. 57).
3. Prove correspondences from auxiliary threads to concrete threads (premises (5)–(6)).
4. Apply the mutex rule to conclude a whole-protocol triple.
5. Instantiate `cs0` and `cs1` with `update0` and `update1`, which copy `shared` to a local set, insert 0 or 1, and write it back. The resulting postcondition is `0 ∈ shared ∧ 1 ∈ shared` on termination (Section 6.4, p. 57).

The paper's formal mutex rule concludes `mutex cs0 cs1` with the conjunction of component postconditions under a joint precondition and the identity rely (Proposition 6.3.1, p. 57). It says that premises (3)–(6) “get routinely discarded when the rule is applied to instances of cs 0 and cs 1 that sensibly avoid any form of access to the protocol and the auxiliary variables” (p. 57).

Inference: in Verus, model `shared`, flags, and turn as state-machine fields; put the auxiliary variables in ghost state and prove a refinement invariant. The set-update example becomes Rust map/set operations with `ensures` about membership. Verus can check the resulting invariant but does not inherit the framework's correspondence theorem automatically.

## technique: fair computations and liveness

When to use it: use fairness when an unbounded scheduler could otherwise postpone an enabled thread forever. The paper defines an always-available position and requires that every such position eventually fires while remaining available (Definition 9.2.2, p. 76).

The method is:

1. Identify program positions in `await` and other commands whose availability is state independent.
2. Define an infinite computation as fair when, from every point, each always-available position eventually performs a program step with the same residual position.
3. Restrict correspondence replay so that components are sequential and the target is non-blocking. Definition 9.4.2 requires componentwise correspondence, sequential source components, and non-blocking target components (p. 86).
4. Use Proposition 9.4.1 to replay a target infinite computation while preserving related states and fired component positions, then Proposition 9.4.2 to transfer fairness (pp. 86–88).

The report warns that extending fairness to every position would be too restrictive: it “would make it inadequately restrictive as we would be able to infer that any sq ∈ vawait C do skip odwfair with C ⊂ J reaches a state satisfying C at least once” (Section 9.2, p. 76). Thus the result assumes the narrower always-available definition and does not fully support arbitrary `await` conditions (Section 9.5, p. 89).

Inference: Verus liveness requires a separately stated progress/fairness assumption over the scheduler; an `invariant` alone proves safety, not eventual execution. A ghost counter or ranking argument can encode the fairness consequence, but the scheduler assumption remains trusted unless modeled.

## technique: refutational liveness and termination

When to use it: use the refutational method to prove that all fair computations eventually reach a desired state. Instead of constructing a terminating run, assume a fair non-terminating run and derive a contradiction through syntax-driven rules.

Steps in Chapters 9–10 (pp. 77–98):

1. Negate the desired liveness statement by fixing a fair computation that never reaches the target predicate.
2. Decompose parallel, sequential, conditional, and while commands using the syntax-driven rules of Section 9.3.
3. Record invariants and event-order facts on suffixes of the fixed computation.
4. Close every branch by contradiction with an extended Hoare guarantee or an eventual-termination premise.
5. For Peterson's mutex, assume critical sections unconditionally terminate; derive global guarantees preserving flags and turn; split into branches where one or both auxiliary threads are stuck; show each branch contradicts those guarantees (Sections 10.1–10.2, pp. 92–95).

The report's termination goal is that every fair computation of `mutex cs0 cs1` reaches a skip configuration when both critical sections terminate (Chapter 10, p. 91). It explicitly observes that a model with perpetual waiting would make termination vacuous, so the proof targets the actual protocol and all fair computations.

Inference: in Verus, encode the contradiction invariant as a ghost state-machine invariant and use a well-founded rank for each loop. The syntax-driven refutation itself is not a Verus construct; it can guide which lemmas and rank decreases an agent should generate.

## evidence, trusted parts, and limits

The report gives formal definitions, propositions, and a complete Peterson case study, but no experimental benchmark denominator or runtime measurements. Its evidence is theorem-level: Proposition 5.1.1 establishes finite/infinite triple equivalence; Proposition 5.2.1 transfers properties across correspondences; Proposition 9.4.2 transfers fairness; and Chapter 10 closes a termination proof under explicit critical-section assumptions. The implementation is a framework in simply typed higher-order logic with Isabelle/HOL support, so trust includes the logic, Isabelle kernel, semantic definitions, and all assumptions about environment steps and fairness.

Inference: the threat to agent-written verified Rust is high for concurrency because a safety proof can silently rely on an unstated scheduler or abstraction relation. The framework's explicit rely, guarantee, correspondence, and fairness components identify those assumptions and are useful design requirements for VL. VL should reuse the rely/guarantee and refinement structure instead of inventing a second concurrency contract language; it still needs a Rust-specific encoding and measured agent-proof evaluation.

## techniques for the catalog

- program correspondence — relate source and auxiliary programs by a state relation and replay matching computations
- rely/guarantee Hoare logic — specify environment interference, inputs, outputs, and program-step guarantees
- auxiliary-model refinement — prove protocol properties on a ghost-augmented model and transfer them to concrete code
- fair computation — require enabled positions to fire eventually under explicit availability assumptions
- refutational liveness — assume a fair non-terminating run and close syntax-driven branches by contradiction
- termination by protocol invariants — combine global guarantees, fairness, and component termination to prove mutex termination
Checked 2026-10-14 against the paper by a Codex agent: audit record bortin2020framework; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
