# O-Forge: An LLM + Computer Algebra Framework for Asymptotic Analysis
(authored by agents unless marked 🧑)
Tag: `khaitan2025forge`, [paper](http://arxiv.org/abs/2510.12350v2)

## scope and central claim

O-Forge couples a frontier language model to Mathematica’s `Resolve` computer-algebra procedure. The model proposes a decomposition of an asymptotic inequality’s domain or series; the CAS verifies each resulting subproblem by quantifier elimination. The paper’s key engineering choice is to delegate creative decomposition to the model and routine checking to a symbolic engine.

The abstract says: “We present a framework, called LLM+CAS, and an associated tool, O-Forge, that couples frontier LLMs with a computer algebra systems (CAS) in an In-Context Symbolic Feedback loop to produce proofs that are both creative and symbolically verified.” It then specifies: “we use an LLM to suggest domain decomposition, and a CAS (such as Mathematica) that provides a verification of each piece axiomatically.” (Abstract, p. 1.)

Inference: For VL, the transferable pattern is propose–machine-check–iterate: an LLM suggests proof decompositions or lemmas, while Verus checks each obligation. The paper does not produce Lean or Verus proof objects, so the security and trust claims do not transfer automatically.

## technique 1: LLM-proposed domain decomposition

What it is. O-Forge accepts a conjectured estimate in LaTeX or natural language, parses it, asks the LLM for a finite cover D=⋃Di (or breakpoints for a series), and then verifies each subdomain. Section 3 lists the pipeline: “Step 1: LATEX or natural language input”; “Step 2: Decomposition proposal”; “Step 3: Regime-wise simplification”; and “Step 4: Symbolic verification via Resolve.” (Section 3, pp. 3–4.)

How to apply it. (1) State the target inequality and variable assumptions. (2) Prompt the LLM to propose breakpoints guided by dominant terms and monotonic regimes. (3) Check that the proposed pieces cover the original domain and that positivity or singularity conditions are explicit. (4) Simplify expressions separately in each regime. (5) Ask a decision procedure to prove the quantified inequality on every piece. (6) Accept the global result only if all pieces return a positive verification result.

The paper’s concrete weak Fenchel–Young example is xy≪x log x+e^y for x≥1,y≥0. The proposed split is y≤2 log x and y>2 log x; the authors show “y ≤ 2 log x =⇒ y ≪ log x =⇒ xy ≪ x log x ≤ x log x + ey” and “y > 2 log x =⇒ x log x + ey ≥ ey/2 ey/2 ≥ xy.” (Section 4, p. 5.)

Verus form. Inference: have a model propose a finite set of `requires`-compatible cases and prove each case with Verus `assert`/`ensures` obligations. A Rust function can dispatch on the case split, while a `proof fn` establishes that the cases cover the specification domain. Unlike O-Forge, each branch must end in a Verus-checked proof; a model-produced split is only a candidate.

Evidence. The reported cases show that the creative split turns an apparently difficult estimate into routine branch obligations, but no count of independently checked proof objects is given. The paper’s CAS returns a Boolean rather than an exported certificate, so its evidence is symbolic-engine output under a closed-source trust assumption.

## technique 2: regime-wise leading-term simplification for series

What it is. For a research-level series estimate, O-Forge asks an LLM for breakpoints and uses Mathematica code to derive safe leading-order bounds in each regime. For the series S(h,m), the paper uses breakpoints {⌈h⌉,⌈hm⌉}: d≤⌈h⌉, ⌈h⌉<d≤⌈hm⌉, and d>⌈hm⌉. The summand is approximated by (d+1)/h², 1/d⁴, and h/(d⁵m⁴), respectively (Section 4, pp. 5–6).

How to apply it. (1) Ask the model for candidate breakpoints. (2) For each interval, identify dominant numerator and denominator terms. (3) Enforce denominator positivity and refine the split around singular regions. (4) Replace the summand by a provable leading-term bound. (5) Sum the bounds on each interval and discharge the resulting asymptotic inequality with the CAS. The authors deliberately use the CAS for simplification because LLM calls “only sporadically gave us the correct simplifications” (Section 4, p. 6).

Verus form. Inference: encode each regime as a lemma with explicit inequalities over integer indices, then prove the summand bound with Verus arithmetic and quantified assertions. Verus can check finite loops with invariants; it does not natively supply Mathematica’s transcendental quantifier elimination, so logarithm/exponential reasoning needs suitable specifications and lemmas or an external certificate checker. A leading-term replacement must be proved, not inserted as an unchecked approximation.

Limits. The authors acknowledge: “Currently, we simplify the summand of the series by extracting the leading order term from both the numerator and the denominator. This may not be valid simplification for more complex summands.” (Section 8, p. 9.) This is a concrete assumption behind technique success.

## technique 3: CAS quantifier elimination as the checker

What it is. For each subdomain Di, O-Forge asks Mathematica `Resolve` to establish ∀x∈Di:f(x)≤Cg, searching C over a finite grid such as 1 to 10⁴. The paper states: “Verification succeeds if Resolve returns True; the global inequality holds if all pieces return a ‘Proved’ or ‘True’ value.” (Section 3, p. 4.) The authors choose `Resolve` because it handles non-linear `log` and `exp` expressions that their tested SMT solvers do not reliably prove.

How to apply it. (1) Translate the branch assumptions and target into first-order real arithmetic. (2) Choose a finite candidate range for C. (3) Call `Resolve` for each branch. (4) Reject the global claim if any branch is false or unresolved. (5) Record the branch results and the selected C. The paper keeps C=10⁴ because its tested examples completed for C≤2, while allowing a user to increase the bound (Section 3, p. 4).

Verus form. Inference: replace `Resolve` with Verus’s solver-backed proof obligations, and where necessary supply trusted lemmas or a separately checked certificate. A Verus `ensures` clause can state the inequality, but solver success alone does not justify a mathematical claim unless the complete Verus pipeline accepts it. O-Forge’s closed-source checker is materially weaker as a trust boundary.

Trust limitation. The paper explicitly warns: “At this point in time, the tool is not designed to produce a formal proof (say, in Lean 4).” It adds that `Resolve` “does not produce a proof object that can be independently verified.” (Section 1, p. 2; Section 8, p. 9.) Thus the output is a machine decision, not a portable proof artifact.

## technique 4: one-shot model bottleneck and reproducible pipeline

O-Forge minimizes model exposure: it prompts the frontier LLM once for decomposition, then runs the remaining transformations and checks in local Mathematica modules. The authors explain: “Therefore, we only prompt the LLM once in the entire process, and the rest of the proof completion is carried out by Mathematica.” (Section 4, p. 6.) Implementation uses a structured prompt with editing rules, task, breakpoint requirements, and output format; `llm_client.py` proposes splits and `mathematica_export.py` invokes `wolframscript` (Section 5, pp. 7–8).

When to use it. Use one-shot proposal when repeated model calls would add inconsistent heuristics or create multiple untrusted bottlenecks. Keep all later transformations deterministic or machine-checked.

Verus form. Inference: ask an agent once for candidate lemma decomposition, then run deterministic Verus verification and bounded repair loops. Store the original proposal and every accepted proof so reviewers can audit model influence. This reduces, but does not remove, model risk: a bad split can make the checker return false or leave a gap.

Reproducibility and evaluation. The repository requires Python 3.9+, local Mathematica via `wolframscript`, and a frontier-LLM API key (Section 9, p. 9). The authors tested “around one hundreds of problems” (Section 6, p. 8). They report that two- or three-variable functions generally need at most four decompositions, that ordering-based subdivisions are robust for symmetric functions, and that regime-wise leading-term replacement is necessary for `Resolve` to finish. No denominator for the approximate hundred-problem suite or per-problem success fraction is supplied, so the observations are qualitative.

## what is proved, trusted, and left open

The CAS symbolically verifies each branch under its own implementation and returns `True`; the LLM supplies decomposition heuristics; Mathematica, its quantifier-elimination algorithms, the closed-source implementation, input parser, and any assumptions about real functions remain trusted. The paper’s limitation section recognizes this trust: “there is still an element of trust involved; that a closed-source company like Wolfram is indeed performing the correct manipulations ‘under the hood’.” (Section 8, p. 9.)

Inference: The threat to VL is moderate and specific. Agent-written verified Rust can benefit from decomposing difficult contracts into solver-friendly regimes, but O-Forge does not establish soundness for executable code, memory safety, concurrency, or external libraries. Existing VL work should not claim a new verified-prover architecture from this paper; it should test whether one-shot decomposition followed by Verus checking lowers proof effort while preserving a fully replayable proof artifact.

## techniques for the catalog

- LLM domain decomposition: ask a model for a finite cover or series breakpoints that expose simple proof regimes
- regime-wise leading terms: derive and prove separate dominant-term bounds in each regime before summing or composing them
- branch-wise symbolic checking: run a quantifier-capable checker on every branch and accept the global claim only when all return true
- one-shot propose then verify: limit the model to a decomposition proposal and let deterministic machine checks handle the remaining proof work

Checked 2026-10-15 against the paper by a Codex agent for o_forge_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
