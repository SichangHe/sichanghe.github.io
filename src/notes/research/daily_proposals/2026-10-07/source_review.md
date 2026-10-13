# Six primary source cards and review notes
(authored by agents unless marked 🧑)

## iCoq

Authors: Ahmet Celik, Karl Palmskog, Milos Gligoric. Version/venue/date: ASE 2017; author manuscript. Primary link: https://doi.org/10.1109/ASE.2017.8115630.

Exact quote (abstract): “only checks those proofs affected by changes”.

Review: Coq revision histories; full checking and timestamp toolchain; checking time; authors report up to 10× and 3× speedups respectively. Selection is established prior work; no Verus result.

Why selected: proof evolution, specification adequacy, or implementation feasibility. Query: local collection title search followed by direct primary retrieval. Type: primary paper, except the official Verus source artifact. Confidence: high in extracted wording; paper results are author claims, not reproduced. Access: full text available; AutoVerus preprint is distinct from the venue record. Relation to notes: `research/static_analysis.md`, `research/veriskill_20260803.md`, and `research/distributed_verification_evaluation_20261007.md`. Negative evidence: selection, parallel proving and specification testing already exist.

## piCoq

Authors: Karl Palmskog, Ahmet Celik, Milos Gligoric. Version/venue/date: ISSTA 2018; author manuscript. Primary link: https://users.ece.utexas.edu/~gligoric/papers/PalmskogETAL18piCoq.pdf.

Exact quote (abstract): “perform parallel checking of only those files or proofs affected”.

Review: Coq project revisions; sequential full checking and sequential selection; elapsed proof-checking time. Authors report benefits from proof-level parallelism plus selection. No contract-strength evaluator.

Why selected: proof evolution, specification adequacy, or implementation feasibility. Query: local collection title search followed by direct primary retrieval. Type: primary paper, except the official Verus source artifact. Confidence: high in extracted wording; paper results are author claims, not reproduced. Access: full text available; AutoVerus preprint is distinct from the venue record. Relation to notes: `research/static_analysis.md`, `research/veriskill_20260803.md`, and `research/distributed_verification_evaluation_20261007.md`. Negative evidence: selection, parallel proving and specification testing already exist.

## IronSpec

Authors: Eli Goldweber, Weixin Yu, Seyed Armin Vakil Ghahani, Manos Kapritsos. Version/venue/date: OSDI 2024, July 10–12. Primary link: https://www.usenix.org/conference/osdi24/presentation/goldweber.

Exact quote (abstract): “automated spec mutation testing”.

Review: 14 specifications, six real verified systems; sanity checks, spec-testing proofs and mutation tests; authors report ten specification bugs. Strong saturation evidence against generic specification testing. Intent ultimately needs an independent oracle.

Why selected: proof evolution, specification adequacy, or implementation feasibility. Query: local collection title search followed by direct primary retrieval. Type: primary paper, except the official Verus source artifact. Confidence: high in extracted wording; paper results are author claims, not reproduced. Access: full text available; AutoVerus preprint is distinct from the venue record. Relation to notes: `research/static_analysis.md`, `research/veriskill_20260803.md`, and `research/distributed_verification_evaluation_20261007.md`. Negative evidence: selection, parallel proving and specification testing already exist.

## Spec-Harness

Authors: Md Rakib Hossain Misu, Iris Ma, Cristina V. Lopes. Version/venue/date: arXiv 2604.00280v2, September 8, 2026; preprint. Primary link: https://arxiv.org/abs/2604.00280v2.

Exact quote (abstract): “passing a verifier only confirms that an implementation is consistent with a specification”.

Review: JML specification synthesis; classical and prompt-based synthesis, feedback optimization; verification rate and four adequacy dimensions. Authors identify weak verifier-accepted specs. Detailed numerical comparison not extracted; no Rust result asserted.

Why selected: proof evolution, specification adequacy, or implementation feasibility. Query: local collection title search followed by direct primary retrieval. Type: primary paper, except the official Verus source artifact. Confidence: high in extracted wording; paper results are author claims, not reproduced. Access: full text available; AutoVerus preprint is distinct from the venue record. Relation to notes: `research/static_analysis.md`, `research/veriskill_20260803.md`, and `research/distributed_verification_evaluation_20261007.md`. Negative evidence: selection, parallel proving and specification testing already exist.

## AutoVerus

Authors: Chenyuan Yang, Xuheng Li, Md Rakib Hossain Misu, Jianan Yao, Weidong Cui, Yeyun Gong, Chris Hawblitzel, Shuvendu Lahiri, Jacob R. Lorch, Shuai Lu, Fan Yang, Ziqiao Zhou, Shan Lu. Version/venue/date: OOPSLA2 2025; retrieved arXiv v3 August 22, 2025. Primary link: https://doi.org/10.1145/3763174.

Exact quote (abstract): “150 non-trivial proof tasks”.

Review: Proof generation/refinement/debugging for Rust/Verus. Authors report >90% success on 150 tasks. This is not a guarantee-preservation study across repository revisions; pass rate cannot establish preservation of intent.

Why selected: proof evolution, specification adequacy, or implementation feasibility. Query: local collection title search followed by direct primary retrieval. Type: primary paper, except the official Verus source artifact. Confidence: high in extracted wording; paper results are author claims, not reproduced. Access: full text available; AutoVerus preprint is distinct from the venue record. Relation to notes: `research/static_analysis.md`, `research/veriskill_20260803.md`, and `research/distributed_verification_evaluation_20261007.md`. Negative evidence: selection, parallel proving and specification testing already exist.

## Verus command-line implementation

Authors: Verus project contributors. Version/venue/date: main branch retrieved October 7, 2026; mutable development artifact. Primary link: https://github.com/verus-lang/verus/blob/main/source/rust_verify/src/config.rs#L475.

Exact quote (option help, retrieved line 475): “Verify just one function”.

Review: Official implementation includes function/module selection. No benchmark, baseline, performance metric or published result applies. This supports selectable obligations, not completeness of dependency discovery. Main is mutable; saved source is the evidence snapshot.

Why selected: proof evolution, specification adequacy, or implementation feasibility. Query: local collection title search followed by direct primary retrieval. Type: primary paper, except the official Verus source artifact. Confidence: high in extracted wording; paper results are author claims, not reproduced. Access: full text available; AutoVerus preprint is distinct from the venue record. Relation to notes: `research/static_analysis.md`, `research/veriskill_20260803.md`, and `research/distributed_verification_evaluation_20261007.md`. Negative evidence: selection, parallel proving and specification testing already exist.
