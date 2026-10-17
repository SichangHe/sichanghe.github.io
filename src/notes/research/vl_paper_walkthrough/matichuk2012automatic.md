# Automatic Function Annotations for Hoare Logic
(authored by agents unless marked 🧑)
Tag: `matichuk2012automatic`, [paper](https://doi.org/10.4204/EPTCS.102.6)

## problem and contribution

Matichuk introduces function annotations for monadic Hoare logic. A proof of one property often establishes facts about intermediate states that another property needs, but ordinary preconditions and postconditions do not retain those facts in a reusable form. The paper's abstract says, “when proving that a function satisfies a Hoare triple, intermediate reasoning is automatically stored as function annotations,” and that annotations “can be exploited in future Hoare logic proofs.” (Abstract, p. 46) The implementation is in Isabelle/HOL and is tested on an experimental seL4 microkernel branch.

An annotation wraps a function with assertions checked at each intermediate operation and a failure flag. Under a precondition that proves the flag never fails, later proofs may assume the intermediate assertions. Multiple annotations for the same function are merged by conjoining their assertions. The technique preserves the underlying monadic function's behavior: annotations are proof artifacts and checks, not changed executable semantics. The paper gives definitions and rules in Isabelle/HOL but no separate soundness argument beyond them, and its practical evidence is one seL4 function (`invoke-untyped`) and selected proof-script line counts.

## technique: derive annotations from an existing Hoare proof

Use this when a function proof has expensive intermediate reasoning that a later property will need. The paper's running function `new-tcb` allocates an identifier, creates a thread-control block, initializes a map entry, and enqueues the identifier (Fig. 1, p. 47). The invariant `valid-free` says an identifier is free exactly when it is absent from the `tcbs` map (Fig. 2, p. 48). Allocation temporarily violates that invariant, so the proof introduces `valid-free-except i`, which records the one permitted exception (p. 48).

Apply the method as follows:

1. state the ordinary top-level Hoare triple `{|P|} f {|Q|}` for the property being proved (§2, pp. 48–49)
2. expose the sequence of component operations and the intermediate predicates needed to compose their triples (§2)
3. replace the top-level triple with an annotator form `{|P|} f {|Q|} ⟨F⟩`, requiring both the original postcondition and adherence to annotation F (§3, p. 49)
4. let the verification-condition generator store each computed intermediate precondition as an annotation (§4, pp. 52–53)
5. prove that annotations cannot fail from P; then use the annotation in later triples (§3–4)

The example annotation in Figure 3 records `valid-free` before allocation, `valid-free-except i` during creation and initialization, and `valid-free` before enqueueing and before the final return (p. 49). The paper emphasizes that annotations “do not need to be explicitly defined, but can be generated as a consequence of an existing Hoare logic proof.” (§1, p. 47)

Inference: In Verus, this corresponds to extracting intermediate facts from a successful `proof fn` or loop proof into reusable lemmas about a function's abstract state. Verus has no annotation monad or `afails` flag; a VL tool would store proof obligations and generated lemmas externally, then invoke Verus to recheck each use. The source code's executable behavior should remain unchanged, but the extracted fact is useful only if its `requires` conditions are preserved.

## technique: annotated triples and safe reuse

Use an annotated triple to consume an existing annotation as a temporary strengthening of the proof context. The paper defines `kPk F kQk` to mean that, for every initial state satisfying P where F does not fail, all outcomes of the underlying function satisfy Q (§3, p. 49). The definition permits assuming intermediate assertions because the proof obligation is conditioned on non-failure of F.

The reuse procedure is:

1. establish an annotation adherence result `{|P|} f {|Q|} ⟨F⟩` (§3–4)
2. formulate the new property as an annotated triple `kRk F kQk`, with R the new invariant (§3, p. 50)
3. split the annotated computation using the analogous weakest-precondition rules (§3, pp. 50–51)
4. use assertions supplied by F at each intermediate operation instead of reproving them from R (§3)
5. discharge the remaining ordinary Hoare triples and conclude the original triple via the annotation soundness rule (§4, p. 52)

For `new-tcb`, the `valid-free` annotation lets the `valid-queues` proof assume `valid-free-except i` during initialization. The paper uses the implication `valid-queues s ∧ valid-free-except i s −→ not-queued i s` to strengthen the precondition of `init-tcb`, so `not-queued i` need not be propagated and reproved through `create-tcb` and `alloc` (§3, p. 50). Rule (5) turns an annotated precondition into an ordinary Hoare precondition (p. 50), and rule (6) transfers the result to the underlying function when it satisfies the annotation (§4, p. 52).

Inference: A Verus version would pass previously proved lemmas as `requires` facts to a later `proof fn`, or invoke a lemma whose postcondition supplies an intermediate invariant. The reuse is sound only when Verus checks the original lemma and the new function's precondition; there is no implicit dynamic annotation state.

## technique: merge orthogonal annotations

Use merging when separate proofs establish different properties of the same function. The paper introduces the merge `⊲⊳` in §3 (p. 51) and defines `F ⊲⊳ G` as `λ s. (dropA F s, afails (F s) ∨ afails (G s))`, so only one underlying function is evaluated and `dropA F s = dropA G s` is assumed (§4, p. 53). To merge:

1. produce annotations F and G with their respective preconditions P and Q (§3)
2. require the combined precondition `P ∧ Q` (§4, p. 53)
3. take the disjunction of the two failure flags, `afails (F s) ∨ afails (G s)`, while evaluating only one underlying computation; the assertions themselves are thereby conjoined (§4, pp. 52–53)
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

The case study concerns `invoke-untyped`, whose invariant-preservation proof is 300 lines of Isabelle script. About five lines of Isabelle reformulated the top-level precondition to produce an annotation, and the generated annotation was manually edited to remove extraneous properties (§5, p. 54). The paper says the net edit was "a single line was added to the script with 40 lines of manual annotation modifications." Applying the annotation to the integrity and authority-confinement proofs reduced the proof script from 192 to 56 lines; this "produced another annotation which, when applied to the proof of confidentiality, reduced the lines of proof script from 215 to to 39" (§5, p. 54). The conclusion reports the combined reduction as 407 to 95 lines for two properties of one function (§7, p. 55). These are line counts, not time measurements, and the denominators are the named proof scripts, not all seL4 proofs.

The authors state that “Some manual effort is still required to effectively use these annotations, so they are currently in an experimental branch of the seL4 proof.” (§5, p. 54) Inference: annotation generation is therefore not fully automatic in the engineering sense: users adjust top-level preconditions and remove irrelevant assertions. The paper also says automation work is "still ongoing" (§5, p. 54). Recursive annotations and annotations over inductive maps are described as possible but left for future work (§4, p. 54).

## trusted boundary, limitations, and VL threat

Inference: the paper has no trusted-base section; the following is my reading. The trusted base would include Isabelle/HOL's monadic semantics, the Hoare and annotation rules, the VCG's implementation, and the proof that an annotation's failure flag is unreachable under its precondition. The method assumes the original proof establishes annotation adherence; the paper does not say it checks that a property is semantically relevant or that an annotation is minimal (it says generated annotations needed manual removal of extraneous properties, §5). It assumes the function's intermediate states are expressible in the chosen monadic model. The paper's seL4 evidence is one function (`invoke-untyped`) in an experimental branch, reused for the integrity, authority-confinement and confidentiality proofs, with manual edits. The paper also lists limitations and future work: recursive annotations are unexplored (§4, p. 54), and the authors plan to make annotations "more opaque to the end user" (§6, p. 55).

Inference: For VL, this is a high-value proof-maintenance technique. Agent-written Verus proofs repeatedly establish ownership, representation, and state-machine facts that later lemmas need. Capturing those facts as named, checked lemmas can reduce duplicated proof text and make repairs local. The threat to product differentiation is moderate: an annotation cache could make a competing verification agent substantially more effective, but it does not replace specification design or Verus checking. VL should record each extracted lemma's preconditions, source obligation, and dependency version so stale annotations fail visibly after code changes.

## techniques for the catalog

- proof-derived function annotations — collect intermediate Hoare facts from an existing proof and attach them to the function
- annotated-triple reuse — assume a verified annotation's intermediate predicates while proving a new property
- annotation merging — conjoin independent annotation sets under a combined precondition
- VCG annotation extraction — use weakest-precondition splitting and schematic lemmas to generate annotations automatically
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Function annotations are implemented by creating a new function which, effectively, has an assertion between every operation."): read the whole paper text and the whole study; checked every quotation, number (300, about 5, 40, 192 to 56, 215 to 39, 407 to 95), figure, rule and page reference, and the technique steps; changed the merge step (failure flags are disjoined, not conjoined), the confidentiality step (a second, derived annotation), the page for the not-queued implication, the soundness and trusted-base wording (now marked Inference), and the link (DOI from the paper text); did not check the Verus inferences against Verus, and did not check the Isabelle formulas beyond comparing them with the paper text.
