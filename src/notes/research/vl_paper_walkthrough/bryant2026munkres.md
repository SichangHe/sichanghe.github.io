# Munkres’ General Topology Autoformalized in Isabelle/HOL
(authored by agents unless marked 🧑)
Tag: `bryant2026munkres`, [paper](https://arxiv.org/abs/2604.07455)

## scope and result

Bryant, Huerta y Munive, Kaliszyk, and Urban report an LLM-only Isabelle/HOL formalization of Munkres’ general topology, Chapters 2–8 (sections 12–50). The target source has 76 definitions, 109 theorems, 34 lemmas, 13 corollaries, and 115 examples; exercises are excluded (section 2.1, PDF p. 3). Over 24 active days, the project produced 85,472 Isabelle lines, 199 definitions, and 806 lemmas, theorems, and corollaries, all proved with zero `sorry`s (section 1, PDF p. 2). The abstract summarizes the scale: “The formalization is complete: all 806 formal results are fully proved with zero sorry’s.” (Abstract, PDF p. 1)

The workflow used ChatGPT 5.2 for bulk definitions and theorem statements, then Claude Opus 4.6 for proof development, in an automated tmux prompting loop. Isabelle imported `Complex_Main`, with sledgehammer, blast, auto/simp, linarith/presburger, meson, and metis available (sections 2.2–2.4, PDF pp. 3–4). No human wrote code by design (section 1, PDF p. 2), although the human occasionally intervened “for focused direction or to correct misbehavior” (section 2.3, PDF p. 4).

Inference: For VeruLaw, the transferable result is an operational workflow for separating formal structure from proof search. Isabelle’s library and tactics cannot be assumed in Verus; the Verus counterpart must use constructs and automation supported by the Verus documentation.

## technique 1: sorry-first proof skeletons

The method is explicitly procedural: (1) write a proof skeleton with `sorry` at every step and prohibit other tactics in new code; (2) build to check well-formedness; (3) annotate every placeholder with `sledgehammer [timeout = 10]`; (4) run `process_theories` once to collect ATP suggestions; (5) substitute the fastest proof for each step; (6) if sledgehammer fails, decompose the step into finer `have` blocks and repeat; and (7) profile slow tactics with `eval_at -t` (section 3, PDF p. 4). The authors state, “This separates proof structure from proof search.” (section 1, PDF p. 2)

The authors say that in a context importing `Complex_Main`, “which contributes thousands of simplification rules”, even an innocent-looking `by auto` can trigger minutes of fruitless search; the rule responds to that (section 3, PDF pp. 4–5). They also say the extreme decomposition into helper lemmas is a consequence of the method: each helper is independently proved via sledgehammer (section 4.2, PDF p. 7). The final formalization has over 16,000 `have` steps, 4,702 `show` steps, about 2,000 proof blocks, and 1,960 `obtain` steps (section 7.2, PDF p. 14).

Inference: Verus form: first write the executable function and its `requires`/`ensures`, then leave proof obligations to be discharged by `assert`, `lemma`, and proof functions; use loop `invariant` clauses as the analogue of explicit skeleton structure. Inference: Verus does not use Isabelle’s `sorry` syntax as a production proof method, so a VL harness would need a clearly marked temporary-obligation representation and must reject it before release. The paper’s decomposition idea transfers, but its exact tactic commands do not.

## technique 2: automated feedback and tool evolution

The agents repeatedly compile and use tool output. The project cached Chapters 2–4 in a precompiled heap image, reducing incremental builds from 50–60 seconds to 12–13 seconds. Profiling replaced slow `metis` calls with `meson`, often yielding 10× speedups (section 2.4, PDF p. 4). Custom `eval_at` and `desorry` tools, together with Isabelle’s built-in `process_theories` command, enabled the bulk sledgehammer workflow (section 2.4, PDF p. 4). The paper says the loop reissues “Read CLAUDE.md and follow instructions” when an agent finishes or stalls (section 2.3, PDF pp. 3–4).

Inference: A Verus integration should similarly cache unchanged modules, capture one verifier run’s diagnostics, and profile slow proof obligations. The performance numbers above are Isabelle-specific and are not evidence for Verus speed.

## technique 3: autonomous prompting with corrective instructions

Phase 2’s log contains 50,119 assistant messages, 17,925 shell commands, 5,186 Isabelle builds, 3,266 `process_theories` runs, 7,135 edits, and 4,962 reads. Of 764 non-system user messages, 635 (83.1%) were automatically issued prompts and 129 were manual interventions; 59 interventions were corrections. Recurring corrections targeted tactic explosion, inefficient repeated tool use, cherry-picking easy goals, and resource management (section 5.2, PDF p. 12). The paper reports 626 automated sessions with median duration 13.0 minutes, mean 24.5, and maximum 263 minutes (section 5.3, PDF p. 12).

Inference: How to apply it: maintain persistent project instructions, let the agent work one theorem or file at a time, capture compiler output, and turn repeated failures into explicit rules. These steps follow the session analysis; the recommendation to apply them to VL is an inference.

Inference: Verus form: use repository instructions to constrain proof style and require verifier runs after edits. Inference: human intervention remains necessary for contract design, API choices, and diagnosing a wrong specification; persistent prompts cannot provide that mathematical judgment.

## evidence, contradictions, and failure modes

The headline claim is 806 fully proved results, while the qualitative review says all 156 non-exercise numbered results have formal counterparts and reports that all proved theorems are sound under their explicit assumptions (section 8.6, PDF p. 19). These are different denominators: 806 includes lemmas, theorems, and corollaries, whereas 156 counts numbered non-exercise textbook results; the paper says 195 of the 806 formal results correspond directly to Munkres’ numbered results (some split into parts) and 611 are helper lemmas (section 4.2, PDF pp. 5–7). The paper also reports an estimated $8,895 list-price API cost from 2.66 million output tokens and 17.2 billion cache-read tokens, but an effective subscription cost of approximately $160; these are two pricing settings, not interchangeable totals (section 5.1, PDF p. 12).

The review found weak definitions. `is_topology_on` omits the carrier-set constraint, and theorems compensate by carrying explicit assumptions; theorems can therefore be sound while definitions are unsafe to reuse (section 8.1, PDF p. 16). Several theorem statements are incomplete (Theorems 19.1, 26.7, 15.1) or mislabeled (Lemmas 23.1 and 23.2), and some content is missing: the clopen characterization of connectedness, sequential compactness, Theorem 28.2, nets, and counterexamples on limit-point compactness (section 8.2, PDF p. 17). The authors say the formalization lacks a proof-compression pass because the methodology prioritizes completing proofs over polishing them (section 8.3, PDF p. 18). The authors summarize the result: “The qualitative review reveals a formalization that is correct but rough: the theorems are proved and the mathematics is sound, but the definitions carry unnecessary weaknesses, some theorem statements are incomplete relative to Munkres, proofs are unpolished, and the integration with Isabelle’s existing infrastructure is ad hoc.” (section 8.7, PDF p. 19)

Inference: The product threat is high if a VL agent optimizes for verifier acceptance while weakening definitions or omitting clauses. Inference: the paper is direct evidence that zero placeholders and successful builds do not guarantee faithful formalization. VL should retain source-to-spec traceability, inspect definitions independently from theorem proofs, and run semantic review on generated contracts.

## what VL should reuse and avoid repeating

Inference: VL should reuse sorry-first’s separation of proof structure from proof search, bounded compile-feedback loops, persistent corrective instructions, and detailed session logs. It should not redo the generic feasibility claim that an LLM can complete a large proof library; this paper already reports that result with 806/806 completed results and extensive logs. Inference: the missing Verus experiments are contract fidelity, proof stability under Rust dependency changes, and whether incremental verification remains usable when executable code and proof code share a source file.

## techniques for the catalog

- sorry-first decomposition: write explicit proof skeletons, then discharge each placeholder with automated search
- bulk theorem proving: collect solver suggestions in one pass and substitute the fastest checked proof
- failure-directed decomposition: split a failed proof step into smaller helper obligations
- compile-feedback loop: repeatedly build, capture diagnostics, and refine the next proof edit
- persistent correction rules: convert recurring agent failures into repository-level instructions
- proof-library audit: inspect definitions and theorem statements separately from successful proof checking
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "These corrections drove the CLAUDE.md evolution: recurring failures were turned into rules in the instruction file."): read the whole paper text (arXiv v1, 981 lines) and checked every quotation, number, section reference and PDF page reference, and each step of technique 1 against it; changed the page citations for section 5.3 (p. 12), 7.2 (p. 14), 8.1 (p. 16) and 8.7 (p. 19), the claim that `process_theories` is custom tooling (it is built in), the attribution of the human interventions to section 2.3, the 'thousands of imported facts' wording (the paper says simplification rules), the grouping of missing content versus incomplete or mislabeled statements, and added the 195/611 split and the 8.3 compression-pass source; kept the tag line and arXiv link (arXiv:2604.07455 is printed on the paper); did not check the Inference lines against Verus documentation, the paper's code repository, or the cited prior work.
