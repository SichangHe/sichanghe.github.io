# Governance Records as Supervision: Verifier-Selected Self-Training for Structured Workflow Repair
(authored by agents unless marked 🧑)
Tag: `salas2026governance`, [paper](https://arxiv.org/abs/2608.18324)

## what the paper establishes

The paper studies whether outputs that an independently authored verifier accepts can become training data. Its central object is a governance record containing the declared contract, model attempt, verifier decision, accepted output, target origin and lineage, and the experimental gate. The target is a structured plan, not a natural-language answer. The paper states: "A workflow may require every obligation exactly once, restrict the tool assigned to each task, impose ordering and time windows, or satisfy an executable planning model." (section 1, p. 1)

The main external result uses Qwen3-14B thinking to generate plans, VAL to admit them, and the same checkpoint with thinking disabled as the training recipient. Twenty-four accepted plans from 32 harvest cases train a rank-16 LoRA. On 80 unopened PlanBench Blocksworld replanning cases, the base non-thinking model accepts 1/80 plans and the adapter accepts 57/80. Eight prospective training seeds reproduce a positive lift, with adapters ranging from 45/80 to 70/80 and every matched base at 1/80; the exact seed-level sign-flip test is p = 0.0078125. The denominator is the 80-case evaluation partition, while the inferential denominator is eight training seeds (sections 4.2–4.3, pp. 8–9; appendix A.6, pp. 22–23).

The paper also reports a stronger-teacher Phi arm: Phi-4-reasoning supplies 24/32 VAL-admitted plans to base Phi-4, which reaches 51/80 versus 2/80 for base. That is distillation from a separate teacher, not same-checkpoint self-training. The paper explicitly limits the claim to one public planning domain and fixed recipes. It says: "The verifier defines correctness only within its declared contract. It does not establish that the contract is complete for real institutional work." (section 2.1, p. 3)

## technique: preserve a governance record

What it is. Store, for every candidate, the contract C, attempted output y, deterministic verifier result V(C,y), target origin/model lineage o, and applicable gate g. A passing output can enter training only when its origin is admissible for the claim. Rejected attempts stay in the provenance trail. The paper writes the record as R = (C, y, V(C, y), o, g) and says: "A passing output may become a training target only when its origin is admissible for the stated claim." (section 3.1, p. 5)

When to use it. Use this whenever a verifier-selected example is intended to support a causal or teacher-free claim. It separates semantic admission from target provenance, so procedural oracle labels, same-checkpoint outputs, and stronger-teacher outputs are not silently pooled.

How to do it.

1. Freeze the public contract, output schema, verifier version, and acceptance gate (sections 2.1 and 3.1, pp. 3, 5)
2. Record the prompt/case, model and adapter identity, serving regime, sampling configuration, attempt index, response hash, parsed-plan hash, verifier verdict, and token count for every attempt (section 3.8, p. 7; appendix A.3, p. 20)
3. Mark target origin as procedural oracle, verifier-selected, same-checkpoint self-distillation, stronger-teacher distillation, diagnosis-steered, or human-adjudicated (section 2.3, p. 4)
4. Admit only the first passing candidate within the frozen per-case budget; retain rejected predecessors (section 3.8, p. 7)
5. Carry the record into training metadata and into evaluation reports, and never backfill a failed self-sourcing row with a procedural target (section 3.8, p. 7)

Verus form. Inference: represent a contract as an executable Rust data type and expose a pure/specification predicate for its obligations. Store an immutable case identifier, candidate hash, verifier result, origin tag, and gate result in a record struct. Prove with `requires` that the record refers to the frozen contract and with `ensures` that an admitted target satisfies the verifier predicate. Use `proof fn` and `assert` for hash/lineage relationships; keep executable record construction separate from proof code. This does not prove that the contract is institutionally complete, that a hash identifies the intended external artifact, or that an external verifier is sound.

Evidence. The formal Qwen harvest retained 24 distinct VAL-admitted targets from 32 cases, including 11 successes found only after the first attempt; all 118/118 HTTP requests completed, using 419,201 completion tokens and 0.649 A100 hours (table 3, appendix A.4, p. 20). The selector ablation shows the provenance distinction: VAL selected 24/24 semantically valid targets, model self-selection 20/24, and schema-only selection 15/24 (table 5, appendix A.5, p. 21).

Limits and assumptions. Admission is only as strong as the declared contract and pinned verifier. The paper says: "Failed outputs remain part of the provenance trail but cannot enter training as accepted targets." (section 3.1, p. 5) Inference: a compromised or incomplete verifier can produce perfectly auditable but wrong training records; the record must therefore include verifier version and contract version, not merely a pass bit.

## technique: verifier-filtered target acquisition

What it is. Sample multiple candidates from a model regime that can occasionally solve the task, parse only with a syntax-only canonicalizer, and submit every schema-valid candidate to a deterministic verifier. The first candidate that passes is the target. The canonicalizer can wrap exact declared action/object sequences in PDDL parentheses but cannot add, remove, reorder, or repair actions (section 3.4, p. 6; appendix A.1, p. 20).

When to use it. Use it when valid behavior is sparse but mechanically recognizable and when target access must be hidden from the generator. The Qwen external protocol required at least 16 distinct targets, at least eight beyond-first-attempt successes, both block strata, at least 98% completed requests, no contamination, at most 2.5 million completion tokens, and at most six A100 hours (appendix A.3, p. 20).

How to do it.

1. Generate fresh harvest cases and evaluation cases; split evenly between 5- and 6-block problems and exclude raw, normalized-PDDL, and object-renaming-invariant overlap with 2,207 published problems, 150 prior experimental files, and another formal partition (appendix A.1, p. 20)
2. Ask Qwen thinking for up to eight independent attempts per harvest case (sections 3.4 and appendix A.3, pp. 6, 20)
3. Apply only the token-conserving syntax canonicalizer; reject malformed outputs before semantic scoring (appendix A.1, p. 20)
4. Run every schema-valid candidate through the pinned VAL executable; preserve all rejected attempts and choose the first passing candidate (sections 3.4 and 3.8, p. 6–7)
5. Seal target hashes, model revision, serving regime, verifier commit, attempt and seed before LoRA training (appendix A.3, p. 20)

Verus form. Inference: implement a pure/specification verifier predicate over a Rust plan representation, then write an executable parser/canonicalizer whose postcondition states that it preserves the action sequence. Use `ensures` to state that a selected target is parseable and satisfies the predicate; use a loop `invariant` for preservation while scanning attempts. The model sampler and VAL process remain outside the Verus proof boundary, so their outputs must enter as trusted inputs checked by the local predicate.

Evidence. Qwen thinking found 24/32 accepted plans; 13/32 passed first attempt and 11 additional cases passed only after later attempts (table 3, appendix A.4, p. 20). The paper states: "The first VAL-accepted plan from each successful case is selected." (appendix A.3, p. 20)

Limits. Fixed-budget coverage is not absolute reachability. The paper says that every fixed-budget result is "a bounded empirical search measure, not proof of absolute model reachability." (section 3.9, p. 7) Inference: a Verus proof can establish that a supplied plan satisfies a local contract, but cannot show that stochastic sampling would eventually discover one.

## technique: consolidate accepted targets with LoRA

What it is. Freeze the base model and train low-rank update modules on exactly the verifier-admitted plans. The external adapters use BF16, rank 16, alpha 32, dropout 0.05, learning rate 10^-4, 5% warmup, cosine decay, three epochs, batch size one, and fixed exposure on one A100 (section 3.5, p. 6; appendix A.3, p. 20).

When to use it. Use it to turn occasional expensive competence into one-response execution while keeping the base checkpoint and a cheap serving regime. The method is ordinary supervised fine-tuning; the contribution is the provenance-controlled source of targets.

How to do it.

1. Freeze the model revision and target set (section 3.7, p. 6)
2. Train the LoRA adapter for the frozen number of epochs/optimizer steps and choose the final checkpoint by exposure, never by evaluation performance (sections 3.5–3.7, pp. 6–7)
3. Disable thinking at serving time for the same-checkpoint Qwen recipient (section 4.2, p. 8)
4. Evaluate one response per unopened case with the same parser and verifier used for target admission (section 3.9, p. 7)

Verus form. Inference: treat the adapter as an untrusted proposal function. A Rust wrapper can call it, parse the output, and invoke a Verus-verified contract predicate before accepting the result. Do not model neural weights as Verus-executable proof code; the proof obligation is on the wrapper, parser, and contract checker.

Evidence. On 80 fresh cases, Qwen base non-thinking, base thinking, and Self-24 accepted 1/80, 30/80, and 57/80 respectively; Self-24 had 80/80 schema-valid outputs and zero endpoint errors (table 4, appendix A.4, p. 20). Against base non-thinking, there were 56 adapter-only successes, zero base-only regressions, one both-pass case, and 23 both-fail cases; exact paired p < 10^-10 (section 4.2, p. 8). The eight-seed replication produced 1,392/1,920 accepted adapter reports versus 24/1,920 for matched bases, but those pooled cases are descriptive; the eight seed effects are the inferential observations (appendix A.6, pp. 22–23).

Limits. The Qwen interface-cure endpoint failed: only three paired schema gains over thinking, p = 0.25, against a frozen requirement of five gains and p < 0.05. The adapter was still 80/80 schema-valid absolutely. Inference: semantic consolidation and interface reliability must be separate acceptance endpoints in VL.

## technique: isolate target-selection effects

What it is. Hold case IDs, candidate pool, target count, prompt, checkpoint, LoRA recipe, training seed, exposure, and evaluation corpus fixed while changing only which candidate is selected. The paper compares VAL selection, blinded Qwen self-selection from opaque IDs, and first-candidate schema-only selection (sections 3.6 and appendix A.5, pp. 6, 21).

How to do it.

1. Build a frozen pool of schema-valid candidates; here 24 cases yielded 52 candidates, with 13 singleton and 11 contested cases (section 3.6, p. 6)
2. Give the model selector opaque shuffled IDs with no VAL outcomes, attempt indices, hashes, provenance, or stop signals (appendix A.5, p. 21)
3. Train one adapter per selector using identical 72-step LoRA settings and one target per case (section 3.6, p. 6)
4. Compare paired verifier outcomes on 160 newly generated, structurally excluded cases, with separate 5- and 6-block strata (appendix A.5, p. 21)
5. Treat repeated cases across seeds/realizations as descriptive and use training seed as the inferential unit (sections 3.7 and appendix A.7, pp. 6–7, 23)

Verus form. Inference: encode selector outputs as an enum and prove that each selector returns exactly one member of the frozen candidate set. The semantic predicate checks the chosen candidate independently; no proof should trust selector labels as correctness evidence.

Evidence. At the initial seed, VAL/model-self/schema-only adapters reached 102/160, 69/160, and 55/160; VAL versus model-self had paired net +33 and p = 1.9647 × 10^-6 (appendix A.5, p. 21). Across eight new seeds, VAL minus model-self effects were +67, +21, +40, −33, +29, −66, +7, +59 over three realizations of 160 cases; sign-flip p = 0.3672. VAL versus schema-only had four clear positive and four null seeds; p = 0.0703 (sections 4.4 and appendix A.7, pp. 10, 23).

Limits. The paper's one-seed advantage is conditional and does not establish a universal purity law. Inference: VL should not assume that selecting semantically cleaner examples improves every training run; preserve verifier admission for safety/provenance while separately measuring downstream learning.

## technique: prospective seed replication

What it is. Freeze targets, model revision, recipe, prompts, corpus, and verifier; vary only new training seeds, and evaluate each adapter and matched base under three frozen inference realizations. Define a clear seed before looking at aggregate results: at least two of three realizations must pass the semantic gate, none may have negative net, and at least two must pass the interface gate (section 3.7, p. 6).

When to use it. Use it whenever a low-data fine-tuning claim could be a lucky initialization. Use the training seed—not repeated cases—as the statistical unit.

Evidence. All eight Qwen seeds were clear positive lifts; every report improved both block strata and had no base-only semantic regression. Adapter schema validity was 1,910/1,920 (99.48%) versus 1,662/1,920 (86.56%) for bases (section 4.3, p. 9). The exact two-sided sign-flip p = 0.0078125 is the smallest attainable value with eight nonzero effects sharing one sign (section 4.3, p. 9).

Verus form. Inference: model a seed replication as an external experiment record and prove only aggregation invariants such as denominator accounting and paired-count conservation. The statistical conclusion remains a trusted analysis result, not a theorem generated by Verus.

## technique: iterate self-sourcing under frozen stopping gates

What it is. After a model samples verifier-passing targets, train a fresh adapter from the original base on the cumulative admitted set, then harvest again on a case-disjoint partition. Permit another round only if a predeclared materiality or frontier gate passes; stop when it does not. This is the paper's synthetic development program, not the primary external Qwen claim.

How to do it.

1. Hide procedural target plans from the model; present only the malformed plan, public contract, feedback, and schema (appendix B.1, p. 24)
2. Sample up to a fixed budget, preserve rejected attempts, and admit parseable verifier-passing outputs (appendix B.3, p. 26)
3. Train a fresh LoRA from the original base on cumulative admitted targets, rather than continuing the preceding adapter (appendix B.1, p. 24)
4. Evaluate one-response acceptance on unopened rows and separately report pass@32 fixed-budget reachability (appendix B.1, p. 24)
5. Continue only under frozen paired-effect and family-regression thresholds (appendix B.3–B.4, pp. 26–28)

Evidence. Generator A rose from 10/48 base to 21/48 Self-16 and 33/48 Default30; a third step reached 35/48 versus 33/48 with p = 0.625 and was stopped. Generator B rose 12/80 to 44/80 to 62/80. Generator C rose 57/128 to 128/128 after one round and then 126/128, showing saturation. Phi Generator B rose 10/80 to 77/80 (table 13, appendix B.3, p. 26). Cross-generator transfer was selective: Default30 improved Generator B aggregate 28/160 to 47/160 but fell from 10/40 to 6/40 on the precedence-plus-control family and stayed 0/40 on timing-plus-separation (appendix B.4, pp. 27–28).

Verus form. Inference: define a round record with a case-disjointness predicate, cumulative target set, and measured gate result. Prove that a new round cannot reuse evaluation cases or admit a target lacking a verifier receipt. Do not encode pass@32 as a proof of eventual reachability.

Limits. The synthetic generators are self-authored, rows are clustered, and transfer can regress a family. The paper calls the fixed-budget measure bounded empirical search, and says saturated measurements are reasons to change the measurement rather than evidence of exhausted capability (sections 3.9 and 5.5, pp. 7, 14).

## what is proved, measured, and trusted

The verifier proves only compliance with its declared planning contract; the empirical study measures acceptance counts, schema validity, paired transitions, latency, token use, and exact tests. The paper retains the verifier after training because the adapter proposes a repair while the verifier remains the acceptance authority (section 3.10, p. 7). Trusted or untested components include the contract's completeness, PlanBench/VAL implementation and pinned runtime, model and tokenizer behavior, LoRA optimizer and hardware, parser/canonicalizer, contamination checks, and the statistical analysis. The paper does not test institutional authority, contract revision, policy legitimacy, external completion evidence, human escalation, routed multi-adapter composition, additional domains, or a specialist size floor (section 6, pp. 15–16).

Inference: for VL, the product threat is a verified wrapper that accepts a model output under an incomplete or stale contract. Agent-written Rust can be proved to satisfy the local predicate while still selecting the wrong contract version, stale external facts, or an untrusted verifier result. The governance-record pattern reduces this threat by binding contract/version, candidate, verifier receipt, and lineage, but it does not remove the need for authority and external-state checks.

Inference: the highest-value reuse is a two-stage Verus architecture: prove parsing, canonicalization, record integrity, and contract checking in Rust; leave model generation and external process execution as explicit trusted inputs; reject or escalate any candidate without a matching receipt. Separate semantic acceptance from interface validity and from statistical claims about training.

## techniques for the catalog

- governance record — bind contract, candidate, verifier result, target origin, lineage, and gate in an auditable immutable record
- verifier-filtered acquisition — sample multiple candidates, apply syntax-only normalization, and admit the first candidate accepted by a pinned deterministic verifier
- verifier-selected LoRA consolidation — train a frozen base with low-rank adapters on accepted targets to turn occasional expensive competence into one-response execution
- matched selector ablation — hold candidate pool and training fixed while changing only VAL, model-self, or schema-only target selection
- seed-level replication — freeze targets and corpus, vary training seeds, and use seed effects rather than repeated cases as the inferential unit
- bounded self-training loop — harvest accepted model outputs, retrain from the base on cumulative targets, and continue only under predeclared stopping and regression gates
Checked 2026-10-15 against paper salas2026governance: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
