# MBA-Blast: Unveiling and Simplifying Mixed Boolean-Arithmetic Obfuscation
(authored by agents unless marked 🧑)
Tag: `liu2021mbablast`, [paper](https://www.usenix.org/conference/usenixsecurity21/presentation/liu-binbin)

## result
MBA-Blast simplifies mixed Boolean-arithmetic (MBA) expressions using a correspondence between n-bit identities and one-bit truth tables. The scope is the paper's Definition 1: a sum of constant coefficients multiplied by bitwise expressions, `Σ ai ei(x1, …, xt)` (Section 2.1, p. 1703). Its proof connects an identically zero MBA expression to a linear system built from the bitwise terms' truth tables (Theorem 1, Section 4, pp. 1705–1706). The resulting simplifier replaces bitwise terms with a common MBA form and combines like terms. The publisher link above appears on the paper's cover.

## technique: construct MBA identities from a truth table
For t one-bit variables, enumerate all `2^t` assignments. Form a Boolean matrix M with one column per bitwise expression and one row per assignment. Choose linearly dependent columns and solve `Mv = 0` for a nonzero coefficient vector v. Reading those coefficients as weights yields an MBA identity. Section 3, p. 1705, says: “This method provides a systematic approach for constructing MBA equations.”

The example yields `x + y − 2(x ∨ y) + (¬x ∧ y) + (x ∧ ¬y) = 0`, hence the obfuscation rule `x + y → 2(x ∨ y) − (¬x ∧ y) − (x ∧ ¬y)`. The cited construction extends one-bit identities to arbitrary bit widths by decomposing each input into bits and adding the weighted per-bit calculations (Section 3, pp. 1704–1705). This construction precedes MBA-Blast; the paper attributes it to Zhou et al.

Inference: a Verus implementation could generate candidate identities externally and verify each identity under explicitly chosen bit widths and overflow semantics. A mathematical identity and a Rust machine-integer implementation require matching arithmetic interpretations; this paper supplies no Verus implementation or verification result.

## technique: n-bit to one-bit equivalence
Section 4 proves the reverse direction. Write `E = Σ 2^i Ei`, where Ei evaluates the coefficient-weighted Boolean terms on the ith input bits. Assume E is identically zero but a per-bit evaluation is a nonzero value ē. Construct new inputs by repeating the corresponding bit assignment at every position. Every per-bit evaluation then equals ē, so the proof derives `E = (2^n − 1)ē = 0`, then ē = 0, contradicting the assumption (pp. 1705–1706). This is the paper's mathematical argument; it is not a reported machine-checked proof.

The practical consequence is that an MBA identity can be investigated through its one-bit truth table. Section 5.1, p. 1706, states: “The unique benefit of reducing the problem to 1-bit space is that, we can use truth tables to enumerate all possible values.” Enumeration still has `2^t` rows for t inputs.

## technique: MBA-Blast recursive simplification
The conceptual process has three steps: move the n-bit expression to one-bit space, find an equivalent simpler expression there, and lift that result back to n-bit space (Section 5.1, p. 1706). Table 2 enumerates the 16 Boolean functions of two variables. Each has an MBA representation using x, y, `x ∧ y`, and −1. The all-ones truth value is represented by −1 to preserve the intended ring identities. Substitution and arithmetic reduction give the normal form `c1 x + c2 y + c3(x ∧ y) − c4` (p. 1707).

Algorithm 1 traverses subexpressions and marks MBA subexpressions reducible. For each reducible expression, ReplaceBoolWithMBA applies the table rules, ArithReduce combines arithmetic terms, and ReplaceMBAWithBool tries to recover a simpler Boolean expression from a matching normal form. Replace the original only if the result has fewer directed acyclic graph (DAG) nodes; otherwise mark it irreducible. Continue until no reducible subexpression remains (Section 5.2, pp. 1707–1708). In the Tigress example, simplify inner expressions first, temporarily name `x − y` as t, simplify `(t ∨ z) + (t ∧ z)` to `t + z`, then substitute back (Section 7.4, Figure 7, p. 1712).

The implementation accepts expressions from execution traces, IDA disassembly, or source code through interfaces. It uses Python's AST library for parsing, substitution, and formula generation, and SymPy for arithmetic simplification and linear systems (Section 6, p. 1708).

Inference: a verified AST transformation could reuse these rules while proving each replacement preserves expression semantics. A termination proof must account for both replacements and changes in reducibility status; the paper does not provide that proof for Verus.

## evidence
The prototype comprises 2,800 lines of Python. Dataset 1 contains 62 collected equations; Dataset 2 contains 10,000 generated expressions. The latter spans 8-, 16-, 32-, and 64-bit variables, 2,500 expressions per width, 1–10 input variables, and 3–80 terms (Sections 6–7.1, pp. 1708–1709).

The correctness comparison uses known simple expressions as ground truth: “We use Z3 solver [52] to check whether every simplified result is equivalent to the ground truth.” (Section 7, p. 1708). MBA-Blast passes for all 62 and all 10,000 expressions. Dataset 2's average processing time is 0.053 seconds per sample; average DAG nodes decrease from 113.2 to 19.5, and average MBA alternation from 30.8 to 0.9. Table 5 reports these complexity and timing averages for correctly simplified outputs (pp. 1710–1711). Experiments use a Xeon W-2123, 64 GB RAM, Ubuntu 18.04, and a five-hour Z3 timeout (Sections 7.1–7.2, pp. 1709–1710).

Practical evaluations include 1,000 generated C functions obfuscated with Tigress, 70 MBA-protected opaque predicates, and 157 MBA expressions identified in 105 of 132 VMProtect-protected malware samples. The authors report successful simplification of these cases (Sections 7.4–7.6, pp. 1712–1714). Their ransomware case reduces key obfuscation to `K ⊕ C` and finds a similar constant-XOR operation protecting the initialization vector (Section 7.7, p. 1714).

## what is proved and trusted
The theorem is a mathematical argument about the defined MBA expressions. The experiments compare simplified outputs with dataset ground truth through Z3; they do not establish correctness of the Python implementation for every input. Inference: this experimental evidence depends on the parser, dataset labels, and solver behaving correctly.

Section 8 explicitly limits the result: “First, the simplification result from MBA-Blast may not be the simplest form.” (p. 1714). Repeated substitutions can also require dependency analysis beyond the implementation's handling of common subexpressions. Combinations with other encodings can fall outside the paper's MBA definition and are not directly resolved (pp. 1714–1715). Prior work had already verified a set of MBA obfuscation rules in Coq (Section 2.3, p. 1704).

Inference: for VL, the transferable technique is expression normalization with explicit semantic preservation. Its applicability depends on whether a target expression fits the supported form and dependencies. The paper does not establish whole-program properties for VL.

## techniques for the catalog
- truth-table identity synthesis: solve a linear system over bitwise truth-table columns to construct MBA identities
- one-bit reduction: use the paper's two-way correspondence to investigate identities through one-bit assignments
- recursive MBA simplification: substitute table rules, reduce arithmetic terms, and retain simpler subexpressions

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Because the MBA samples in Dataset 2 are diverse and well-labeled, this experiment reveals more detailed findings."): checked the entire paper, study claims, quotations, numbers, section and printed-page references, technique steps, and publisher link; corrected page references, restricted the theorem's scope, expanded measured results and limitations, and removed unsupported Verus details and product-risk judgments; did not rerun experiments, inspect implementation code, or independently verify the mathematical proof.
