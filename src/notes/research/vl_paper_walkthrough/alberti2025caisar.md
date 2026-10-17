# The CAISAR Platform: Extending the Reach of Machine Learning Specification and Verification
(authored by agents unless marked 🧑)
Tag: `alberti2025caisar`, [paper](http://arxiv.org/abs/2506.12084v2)

## purpose and architecture

CAISAR is a Why3-based platform for writing high-level properties of machine-learning models and translating them to existing verifiers. The paper identifies four problems: local-robustness-focused properties, the restricted VNN-LIB input language, difficulty comparing backends, and an embedding gap between what users specify and what a verifier actually checks. It states: “CAISAR provides a high-level language for specifying complex properties and integrates several state-of-the-art verifiers for their automatic verification.” (abstract, p. 1)

The platform extends Why3 with ML theories, vector operations, a Neural Intermediate Representation (NIR), an interpretation phase for built-ins, graph transformations, and dispatch to α-β-CROWN, PyRAT, Marabou, nnenum, AIMOS, SAVer, CVC5, Z3, and Alt-Ergo. NIR is a pure recursive OCaml variant representing a directed acyclic graph and can be translated back to ONNX or SMT-LIB/VNN-LIB.

Inference: this is a useful architecture for VeruLaw's specification-to-checker boundary: keep a typed, high-level specification, lower it through an explicit intermediate representation, and preserve a trace of each lowering so a verifier checks the same property the user wrote. CAISAR's models are ML graphs rather than Rust programs.

## technique 1: typed high-level specifications

What it is. Users write WhyML declarations of types, predicates, and functions. CAISAR extends the Why3 standard library with a `Model` theory and a `Vector` theory (Section 2.1); datasets are read with `read_dataset` from a CSV file (Figure 3, Section 2.3). Models are pure abstract functions over vectors; built-ins such as `read_model`, `read_dataset`, `@@`, `length`, `has_length`, indexing, and `mapi` receive special interpretation, and bounded quantification over vectors of known size is interpreted element by element (Section 2.3).

When to use it. Use this layer for properties involving multiple models, intermediate arithmetic, datasets, or quantified vector conditions that VNN-LIB cannot express directly.

How to do it.

1. Declare a goal and load models or datasets with `Model.read_model` and `Dataset.read_dataset`.
2. State vector shape and value preconditions using `has_length`, element bounds, and validity predicates.
3. Apply models with `@@`, bind intermediate vectors, and express the postcondition with arithmetic, implication, and bounded quantification.
4. Keep model and dataset reads pure; the interpretation phase maps file paths to parsed mathematical objects.
5. Let Why3 generate verification conditions and dispatch them to a selected backend.

The paper's composition example loads two ONNX models and a CSV dataset, sets ε=0.01, quantifies each perturbed example, applies `nn1` then `nn2`, and requires the target label to remain maximal (Figure 3, Section 2.1). Its second example states: “forall input. Vector.has_length input 5 → (forall i. 0 ≤ i < Vector.length input → 0.0 .≤ input[i] .≤ 1.0) → let output1 = nn1 @@ input in let output2 = nn2 @@ input in .- delta .≤ output1[0] .- output2[0] .≤ delta” (Figure 4, Section 2.1, p. 6).

Verus form. Inference: use Rust structs for fixed-shape vectors and model interfaces, `requires` for shape and value assumptions, and `ensures` for the property. A `spec fn` can describe pure model semantics; executable model loading must be kept outside the proof or represented by a trusted, validated model value. Verus does not provide CAISAR's file-interpreting WhyML built-ins.

Evidence and limits. The language is strongly typed and expressive, but universal quantification over vectors whose shape cannot be determined statically is unsupported, and formulas with alternating quantifiers are not directly supported, because VNN-LIB is a fragment of quantifier-free linear real arithmetic (Section 2.3). The paper says: “Since VNN-LIB is a fragment of the SMT-LIB theory of Quantifier-Free Linear Real Arithmetic (QF_LRA), quantifiers must be eliminated to generate valid verification conditions.” (Section 2.3, p. 10)

## technique 2: NIR and model translation

What it is. NIR is a typed DAG whose nodes carry operation, input/output shapes, and computation type. It supports a subset of ONNX and parses ONNX/NNet neural networks and scikit-learn SVMs. Back-translation emits ONNX or SMT-LIB/VNN-LIB.

How to do it.

1. Parse the source model into NIR nodes.
2. Represent operators such as Add, Sub, Mul, Div, Concat, Gather, Gemm, Sign, and ReLU as graph nodes (Section 2.2).
3. For an SVM, build kernel computation, multiply by dual coefficients, add intercepts, apply sign for each one-versus-one class comparison, and aggregate class scores (Figure 6).
4. Emit a target format supported by the selected prover.
5. Compare the result against a reference tool when translating a supported model family (the paper does this for SVMs against SAVer, Section 3.2).

The SVM pipeline is an explicit reusable recipe: the kernel stage computes support-vector products and an optional nonlinear function; the comparison stage applies coefficients, intercepts, and positivity; the final stage aggregates pairwise votes. In the ten-class one-versus-one case, each output score lies from 0 to 9 (Section 2.2).

Verus form. Inference: define an enum or tagged struct for NIR nodes, a well-formedness predicate for acyclic indices and shapes, and a recursive evaluator. Prove that the evaluator preserves the source model's semantic function for each operator. The paper's ONNX and floating-point semantics require an explicit numeric model before a Verus proof can claim equivalence.

## technique 3: interpretation and verification-condition lowering

What it is. CAISAR first interprets built-ins and constants, then applies formula-wide Why3 transformations, then prover-specific transformations, and finally emits each backend's format. Bounded quantifications over vectors of fixed, known size are interpreted as quantifications over individual elements, and Why3's reduction engine keeps a symbolic representation of each vector element, which lets `mapi` and similar higher-order constructs be interpreted (Section 2.3).

How to do it.

1. Interpret `read_model` and `read_dataset` as pure mathematical mappings to parsed values.
2. Evaluate computable constants and lift them to top-level definitions.
3. Interpret bounded quantification over fixed-size vectors as quantification over their elements, using symbolic element representations.
4. Apply modular Why3 transformations, then backend-specific transformations.
5. Translate the resulting conditions to VNN-LIB, SMT-LIB, or another supported input and collect solver results.

The paper describes the key trust problem: “A common struggle is to ensure that each step of the process is trustworthy and coherent one with another, that is to say, that the proof run on a particular program is meaningful with regard to a specification that was provided.” (Section 1, p. 3)

Verus form. Inference: preserve a source-to-lowered-property certificate. Each lowering rule should have a semantic preservation lemma, and the final checker should consume the lowered formula plus a proof that it is equivalent to the source specification. This is a recommendation for adapting the architecture; CAISAR does not target Verus.

## technique 4: embedding specification terms into one NIR

What it is. VNN-LIB cannot directly express arithmetic on inputs, composition of several networks, or feeding one network's output into another. CAISAR embeds translatable WhyML terms into a new single NIR graph.

How to do it.

1. Start with a formula containing a precondition H and a postcondition over multiple networks, for example `nn2 @@(nn1 @@(x1), x1 + ε) + nn1 @@(x0) > 0` (Section 2.3).
2. Select unsupported or non-VNN-LIB subterms top-down by structural pattern matching.
3. Translate each arithmetic term using the mapping `+→Add`, `−→Sub`, `*→Mul`, `/→Div`, negation to multiplication by −1, and model application to `Gather(Apply(nn, Concat(...)), c)` (Figure 8).
4. Inline nested models and insert `Gather`, `Add`, `Concat`, and other nodes into a new NIR; replace the original term in the Why3 formula with the new model application.
5. Emit the equivalent one-model formula `H → nn3 @@(x0,x1,ε) > 0` to the backend.

The authors state: “Embedding multiple networks within a single NIR allows specifications that involve their composition, while incorporating fragments of WhyML expressions into the NIR enables more expressive specifications that capture computations over both inputs and outputs.” (Section 2.3, p. 11)

Verus form. Inference: this corresponds to compiling a Rust specification expression into a verified expression DAG, then proving evaluator equivalence. Use `ensures` on each rewrite and a final theorem that the compiled DAG's result equals the source expression. Conditionals and unsupported operators need separate branches or a different checker.

Limits. CAISAR restricts translation to simple QF_LRA arithmetic because conditionals often require formula splitting. Flattening inputs into one-dimensional nodes adds overhead, which the paper evaluates in Section 3.1. The paper calls how much of the specification to embed in the network an open question, a trade-off between expressiveness for the user and tractability of the verification conditions (Section 2.3).

## technique 5: explicit normalization and denormalization

What it is. CAISAR puts input normalization and output denormalization inside the specification graph, allowing users to state ACAS Xu properties in expert-domain units rather than hidden normalized units.

How to do it.

1. Define `normalize_t i mean range = (i − mean) / range` and its inverse `denormalize_t`.
2. Map normalization over each input index.
3. Apply the NN to the normalized vector.
4. Select the output component and denormalize it.
5. State `requires` for shape and domain conditions and `ensures` in original units, for example result ≤ 1500 (Figure 9, Section 3.1).
6. Verify the generated graph with multiple backends and compare answers.

Evidence. ACAS Xu tests averaged three runs (Table 1). The paper says PyRAT's outcomes were preserved for all properties but the added overhead caused many timeouts; nnenum was consistent except for occasional crashes from a known bug in its ONNX parsing module. Marabou itself failed on the unnormalized properties because the `Concat` operator is unsupported. maraboupy reported counterexamples for φ4, φ5, and φ9 on the unnormalized versions, where none should exist, and found a counterexample for normalized φ10 where Marabou verifies the property. The paper says maraboupy's floating-point degradation warnings on φ10 "may explain this discrepancy", noting that CAISAR emits IEEE 754 double precision while the ACAS Xu networks operate in single precision; it also reports an inconsistency between Marabou and maraboupy in ONNX operator support to the Marabou developers (Section 3.1, footnote 13). Inference: this shows why normalization, numeric precision, and backend behavior belong in the explicit specification.

Verus form. Inference: model normalization as proved arithmetic functions and prove range/nonzero assumptions for division. If executable Rust uses `f32`, a proof over mathematical reals must include a rounding error bound or use an exact fixed-point representation; silently assuming equality is unsound.

## evidence, scope, and threat to VL

CAISAR's SVM translation agreed with SAVer on all ten MNIST instances, but Table 2 reports SAVer runtimes of 35–53 ms versus PyRAT through CAISAR at 18,552–22,001 ms, which the paper describes as approximately two orders of magnitude higher runtime (ten instances of the MNIST linear-1k SVM, PyRAT as verifier, Table 2, Section 3.2, p. 16). For sequential NN composition, maraboupy reported Invalid while nnenum and PyRAT timed out within one hour; Marabou could not consume required ONNX operators (Table 3, Section 3.3). The equality-up-to-δ example timed out on all provers.

What is proved or measured: CAISAR can express richer properties, translate them to several tools, and preserve selected outcomes in the reported examples. Inference, from the architecture: what stays trusted is Why3 and CAISAR interpretation and graph transformations, model parsers, ONNX semantics, backend verifiers, floating-point behavior, and the assumption that generated models encode the source formula. Inference: I found no machine-checked proof in the paper that every transformation preserves semantics.

Inference: threat to agent-written verified Rust is moderate. The embedding gap has a direct analogue when a Rust implementation, specification, normalization, and Verus model differ. A typed IR and semantic translation certificates could expose this gap, but backend timeouts and numeric mismatches remain product risks. Existing VL work should reuse the source specification plus lowering trace idea and avoid rebuilding a general ML verifier; its target is Rust semantics and Verus's proof checker.

## techniques for the catalog

- typed high-level specification — express multi-model and vector properties with typed pure model functions and explicit preconditions
- neural intermediate representation — normalize models and operators into a typed DAG that can be emitted to several verifier formats
- staged condition lowering — interpret built-ins, expand fixed-size vectors, transform formulas, and dispatch backend-specific conditions
- specification embedding — compile arithmetic and nested model applications into one equivalent intermediate graph
- explicit numeric preprocessing — put normalization and denormalization in the checked graph and compare backends
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Since NN verifiers are typically optimized for high-dimensional tensor computations, this flattening introduces overhead, as empirically evaluated in Section 3.1."): I read the whole paper text and the whole study; checked every quotation, number, figure and section reference, page numbers (PDF page), the technique steps, the Table 1 to 3 claims, the author and year in the tag, and the arXiv link (arXiv:2506.12084v2 appears in the paper text). Changed: three wrong page numbers in quote citations (now p. 6, p. 10, p. 11) and the Table 2 page (p. 16); the claim that alternating quantifiers "cannot be lowered" (paper: "not directly supported"); the floating-point attribution (paper hedges: "may explain"); the Marabou issue description (Marabou/maraboupy ONNX operator inconsistency, not a precision issue); added the Marabou Concat failure on unnormalized properties; theory and interpretation wording; moved the trusted-component list and the numeric-precision lesson under "Inference:". Not checked: the reference list contents, the cited external works, the artifact at the Zenodo DOI, the PDF figure images beyond their extracted text, and the per-cell values of Table 1 beyond the entries cited.
