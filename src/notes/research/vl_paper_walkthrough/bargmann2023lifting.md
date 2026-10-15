# Lifting the Reasoning Level in Generic Weak Memory Verification (Extended Version)
(authored by agents unless marked 🧑)
Tag: `bargmann2023lifting`, [paper](http://arxiv.org/abs/2309.01433v1)

## problem and contribution

The paper targets verification of concurrent programs under weak memory models without hard-coding one architecture. Its generic approach uses view-based assertions and axioms over weakest liberal preconditions (wlp), but proofs at that level require many low-level steps. The authors summarize the problem: “Due to the usage of weakest preconditions, reasoning however takes place on a very low level requiring the application of numerous axioms for deriving program properties, even for a single statement.” (Abstract, p. 1).

Their technique lifts those proofs to rules over program constructs and assertions. They prove soundness of general, fence, read, and write rules, and apply them to the write-to-read causality (WRC) litmus test. The result remains generic: “We prove soundness of our proof rules and exemplify them on the write-to-read causality (WRC) litmus test.” (Abstract, p. 1). The paper's evidence is a mathematical soundness argument plus one proof outline, not an implementation benchmark.

## technique 1: specify weak memory through views and axioms

What it is. Model a concurrent program as a parallel composition of sequential threads over global and local variables. A thread's view records which writes it can observe. The memory-model-independent proof uses an abstract transition system, a wlp transformer, an interference relation, and named axioms (C1–C4, SV1–SV2, RW1–RW7, FNC, MP).

When to use it. Use this abstraction when the same proof should transfer to several memory models that satisfy a common axiom subset. The paper notes that SC, TSO, PSO, and C11 RAR have been shown to fit the view-based category (Introduction, p. 1). A proof is transferable only when the target model instantiates every axiom used by that proof.

How to do it.

1. Define commands for local assignment, unsynchronized/synchronized reads and writes, fences, sequencing, conditionals, and loops (Section 2, pp. 2–3).
2. Define actions and an abstract transition relation `T(t,a)` over states; leave the concrete memory model unspecified (Section 3.1, p. 3).
3. Define `wlp(R,P)` as the states whose `R` successors all satisfy predicate `P` (Section 3.1, p. 3).
4. Define view-maximality `vmax(t,a)` and a view-preserving simulation `β`; require the core and read/write axioms in Figures 3–4 (Section 3.1, pp. 4–6).
5. Define view assertions such as impossible value `[x ≉ v]_t`, definite value `[x ≡ v]_t`, maximal value `[x = v]_t`, and synchronized conditional observations (Definition 2, p. 6).
6. Annotate every thread command with a pre- and post-assertion, forming a proof outline (Section 3.2, pp. 7–8).
7. Check local correctness for each command and global interference freedom for every other thread (Definition 4, p. 8).

Verus form. Inference: represent a weak-memory state and per-thread views as ghost state in a Verus state machine; define view predicates with `spec fn`, and encode each transition with `requires`/`ensures`. Inference: the axioms should be assumptions or separately proved lemmas about an abstract memory implementation, not executable Rust behavior. Standard Verus sequential contracts do not by themselves model relaxed reads, write propagation, or reorderings.

Evidence and limits. The authors prove that their rules are generic under the axioms, but no concrete hardware implementation is formalized in this paper. The abstraction intentionally over-approximates behavior through interference and β. It therefore depends on proving that a concrete memory model satisfies the selected axioms; SC, TSO, and C11 RAR are cited through prior work, not re-proved here (Conclusion, p. 17).

## technique 2: lift wlp derivations into sound construct rules

What it is. Replace repeated obligations of the form `P ⊆ wlp(T(t,a),Q)` with reusable Hoare-style rules `{P} com_t {Q}`. The general rules are True, False, Mono, Conj, and Disj (Figure 5, p. 9). Command-specific rules summarize the axioms needed for fences, reads, and writes.

How to apply it.

1. Prove the general rules once from wlp properties. Mono strengthens a precondition and weakens a postcondition; Conj and Disj combine triples (Section 4, p. 9).
2. For fences, use Fence1 to preserve a global assertion, Fence2 to transfer view-maximality to another thread, and Fence3 to transfer a definite value; record the required axioms beside each rule (Figure 6, p. 10).
3. For reads, use Read1 to preserve β-stable global assertions, Read2/Read3 to turn impossible/definite global values into local register facts, ConRead1/ConRead2 for conditional observations, and ReadReg/LocRead for unaffected local assertions (Figure 7, pp. 10–11).
4. For writes, use Write1–Write4 for assertions about other variables, Write5/Write6 for the written variable, ConWrite1 for cross-thread conditional observations, ConWrite2 for synchronized message passing, and WriteReg for local registers (Figure 8, pp. 11–12).
5. Apply Mono, Conj, and Disj to combine branches and assertions; inspect the rule's axiom side conditions to know the portability requirements (Section 4, pp. 9–12).
6. Prove each local and interference triple in the proof outline using these rules rather than expanding wlp definitions (Section 5, pp. 12–15).

Verus form. Inference: each rule can become a generic `proof fn` whose `requires` clauses list the relevant memory-model axioms and whose `ensures` clause states the Hoare triple. Assertions are `spec fn` predicates over ghost state; command execution remains an abstract transition function. Inference: Verus's `invariant` clauses can maintain β-stability through loops, but relaxed-memory operational semantics and the axiom library must be modeled first.

Evidence. The paper states: “The general proof rules in Figure 5 are sound.” (Theorem 1, Section 4, p. 10) and separately states soundness for fence, read, and write rules (Theorems 2–4, pp. 10–12). These are theorem-level guarantees under the listed axioms, not measured reductions over a benchmark suite.

## technique 3: write and audit the WRC proof outline

What it is. Use a three-thread WRC program: thread 1 writes `x := 1`; thread 2 reads `x`, then performs a write-synchronized `y := 1`; thread 3 performs a read-synchronized read of `y` and then reads `x`. The desired postcondition is that if `r1` and `r2` are 1, then `r3` is 1 (Example 2, p. 3).

How to apply it.

1. State initial assertions for all threads and intermediate assertions after each command (Fig. 1, p. 3).
2. Check local triples using the lifted rules. For example, the synchronized read in thread 3 uses ReadReg and ConRead2 to derive `{hy = 1iS [x = 1]3} r2 :=RS_3 y {r2 ≠ 1 ∪ [x = 1]3}` (Section 5, pp. 12–13).
3. Check every interference triple, pairing each command with every assertion in every other thread; use Table 2 to record the rule and axiom set (Section 5, pp. 14–15).
4. Apply Disj to combine alternative cases and finish local and global correctness.
5. State exactly which axioms the completed proof uses. The paper's Lemma 5 requires C2, C3, C4, SV1, SV2, RW2, RW3, RW5, RW6, RW7, and MP (Section 5, p. 13).
6. Transfer the result to a concrete model only after checking that model instantiates that axiom set. The paper relies on prior results that SC, TSO, and C11 RAR instantiate all of them (Conclusion, p. 17).

Verus form. Inference: encode each thread's control location, local registers, and shared state in a ghost transition system. State the WRC postcondition as a `spec fn`; prove each command transition with `proof fn` lemmas and preserve the outline invariant with `invariant`. Inference: a real Rust implementation using atomics would additionally require a Verus model of the target memory ordering and a refinement theorem from that model to hardware; the paper proves neither.

Evidence and limits. The paper says the complete outline contains 31 Hoare triples and that the lifted rules need significantly fewer steps than the axiom-level derivation (Section 5, pp. 14–15). It gives no numeric count of low-level versus high-level steps, no runtime, and no denominator beyond this one 31-triple example. The proof establishes safety of the stated WRC outcome under the named axioms; it does not establish progress, fairness, or absence of data races for arbitrary programs.

## technique 4: make proof portability explicit

What it is. Attach an axiom list to each lemma and rule so a reader can test portability to a partially fitting memory model. Earlier approaches hid which axioms an automated prover used; this paper records them with every lifted rule (Introduction, pp. 1–2; Section 3.1, p. 7).

How to apply it.

1. For each derived rule, list every core, shared-variable, fence, or message-passing axiom used in its soundness proof (Figures 6–8, pp. 10–12).
2. For each program triple, collect the union of side-condition axioms from the applied rules (Tables 1–2, pp. 13–15).
3. Compare that union with the axiom characterization of a target memory model.
4. Reject transfer when any required axiom is absent; do not treat a proof valid for one model as automatically valid for another.
5. Keep model-specific obligations separate from program-specific assertions so the same outline can be reused with another instantiation.

Verus form. Inference: encode an axiom set as a ghost type or module-level specification predicate and require it in each portability lemma. A generated report can list the `requires` dependencies of each proof function. Inference: this would make assumptions auditable, but it cannot prove the target CPU's implementation satisfies those axioms without an external memory-model proof.

Evidence and limits. The authors explicitly motivate this bookkeeping: “This enables us to directly see whether a proof is transferable to a memory model which only partially fulfills the axiom set.” (Introduction, p. 2). Portability is conditional on the model-to-axiom mapping from prior work; no new hardware validation is supplied.

## what is proved, measured, and trusted

The formal results are soundness theorems for four families of rules and Lemma 5 for WRC under a named axiom set. The paper's measured comparison is qualitative: the lifted proof has significantly fewer steps than the low-level proof, but no exact step counts or percentage are reported. The sole concrete proof artifact is the 31-triple WRC outline. Trusted components include the abstract transition-system semantics, wlp laws, the β/interference over-approximation, each axiom-to-hardware instantiation, and the correctness of the annotated proof outline.

Inference: a Verus adaptation would trust the abstract atomic-memory model, the proof that Rust atomic operations refine it, the solver, and the specification of the target program. A successful proof could still be irrelevant if the chosen view assertions do not express the product requirement.

## implications for VeruLaw

Inference: this paper's strongest lesson for VL is to expose proof assumptions as first-class dependencies. A generated concurrent Rust proof should record which memory-order axioms, interference lemmas, and environment assumptions each invariant uses, then reject reuse when a dependency changes. The syntactic lifting pattern also suggests reusable Verus proof lemmas for common atomic operations instead of repeating low-level solver steps.

Inference: VL should not redo generic claims that weak-memory proofs can be made model-independent through shared axioms or that Hoare-style rules reduce proof effort; this paper already proves those points for WRC. A distinct contribution would need a machine-checked Verus memory model, measured proof maintenance across real Rust revisions, and exact comparisons of proof obligations. Inference: the threat to agent-written verified Rust is high for concurrent code if generated contracts omit memory-order assumptions; a proof valid in SC may fail under TSO or C11, while a proof under an over-strong abstract model may be unsound for the deployed target.

## techniques for the catalog

- view-based generic memory reasoning: abstract per-thread observations and prove programs under named memory-model axioms
- lifted construct rules: replace repeated weakest-precondition calculations with sound fence, read, write, and general Hoare rules
- axiom-audited WRC proof: annotate a litmus-test proof outline and record the exact axioms required by each triple
- portability checking: transfer a proof only when the target memory model satisfies the collected axiom set
Checked 2026-10-15 against paper bargmann2023lifting: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
