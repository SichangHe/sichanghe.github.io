# Duet: an expressive higher-order language and linear type system for statically enforcing differential privacy
(authored by agents unless marked 🧑)
Tag: `near2019duet`, [paper](https://arxiv.org/abs/1909.02481) (arXiv:1909.02481v1, printed on the paper's first page)

## scope and trusted boundary

Duet is a language and type system that statically checks differential-privacy costs for higher-order programs and machine-learning pipelines. The paper's abstract says: “We propose Duet, an expressive higher-order language, linear type system and tool for automatically verifying differential privacy of general-purpose higher-order programs.” (Abstract, p. 1) It separates sensitivity analysis from privacy accounting: a sensitivity language allows scaling, while a privacy language uses linear costs without scaling. The design targets terminating programs and treats low-level mechanisms such as Gaussian noise as opaque primitives. The authors state: “Duet is designed primarily as a fully-automated type system with a rich set of primitives for vector-based and higher-order programming; low-level mechanisms in Duet are opaque and trusted.” (Section 2.2, p. 6)

The formal model interprets sensitivity judgments as linear maps between metric spaces and privacy judgments as probabilistic privacy-preserving maps. Theorem 3.1 gives soundness for both languages; a well-typed privacy lambda is `(ϵ,δ)`-differentially private for each argument according to its annotation (Section 3.6, pp. 18–19). Inference: the trusted remainder also includes the implementation of mechanisms, matrix primitives and the typechecker, and the correctness of the privacy definitions and input data model; the paper itself states only that low-level mechanisms are opaque and trusted. The paper says its proofs are by induction over typing derivations, with key lemmas and cases in the appendix (Appendices C–D, pp. 47–52).

## technique: two mutually embedded linear type systems

Use the sensitivity fragment to bound how much a value changes when an input changes, and the privacy fragment to charge each input for randomized mechanisms.

1. Type a sensitivity expression with a context such as `{x:2 R}`; variable use is counted and function arrows carry a multiplicity, for example `λx:R ⇒ x+x : R ⊸2 R` (Section 3.2, p. 9)
2. Keep sensitivity scaling in application: applying an `s`-sensitive function scales the argument context by `s` (Section 3.2, p. 9)
3. Enter the privacy fragment at a mechanism boundary, e.g. `gauss[R+[2.0],ϵ,δ] <x> {x+x}`; its body must typecheck under the stated maximum sensitivity (Section 3.2, p. 10)
4. Track privacy costs per variable in a co-effect context, so two distinct inputs each cost `(ϵ,δ)` while using the same input twice costs `(2ϵ,2δ)` (Section 3.1, pp. 8–9)
5. Use `Bind` for sequential composition; the paper says `return` is “typically used to compute on values which are already differentially private”, because its argument variables get infinite privacy cost (Section 3.2, p. 10)

The reason for forbidding privacy scaling is explicit: “Privacy bounds in (ϵ, δ )-differential privacy do not scale linearly, and cannot be accurately modeled by linear type systems which permit unrestricted scaling.” (Section 3, p. 7) Privacy application therefore accepts only arguments proved 1-sensitive (Section 3.5, p. 17: “This restriction is crucial for type soundness”).

Inference: in Verus, this architecture maps to specification types and proof lemmas rather than a new Rust type checker. A `spec fn` can define a metric or adjacency relation, and `ensures` clauses can state a sensitivity bound; a `proof fn` can establish composition lemmas. Randomized mechanisms and distributions would remain trusted models unless a probability library is separately verified. This is an inference from Duet's semantic judgments and Verus's available constructs.

## technique: higher-order sensitivity, boxes, loops, and mechanisms

Sensitivity arrows support higher-order functions such as `map`; the paper's examples infer sensitivity 1 for `map (λx→x+1) xs` and 2 for `map (λx→x+x) xs` (Section 3.1, p. 7). Privacy lambdas are multi-argument because the privacy language has no currying. `box e` captures a sensitivity context and `unbox e` pays it later, allowing one clipped dataset to be reused in a loop without reclipping (Section 3.4, p. 17). The `loop` form requires a statically known iteration count and uses advanced composition; singleton types carry the iteration count and the auxiliary `δ′` parameter (Section 3.5, pp. 17–18). The `gauss` form checks a sensitivity bound for its body and emits an `(ϵ,δ)` privacy guarantee; analogous primitives implement other variants.

The metatheory deliberately excludes general recursive types: “We do not formalize or implement general recursive types in order to ensure that all Duet programs terminate.” (Section 3.4, p. 16) This assumption simplifies the model and means the guarantees apply to the terminating fragment.

## technique: metric-indexed matrices and vector mechanisms

Use matrix types `M^c_ℓ[m,n] τ` to make row shape, row norm bound `c`, and distance metric `ℓ ∈ {L∞,L1,L2}` explicit. Matrix distance sums row distances; `L∞`, `L1`, and `L2` instantiate different row metrics (Section 4.1, pp. 19–20). Use `clip_ℓ` to enforce a row norm bound, `fr-sens` to convert between metrics with a dimension-dependent sensitivity, and `L∇` or `U∇` for Lipschitz or unbounded gradients (Section 4.2, pp. 20–21). `mgauss` and the analogous Laplace rule consume a sensitivity-bounded matrix and return a private matrix; the `exponential` rule “picks one element out of an input vector based on a sensitive scoring function” (Section 4.3, pp. 21–22).

Inference: a Verus implementation would represent dimensions and norm bounds with Rust structs plus `spec fn` metrics, then prove each matrix operation's contract. The type-level metric conversion would become explicit preconditions and lemmas; it would not be inferred automatically by Verus. The probabilistic guarantee still requires trusted distribution semantics.

## technique: reusable privacy case studies

The paper shows how the same typing rules verify several algorithms.

- Noisy gradient descent: clip input rows, compute a 1-Lipschitz gradient, add Gaussian noise each iteration, and use `loop[δ′] k`; Duet derives `(2ϵ√(2k log(1/δ′)), kδ+δ′)` under `(ϵ,δ)`-DP, `kρ`-zCDP, and `(α,kϵ)`-RDP (Section 5.1, p. 23)
- Output perturbation: divide the dataset into minibatches, use `mfold-row` (each row a minibatch of size 1, extendable) to derive sensitivity `k/b`, then add one final Gaussian noise draw; the total cost is `(ϵ,δ)` (Section 5.2, p. 23)
- Noisy Frank–Wolfe: clip with an `L∞` bound, use the exponential mechanism to choose a direction, and compose each iteration in zCDP (each iteration `½ϵ²`-zCDP); the paper states the whole algorithm satisfies `(½ϵ² + 2√(½ϵ² log(1/δ)), δ)`-DP, as printed in Section 5.3 (p. 24), and says this improves on the manual analysis of Talwar et al., which used advanced composition
- Sampling minibatches: `sample` encodes privacy amplification; for sample fraction `b/m`, Duet derives `(4(b/m)ϵ√(2k log(1/δ′)), (b/m)kδ+δ′)` (Section 5.4, p. 24)
- Parallel minibatches: `pfld-rows` encodes disjoint parallel composition, retaining `kρ`-zCDP for `k` epochs (Section 5.5, p. 25)
- Gradient clipping: clip each unbounded per-example gradient, convert discrete bounded rows to reals, average, and apply `mgauss`; the averaged sensitivity is `1/n` despite unbounded raw gradients (Section 5.6, p. 25)
- Adaptive clipping: issue 1-sensitive tests for candidate scales and use `above-threshold` (Sparse Vector Technique) to select the first scale leaving at least 90% of rows unchanged; the cost is `ϵ` independent of the number of candidates (Section 5.7, p. 26)
- Mixed variants: compose pure DP, `(ϵ,δ)`-DP, and zCDP components, converting embedded variants to the surrounding mode (Section 5.8, pp. 26–27)

## evidence, assumptions, and product threat

The Haskell prototype typechecks the listed case studies in 0.39–3.87 ms, with 21–125 lines per program (Figure 7, p. 27). Its custom solver for symbolic inequalities is “decidable (but incomplete)”; the authors wrote it because SMT solvers “typically do not support operators like log and square root” (Section 6.1, p. 27). Accuracy experiments use four datasets—Synthetic 10,000 samples/20 dimensions, Adult 45,220/104, KDDCup99 70,000/114, and Facebook 40,949/54—an 80/20 train/test split, five runs per algorithm, and `δ=1/n²` (Section 6.2, pp. 27–28). Per-iteration ϵ ranged over {0.0001, 0.001, 0.01, 0.1}, with Duet deriving the total cost; for each algorithm the plots (Figure 9, p. 28) compare three composition methods (advanced composition, Rényi DP, zCDP) that give “exactly the same privacy guarantee for a given value of ϵ, yet their accuracies vary significantly”. The paper concludes “recent variants with tighter composition bounds yield significantly better accuracy for a given level of privacy”; I found no single aggregate accuracy statistic.

Inference: Duet's threat to agent-written verified Rust is high for privacy-accounting ideas and low for direct code reuse. It demonstrates a mature pattern—linear sensitivity contexts, non-scaling privacy contexts, metric-indexed data, and composition primitives—that VL can borrow. It does not verify the implementation of noise, gradient routines, or arbitrary Rust, and it assumes termination and correct mechanism specifications. The paper lists as a known limitation that “Duet is not suitable for verifying implementations of low-level mechanisms, such as the implementation of advanced composition, gradient operations, and the sparse-vector technique (SVT-imp)” (Section 2.3, p. 6).

Inference: VL should not redo a generic linear privacy type system or these listed DP algorithms without a Rust-specific gap. A useful extension would connect Verus contracts to a trusted probability model and measure whether proof obligations survive real Rust and dependency changes.

## techniques for the catalog

- dual sensitivity/privacy linear typing — count input sensitivity with scaling and privacy cost without scaling in mutually embedded contexts
- mechanism boundary checking — require a statically proved sensitivity bound before assigning a randomized privacy guarantee
- metric-indexed matrix verification — encode row norms, distances, clipping, and gradient bounds in matrix types
- composition primitives — verify sequential, advanced, parallel, sampling-amplified, and mixed-variant privacy costs
- adaptive clipping via sparse vector — select a data-dependent scale with a fixed privacy budget over many queries
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "This algorithm is similar in concept to the output perturbation approach of Wu et al. [54], but leverages parallel composition of privacy mechanisms for gradient perturbation instead, and has not been previously published."): read the whole paper text including appendices A–G and viewed pages 23–24 as images; checked every quotation, section/page reference, formula, figure number (Figure 7 times and LOC, dataset sizes, split, runs) and each case-study claim against the text. Changed: replaced the tag link (the old DOI prefix belonged to a different CCS 2016 paper cited in the references) with the arXiv link printed in the paper; corrected the Frank-Wolfe conversion formula (square root covers only the second term); fixed the evaluation description (the plots compare advanced composition, Rényi DP and zCDP per algorithm, not the two algorithms); corrected a page range, the `clip` subscript, the exponential-mechanism wording and the Return wording; marked the extra trusted-base list as Inference; added the paper's own limitation quote. Not checked: the PDF figure plots (Figure 9) beyond the text caption, the colour coding of the typing rules, the extended-version claims, the correctness of the proofs, and the Verus-related Inference paragraphs, which are my reading and not paper claims.
