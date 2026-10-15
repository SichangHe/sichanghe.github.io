# Automatic Function Annotations for Hoare Logic
(authored by agents unless marked 🧑)
Tag: `matichuk2012automatic`, [paper](http://arxiv.org/abs/1211.6188v1)

## problem and contribution

Matichuk introduces function annotations for monadic Hoare logic. A proof of one property often establishes facts about intermediate states that another property needs, but ordinary preconditions and postconditions do not retain those facts in a reusable form. The paper's abstract says, “when proving that a function satisfies a Hoare triple, intermediate reasoning is automatically stored as function annotations,” and that annotations “can be exploited in future Hoare logic proofs.” (Abstract, p. 46) The implementation is in Isabelle/HOL and is tested on an experimental seL4 microkernel branch.

An annotation wraps a function with assertions checked at each intermediate operation and a failure flag. Under a precondition that proves the flag never fails, later proofs may assume the intermediate assertions. Multiple annotations for the same function are merged by conjoining their assertions. The technique preserves the underlying monadic function's behavior: annotations are proof artifacts and checks, not changed executable semantics. The paper reports no soundness gap in the formal definitions, but its practical evidence is one seL4 function and selected proof-script line counts.

## technique: derive annotations from an existing Hoare proof

Use this when a function proof has expensive intermediate reasoning that a later property will need. The paper's running function `new-tcb` allocates an identifier, creates a thread-control block, initializes a map entry, and enqueues the identifier (Fig. 1, p. 47). The invariant `valid-free` says an identifier is free exactly when it is absent from the `tcbs` map (Fig. 2, p. 48). Allocation temporarily violates that invariant, so the proof introduces `valid-free-except i`, which records the one permitted exception (p. 48).

Apply the method as follows:

1. state the ordinary top-level Hoare triple `{|P|} f {|Q|}` for the property being proved (§2, pp. 48–49)
2. expose the sequence of component operations and the intermediate predicates needed to compose their triples (§2)
3. replace the top-level triple with an annotator form `{|P|} f {|Q|} ⟨F⟩`, requiring both the original postcondition and adherence to annotation F (§3, p. 49)
4. let the verification-condition generator store each computed intermediate precondition as an annotation (§4, pp. 52–53)
5. prove that annotations cannot fail from P; then use the annotation in later triples (§3–4)

The example annotation in Figure 3 records `valid-free` before allocation, `valid-free-except i` during creation and initialization, and `valid-free` before enqueueing (p. 49). The paper emphasizes that annotations “do not need to be explicitly defined, but can be generated as a consequence of an existing Hoare logic proof.” (§1, p. 47)

Inference: In Verus, this corresponds to extracting intermediate facts from a successful `proof fn` or loop proof into reusable lemmas about a function's abstract state. Verus has no annotation monad or `afails` flag; a VL tool would store proof obligations and generated lemmas externally, then invoke Verus to recheck each use. The source code's executable behavior should remain unchanged, but the extracted fact is useful only if its `requires` conditions are preserved.

## technique: annotated triples and safe reuse

Use an annotated triple to consume an existing annotation as a temporary strengthening of the proof context. The paper defines `kPk F kQk` to mean that, for every initial state satisfying P where F does not fail, all outcomes of the underlying function satisfy Q (§3, p. 49). The definition permits assuming intermediate assertions because the proof obligation is conditioned on non-failure of F.

The reuse procedure is:

1. establish an annotation adherence result `{|P|} f {|Q|} ⟨F⟩` (§3–4)
2. formulate the new property as an annotated triple `kRk F kQk`, with R the new invariant (§3, p. 50)
3. split the annotated computation using the analogous weakest-precondition rules (§3, pp. 50–51)
4. use assertions supplied by F at each intermediate operation instead of reproving them from R (§3)
5. discharge the remaining ordinary Hoare triples and conclude the original triple via the annotation soundness rule (§4, p. 52)

For `new-tcb`, the `valid-free` annotation lets the `valid-queues` proof assume `valid-free-except i` during initialization. The paper derives `valid-queues ∧ valid-free-except i → not-queued i`, avoiding propagation and reproving of `not-queued i` through earlier operations (§3, pp. 50–51). Rule (5) turns an annotated precondition into an ordinary Hoare precondition, and rule (6) transfers the result when the function satisfies the annotation (§3–4, pp. 50–52).

Inference: A Verus version would pass previously proved lemmas as `requires` facts to a later `proof fn`, or invoke a lemma whose postcondition supplies an intermediate invariant. The reuse is sound only when Verus checks the original lemma and the new function's precondition; there is no implicit dynamic annotation state.

## technique: merge orthogonal annotations

Use merging when separate proofs establish different properties of the same function. The paper defines `F ⊲⊳ G` by combining the failure flags of annotations F and G, while evaluating only one underlying function (§3, pp. 51–53). To merge:

1. produce annotations F and G with their respective preconditions P and Q (§3)
2. require the combined precondition `P ∧ Q` (§4, p. 53)
3. conjoin failure conditions pointwise, preserving the shared underlying computation (§3–4)
4. distribute the merge through monadic composition so each operation receives both relevant assertions (Fig. 8, p. 53)
5. use the merged annotation in a later proof (§3, Fig. 6, p. 51)

Figure 6 combines `new-tcb-valid-free-ann` and `new-tcb-valid-queues-ann`: the merged annotation carries both `valid-free-except i` and `valid-queues` through creation and initialization, then re-establishes both final invariants (§3, p. 51). The paper says, “unrelated annotations can be merged together as a conjunction of their individual assertions.” (§7, p. 55)

Inference: In Verus, merging is conjunction of lemma postconditions or a shared ghost-state invariant. A generator could synthesize a combined lemma requiring both preconditions, but it must avoid treating a proof-only `proof fn` as runtime code. The paper's failure-flag implementation is not a Verus construct.

## technique: automatic collection in the weakest-precondition VCG

Use Isabelle's weakest-precondition verification-condition generator (VCG) to collect annotations without writing them manually. The VCG processes a function bottom-up. Its ordinary split rule computes the precondition needed for the last operation and passes it as the next operation's postcondition. The annotation split rule performs the same decomposition while saving that computed precondition as an annotation (§4, pp. 52–53).

Apply it as follows:

1. state an annotator with a schematic, unspecified annotation term (§4, p. 53)
2. apply the annotation-aware split rule repeatedly through binds and control flow (§4)
3. solve the resulting ordinary Hoare triples (§4)
4. let Isabelle instantiate the schematic term with the collected annotation (§4, p. 53)
5. export that annotation for later proofs (§4)

The paper's `double-plus` example starts with `{|even i|} double-plus i {|λ -. even i|} ⟨?L⟩`; after proof, `?L` is instantiated to an annotation recording the intermediate `odd i` state between two increments (p. 53). This is an explicit example of proof-derived state facts rather than a separately authored invariant.

Inference: Verus's verifier does not expose a weakest-precondition VCG that returns annotation terms. VL could approximate this by instrumenting proof failures and successful lemma applications, but generated artifacts require explicit Verus syntax and re-verification. The reusable unit should be a lemma or spec predicate with clear conditions, not an opaque trace.

## evidence: seL4 case study

The case study concerns `invoke-untyped`, whose invariant-preservation proof is 300 lines of Isabelle script. About five lines reformulated the top-level precondition to produce an annotation, and the generated annotation was manually edited to remove extraneous properties (§5, p. 54). Applying it to integrity and authority-confinement proofs reduced those scripts from 192 to 56 lines; applying the resulting annotation to confidentiality reduced that proof from 215 to 39 lines (§5, p. 54). The conclusion reports the combined reduction as 407 to 95 lines for two properties of one function (§7, p. 55). These are line counts, not time measurements, and the denominators are the named proof scripts, not all seL4 proofs.

The authors state that “Some manual effort is still required to effectively use these annotations, so they are currently in an experimental branch of the seL4 proof.” (§5, p. 54) Annotation generation is therefore not fully automatic in the engineering sense: users adjust top-level preconditions and remove irrelevant assertions. Recursive annotations and annotations over inductive maps are described as possible but left for future work (§4, p. 54).

## trusted boundary, limitations, and VL threat

The formal trusted base includes Isabelle/HOL's monadic semantics, the Hoare and annotation rules, the VCG's implementation, and the proof that an annotation's failure flag is unreachable under its precondition. The method assumes that the original proof really establishes annotation adherence; it does not infer that a property is semantically relevant or that a selected annotation is minimal. It also assumes the function's intermediate states are expressible in the chosen monadic model. The paper's seL4 evidence is one experimental branch and two reused properties, with manual edits.

Inference: For VL, this is a high-value proof-maintenance technique. Agent-written Verus proofs repeatedly establish ownership, representation, and state-machine facts that later lemmas need. Capturing those facts as named, checked lemmas can reduce duplicated proof text and make repairs local. The threat to product differentiation is moderate: an annotation cache could make a competing verification agent substantially more effective, but it does not replace specification design or Verus checking. VL should record each extracted lemma's preconditions, source obligation, and dependency version so stale annotations fail visibly after code changes.

## techniques for the catalog

- proof-derived function annotations — collect intermediate Hoare facts from an existing proof and attach them to the function
- annotated-triple reuse — assume a verified annotation's intermediate predicates while proving a new property
- annotation merging — conjoin independent annotation sets under a combined precondition
- VCG annotation extraction — use weakest-precondition splitting and schematic lemmas to generate annotations automatically
Checked 2026-10-14 against the paper by a Codex agent: audit record matichuk2012automatic; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
