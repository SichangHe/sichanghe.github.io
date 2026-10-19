# Large Lemma Miners: Can LLMs do Induction Proofs for Hardware?
(authored by agents unless marked 🧑)
Tag: `peled2025large`, [paper](https://arxiv.org/abs/2511.02521v3)
## scope and result

Large Lemma Miners studies a neurosymbolic workflow in which LLMs propose auxiliary invariants for SystemVerilog designs and a formal engine checks them. The abstract says: “We present a neurosymbolic approach that includes two prompting frameworks to generate candidate invariants, which are checked using a formal symbolic tool.” The framework searches for an inductive strengthening of a safety property, rather than asking the model to prove the property directly. Its dataset has 109 design/property pairs. Across six LLMs and the main few-shot configurations, the virtual-best Agentic setup solves 98/109 examples (90%), while the virtual-best Non-Agentic setup solves 90/109 (83%). Eleven examples are unsolved by every setting (Section 7, PDF page 6; Table 1, page 7). This study checks arXiv:2511.02521v3, dated 25 June 2026.

Inference: this is a close analogue of generating Verus loop invariants or state-machine facts. The formal checker, rather than the model's plausibility, decides whether a candidate can support the target proof. The paper studies hardware transition systems and SVA, so its percentages do not establish performance on Rust or Verus.

## the verification object: inductive strengthening

A transition system `T` has state variables, initial-state formula `Init`, and transition relation `Tr`. An inductive invariant `Inv` must satisfy initiation, `Init(v) -> Inv(v)`, and consecution, `Inv(v) and Tr(v,v') -> Inv(v')`. A safety property `AGp` is proved when an inductive strengthening is a set of lemmas `L = {AGq1, ..., AGqk}` such that the conjunction of the `qi` and `p` is inductive. This is the mathematical target for the lemma miner.

The motivating round-robin arbiter demonstrates the distinction between truth and inductiveness. Section 3 (PDF page 2) states: “The specified property, while true, is not an inductive invariant.” The generated SVA lemma checks `not (ack0 && ack1)` on each positive clock edge, disabled during reset; conjoined with the property, it forms an inductive invariant. Inference: the example shows how an auxiliary lemma can make a true but non-inductive property tractable.

Verus form. Inference: for a Verus loop, use a loop invariant that is established before the loop and preserved by every body execution; for a concurrent state machine, use a transition invariant that relates each allowed transition to the abstract state. The exact Rust proof structure depends on the Verus API and is not specified by this paper. Inference: generated facts must be expressed as contracts or proof functions and checked by Verus before being reused.

## technique 1: few-shot non-agentic candidate generation

What it is. Algorithm 1 builds a fixed few-shot prompt from a pool of examples. Each example contains an RTL design, property, candidate lemmas, and chain-of-thought reasoning explaining why those lemmas form an inductive strengthening. The framework embeds the target design/property pair and the pool entries using sentence transformers, then selects the k most similar examples by dot product (Section 5.1, PDF pages 3–4).

How to do it.

1. Construct a pool of verified design/property/lemma examples.
2. Embed the target `(D, phi)` and every pool entry.
3. Select the k most similar examples; the main experiments use k in `{0,1,2,3,4}`, and the ablation additionally tests k=5.
4. Add the fixed task template, examples, target RTL, and target property to the prompt.
5. Sample the same prompt n times and collect all candidate lemmas.
6. Pass the union of candidates to `FindIndStrength`.

Algorithm 1 (PDF page 3) initializes `S` with `GetFewShotPrompt(D, φ, k)`, repeatedly calls the model, and then invokes the formal search. The model outputs candidate lemmas; Algorithm 1 returns a formally checked strengthening or the empty set.

Verus form. Inference: build a corpus of verified Rust examples indexed by obligation text, type names, APIs, and invariant shapes. Retrieve a small number of examples and ask the model for candidate `requires`/`ensures` facts or loop-proof facts. Inference: examples should be checked under the target crate and dependency versions; text similarity alone cannot establish a valid invariant. This adaptation is not in the paper.

Evidence and limits. The few-shot ablation reports a virtual-best success rate increasing from 82% at k=0 to 86% at k=4, with no improvement at k=5. This denominator is the 109-example dataset for the virtual-best aggregate. The increase is nonmonotonic per model and category, so more examples are not automatically better.

## technique 2: agentic proposal, checking, and repair

What it is. Algorithm 2 wraps candidate generation in a verifier feedback loop. The LLM proposes a batch; the formal search checks it; if no strengthening is found, the system records every candidate and appends a repair message describing whether each candidate held. The next prompt includes the accumulated conversation. The experiments allow at most seven iterations in the main Agentic setup and vary the iteration count from 1 to 10 in an ablation.

How to do it.

1. Build the same few-shot prompt as in the Non-Agentic setup.
2. Ask the LLM for candidate lemmas.
3. Run `FindIndStrength` on the new candidates.
4. Return immediately if a nonempty strengthening is found.
5. Otherwise add the candidates to `All`, run the checker on all accumulated candidates, and return if successful.
6. Append a repair message that identifies each candidate's verification status.
7. Repeat until success or the iteration bound is reached.

Section 5.1 (PDF page 4) states: “In the Agentic setting of Algorithm 2, lemma generation is framed as an iterative interaction between an LLM and a verifier.” Feedback also includes task and format reminders every two rounds. Section 6.1 (page 5) reports that including counterexamples degraded performance; the authors suggest longer feedback as a possible cause. Section 7.5 (page 8), discussing Figure 2’s experiment with k=1, a two-hour timeout, and no iteration cap, reports that most examples are solved within five iterations and all models saturate at approximately ten iterations.

Verus form. Inference: after each Verus run, feed the model the exact diagnostic, obligation context, and which candidate facts were accepted or rejected. Keep accepted facts and rejected facts separately; do not let a timeout masquerade as a counterexample. Inference: cap both model turns and total Verus invocations to control solver cost. The paper's seven-iteration limit is not a Verus requirement.

Evidence and limits. Table 1's virtual-best row gives 98 solved tasks for Agentic and 90 for Non-Agentic, out of 109. The authors attribute part of the Agentic advantage to checking more subsets over several rounds, so it can spend more formal-engine calls. Inference: comparing success rates without equalizing checker calls would overstate the benefit of prompting alone.

## technique 3: formal subset search with inductive and bounded checks

What it is. `FindIndStrength` partitions candidates into those that are individually 1-inductive and those that merely hold up to a bounded depth N. It orders individually inductive candidates first, then bounded-correct candidates lexicographically, and checks prefixes of that list for an inductive strengthening.

How to do it.

1. Translate the RTL and property into transition system `T` and reachability property `AGp`.
2. For each candidate `ell`, call `IsOneInductive(T, ell)`.
3. If `ell` is individually inductive and `ell and p` is inductive, return `{ell}`.
4. Keep every individually inductive candidate even if it does not suffice alone. Only for candidates that fail the individual induction check, call `HoldsUpToBound(T, ell, N)`; keep those passing this check. Discard candidates that fail both checks.
5. Sort the individually inductive candidates before bounded-only candidates, using lexicographic order within each category.
6. Add candidates in prefix order and test whether the conjunction of the prefix and `p` is inductive.
7. Return the first successful prefix or the empty set.

Algorithm 4 checks initiation and consecution with a SAT solver: it rejects a candidate if `Init and not psi` is satisfiable or if `psi and Tr and not psi'` is satisfiable. The paper uses k=1 for induction checks and BMC bound 30 for bounded checks; every query has a 120-second timeout.

Theorem 1 (Section 5.2, PDF page 5) states that a nonempty result from `FindIndStrength` is an inductive strengthening for the target property, which therefore holds in the design. The same section warns: “Moreover, since FINDINDSTRENGTH does not consider all possible subsets, it may fail to find an inductive strengthening represented by a subset that is not a prefix.” Here `FINDINDSTRENGTH` renders the paper’s typeset algorithm name.

Verus form. Inference: the closest analogue is to check each generated invariant as a Verus proof obligation, then test combinations in a deterministic order. A bounded execution check can find short counterexamples but cannot prove a Rust invariant; only Verus's full initiation and preservation proof should certify it. Inference: prefix-only search may miss a useful non-prefix combination, so a Verus implementation should record this incompleteness and optionally use a separate subset strategy.

Evidence and limits. Table 1 distinguishes Total Lemmas, Correct candidates that hold to BMC bound 30, 1-Inductive candidates, verifier Error, and Solved tasks. For example, GPT-5 Agentic produces 8,090 candidates, 5,976 BMC-correct, 3,187 1-inductive, 175 errors, and solves 84/109 tasks. These columns have different denominators: candidate counts for the first four and the 109-task benchmark for Solved. They must not be interpreted as percentages of the same population.

## technique 4: bounded checking as a filter, not proof

What it is. `HoldsUpToBound(T, ell, N)` invokes bounded model checking to reject candidates with short counterexamples. A candidate that survives bound 30 is retained as a possible lemma but is not called inductive until initiation and consecution succeed.

When it is used. Algorithm 3 applies bounded checking after a candidate fails individual induction, preserving candidates that may still contribute to a joint strengthening. Bounded survival is not the final proof criterion.

How to do it.

1. Test each candidate for individual inductiveness first.
2. For candidates failing that check, invoke `HoldsUpToBound` with bound N; the paper uses 30.
3. Retain candidates that hold up to that bound.
4. Combine them with individually inductive candidates in the sorted prefix search.
5. Accept a strengthening only after its conjunction with the target property passes induction.

Verus form. Inference: execute bounded test traces or model checks only as triage for generated Rust invariants. A bounded pass cannot replace the Verus proof of all loop iterations or state transitions. This distinction follows from the paper's separate `Correct` and `1-Inductive` columns.

Evidence and limits. Section 6.2 (PDF page 5) explains: “We use bound 30 as a practical bound for bug-finding, sufficient to detect short counterexamples and quickly filter out incorrect candidates while also keeping the cost of this check manageable.” It also states: “All queries use a timeout of 120 seconds.” Inference: a timeout does not establish that a candidate is false. Inference: Verus evaluation should report timeout and verifier-error counts separately from false candidates.

## technique 5: sampling and prompt repair

Non-Agentic runs sample up to five responses for one prompt and aggregate all candidate lemmas. Agentic runs sample one response per message sequence and use conversation repair. Section 6.3 (PDF page 5) lists GPT-5, Claude4, Claude4.5-Sonnet, Claude4.5-Haiku, Claude4.5-Opus, and Claude4.7-Opus. Claude uses the default Amazon Bedrock Converse API configuration; GPT-5 uses the default Responses API parameters without previous-response IDs. The paper observes syntax familiarity failures: models misstate SVA operators, use undefined next-state variables, emit invalid loop constructs, or produce non-ASCII symbols such as Unicode `⇔` instead of ASCII `<->`.

How to do it.

1. Choose the model and inference configuration.
2. For Non-Agentic, repeat the identical prompt up to five times.
3. For Agentic, make one proposal per iteration and append verifier feedback.
4. Aggregate candidates and invoke the formal subset search.
5. Stop when a strengthening is found or the time/iteration bound expires.

Verus form. Inference: sample multiple proof candidates, normalize diagnostics, and ensure generated source uses valid Rust and Verus syntax. Inference: syntax repair should be separated from logical repair so a parser error does not contaminate the learned invariant pool. The paper's syntax examples are SVA-specific.

## what is proved, measured, and trusted

The formal engine proves that a returned lemma set is an inductive strengthening and therefore implies the target safety property for the modeled hardware. Section 6.5 (PDF pages 5–6) describes 57 SystemVerilog hardware designs with safety properties, 47 examples adapted from C programs, and 25 additional variants of seven C examples. Sixteen C examples populate the CoT pool; three further hardware examples are used solely in that pool. The evaluation totals 109 design/property pairs, with 18 seen examples, 31 other C examples, and 60 other examples in Table 3 (page 8). Runtime experiments use 1,519.9 Amazon EC2 hours, 20% LLM and 80% symbolic engine; all runs generate 277.41 million tokens. Section 7 (PDF page 6) reports a maximum solve time of five hours, a mean of 232.54 s, and a median of 85.1 s. It does not explicitly specify the population used for those timing statistics.

For 31 challenging examples, the pipeline solves 27/31 against state-of-the-art tools, with a one-hour timeout for those comparisons. Table 2 (PDF page 7) marks the larger buffer as a timeout because its induction check exceeded two minutes; JasperGold could check the generated strengthening within that limit. A separate case took Agentic Claude4.7-Opus two hours, exceeding the comparison’s one-hour limit. The comparison uses rIC3 1.5.2, JasperGold 2024.06p002, and VC-Formal X-2025.06-SP2P3. The 31 examples were selected because at least one of those tools did not prove the property within ten minutes (Section 7.4, pages 6–7).

Section 6.2 identifies EBMC 5.9 as the formal engine. Inference: proof soundness depends on the design/property formalization, RTL and SVA translation, and formal engines. Model APIs and the manually selected CoT pool affect candidate quality and evaluation, but their outputs still require formal checking. The paper warns that dataset representativeness and data contamination threaten validity; most public netlists lack source RTL and cannot be used by this framework.

## Verus translation and product boundary

Inference: the core Verus workflow is candidate generation, verifier feedback, deterministic subset search, and final proof checking. A candidate Rust invariant should be attached to the relevant loop or transition API and checked with Verus. Any generated fact that is not accepted by Verus remains a suggestion. The paper does not give Verus syntax, ownership treatment, or Rust concurrency models.

Inference: hardware induction differs from local loop invariants because hardware lemmas can include temporal operators and global reachable-state claims. A Verus state-machine proof may encode related global facts, but the mapping is an engineering hypothesis requiring a benchmark. Inference: tests should include sequential loops, ownership-heavy data structures, and concurrent state machines, with proof success and solver cost denominators.

## contradictions, assumptions, and failure modes

The abstract attributes 90% success to at least one prompting setup; Section 7 reports the Agentic virtual best as 98/109 = 89.91%, rounded to 90%; Non-Agentic is 90/109 = 82.57%, rounded to 83%. Table 1 defines its aggregate: “Virtual best: tasks solved by at least one of the six models in the given setup.” Its results also aggregate the main few-shot configurations. Inference: the 98-task aggregate should not be reported as one fixed model’s success count.

The paper reports 11/109 tasks unsolved by any setting, a 10.09% remainder. Section 7.3 reports: “As expected, for all examples that were used to construct the CoT pool, the LLMs copied the lemmas they were shown, at times along with additional lemmas.” Excluding pool examples and their variants, Section 7 reports 84% solved by at least one configuration. Section 8.3 says manual convenience selection may introduce bias, and Section 8.2 warns that the dataset may not represent industrial designs. Inference: success on unseen examples provides stronger evidence of generalization than copying shown lemmas.

Inference: VeruLaw faces analogous contamination and benchmark overfitting risks if prompt examples come from the same projects used for evaluation. Inference: model-generated invariants can be syntactically valid but semantically irrelevant, and solver timeouts can conceal whether the candidate is wrong or merely expensive. Inference: a product must retain the exact verified source, dependency versions, and contract so that a mined lemma cannot silently outlive its assumptions.

## transfer notes for VL implementation

Inference: reusable contributions for VL are verifier feedback and repair, bounded filtering, formal subset selection, deterministic ordering, and separation of bounded correctness from inductiveness. The paper evaluates this architecture on hardware and compares it with industrial model checkers (Sections 7–7.4). Inference: VL should evaluate its transfer to Verus rather than treat the general ability to propose invariants as an untested claim.

Inference: VL should test whether Verus diagnostics can guide a bounded candidate filter, whether a prefix search misses useful combinations, and whether generated lemmas remain valid after Rust dependency upgrades. Measure accepted invariants, full proofs, timeouts, repair rounds, verifier calls, and human interventions separately.

Product relevance for peled2025large. Inference: the threat is substantial to proof-authoring cost because this pipeline could automate invariant discovery, one of the most manual parts of Verus work. The final runtime artifact remains subject to Verus, but stale specifications, external assumptions, and incomplete state models can still make a formally verified product wrong for its intended environment. The paper provides no evidence about Rust executables, unsafe code, or production deployment.

## techniques for the catalog

- few-shot invariant prompting — retrieve similar verified examples and sample candidate lemmas from a fixed prompt
- agentic verifier feedback — iterate proposal, formal checking, and diagnostic-guided repair until a strengthening appears
- bounded candidate filtering — reject lemmas with short counterexamples after failed individual induction checks
- inductive subset search — classify candidates, order them deterministically, and test prefixes for a strengthening
- initiation and consecution checking — prove that a candidate holds initially and across every transition
- sampled neurosymbolic mining — aggregate multiple model responses while retaining formal verification as the prerequisite check for acceptance

## evidence references

PDF page numbers count from the title page. The round-robin example and definitions are Sections 3–4.1, pages 2–3. Prompting and Algorithms 1–2 are Section 5.1, pages 3–4. Subset search, Algorithms 3–4, and Theorem 1 are Section 5.2, pages 4–5. Configuration and dataset details are Section 6, pages 5–6. Aggregate results are Section 7, page 6, and Table 1, page 7. Challenging benchmarks and ablations are Sections 7.4–7.5, pages 6–8; Tables 2–3 and Figures 1–2 are on pages 7–8. Limitations are Section 8, pages 8–9.
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Excluding examples that are part of the CoT pool, or variants thereof, 84% of the examples are solved by at least one of the configurations."): checked the whole paper, quotations, reported numbers, section/page references, and technique steps; corrected page references, bounded-check ordering, algorithm naming, ablation scope, timing claims, dataset description, and proof-trust claims, and labeled transfer conclusions as Inference; did not reproduce experiments, inspect implementation artifacts, or validate Verus adaptations.
