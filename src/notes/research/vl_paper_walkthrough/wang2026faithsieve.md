# FaithSieve: Fine-Grained Evaluation of Math Proofs with Faithful Formal Evidence
(authored by agents unless marked 🧑)
Tag: `wang2026faithsieve`, [paper](https://doi.org/10.48550/arxiv.2608.26310)

FaithSieve evaluates a natural-language proof by locating its first unreliable step with local formal evidence. The paper's central claim is that Lean output is useful only when the checked statement is both local to the proof transition and semantically faithful to the original claim. It reports 81.43% exact first-error accuracy on 350 ProofLoc-Olympiad problems and 84.50% on 200 ProofLoc-University problems with GPT-5.4, versus 72.29% and 75.00% for direct judging (Sections 1 and 5.1, PDF pp. 2, 7–9). The paper states: “Formal validation is gated by semantic alignment scoring, so Lean evidence is incorporated only when the formal statement faithfully preserves the context, objects, and logical form of the original claim.” (Abstract, p. 1)

## proof-state-tree decomposition and EdgeUnits

What it is and when to use it. A benchmark proof step is treated as an annotation unit, not necessarily as the unit to verify. The system first asks a language model to split each coarse chain-of-thought step into faithful fine-grained substeps, then represents the proof as a tree whose nodes carry assumptions and goals and whose edges are local transitions. Use this when one textual step combines substitutions, new facts, goal changes, or branch pruning; checking the whole step would create the locality mismatch described in Section 2.2.

How to do it. (1) Preserve the original conclusion, variables, case wording, witnesses, and calculations while removing only redundancy (Section 3.1, p. 4). The paper explicitly warns: “Here we emphasize ‘faithful’ rather than ‘patching’: conclusions, variable scopes, case-discussion wording, concrete witnesses, and numerical calculations in the original proof must all be preserved as-is.” (Section 3.1, p. 4) (2) Build a tree `T=(V,E)`. A node is `S_v=(Γ_v,G_v)`, the accumulated assumptions and current goal. (3) Classify each substep as fact derivation, rewrite, goal reduction, case split, or lemma introduction, and attach it to its parent state. (4) Update the child state: add a new fact to `Γ`, change `G` when the goal changes, and create one child per branch with branch-specific assumptions (Section 3.1, pp. 4–5). (5) Record every edge as an `EdgeUnit` containing before-context, after-context, goal relation, branch scope, and transition type.

The example splits `m` into odd and even branches, retaining the corresponding goals `(n,m)=(1,1)` and `(n,m)=(3,2)` (Figure 2, p. 4). The paper says: “Each edge e = (v → v ′ ) ∈ E represents a local reasoning transition of type τe , such as fact derivation, rewrite, goal reduction, case split, or lemma introduction.” (Section 3.1, p. 4)

Inference: In Verus, the analogous unit is a small proof obligation around one state-changing Rust operation. Encode the state in `spec` values and use `requires`/`ensures` on the executable function; use a loop invariant for each repeated state transition. Verus has no Lean proof-state tree or EdgeUnit library, so the decomposition and mapping from Rust statements to units must be maintained by the agent or a wrapper. The intended safety and functional contract remain in Verus; the tree is an audit artifact.

Evidence and limits. Removing local EdgeUnits reduced GPT-5.4 exact/binary accuracy on ProofLoc-Olympiad from 81.43%/93.71% to 60.86%/72.29%, and Qwen3.5-9B to 62.29%/77.71% (Table 5, p. 9; denominator 350 problems). The paper's benchmark labels remain coarse benchmark steps even though validation uses internal EdgeUnits (Section 5, p. 7). A tree can be much larger than the original proof, and the paper therefore does not validate every edge (Section 3.2, p. 5).

## suspicion-tree search and audit windows

What it is and when to use it. Suspicion Search cheaply scores all EdgeUnits before expensive formal checking. It is useful when the tree is too large to send every transition through Lean. For each edge, a model judges whether it is suspicious, assigns a risk in `[0,1]`, and checks edge-type-specific failure modes using the attached contexts and goal relation (Section 3.2, p. 5).

How to do it. (1) Run one lightweight judgment per EdgeUnit. (2) Treat risk above 0.6 as a candidate; the authors report that more than 80% of risk scores fall in `[0,0.2]` or `[0.8,1.0]` (Section 3.2, p. 5). (3) Do not choose only the globally highest score. Select the earliest suspicious edge and include a short prefix of preceding edges, especially special transition types, as the audit window. (4) Send that window to obligation discovery and validation. The paper's rationale is cost control while retaining evidence before the first candidate error.

Inference: A Verus implementation can use this as a scheduling policy: prioritize the earliest function or loop transition whose generated contract check looks suspicious, and include preceding transitions so an earlier violated precondition is not hidden. The risk model is external orchestration; Verus only checks the resulting contracts and invariants.

Evidence and limits. The paper gives the 0.6 threshold and score distribution, but it does not report a standalone precision or recall for suspicion scores. Therefore the threshold is an engineering heuristic, not a demonstrated detector. A false low score can prevent a real obligation from reaching Lean.

## typed obligation generation

What it is and when to use it. An EdgeUnit is a transition record, not yet a theorem. Typed conversion turns it into an explicit local obligation matched to the transition type. Use it whenever a single transition could otherwise be summarized too broadly. Table 1 (p. 5) defines derived-fact, rewrite, goal-reduction, fact-plus-reduction, case-split, branch-elimination, witness, contested-claim, entailment, and overlap-partition obligations.

How to do it. (1) Select a conversion template from the edge type and state change. (2) Instantiate it from the before context, after context, branch conditions, and goal relation. (3) For fact-plus-reduction, create two obligations: first prove the new fact from the prior context, then prove the goal reduction assuming that fact. This prevents an unvalidated fact from being used as a premise (Section 3.3, p. 5). (4) For a case split, check exhaustiveness, validity of the partition, and the consequence of each branch. (5) Emit the obligation for the formal evaluation agent.

The paper states: “Thus, typed conversion turns a local edge into an explicit statement that formal validation can handle.” (Section 3.3, p. 5)

Inference: In Verus, make each obligation a lemma or an `ensures` clause over the relevant Rust state. A derived fact becomes a proof lemma; a rewrite becomes an equality or `assert`; a case split becomes branches whose postconditions cover all cases. Do not write `invariant(...)` as a call: loop invariants belong in the loop syntax. The obligation templates are a FaithSieve design, not Verus constructs.

Evidence and limits. The paper presents the obligation taxonomy and Algorithm 1 but does not give per-obligation accuracy. If the transition type is misclassified, the generated statement can omit the responsibility that needs checking.

## faithfulness scoring as a gate

What it is and when to use it. Lean checks only the formal proposition it receives. Faithfulness scoring prevents a provable but drifted proposition from becoming evidence. For natural-language obligation `m`, formal statement `m̂`, and local context `C`, the paper defines `Sfaith(m,m̂;C)=Sprem·Sconc·Shol` (Equation 1, p. 6). `Sprem` checks hypotheses, branch assumptions, and witnesses; `Sconc` checks the conclusion; `Shol` checks relation, object/witness, direction, role alignment, and syntax (Section 4.1, p. 6).

How to do it. (1) Extract premise and conclusion semantic slots from the source obligation. (2) Compare each slot with the formal statement, scoring preserved, omitted, weakened, strengthened, or replaced content (Equation 2, p. 6). (3) Produce a structured report containing status, drift categories, confidence, reasons, missing assumptions, overgeneralization examples, and a revision suggestion. (4) If the language-meaning or a critical component score is below threshold, revise `m̂` using the report and repeat compilation and semantic checking. (5) Admit Lean evidence only after this gate.

Inference: For Verus, compare a generated `requires`/`ensures` contract with the natural-language requirement before trusting a successful verification. A mechanically checked but weaker postcondition is evidence of the wrong contract. This semantic comparison is outside Verus and must be recorded as review metadata.

Evidence and limits. Removing the semantic gate lowered GPT-5.4 exact/binary accuracy to 70.86%/86.29% and Qwen3.5-9B to 70.86%/86.00% on the 350-problem Olympiad set (Table 5, p. 9). The paper says: “These results show that a Lean or checker success signal is reliable only when the statement remains semantically aligned with the original obligation; without faithfulness filtering, semantic drift contaminates the final judgment.” (Section 5.2, p. 9) Threshold values and the semantic checker's independent error rate are not reported.

## formal evaluation branches and evidence fusion

What it is and when to use it. The Formal Evaluation Agent returns `passed`, `refuted`, or `inconclusive` for one local obligation, together with evidence strength and an artifact or diagnostic (Section 4.2, p. 6). Pure numeric equations go to a SymPy checker. Other faithful obligations go to Lean. The branch verifies the proposition for likely-correct edges and its negation or a counterexample for likely-wrong edges. Compilation failures, faithfulness failure, or timeout yield `inconclusive` (Algorithm 1, p. 8).

How to do it. (1) Generate a Lean statement or LaTeX equation. (2) Normalize pure numeric claims and run the numeric checker when there are no variables or natural-language explanation. (3) Otherwise compile Lean, repairing syntax, type, or dependency errors with Lean MCP tools. (4) Apply the faithfulness gate and revise if needed. (5) Run Lean on the claim, negation, or counterexample branch. (6) Aggregate review, typed obligations, formal results, faithfulness reports, and diagnostics into `Info(u_e)`, map it to the original coarse step, and select the earliest step with reliable negative evidence. If evidence conflicts or is only a timeout/drift signal, mark the step uncertain.

Inference: The Verus form is a checked Rust function or lemma plus compiler diagnostics. A refuted postcondition or failed invariant is negative evidence; a timeout or unsupported feature is inconclusive. Verus proof code is erased from execution, so product acceptance still requires checking the executable implementation and trusted assumptions.

Evidence and limits. On 350 Olympiad problems, GPT-5.4 FaithSieve scored 81.43% exact and 93.71% binary, versus 72.29% and 88.29% direct judging (Table 5, p. 9). On 200 University problems it scored 84.50% exact and 92.50% binary versus 75.00% and 87.00% (Table 3, p. 7). These denominators are the benchmark sizes; the paper does not report confidence intervals. Lean success does not prove that the formal statement captured the informal requirement, which is why the faithfulness gate is trusted in the pipeline.

## what is proved, trusted, and risky for VL

Lean proves the selected formal obligations under Lean and mathlib, and the reported benchmark labels measure first-error localization. The datasets are expert-verified, but the language model's decomposition, suspicion scores, obligation templates, semantic checker, repair loop, and final evidence fusion remain trusted components of the evaluator (Sections 3–5). The paper does not establish that all local proof transitions are checked, nor that a failed check always identifies the first human-intended error.

Inference: For VL, the direct transfer is a verifier-gated workflow for agent-written Rust: split code changes into local state transitions, generate typed contracts, compare those contracts with requirements, and let Verus produce checkable artifacts only after semantic alignment. The threat is high for specification drift and incomplete local obligations, because a generated Rust proof can pass while proving a weaker contract. The paper's already-completed decomposition, semantic gate, and evidence-fusion design should be reused rather than rediscovered; VL still needs Rust/Verus mappings, trusted-boundary accounting, and product-level tests.

## techniques for the catalog

- proof-state-tree decomposition: split coarse proof steps into faithful state transitions and EdgeUnits before formal checking
- suspicion-tree audit windows: score every local transition cheaply and validate the earliest suspicious edge plus its prefix
- typed obligation generation: map each transition type to a local theorem, separating newly introduced facts from goal reduction
- faithfulness scoring gate: compare formal premises and conclusions with the source claim before accepting Lean evidence
- hybrid formal evaluation: use SymPy for pure numerics and Lean for other faithful obligations, with explicit inconclusive outcomes
- evidence fusion: aggregate local artifacts back to benchmark steps and return the earliest step with reliable negative evidence
Checked 2026-10-15 against paper wang2026faithsieve: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
