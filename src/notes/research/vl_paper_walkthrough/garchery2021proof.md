# A Framework for Proof-carrying Logical Transformations
(authored by agents unless marked 🧑)
Tag: `garchery2021proof`, [paper](http://arxiv.org/abs/2107.02352v1)

## scope and result
The paper addresses trust in logical transformations used by deductive verifiers. Its central claim is that a transformation can emit a certificate checked by an independent checker, so transformation code need not remain in the trusted kernel. The authors state: “In various provers and deductive verification tools, logical transformations are used extensively in order to reduce a proof task into a number of simpler tasks.” They instantiate the framework in Why3, whose transformations total “more than 17 000 lines of OCaml code.”

## technique 1: skeptical proof-carrying transformations
What it is: Instrument each transformation application to return its ordinary list of proof tasks plus a certificate tree. Correctness means validity of every leaf implies validity of the input task. The paper explicitly says: “certificates, defined in Section 3, are generated every time a transformation is applied and are checked independently at a later time.”

Inference: when to use it: use this when a verifier has a large, evolving transformation layer and you want a small independently checked trust boundary. The paper's motivating Why3 example applies `instantiate` to a quantified arithmetic hypothesis, adding a concrete instance so an external prover can solve the resulting task.

How to do it:
1. Define the task language (types, polymorphic terms, hypotheses and goals) and the semantic relation that a transformation preserves (Section 2).
2. Define elementary kernel certificates whose leaves are the returned tasks. A certifying transformation is formally one that returns “on top of a list L of resulting tasks, a certificate c such that L is the leaves of c” (Definition 8, Section 3.4).
3. Instrument each transformation to construct that certificate while it computes its output. Certificates may contain `KHole` leaves, allowing later proof tasks to be filled incrementally; “A certificate with holes associated to a transformation application can be checked without needing to wait for the proof of the returned tasks to fill its holes” (Section 3.2).
4. Check the certificate with a small checker. Compose transformations by substituting one certificate into a `KHole` (Section 3.4).

Verus form: Inference: a Verus front end could emit a proof object for desugaring or invariant-elaboration steps, then a standalone checker validates that the generated Verus proof obligations entail the original obligation. The checker should use `spec fn`, `proof fn`, `requires`, `ensures`, and `assert` only as supported by the Verus reference; certificate checking itself must not be an `external_body` function. Inference: unlike Why3's custom task calculus, Verus would need a translation from Rust/Verus AST obligations to a certificate language; the paper does not provide this translation.

Evidence: The implementation has two checkers, one based on Lambdapi/Dedukti. Figure 3 reports propositional-task measurements: for 5, 10, 15, 20, 25, 50, 100, 200, 400 and 800 variables, transformation time rises from approximately 0 to 25 seconds, kernel-certificate size from 2.1 kB to 13,000 kB, and OCaml checker time from approximately 0 to 0.35 seconds. Lambdapi checking rises from 0.072 seconds at 5 variables to 660 seconds at 100 variables, with no result shown for 200 variables and above. Inference: these denominators are variable-count cases, not a success percentage.

Limits and trust: the certificate checker, its logical encoding, and any axioms remain trusted. The paper says: “Our approach ... has been applied to the program verification tool Why3 for a number of its transformations including transformations dealing specifically with higher-order logic.” Inference: certificate size and Lambdapi scaling can threaten an agent-written verifier if every Rust elaboration step is certified; batching and a fast kernel checker would be required. The paper does not measure Verus, Rust, concurrency, or adversarial certificate generation.

## technique 2: interpreted-theory certificate rules
What it is: Keep interpreted symbols out of each task's quantified signature so their meaning is shared by input and output, then add certificate constructors for theory properties. For equality, the paper adds `KEqRefl` and `KRewrite`; for integers it adds `KInduction` (Section 4). “To make sure that the interpretation is unique, we should not quantify over the interpreted symbols at the level of the tasks.”

How to do it: represent rewriting with an explicit context function and an equality premise; instrument a rewrite transformation to introduce implications and quantifiers, optionally apply symmetry, rewrite the target, then discharge the temporary hypothesis (Section 4.1). For integer induction, emit base and recursive certificates matching the strong-induction rule and expose the context-dependent premises before and after the induction step (Section 4.2).

Verus form: Inference: equality rewriting corresponds to `assert`/`assert_by` facts and `forall`-style specifications, while arithmetic induction would normally be encoded as a recursive `proof fn` with a decreases clause rather than a new Verus certificate constructor. The exact certificate kernel is not in the paper's Verus setting.

## what is proved, measured, and trusted
The formal result is the soundness of certificate semantics and the machine-checked Lambdapi encoding of each certificate rule; the measurements are runtime and certificate size in Figure 3. The transformation implementation, certificate elaborator, checker implementation, Lambdapi development, and declared axioms remain trusted components. Inference: the framework mainly reduces trust in transformations, rather than eliminating trust.

## techniques for the catalog
- skeptical transformation certificates — instrument every logical transformation to emit a certificate whose leaves are its output tasks, then check it independently
- certificates with holes and composition — leave output obligations as holes and substitute certificates when composing transformations
- interpreted-theory rules — add explicit certificate rules for equality rewriting and arithmetic induction while keeping interpretations fixed
Checked 2026-10-14 against the paper by a Codex agent: audit record garchery2021proof; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
