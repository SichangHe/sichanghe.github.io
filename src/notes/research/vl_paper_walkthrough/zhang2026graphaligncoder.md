# GraphAlignCoder: Aligning Program and Proof Graphs for Code Generation
(authored by agents unless marked 🧑)
Tag: `zhang2026graphaligncoder`, [paper](https://doi.org/10.48550/arxiv.2608.11394)

## what the paper establishes
GraphAlignCoder trains a code model with two aligned structures: a graph of executable regions and a graph of formally checked proof transitions. It targets the gap between code that looks plausible and code that preserves hidden semantic obligations. The abstract states, “GraphAlignCoder constructs an implementation graph that captures control and dependence among program regions.” In parallel, a constrained Lean pipeline emits proof traces and a proof-flow graph; the model learns code, region-level correctness roles, and obligations, then is trained again on ordinary code-only outputs. The abstract summarizes the sequence as: “The model first learns executable code together with graph-derived descriptions of why individual program regions are correct, and then consolidates this knowledge into code generation.” Deployment emits ordinary Python from the task alone.

The evaluation uses Qwen/Qwen3.5-4B-Base with LoRA rank 16, two NVIDIA RTX A6000 GPUs, and greedy Pass@1. LiveCodeBench v6 has 175 held-out tasks; BigCodeBench Hard has 148 and Full has 1,140 (Table 1, p.7). GraphAlignCoder solves 50/175 (0.286), 23/148 (0.155), and 363/1140 (0.318). CodeRL solves 38/175, 16/148, and 359/1140. The paper's abstract reports relative gains of 31.6% and 43.8% over CodeRL on the first two benchmarks. Inference: these are execution-test results for Python generation, not proofs that generated Rust satisfies a Verus contract.

## technique: build an implementation graph
What it is: deterministically parse each correct reference program with Python's AST and represent function-entry and statement nodes, region groups, and edges for control flow, calls, and dominance. The formal definition is `G^I_i = G^I(y_i) = (V^I_i, E^I_i, R_i)` (Equation 1, Methodology, p.4). Regions include guards, loops, calls, recursive sites, updates, and returns. This attaches a correctness description to a concrete program boundary instead of to an undifferentiated token sequence.

When to use it: use this representation when correctness depends on preserving a sequence of state updates, branch guards, loop behavior, and return construction. The motivating HTML-table task requires connection, table-existence, row-existence, header, data-row, and DataFrame-return regions. The base model assumed a `tbody`; CodeRL mismatched header and row counts; GraphAlignCoder preserved the obligation order and succeeded (Motivating Example, pp.2–3).

How to apply it:
1. Start with a trusted executable reference `y_i` and its task input `x_i` (Methodology, p.4).
2. Parse the AST and create nodes for function entry and statements.
3. Group nodes into semantic regions (`R_i`) such as guards, loops, calls, updates, and returns.
4. Add control-flow, call, and dominance edges (`E^I_i`).
5. Use the region inventory when generating or checking obligations.

Verus form: Inference: derive an analogous graph from Rust/Verus functions using basic blocks, loop headers, calls, and return sites. Attach each region to `requires`, `ensures`, `assert`, and loop invariants. A `View` can name the logical state before and after a region; `old(...)` relates post-state facts to pre-state values. The paper's Python AST and graph equations do not themselves model Rust ownership, aliasing, or Verus proof modes.

Evidence and limits: Graph construction is deterministic for the reference code, but the paper does not report graph extraction errors or prove that its region vocabulary is complete. Inference: a graph can expose intended structure only to the extent that the reference implementation and region grouping encode it correctly.

## technique: generate a constrained Lean proof-flow graph
What it is: two GPT-5.2 teacher passes turn a task, reference code, implementation-region inventory, and fixed theorem/tactic library into Lean proof hints. The first identifies boundary, invariant, progress, and return requirements; the second maps them to controlled theorem shapes and tactic skeletons (Equations 2–4, pp.4–5). Lean executes the skeleton as goal-state transitions. Nodes are unresolved-goal lists; edges are tactic-labeled transformations such as `cases`, `induction`, `rw`, `have`, `exact`, and `simpa` (Equation 5 and surrounding text, p.5). The methodology reports that Lean's kernel checks each successful proof term. The paper says, “Rather than using the proof term as an opaque certificate, we extract the goal-state trajectory that produced it.” (Methodology, p.5).

When to use it: use proof-flow extraction when the formal proof exposes semantic structure that execution feedback cannot provide: branch obligations, induction steps, invariant preservation, or witness construction.

How to apply it:
1. Give teacher pass one `x_i`, `y_i`, and `R_i`; request boundary, invariant, progress, and return requirements (Equation 2).
2. Give pass two the requirements and fixed library `T`; produce hints with theorem shape, tactic plan, proof roles, and lemma family.
3. Select a declared theorem schema and tactic skeleton (`Select_T`).
4. Instantiate types, variables, hypotheses, and conclusions (`Instantiate`), inserting the tactic block after `:= by`.
5. Execute Lean; retain only successful traces whose unresolved-goal list ends empty.
6. Extract tactic nodes and edges, recording case analysis, induction, rewriting, invariant propagation, and witness construction (Equation 6).

Verus form: Inference: replace Lean goals with Verus proof obligations and use `proof fn`, `assert`, `assert ... by`, `requires`, `ensures`, `old`, and `#[verifier::loop_invariant]`-style loop facts where supported by the project notes. Keep executable Rust separate from erased proof code. Verus does not use Lean tactic scripts or Lean kernel traces, so the paper's graph extraction must be reimplemented over Verus diagnostics or proof blocks. Inference: `spec fn` predicates and `View` methods can supply named invariant and postcondition nodes.

Evidence and limits: the paper reports that Lean's kernel independently checks successful traces (Methodology, p.5), but it does not quantify the number of generated hints, failed traces, or teacher errors. GPT-5.2 generates hints, yet the controlled template/library and Lean checker determine which traces enter training. Inference: the checker protects against invalid Lean proofs, while task specification, theorem templates, and the Python-to-Lean correspondence remain trusted.

## technique: align graphs into region-grounded supervision
What it is: project implementation and proof graphs into role sets and retain their overlap as alignment evidence. The paper defines `C^I_i = π_I Roles(G^I_i)`, `C^F_i = π_F Roles(G^F_i)`, and `A_i = C^I_i ∩ C^F_i` (Equations 8–10, p.5). It filters roles and generates region-level conditions, for example that a loop update preserves an invariant or a return establishes an output relation (Equations 11–13). The serialized scaffold yields three targets: executable code, concept roles, and region-grounded obligations.

When to use it: use this when a proof role has a corresponding executable region and should supervise how the model organizes that region. The overlap filter avoids treating every free-form proof statement as relevant to code.

How to apply it:
1. Extract role sets from both graphs.
2. Intersect the sets to keep shared semantic support.
3. Filter implementation roles with the overlap, graph, and reference code.
4. Generate conditions for each retained region.
5. Serialize role and obligation targets consistently.
6. Train one model on code `x_i → y_i`, concept `q^C_i → c_i`, and obligation `q^O_i → o_i` examples (Equations 14–18).

Verus form: Inference: use shared role names such as `preserves type invariant`, `establishes postcondition`, and `maintains sequence length` to connect Rust basic blocks with Verus predicates. A `View` condition can be the logical relation attached to a return; a loop invariant can be attached to the loop region. The graph is training metadata, not a Verus proof and cannot substitute for verifier checking.

Evidence: the full injection objective is `L_inject = L_code + L_concept + L_obligation` (Equation 19, p.6). Structural injection raises LiveCodeBench v6 from 33/175 (0.189) for code-only SFT to 44/175 (0.251), and BigCodeBench Hard from 15/148 (0.101) to 17/148 (0.115) (Table 4, p.7). It lowers BigCodeBench Full from 354/1140 to 339/1140 before consolidation, showing a distribution shift. Inference: alignment helps structure-sensitive tasks but can temporarily harm broad code behavior.

## technique: consolidate into ordinary code generation
What it is: after injection, continue training the same checkpoint on 514 code-only examples for 65 optimization steps. The auxiliary outputs disappear, while their parameter updates remain. Equation 20 defines the code loss; Equation 21 switches from injection to consolidation. At inference, the final checkpoint receives only ordinary task input and emits one Python solution.

How to apply it:
1. Initialize consolidation from the injection checkpoint, not from the base model.
2. Train on task-to-reference-code pairs with the ordinary code loss.
3. Remove concept and obligation channels from the deployment prompt.
4. Evaluate one greedy sample under the benchmark's official execution suite.

Evidence: consolidation-only, initialized from the base model, reaches 49/175 on LiveCodeBench v6, 352/1140 on BigCodeBench Full, and 19/148 on Hard; the complete two-stage model reaches 50/175, 363/1140, and 23/148 (Table 4, p.7). The ablation therefore attributes complementary value to injection and consolidation. Inference: the method's deployment contract is ordinary code generation, so it does not force a generated program to carry a machine-checkable proof at runtime.

Verus form: Inference: a VL pipeline could pretrain on Verus proof-role annotations and then fine-tune on Rust code plus contracts, but final generation should still be passed to Verus. Use the generated roles as hints for `requires`, `ensures`, `spec fn`, `proof fn`, `View`, and loop invariants; do not trust the model's role labels as evidence.

## what is proved, measured, and trusted
The paper measures solved-task counts and Pass@1 under fixed benchmark denominators, plus ablations and difficulty/category buckets. It does not prove that graph alignment recovers all correctness structure, that GPT-generated hints express the whole task specification, or that a generated program is correct beyond the benchmark tests. The formal component is Lean-kernel checking of generated traces; Python correctness is judged by execution suites. Inference: for VL, Verus should be the final acceptance gate, with independently reviewed specifications and tests. Trusted components include the task statement, reference solutions used for graph extraction, GPT-5.2 annotation, theorem-template library, Lean/Verus kernels and solvers, training code, benchmark tests, and the semantic correspondence from proof roles to executable regions.

## threat to VL and work already done
Inference: the residual risk to VL-generated verified Rust is material but bounded by Verus acceptance. The paper offers a useful way to teach an agent where invariants and postconditions belong, which can reduce missing-structure errors; however, it targets Python and Lean, and its deployed model emits no proof artifact. A malicious or mistaken model can produce a plausible role description while Verus rejects, or accepts, a weak specification. VL should not redo generic graph alignment, AST graph extraction, or Lean proof-flow supervision. A distinct contribution would be a measured Verus adaptation: compare code-only generation, Verus-role injection, and proof-carrying generation on unseen Rust modules, reporting verifier pass rate, repair effort, and specification defects.

## techniques for the catalog
- implementation graph — represent control, call, dominance, and region structure from a parsed reference program
- constrained proof-flow graph — turn checked Lean goal-state transitions into tactic-labeled correctness structure
- graph-role alignment — retain implementation roles supported by overlapping proof roles and generate region obligations
- multi-target injection — train one model on code, concept, and obligation targets with a summed loss
- verification-to-code consolidation — remove auxiliary outputs through a second code-only training phase before deployment
Checked 2026-10-15 against paper zhang2026graphaligncoder: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
