# Neuro-Symbolic Software Verification: Hyper-charging Local Language Models with Symbolic Reasoning at Scale
(authored by agents unless marked 🧑)
Tag: `pirzada2026neurosymbolic`, [paper](https://arxiv.org/abs/2606.16886)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## scope and prior notes

The paper presents VerIbmc, a local open-weight LLM plus ESBMC pipeline for synthesising loop invariants in C. The batch entry classifies it as a local open-weight LLM pipeline with structured ESBMC feedback for loop-invariant synthesis. The existing literature shortlist contains the title as a candidate, but I found no completed walkthrough of this paper in the research notes. This study therefore records the paper's concrete procedures and results rather than repeating its abstract.

The paper's central engineering rule is escalation only after cheap checks. It says: “Cheap, symbolic reasoning runs first, and the LLM is invoked only on the residue that symbolic methods cannot close.” Every candidate, including one produced by a language model, is accepted only after ESBMC proves it. This is a soundness architecture: the neural component proposes predicates; the checker is the trust boundary.

## technique 1: ESBMC as an invariant oracle

What it is and when to use it. Treat invariant checking as a three-valued primitive over a C program P and Boolean candidate φ: provable, disprovable, or unknown. Use it whenever a generated predicate must be admitted to a verified invariant set. ESBMC's loop-invariant mode uses k-induction and inserts a predicate at the loop head (section 2.1, page 4). A timeout or parse error is unknown, never acceptance.

How to do it. For an atomic inductivity test, remove the postcondition, make the loop guard true, insert only φ, and check the initiation/consecution condition
`pre → φ ∧ (φ ∧ g ∧ body → φ')` (Equation 1, section 3.1, page 7). A successful result proves inductivity; a failed result gives a countermodel. For whole-program checking, retain the postcondition ψ and check the atomic obligations plus `φ ∧ ¬g → ψ` (Equation 2). A successful result closes the program; a failed result means the invariant is inductive but too weak for ψ. The paper states: “A successful verdict terminates the pipeline; failed indicates that φ is inductive but too weak to entail ψ” (section 3.1, page 7).

Verus form (inference). Use Verus `requires`, `ensures`, and loop `invariant` clauses. The atomic test corresponds to checking invariant initiation and preservation; the whole-program test additionally checks the postcondition on loop exit. Verus's verifier, rather than ESBMC, is the trusted oracle. C parsing, machine integer semantics, and ESBMC's k-induction details do not carry over directly.

Evidence and limits. ESBMC v8.2 was the backend for all experiments. Phase-level results show 111 of 499 effective problems solved by baseline ESBMC without an invariant (plus 3 under integer-relaxed semantics). The checker can return unknown, and the evaluation mostly uses mathematical integers rather than C fixed-width integers; overflow is therefore outside the headline guarantee.

## technique 2: Phase 0 baseline before synthesis

What/when. Run ESBMC on the unannotated program before generating any invariant. If it proves safe or proves unsafe, terminate; invoke synthesis only on unknown. This removes wasted LLM calls and is deterministic across models (section 3.2, page 7).

Steps. (1) submit P with no loop annotation; (2) return success or failure immediately; (3) on unknown, continue to symbolic candidate enumeration. In the 520-problem pool, 21 overflow cases were excluded, leaving 499; Phase 0 solved 111 under standard semantics (22.2% of 499) and 3 more in integer-relaxed mode (section 4.2, page 16).

Verus form (inference). First call Verus on the function with its existing specifications and no added loop invariant. If verification succeeds, do not synthesize annotations. If it fails because a proof obligation is undecided, proceed to invariant generation. Verus does not generally classify “unsafe” programs as a model checker would, so the failure taxonomy differs.

## technique 3: deterministic symbolic atom enumeration (Phase 1)

What/when. When Phase 0 is unknown, enumerate simple predicates over variables live at each loop head and constants in the loop body. For each variable pair or variable/constant, instantiate `<, ≤, =, ≠, ≥, >`; test each atom with the atomic oracle; store it in provable P, disprovable D, or unknown U. Conjoin P and run whole-program verification. This gives a verified floor without an LLM.

Steps and example. For live variables V and constants C, enumerate at most `6(|V|² + |V|·|C|)` candidates (Equation 4, page 8; the |V|² term covers all ordered variable pairs, and self-comparisons such as x ≤ x are filtered before ESBMC). In Example 3.1, `x` and `y` are live and `{0,1,10}` are constants, giving 60 candidates. ESBMC proves `x ≥ 1` and `x ≥ 0`, rejects unconditional bounds on nondeterministic `y`, and finds their conjunction too weak for `y < 10`; P is carried into Phase 2. The exact example program is `while (x <= 10) { y = 10 - x; x++; } assert(y < 10);` (section 3.2, page 8).

Verus form (inference). Generate candidate `invariant` clauses such as `x >= 1`, `x >= 0`, and pairwise relations over Verus integer variables, then let Verus check each clause in a small harness. Predicate syntax changes (`int`/`nat`, mathematical operators, and Rust expressions), and Verus's invariant must be attached to the loop; the enumeration idea carries over. For arrays or heap state, this scalar template is insufficient.

Evidence. Phase 1 alone solved exactly 75 of 499 effective problems (15.0%) that Phase 0 could not decide, with no LLM call. Adding it gave net gains of +36 solves for Llama-3.1-8B, +22 for Qwen2.5-7B, +15 for GPT-OSS-20B, +3 for Qwen2.5-32B, and 0 for GPT-OSS-120B (Appendix B, Table 7). Its worst-case enumeration is quadratic in live variables and linear in constants.

## technique 4: verifier-feedback LLM refinement and atom recombination (Phase 2)

What/when. Use a local LLM only after Phase 0 and Phase 1 fail. Prompt it with the loop source and the current P, D, U stores. Parse each proposed formula, check it whole, decompose a failed conjunction into subformulas, classify each atom, and recombine all provable atoms. The paper emphasizes that “the 3 stores that are populated are the only” feedback propagated from one iteration to the next (section 3.2, page 8).

Steps. (1) Build a few-shot prompt containing source and P/D/U. (2) Ask for an invariant. (3) Parse; on parse error, continue to the next iteration. (4) Check the complete candidate; terminate on success. (5) If it fails, decompose the formula into sub-formulas and run atomic tests (in Example 3.2 the split is into the two conjuncts, and the disjunction stays whole). (6) Add each to P, D, or U. (7) Check conjunction P; continue until success, timeout, or the iteration budget. Counterexample traces were tried but generally harmed smaller models because they lengthened context.

Example 3.2 starts with P = `{x ≥ 1, x ≥ 0}` and the LLM candidate `y == 0 && (x == 1 || y + x == 11)`. ESBMC rejects `y == 0` because y is nondeterministic, proves the second conjunct, and recombination gives `x ≥ 0 ∧ x ≥ 1 ∧ (x = 1 ∨ y + x = 11)`, which with `¬(x ≤ 10)` implies `y < 10` (section 3.2, page 9).

Verus form (inference). Ask a local model for Rust/Verus invariant expressions, then compile and run Verus on the whole conjunction. For a failed conjunction, split at `&&` and test each candidate in separate `invariant` clauses or lemmas; retain only clauses that Verus proves. P/D/U can be represented as host-side sets keyed by normalized Rust expressions. Verus diagnostics are not identical to ESBMC countermodels, so parser and error classification need a Verus adapter.

Evidence. Across five models and 499 effective problems, Basic (symbolic prior plus refinement) solved 1,931 of 2,600 model–problem pairs (74.3%). GPT-OSS-120B Basic solved 431/499 (86.4%) versus 428/499 for LLM-Only. Phase 2 was needed for 248 of 499 problems after the phase-level accounting, while 62 remained unsolved by every configuration within 600 seconds. 65.1% of LLM-solved instances finished on the first iteration, 85.1% within five, and 88% within ten; the maximum was 171 iterations.

Failure assumptions. The pipeline accepts only ESBMC-proved predicates, but the benchmark uses real/integer arithmetic rather than fixed-width machine integers. Public benchmark contamination, stochastic decoding, 600-second timeouts, parse failures, and model-specific prompt sensitivity limit generalisation. The paper reports three Basic runs; GPT-OSS-120B varied from 428 to 431 solves (out of 499), while Llama-3.1-8B had standard deviation 5.3 across runs (Table 5).

## technique 5: Chain-of-Thought prompt families

Use few-shot prompts to shape invariant generation. Four example sets are supplied: inductive with explanation (base, step, sufficiency), inductive without explanation, Hoare-logic derivation `{I ∧ B} S {I}`, and constrained Horn-clause derivation. Basic chooses one set for a run. These are prompting methods, not soundness mechanisms; ESBMC remains the checker. In Verus, examples should show Rust syntax, `requires`/`ensures`, loop invariants, and proof blocks. Hoare and Horn explanations can guide generation, but their text is trusted only as a proposal.

The paper does not report a per-style comparison of the four example sets; its model-versus-strategy analysis (section 4.3) finds model identity dominates strategy. Basic was best for every model in Table 1; GPT-OSS-120B Basic solved 431/499, Qwen2.5-7B Basic 352/499, and Llama-3.1-8B Basic 342/499.

## technique 6: Tree-of-Thoughts strategy scoring and refinement

What/when. ToT explores all four prompt families in parallel, scores them from verifier outcomes, and refines only the top two. Algorithm 1 uses four scouting calls, then up to R=10 rounds, cycling selected strategies and re-ranking every six rounds. The score is `(0.6|P| − 0.3|D| + 0.1|U|)/|P∪D∪U|`; successful whole-program verification gets 1.0 and an empty result gets 0.1.

Steps. Run each strategy once; collect P/D/U and score it; select top two; alternate calls with feedback-augmented prompts; add provable atoms; stop on whole-program success; after every six rounds recompute scores; enforce per-strategy budget `floor(R/|S*|)` and timeout. This is an inference-control technique, not a replacement for checking.

Verus form (inference). Run four Verus-specific prompt templates in parallel, score by the number of clauses Verus proves, penalize rejected clauses, and retain the top two. Keep all candidates behind Verus verification. The fixed weights and six-round cadence are empirical choices, not soundness facts.

Evidence and failure. ToT reached 49 model–problem pairs unavailable to direct CoT, but aggregate performance often fell: GPT-OSS-120B Basic-ToT 421/499 versus Basic 431/499; Llama-3.1-8B 285 versus 342. Overhead ranged from 2% to 1.40×. The authors explicitly say the weights “were chosen heuristically and were not subjected to ablation” (section 5, page 21), so the score is unvalidated outside this setup.

## technique 7: sequential dual-LLM correction

A supplementary Combined strategy sends LLM1's raw proposal plus P/D/U to LLM2, then independently parses and checks both outputs and recombines atoms. LLM2 acts as a semantic formatter/corrector. With GPT-OSS-120B fixed as LLM2, gains over Basic were −1 for GPT-OSS-120B, +1 for GPT-OSS-20B, +47 for Llama-3.1-8B, +39 for Qwen2.5-32B, and +64 for Qwen2.5-7B (all out of 499). The paper cautions that this is not a controlled structural ablation: gains track the stronger second model. Similar-size pairs showed medium models at 81–82% versus 56–62% for small pairs, and Combined-ToT underperformed Combined by 24–54 problems. In Verus, this can be implemented as a first local model proposing clauses and a second repairing syntax/semantics before Verus checks, but the second model does not become trusted.

## what is proved, measured, and trusted

Proved: each accepted invariant is discharged by ESBMC; the symbolic P store contains individually inductive atoms; whole-program success establishes the encoded postcondition under the chosen arithmetic semantics. Measured: solve counts, iteration distributions, phase contributions, wall-clock times, and comparisons against other tools. Trusted (inference, not stated in this form by the paper): ESBMC, its parser and SMT back-end, the C-to-GOTO transformation, benchmark specifications, and the host code that parses and recombines formulas. The LLM is not trusted for correctness. The headline 431/499 result includes integer-relaxed successes and therefore does not establish bit-precise C safety.

The tables contain a denominator issue readers must preserve: experiments start with 520 problems, exclude 21 unavoidable-overflow cases, and report rates over 499; Table 1 totals add an IR column, while Appendix Table 7 reports standard-semantics phase counts. The paper also reports 431/499 for the best single cell and 437/499 for the union of four strategies, then 440/499 in the dual-LLM supplement; these are different configuration unions, not additive independent solves.

## what VL should reuse and avoid redoing

VL can reuse the architecture: local model proposals, a deterministic predicate floor, structured verifier feedback, formula decomposition, and proof-gated recombination. A Verus adapter should preserve the separation between proposal generation and trusted checking, record unknown/timeouts distinctly, and attach every surviving clause to a concrete loop invariant. In my reading (inference), the paper's strongest practical result is that symbolic Phase 1 helps weak models at negligible runtime cost; this is worth implementing before elaborate ToT search.

VL should not redo a generic claim that larger models solve more. This paper already shows model-driven variance dominates strategy variance by 3–7× on shared suites, and dual-LLM gains mostly reflect the stronger second model. It also shows ToT's fixed heuristic score can spend 1.40× the time while reducing solves. A Verus study should instead measure bit-precise arithmetic, Rust ownership/borrowing, quantified collections, mutable aliasing, and multi-function proof obligations, which this C scalar benchmark largely omits.

Product threat (inference). The architecture is a moderate threat to any product whose differentiation is only LLM proposals followed by verifier checks: the generate–check loop, atom filtering, and local deployment are demonstrated at scale. It is a smaller threat to VeruLaw if its value includes Rust/Verus semantics, ownership-aware proofs, end-to-end specifications, and reliable engineering around verifier failures; none are evaluated here. The paper's soundness boundary also means an untrusted LLM cannot by itself falsify a proof, while arithmetic-model mismatches and specification bugs remain product risks.

## techniques for the catalog

- ESBMC invariant oracle — classify atomic and whole-program invariant obligations as provable, disprovable, or unknown, accepting only successful checks
- Phase 0 baseline — run the verifier on the unannotated program and synthesize only after an unknown result
- symbolic atom enumeration — instantiate variable/constant relations, verify each atom, and conjoin the provable store
- verifier-feedback refinement — prompt a local LLM with P/D/U, decompose failed formulas, and recombine verified atoms
- CoT prompt families — guide proposals with inductive, Hoare, or Horn-clause few-shot examples while retaining verifier gating
- ToT verifier scoring — scout four prompt strategies, score by verified atoms, and refine the top two with bounded rounds
- dual-LLM correction — pass one model's proposal and verifier stores to a second model, then independently verify and recombine outputs

Audited 2026-10-12 against the paper: checked equations 1, 2 and 4, Example 3.1 and 3.2, Algorithm 1 and the score formula, Tables 1, 3, 4, 5, 7, 10, 11, the RQ4 phase counts (111, 3, 75, 248, 62, 323), convergence figures, page and section references and quotations, and the Verus forms (none contain code; they are marked inference and are sound as sketches). Changed: Equation 4 was given as 6(|V|² + |V||C|/2) with an invented binomial reading, the paper has 6(|V|² + |V|·|C|) and the example 6(4+6)=60 needs that; the quotation about the 3 stores dropped the paper's own quotation marks around feedback, so it now quotes only the words that are verbatim; the Phase 2 step splitting disjunctions was not the paper's (it decomposes into sub-formulas, and Example 3.2 keeps the disjunction whole); the claim that the paper reports prompt style is dominated by feedback and capability has no basis (no per-style results exist), replaced; labelled the trusted-components list and the Phase 1 recommendation as inference. Not checked: Figure 2 and Figure 3 values (images), SV-COMP subset numbers beyond Table 2 headline counts, and the Table 2 totals for competing tools. The paper itself says up to +35 in the abstract and +36 in Table 7 for Llama-3.1-8B; the study uses +36 from Table 7.
