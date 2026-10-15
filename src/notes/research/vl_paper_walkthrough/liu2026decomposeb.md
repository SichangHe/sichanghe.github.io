# Decompose, Structure, and Repair: A Neuro-Symbolic Framework for Autoformalization via Operator Trees
(authored by agents unless marked 🧑)
Tag: `liu2026decomposeb`, [paper](https://arxiv.org/abs/2604.19000)

## scope and result

The paper presents Decompose, Structure, and Repair (DSR), a Lean 4 statement-autoformalization pipeline. Its central claim is that a natural-language theorem should be split into components, translated together with an operator tree (OPT), assembled from the tree, and repaired at the smallest tree scope that explains a compiler error. The authors state: “DSR decomposes statements into logical components and maps them to structured operator trees, leveraging this topological blueprint to precisely localize and repair errors via sub-tree refinement.” (Abstract, p. 1.)

The paper introduces PRIME, 156 manually formalized undergraduate and graduate theorems (Abstract, p. 1; §4.1, p. 6), and evaluates syntax (Lean 4 compilation) and semantic consistency (LeanScorer, threshold 0.6). With four inference calls, DSR's Consistency Check (CC) is 84.00% on ProverBench, 79.51% on ProofNet, and 67.95% on PRIME (Table 2, p. 7; denominators are the respective benchmark problem sets, but the table does not print their sizes). The same table reports DSR Syntax Check (SC) of 95.38%, 87.33%, and 80.13%. These are pass rates, not proof-completion rates for the informal theorem: compilation and LeanScorer are the reported checks.

## technique: semantic canonicalization and structural role alignment

When to use it: use this decomposition before translating an informal statement whose prose has implicit types, background assumptions, or rhetorical material. The paper says, “NL statements are typically optimized for human readability, relying on implicit context and flexible phrasing that might hinder autoformalization.” (§3.1, p. 3.)

How to do it:

1. Apply Semantic Canonicalization in one pass. Remove supplementary text that is logically redundant in a formal setting; recover omitted variable types and background assumptions. The paper defines the purpose as producing “a sequence of refined NL components” (§3.1, p. 3) and says canonicalization “yields a canonicalized text representation that serves as a clean, Lean-aligned input for the subsequent alignment step.” (§3.1, p. 3.)
2. Apply Structural Role Alignment to the canonicalized text. Segment it into components and label each `CONDITION` or `CONCLUSION`. The labels become a structural prior: conditions become variables or hypothesis binders and the conclusion becomes the proof goal. The paper states: “This categorization aligns the definition of NL components with the standard logical structure of mathematical propositions.” (§3.1, p. 3.)
3. Retain the resulting components as separate inputs to translation. Figure 2's example turns the perfect-map theorem into six condition components (`X,Y` spaces, `p:X→Y`, closed, continuous, surjective, compact fibres, compact `Y`) and the conclusion `X is compact` (Figure 2, p. 3).

Inference: in Verus, this corresponds to turning prose requirements into explicit `requires` assumptions and an `ensures` postcondition before writing executable Rust. A condition that describes a persistent loop fact would become a loop `invariant`; the paper does not discuss Rust or Verus, so this mapping is an inference. The decomposition does not prove that recovered context is the intended context; the authors identify wrong partitioning as an error-propagation bottleneck (Appendix A, p. 12).

## technique: joint formal component and operator-tree generation

When to use it: use an OPT when linear generation can lose nesting, precedence, scopes, or the distinction between a hypothesis and the goal. The paper defines an OPT as “a labeled, ordered tree constructed by querying the Lean Language Server for the nested scopes of elements: operators function as parent nodes, while their arguments serve as ordered children.” (§3.2.2, p. 4.)

How to do it:

1. For every NL component, generate both a linear formal-language (FL) fragment and its FL OPT as one output sequence. The paper says, “the formalizer is designed to generate the FL component and its FL OPT as a joint output sequence.” (§3.2.1, p. 4.)
2. Build the tree from Lean Language Server nested scopes; keep operator precedence and logical scoping as parent-child structure. DSR preserves parentheses, unlike ASSESS, “to enforce strict token-level consistency between the linear code and the hierarchical tree.” (§3.2.2, p. 4.)
3. Use the tree as a semantic anchor and repair address map. The authors call it “a topological blueprint of the FL component, partitioning linear code into addressable logical sub-structures.” (§3.2.1, p. 4.)

Inference: in Verus, a tree can be represented by the syntax of nested expressions and proof blocks, while the corresponding proof obligation is checked by Verus. A practical analogue is to preserve explicit subexpressions or helper proof functions so an error can be attached to one contract clause or lemma. Verus has no paper-defined OPT interface; this is an inference and should not be read as an existing Verus feature.

## technique: structured corpus, complexity stratification, and curriculum with replay

When to use it: use this training recipe when a model must learn both Lean syntax and hierarchical structure, especially when direct joint learning causes instability.

How to do it:

1. Start with 120,627 FL statements from NuminaMath-LEAN and ATLAS-Synthetic. Parse them with the ASSESS tree-construction toolkit, then use Qwen3-Max to back-translate fragments into NL components. The resulting corpus has 283,958 aligned triples (NL component, FL component, FL OPT) (§3.2.3, p. 4).
2. Compute OPT tree depth, width, and node count. Rank by these metrics and discard the top 1% extreme-complexity samples. The remaining 281,209 samples are split into 143,325 simple, 109,829 moderate, and 28,055 complex examples (§3.2.3, p. 4). These counts sum to 281,209.
3. Fine-tune Qwen2.5-7B-Instruct with LoRA in four phases. Phase 1 trains atomic FL components (100%); Phase 2 uses simple data (90%) plus atomic replay (10%); Phase 3 uses moderate (70%), simple replay (30%); Phase 4 uses complex (50%), moderate replay (30%), and simple replay (20%). Each phase has one epoch and batch size 128, except phase 4's 64; learning rates are 2e-4, 1e-4, 5e-5, and 1e-5 (Table 1, p. 5).
4. Keep sampled earlier tiers in every later phase to prevent catastrophic forgetting. The paper says replay “mixes the full dataset of the current complexity tier with sampled data from previous tiers.” (§3.2.3, p. 4.)

Evidence: Table 3 compares a linear baseline, baseline + OPT supervision, and + curriculum. On PRIME Pass@1 SC, the numbers are 22.44%, 19.87%, and 23.08%; on PRIME Pass@1 CC they are 18.59%, 16.03%, and 20.51% (Table 3, p. 8). Thus OPT alone regressed these metrics while curriculum recovered and exceeded baseline. The authors caution that “simultaneously learning complex mathematical logic and hierarchical topology is non-trivial for the model.” (§4.4.1, p. 8.)

Inference: for a Verus code model, stratify training examples by contract and proof-tree complexity, then replay simpler contracts while introducing quantified invariants. This is a training recommendation, not an evaluated Verus result.

## technique: structure-first assembly

When to use it: use structure-first assembly after generation, before compilation, to prevent malformed delimiters and scopes.

How to do it:

1. Recursively concatenate the OPT's leaf nodes to reconstruct the FL statement. The paper says, “Adopting a structure-first strategy, we prioritize the FL OPT by recursively concatenating its leaf nodes to form the final code.” (§3.3, p. 5.)
2. Treat FL components as training stabilizers and a fallback. If the OPT is structurally invalid (for example, node-count mismatch), discard it and use the FL component; the authors say this ensures “a valid output string.” (§3.3, p. 5.)
3. Submit the assembled statement to Lean for verification.

Inference: in Verus, generate Rust expression structure and contracts from an explicit syntax representation, then invoke Verus. A fallback could use the linear candidate only after checking its syntax; Verus-specific assembly behavior is not studied in this paper.

## technique: compiler-localized, tree-guided repair

When to use it: use this repair loop after compilation fails and the generated OPT is available. It is designed to preserve already-correct logic while changing the smallest failing region.

How to do it:

1. Submit the assembled FL statement to Lean. Map the compiler's row and column error location to the corresponding tree node (§3.3, p. 5).
2. Start bottom-up at the immediate parent of that node. Extract the minimal subtree and ask the repair model to fix it. If verification still fails, move to the grandparent and repeat; continue until the component boundary. This is the paper's “Subcomponent-Level Repair” (§3.3, p. 5).
3. If the whole component fails, repair the FL component (“Component-Level Repair”) (§3.3, p. 6).
4. If that fails, repair the entire FL statement (“Statement-Level Repair”) (§3.3, p. 6).
5. Limit each attempt at each granularity to one inference pass, and always run statement-level repair as a semantic check after local success (§3.3, p. 6).

The paper's worked trajectory starts with an undefined `logb`, repairs it to `Real.logb`, then adds `(4:N)` because `Finset.Icc` needs a discrete type; compilation and consistency then pass (Figure 4, p. 5). This example demonstrates error localization and escalating scope, but the displayed final theorem still contains `by sorry`, so it is a formalized statement check rather than a completed proof.

Evidence: DSR versus DSR-Global (global statement repair) in Table 2 uses four calls on each benchmark. DSR has CC 84.00/79.51/67.95% (ProverBench/ProofNet/PRIME), while DSR-Global has 82.77/76.01/66.03%; SC is 95.38/87.33/80.13% for DSR and 96.00/89.76/83.97% for DSR-Global (Table 2, p. 7). Global repair can compile more often, while local repair gives higher semantic consistency. The authors state that global repair is “an effective brute-force strategy for finding any compilable path” but that this “comes at the cost of semantic integrity.” (§4.4.2, p. 8.)

Inference: in Verus, use compiler diagnostics to select a contract clause, invariant, or proof lemma and regenerate only that unit; run a whole-function verification pass afterward. Verus diagnostics and proof obligations differ from Lean, so the exact row/column-to-subtree algorithm does not carry over without an adapter.

## evidence, assumptions, and limits

The experimental setup uses Lean 4 toolchain v4.15.0, LeanScorer with DeepSeek-V3.2 and threshold 0.6, and a global budget of four calls (§4.2, p. 6). The authors report average DSR calls of 2.9 on ProverBench, 3.5 on ProofNet, and 3.9 on PRIME (§4.2, p. 6). PRIME's 156 theorem statements come from undergraduate and graduate textbooks and were manually formalized by Lean experts (§4.1, p. 6). The paper reports LeanScorer agreement with human labels on PRIME: kappa 0.766 versus 0.603 for a prompt LLM judge, with denominators the full 156-example PRIME set (Table 4, p. 13). LeanScorer's DSR pass rate is 67.95%, versus 71.15% human and 76.92% LLM judge on PRIME (Table 5, p. 13); these are evaluator pass rates, not theorem-proving success.

The main assumptions are explicit decomposition correctness, reliable OPT construction, and meaningful compiler localization. Appendix A says success is “heavily predicated on the initial semantic decomposition” and that a bad partition makes the operator tree flawed. It also reports hallucinated Mathlib identifiers as a primary failure cause and proposes retrieval augmentation during repair (Appendix A, p. 12). The paper does not measure repair cost beyond call budgets, does not prove that LeanScorer is sound, and does not report complete proof construction for the theorem statements.

Inference: for VeruLaw, the useful transferable pattern is a staged generate–compile–localize–repair loop, while the product threat is that a compiling repaired specification can preserve the wrong intent. DSR itself warns of “automation bias, where users might overly trust a successfully compiled statement without verifying if the model preserved their original semantic intent.” (Impact Statement, p. 9.) In a Verus product, this threat applies to `requires` and `ensures` that are too weak or encode a mistaken requirement; Verus verification establishes the written contract, not the user's unwritten intent.

Inference: VL should not redo the already-demonstrated idea of hierarchical local repair for Lean statement syntax. It can still study whether the same repair boundaries work for Rust ownership, loop invariants, and external-body assumptions, which this paper does not evaluate.

## techniques for the catalog

- semantic canonicalization and role alignment: remove redundant prose, recover implicit context, and label conditions versus conclusion before formalization
- operator-tree supervision: jointly generate formal fragments and labeled ordered trees to preserve nesting and expose repair locations
- complexity curriculum with replay: stratify tree depth, width, and node count and mix earlier tiers into later LoRA phases
- structure-first assembly: reconstruct code from tree leaves, falling back to linear fragments when the tree is malformed
- tree-guided repair: map compiler coordinates to a node, repair bottom-up through subcomponent, component, and statement scopes, then run a semantic check
Checked 2026-10-15 against paper liu2026decomposeb: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
