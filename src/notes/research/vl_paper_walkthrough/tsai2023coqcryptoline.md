# CoqCryptoLine: A Verified Model Checker with Certified Results
(authored by agents unless marked 🧑)
Tag: `tsai2023coqcryptoline`, [paper](https://doi.org/10.1007/978-3-031-37703-7_11)

## what the paper proves

CoqCryptoLine is an automatic checker for CryptoLine specifications of cryptographic programs. A specification has a typed program, a precondition, and a postcondition. The algebraic part of each condition is a conjunction of (possibly modular) equations; the range part is a quantifier-free bit-vector (QF_BV) predicate. The paper states: “A CryptoLine specification is valid if every program execution starting from a program state satisfying the pre-condition ends in a state satisfying the post-condition” (Section 2.1, p. 228). The implementation is extracted from Coq proofs, so the checker returns certified results without requiring a Coq proof from the user.

The central construction has two reductions. The algebraic reduction turns polynomial equality checking into root entailment in commutative algebra. The bit-vector reduction turns range checking into an SMT QF_BV query. The paper says, “The CoqCryptoLine verification algorithm consists of two reductions” (Abstract, p. 227). The Coq modules specify and prove both reductions, including the correspondence between executions and roots or satisfying assignments. The algebraic reduction is sound but incomplete because it abstracts bit-accurate arithmetic to modular polynomial equations; the bit-vector reduction is sound and complete (Section 2.2, pp. 229–230).

## technique: model typed low-level arithmetic

What it is. CryptoLine models assembly-like code with `mov`, conditional `cmov`, add/adc, sub/sbb, half and full multiplication, explicit carry and borrow variants, bitwise operations, split/join and multi-word shifts. Variables and constants are strongly typed as signed or unsigned bit-vectors, with explicit casts. `assert` and `assume` connect proof facts to the model.

When to use it. Use this representation when the target is low-level cryptographic arithmetic whose correctness depends on carries, overflow, word layout, signedness, or exact bit widths. The paper's motivating examples are field and group operations in Bitcoin, BoringSSL, NSS, and OpenSSL, plus Kyber's NTT.

How to apply it. Declare each machine word with its width and interpretation. State input bounds and algebraic relations in the precondition. Model each instruction in order. Name output words and state the mathematical postcondition, including modular equality and range bounds. The walkthrough splits each 256-bit input into four little-endian 64-bit limbs and writes `limbs 64 [a0,a1,a2,a3]`; it states that the output is the product modulo `p256` and is less than the modulus (Section 3, pp. 232–234).

Verus form. Inference: represent a Rust word array as an executable `Vec<u64>` or fixed-size array, and define a `spec fn` for its mathematical little-endian value. Use `requires` for input bounds and `ensures` for modular equality and output range. Keep carry and overflow as explicit executable values and prove each limb step with lemmas and loop invariants. CryptoLine's instruction semantics do not carry over directly; Verus verifies the Rust implementation and its contracts rather than parsing this DSL.

Evidence and limits. The paper reports 54 real-world programs, 52 from security libraries and two Kyber NTT implementations (Introduction, p. 228). It supports industrial signed and unsigned bit-vector code that the earlier bvCryptoLine could not. The model still depends on a correct CryptoLine translation of the assembly or C source and on the stated pre/postconditions.

## technique: reduce algebra and ranges separately

What it is. After parsing, CoqCryptoLine translates the specification to an abstract syntax tree with formal DSL semantics, then to static single assignment (SSA). The SSA module proves that validity is preserved. SSA2ZSSA constructs modular polynomial equations whose roots correspond to executions; algebraic postconditions become root-entailment checks. SSA2QFBV constructs QF_BV queries whose satisfying assignments correspond exactly to executions and adds queries for algebraic soundness conditions (Section 2.2, pp. 229–230).

How to apply it. First parse the typed model. Convert every assignment to a fresh SSA name. Build one algebraic equation per instruction and collect the equations defining the postcondition. Ask whether every execution root also roots each postcondition equation. Separately encode bit-vector execution and the negation of the desired range property in QF_BV; an unsatisfiable query proves the range property. Use the QF_BV queries for the soundness side conditions needed by the algebraic abstraction.

Verus form. Inference: the SSA idea maps to immutable ghost snapshots or fresh local variables, while executable Rust can retain mutable variables if a proof lemma relates each update to the mathematical state. Use `assert` and `ensures` to expose the same correspondence; use `while` invariants for repeated instruction sequences. Verus has no CryptoLine `SSA2ZSSA` or `SSA2QFBV` module, so the arithmetic lemmas and bit-vector facts must be expressed in Verus specifications.

Evidence and limits. The paper explicitly warns that algebraic failure is inconclusive: “a failure in solving the root entailment problem by CAS does not mean that the algebraic post-conditions are violated” (Section 2.2, p. 230). QF_BV reduction is complete for the modeled range property. The reduction proof is in Coq/MathComp, but the parser and interfaces remain in the trusted base.

## technique: certify external answers

What it is. Singular solves root-entailment instances and emits certificates. CoqCryptoLine validates those certificates with a formally checked polynomial normalization procedure. QF_BV instances are solved by the verified CoqQFBV solver; its SAT answers also carry certificates checked by verified validators. The paper summarizes the architecture as: “In all cases, instances of the two kinds of problems are solved with certificates” (Section 2.2, p. 230).

How to apply it. Reduce the algebraic problem to ideal membership. Ask Singular for a witness of polynomials `c0,...,cn` satisfying `q = Σ ci*pi`. Check that identity with Coq's `norm_subst`; do not trust Singular's decision procedure itself. For QF_BV, send the generated query through CoqQFBV and validate its SAT certificate. Reject any answer whose certificate does not check.

Verus form. Inference: this is a proof-carrying-server pattern for Verus. A Rust tool could accept an untrusted solver's lemma or witness as data, then have Verus prove a checker predicate over that data. The verified program should consume only the checker result; the external solver and parser remain outside the Verus proof unless separately verified.

Evidence and limits. The paper's trusted computing base includes the CoqCryptoLine parser, text interface to external SAT solvers, Isabelle used by the Grat certificate validator, and Coq itself; “sophisticated decision procedures in external CASs and SAT solvers used in CoqQFBV need not be trusted” (Section 2.2, p. 231). Certificate validation therefore narrows trust but does not prove parser, proof assistant, compiler, or interface correctness.

## technique: transfer facts between mixed theories

What it is. An `assert` can prove a predicate on the range side and an equivalent `assume` can pass it to the algebraic side, or vice versa. In the walkthrough, two interleaved carry chains end with `assert true && and [carry=0@1,overflow=0@1]`; `assume and [carry=0,overflow=0] && true` then supplies those facts to the algebraic reduction (Section 3, pp. 233–234). The paper explains: “The assert statement verifies that both the carry and overflow flags are zeroes through the bit-vector reduction” (p. 234).

How to apply it. Identify a fact that one theory proves more easily. Insert an assertion in that theory. Insert the corresponding assumption in the other theory, preserving the exact predicate and variable versions. Use this for final carries, overflow flags, or range facts needed to justify modular algebra. The user supplies hints about what to prove, while CoqCryptoLine proves the hints and final postcondition automatically.

Verus form. Inference: encode the transferred fact as a lemma whose `ensures` states the mathematical carry property, and call that lemma from the proof of the algebraic postcondition. A Verus `assume` would add an untrusted axiom and is not an equivalent safe replacement; use a proved lemma or a specification-level precondition instead. This distinction matters because the paper itself says the equivalence between its assertion and assumption is “currently not verified” (Section 2.3, p. 231).

Evidence and limits. The 230-line Curve25519 specification has 50 annotation lines: 20 declarations/initialization lines and 30 hints. With 24 threads, the postcondition is verified in 30 seconds (Section 3, p. 234). Mixed-theory transfer can make proofs possible, but its explicit unverified equivalence is a trust gap and the slicing option below sacrifices completeness.

## technique: certified slicing and solver engineering

What it is. During both reductions, CoqCryptoLine performs verified static slicing to remove predicates unrelated to the queried postcondition. Unlike earlier slicing, it can prune unrelated predicates inside `assume` statements. Slicing is optional because it makes verification incomplete (Section 2.3, p. 232). The tool also parallelizes independent algebraic and QF_BV problems, caches QF_BV bit-blasting for repeated atomic predicates, and uses Singular's `lift` certificate construction plus variable-substitution elimination.

How to apply it. Enable slicing only when the reduced problem is known to preserve the desired dependency path. Let the tool compute the slice while retaining variables and predicates that flow to the postcondition. For ideal membership, request a `lift` witness and validate `q = Σ ci*pi`; apply substitution to eliminate ideal generators before solving. Reuse the QF_BV bit-blasting cache across atomic predicates, and solve independent obligations in parallel.

Verus form. Inference: slice a Verus proof by extracting only executable statements and ghost facts that influence the postcondition, but retain any invariant or precondition that may be needed in another loop iteration. Cache is an engineering optimization outside the logical proof; parallel proof tasks can be separate lemmas or verification units. Because Verus's solver context is global to a proof obligation, an automated slice must preserve all facts needed by later `assert` steps.

Evidence. Of 12 root-entailment problems that trigger bvCryptoLine's `gbarith`, bvCryptoLine fails three within one hour; for the other nine, `lift` is faster (Section 4, p. 237). Figure 3b reports average time shares of 93.28% for external SMT QF_BV, 4.63% for CAS, and 2.09% for internal OCaml (p. 236). The slicing comparison in Fig. 3d shows an obvious reduction in running time, but the paper gives no aggregate denominator or exact speedup for that figure.

## results, trust, and product implications

The evaluation uses an Ubuntu 22.04.1 machine with a 3.20 GHz Intel Xeon Gold 6134M and 1 TB RAM (Section 4, p. 235). All field operations finish in six minutes; the 4,274-statement `x25519_scalar_mult_generic` takes about 1.5 hours. Kyber reference and AVX2 NTTs take 2,642 and 1,048 seconds, while unveriﬁed CryptoLine takes about 95 seconds (Section 4, pp. 235–236). The paper notes that only two of three modular polynomial equations in the postcondition are certified for the cited complex implementation (footnote 2, p. 235), so the headline result should not be read as every postcondition equation being certified in that case.

What stays trusted is explicit: parser, external-solver text interface, Isabelle/Grat components, and Coq. Singular's and SAT solvers' search algorithms are not trusted because their certificates are checked. The specification, source-to-CryptoLine translation, compiler/extraction chain, and hardware are not established by these experiments.

Inference: for a Verus-based product, the strongest reusable idea is a small verified checker around untrusted automation: have agents generate arithmetic witnesses or solver certificates, then prove a deterministic checker over those witnesses in Verus. The dual algebra/range decomposition and carry-fact transfer suggest separating nonlinear mathematical lemmas from bit-accurate machine lemmas. The main threat is specification and translation error rather than an incorrect solver answer: an agent can write a valid proof of the wrong contract, or an unsound `assume`-like bridge can hide a missing carry fact. The reported 54-program coverage is evidence that this workflow scales to cryptographic arithmetic, but it does not measure agent-written Rust or general systems code.

## what VL should not redo

The paper already supplies formally verified reductions from typed low-level arithmetic to algebraic root entailment and QF_BV, certificate validation for both solver families, verified slicing, multi-modulus support, and a concrete mixed-theory annotation pattern. Reimplementing those mechanisms without a new target or trust boundary would duplicate existing work. A new VL effort should instead test the transfer of these patterns to Verus Rust, especially certificate checkers, carry lemmas, and dependency-preserving slicing.

## techniques for the catalog

- typed CryptoLine modeling — encode signed/unsigned words, carries, bitwise operations, and multi-word arithmetic with explicit pre/postconditions
- dual algebra/QF_BV reduction — prove nonlinear equalities through root entailment and ranges through complete bit-vector queries
- certificate-checked automation — validate CAS polynomial witnesses and SMT certificates in a verified checker
- mixed-theory fact transfer — prove carry/range facts in QF_BV and pass them as algebraic lemmas through assertion/assumption annotations
- verified slicing — remove irrelevant predicates during reduction, accepting incompleteness when the optional slice is enabled
- solver engineering — combine Gröbner `lift`, substitution elimination, QF_BV bit-blasting caches, and parallel obligations
Checked 2026-10-15 against paper tsai2023coqcryptoline: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
