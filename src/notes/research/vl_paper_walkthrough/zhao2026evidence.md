# Evidence-Driven LLM Agent for C-to-Synthesizable-C Conversion and Verification
(authored by agents unless marked 🧑)
Tag: `zhao2026evidence`, [paper](https://arxiv.org/abs/2606.28409)

## what is proved and measured

The paper treats conversion from ordinary C/C++ to high-level-synthesis C (HLS-C) as a closed loop controlled by Vitis HLS 2022.1. A candidate must pass compile, C simulation (CSim), synthesis, and C/RTL co-simulation (CoSim); the last stage checks cycle-level behavior. The authors summarize the deliverable as “functionally consistent Verilog, not a snippet that merely compiles” (Introduction, PDF p. 2). On CFull107 (107 designs, gpt-5-mini, repair cap K=3), the system passes all four stages on 94/107 = 87.85%, versus 37/107 = 34.58% for C2HLSC (Table II, PDF p. 8). The mismatch-dense subset has 24 designs; the system passes 17/24 = 70.83% with its localization chain versus 5/24 = 20.83% for C2HLSC (Section V-B, PDF p. 8).

Trusted evidence includes Vitis, the generated testbenches, the original C as a runtime golden reference, the verifier wrapper, human audit of retrieval cards, and the isolation implementation. The paper does not claim convergence: “We do not claim a convergence proof for the LLM-driven loop” (Section IV-E, PDF p. 6). Inference: VeruLaw can borrow the evidence discipline, but these hardware passes are not a Verus proof of a Rust specification; they establish behavior only for the supplied tests and toolchain.

## technique 1: four-stage verifier-driven repair loop

Use this when a generated program must satisfy a toolchain with staged, non-equivalent checks. The state is a candidate plus its earliest failing stage. Stages short-circuit on the first failure; the loop allows at most K=3 repairs on CFull107.

Steps from Sections III-A, III-C and IV-A (PDF pp. 3–4):
1. Build a compact brief from source, public harness, and the must-preserve interface contract.
2. Generate candidate HLS-C.
3. Run compile, CSim, synthesis, then CoSim; record Boolean pass values and the earliest failure.
4. Admit only the current code, failing stage, a truncated first-error excerpt (default 80 lines), a local radius-8 code window, and the contract to the repair prompt.
5. Ask a failure analyst for a structured failure family, named symbols, and repair intent; apply a minimal patch.
6. Repeat until all stages pass or K is exhausted.

The paper formalizes the success indicator as the product of stage indicators and reports mean repair iterations 1.577 with the proposed workflow versus 2.76–2.89 for baselines (Section V-B, PDF p. 7). A single-shot “translate this C to HLS-C” prompt produced 0% four-stage all-pass: only 4–7 of 107 designs compiled and none passed later stages (Section V-C, PDF p. 8).

Verus form. Inference: represent each generated Rust candidate as executable code plus `requires`/`ensures`; run Verus after ordinary compilation and run targeted tests after proof checking. Store the first failing proof obligation and a bounded source window as repair evidence. A Verus proof is stronger than a finite CSim test for the stated contract, but external code, hardware, and test assumptions remain trusted.

## technique 2: strict prompt/artifact isolation

The agent separates prompt-facing evidence from audit-only artifacts. The allowed set has exactly five items: brief, current candidate, failing stage, truncated error excerpt, and local code window; mismatch cases add PMLC layers. Reference HLS, golden labels, manual repairs, baseline private outputs, and the full execution trace remain audit-only. The paper's formal claim is: “The input schemas of the four agents and the RAG retriever contain none of the four leakage channels” (Section IV-E, PDF p. 6).

To apply it, define schemas before experiments, enforce disjoint prompt and audit stores, and log every promoted repair card. The harness may provide interface and stimulus generation, but expected outputs are computed by executing original C rather than supplied labels (Section III-B and V-A).

Inference: for agent-written Verus Rust, put hidden reference implementations, human patches, and full solver traces outside the model context. This makes a repair reproducible and prevents an agent from copying a trusted answer while still allowing the Verus error and relevant source to be shown.

## technique 3: Progressive Mismatch Localization Chain (PMLC)

PMLC addresses CSim/CoSim failures whose raw logs identify a cycle but not the cause. The chain has three shrinking layers (Section IV-C, PDF pp. 4–6):

1. L1 normalizes the log into failed/total outputs, first failing cycle, failed-output list, and mismatch examples.
2. L2 parses the AST and performs a backward slice (depth at most 2) from failed outputs, producing related variables, assignments, control sites, and merged suspect lines.
3. L3 instruments only those sites with probes for assignments, loop iterations, branches, and snapshots; when original C is available, it places co-located probes in C and HLS-C, aligns traces, and reports the first divergence cycle and variables.
4. Package L1–L3, the failing code window, project-log summary, raw excerpt, and must-preserve contract into the repair brief.

The layers satisfy `Lines(L3) ⊆ Lines(L2) ⊆ Lines(L1) ⊆ Lines(y)` (Figure 3, PDF p. 6). On a separate full50 suite of 50 mismatches with known fault locations, L1 and L2 localized 50/50 (100%) and L3 localized the first-divergence cycle in 45/50 (90%) (Section IV-E, PDF p. 6). In the 24-case mismatch subset, the end-to-end workflow reached 17/24 (70.83%) all-pass (Table III, PDF p. 8).

Verus form. Inference: use the failing Verus obligation's named variables as L1, a bounded dependency slice over Rust expressions as L2, and ghost snapshots or executable logging around the slice as L3. Do not write `invariant(...)` as a call; use valid Verus loop invariants and proof steps. Trace alignment is a debugging aid, while the final result must be a Verus proof.

## technique 4: typed, self-evolving MoE evidence RAG

This is repair-only retrieval, not a replacement for verification. Stage 1 hard-routes by failing stage, failure family, and mismatch flag to a family-specific bucket. Stage 2 exact-matches stage, family, and named symbols, optionally links related cases, and returns at most three hints; any mismatch short-circuits to an empty result (Section IV-D, PDF p. 5). Each card records observed failing stage, family, permitted retrieval range, error excerpt, code window, and repair diff. A complete failure-to-repair chain is human-audited before promotion; incomplete cases enter an audit ledger. The data-side loop is run-experiment → extract-evidence → human-audit → enrich-knowledge → improve-retrieval (Section IV-D, PDF p. 5).

Evidence: with gpt-5-mini and K=3, RAG raised all-pass from 78.50% (no RAG) to 87.85% (94/107), +9.35 percentage points, and mismatch-subset performance from 41.67% (10/24) to 70.83% (17/24), +29.17 points (Table III, PDF p. 8). Token cost rose from 17.1K to 18.8K per case; average iterations fell from 1.85 to 1.577 (same table). Inference: a Verus catalog should route by verifier error family and symbol set, promote only cards whose final code re-verifies, and keep failed repairs as searchable negative evidence.

## limitations, contradictions, and product threat

The benchmark is one Vitis version and one four-stage pipeline; control-heavy cases scored only 3/8 = 37.5% (Table IV, PDF p. 8), and overlapping subset counts mean those denominators are not a partition. The authors explicitly constrain PMLC budgets and say its propositions are implementation-level observations, not theorems (Section IV-E). Inference: an agent-written verified-Rust product faces a threat when bounded traces or finite tests are mistaken for exhaustive proof, or when an empty RAG hit is treated as evidence that no repair exists. VL should retain independent Verus checking and contract review; it should not redo one-shot prompting, raw-log replay, or static rule books, because this paper already demonstrates their weakness under the stated protocol.

## techniques for the catalog

- four-stage verifier loop — generate, run staged checks, expose the earliest failure, patch, and repeat under a fixed budget
- prompt/artifact isolation — admit only bounded failure evidence while keeping reference implementations and labels audit-only
- Progressive Mismatch Localization Chain — normalize logs, backward-slice the AST, and align selective dual traces
- typed self-evolving MoE RAG — hard-route exact repair cards by stage, family, and symbols after human audit
Checked 2026-10-15 against paper zhao2026evidence: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
