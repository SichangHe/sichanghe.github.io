# Sound State Encodings in Translational Separation Logic Verifiers
(authored by agents unless marked 🧑)
Tag: `ling2026sound`, [paper](https://www.semanticscholar.org/paper/af8cceb2084817ddf8a4c4fd51c36dd78f686754)

## scope and result
The paper gives an Isabelle/HOL framework for proving that a separation-logic front end remains sound when its state model differs from the intermediate verification language (IVL). The target claim is that a verified IVL translation implies correctness of the source program. The authors identify homomorphic state encoding, prevention of spurious splitting, and backward satisfiability as the key obligations. Their abstract says: “We present the first formal framework for proving the soundness of translational separation logic verifiers with non-trivial state encodings.” The work formalizes Viper-style IVL semantics and instantiates three encodings; all framework proofs are mechanized in Isabelle/HOL. The paper also reports that requirement violations explain previously reported bugs in Prusti, Nagini, and VerCors.

## technique: model a state encoding as a relation
What it is: define `front-end state ∼S IVL state` instead of assuming identical heaps. A function `J·KS` is sufficient when one source state has one IVL representation; a relation is needed when one source resource has many valid IVL representations. The paper's example maps binary permissions to fractions 0 or 1, while duplicable immutable resources map to any positive fraction.

Inference: When to use it: use a relation whenever representation choices are intentionally nondeterministic, such as arbitrary positive fractions for duplicable ownership. Use a function for deterministic encodings such as a lazy field represented by two fixed IVL fields.

How: (1) define source and IVL state algebras and their partial composition `⊕`; (2) define the encoding function or relation; (3) define translated assertions and statements; (4) prove the requirements in section 3 before claiming front-end soundness. The paper states that “the state encoding relation is often derived naturally from a function J·KS that encodes a front-end separation logic state into the corresponding IVL state.” (sec. 2.1, p.6)

Inference: Verus form: represent the source abstract state as a `struct` and expose a `spec fn` abstraction. Use `requires` and `ensures` to state that a Rust operation preserves the abstraction relation. If multiple concrete encodings are allowed, quantify over a ghost representation in the specification instead of choosing one executable encoding. Verus proves the chosen contracts; it does not itself prove the paper's Isabelle meta-theorem.

Evidence and limits: the framework is formalized in Isabelle/HOL and instantiated for rational-to-real permissions, lazy fields, and immutable heaps. The relation approach adds proof obligations for every permitted representation. A relation that admits an IVL state with no source counterpart can make later framing unsound.

## technique: require homomorphism
What it is: require `Jω1 ⊕ ω2KS = Jω1KS ⊕ Jω2KS` (or the relational analogue). This makes separating conjunction and IVL `inhale`/`exhale` correspond to source separation. The paper says: “The encoding function J·KS is required to be homomorphic.” (sec. 2.2, p.6)

Inference: When to use it: check this before implementing a translation. It catches permission encodings whose arithmetic changes when resources are combined.

How: choose two arbitrary composable source states; encode their sum and separately compose their encodings; prove equality. The paper's counterexample encodes counting permission `k·ε` as fraction `1−1/2^k`. Encoding the sum of two one-unit states gives a quarter, whereas composing the two encoded halves gives a full permission. The resulting IVL precondition rejects three aliased arguments even though the source counting model permits them, so the IVL verifies an incorrect program.

Inference: Verus form: make resource composition an abstract ghost operation and prove a lemma with `ensures` equating the abstraction of a combined state to the combination of abstractions. Use `assert` and a `proof fn` for arithmetic side conditions; do not treat proof functions as runtime code.

Evidence and limits: the counterexample is a semantic unsoundness proof, independent of the particular positive fraction; smaller fractions only require more aliases. The condition is necessary for the separation reasoning used by the translation, but it does not by itself establish soundness.

## technique: prevent spurious splitting with backward satisfiability
What it is: an IVL state may split into pieces that satisfy a translated assertion but have no source-state counterparts. The paper names this “spurious splittability.” Backward satisfiability requires that every IVL state satisfying a translated assertion has a source state satisfying the original assertion whose encoding is no larger. The exact explanation is: “backward satisfiability guarantees the existence of an alternative, non-spurious split.” (sec. 2.4, p.9)

Inference: When to use it: check every source assertion that can be inhaled, exhaled, framed, or used in a parallel rule. Points-to and pure assertions satisfy it; magic wands do not generally preserve it.

How: (1) characterize a translated assertion `JA KA`; (2) take an arbitrary IVL witness `ΩA` that satisfies it and is part of an encoded source state; (3) construct a source witness `ωA` satisfying `A`; (4) prove `JωAKS ⪯ ΩA`; (5) use the remaining source state as a sound frame. For binary permissions translated to fractions, the paper's Figure 5 shows why arbitrary positive fractions let a full permission split into two halves although no source binary split exists. Figure 6 shows three magic wands can be satisfied fractionally while binary source permissions cannot. Figure 7 shows rational permission amounts encoded as reals can select irrational fractions that the rational source cannot represent.

Inference: Verus form: state the backward property as a quantified `spec fn` predicate over abstract states and prove it with `proof fn`; use `requires` to assume the encoded state and `ensures` to return a source witness relation. For ordinary Rust APIs, a practical approximation is to make ownership fractions and state invariants explicit in contracts and reject ghost states that have no concrete witness.

Evidence and limits: the authors prove soundness for three encodings: rational permissions as reals under restricted assertions, lazy field creation, and immutable heaps represented by arbitrary positive fractions. Their immutable-heap relation permits “all such amounts p” in `(0,1)`. General magic wands and unrestricted lossy type translations fail the requirements. The framework assumes an affine front-end separation logic and a sound back-end IVL.

## what is proved, measured, and trusted
The proved result is a meta-level soundness theorem for the specified framework and instantiations, mechanized in Isabelle/HOL. No runtime benchmark or success denominator is reported; the evidence is formal proofs and concrete counterexamples. Trust therefore includes Isabelle/HOL, the IVL semantics and back-end soundness assumptions, and the correctness of each front-end's primitive rules. Inference: for VL, the paper is a high threat warning against translating Verus ownership or ghost state into a richer solver state without a witness-preservation proof. Existing verifier bugs already occupy this space; VL should not redo an informal the encoding looks equivalent argument.

## techniques for the catalog
- relational state encoding — model one source state to many IVL states when representation is nondeterministic
- homomorphic encoding check — prove state composition is preserved by translation
- backward satisfiability — require every usable IVL assertion witness to have a source-state witness
- spurious-split audit — test inhale/exhale and framing for IVL states outside the encoding image
- mechanized front-end soundness — discharge encoding, assertion, statement, and control-flow obligations in Isabelle/HOL

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
