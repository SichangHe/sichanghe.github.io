# Can Large Language Models Learn Formal Logic? A Data-Driven Training and Evaluation Framework
(authored by agents unless marked 🧑)
Tag: `xia2025formal`, [paper](http://arxiv.org/abs/2504.20213v1)

## scope and formal setting

The paper trains language models to emit Hilbert-style proofs for an implication-only fragment of Boolean logic and validates every output with a symbolic checker. Its abstract states: “A trained LLM receives as input a set of assumptions and a goal, and outputs a proof that formally derives the goal from the assumptions.” (Abstract, p.1) The formal proof system has two axiom schemas and Modus Ponens (MP); a proof is a sequence whose justifications are checked and whose goal appears as a derived formula (§2.2, pp.2–3). This is a narrow but mechanically checkable setting, useful for separating valid deduction from plausible prose.

## technique 1: randomized backward proof generation

Use this when training data are scarce but a small proof calculus can synthesize unlimited valid examples. The paper's process starts from a random goal and constructs a proof tree backward (§3.1, p.3).

1. Choose a random goal formula g and label the tree root with g.
2. At each leaf h, randomly choose one action: stop and treat h as an assumption; choose a random formula f and expand by MP into subgoals f and f→h; or close h with an axiom justification when h is an axiom instance (§3.1, p.3).
3. Continue until a size or depth limit. Treat stopped leaves as assumptions, then traverse children before parents to obtain a linear Hilbert proof. The paper says, “A proof tree generated in this way is turned into a valid proof by viewing all formulas of stopped open nodes (case 2) as assumptions required to prove the goal g.” (§3.1, p.4)
4. Generate balanced training sets at depths 7, 10, and 13. In the reported setup each goal expression has at most four variables and recursion depth four (§4, p.5).

Goal-directed generation avoids searching all earlier formulas for MP matches. The paper notes that naive forward generation is quadratic in the number of deductions and can be reduced with hashing, while backward generation chooses each local expansion directly (§3.1, p.4).

Verus form (inference): represent a proof tree with a Rust enum and write a `spec fn` interpreting each node as a formula. A `proof fn` can establish that each constructor preserves derivability; an executable checker can then validate a serialized proof. Use `requires` for well-formed assumptions and `ensures` for “the root goal follows.” This is an inference because the paper's checker is not Verus. The random generator remains trusted unless its generated proof is rechecked.

Evidence: the generated proofs are valid by construction, but the paper does not claim that random trees model real software proofs. Synthetic data enable controlled depth and width experiments while sacrificing domain realism (§4, p.5).

## technique 2: template transformation augmentation

Use this to force abstraction over variable names and formula syntax. The paper views a Hilbert proof over variables X as a schema and uniformly substitutes each variable with a Boolean formula over Y. It specifies three steps (§3.2, p.4): (1) choose a random substitution σ mapping variables in X to formulas over Y; (2) replace every proof formula f with σ(f); and (3) apply σ to assumptions and the goal. The justification sequence is unchanged, so validity is preserved by induction on proof length.

The paper's transitivity example replaces q with y1, p with y1→y2, and r with y2→y1; the transformed goal is (y1→y2)→(y2→y1), with correspondingly transformed assumptions (§3.2, p.4). During fine-tuning, Template Transformation is applied with probability αTT=0.7 to each training batch (§5.1, p.5). The authors explain the purpose: “supplying similar instances obtained through template transformation forces the LLM to focus on the abstract proof structure rather than on concrete detail such as variable names.” (§3.2, p.4)

Verus form (inference): instantiate a generic lemma over abstract type or formula parameters and prove that substitution preserves the semantic interpretation. Keep the substitution function pure (`spec fn`) and prove a lemma for each proof constructor. This can test whether a repair generalizes across renamed APIs, but it does not make a Rust proof generic automatically.

Evidence: Table 1 reports the 8B model with transformation at 0.98, 0.66, and 0.32 accuracy on depths 7, 10, and 13, respectively; these are fractions of test problems whose complete proof passed the validator (125 samples per in-distribution depth, §4, p.5; Table 1, p.6). Without transformation the same model scores 0.78, 0.40, and 0.28. The 1B model with transformation scores 0.54, 0.30, and 0.04. The gain is therefore strongest for the 8B model and shorter depths.

## technique 3: validator-first training and evaluation

Use a formal validator as the acceptance criterion instead of string matching. The paper's validator accepts only proofs that are syntactically well formed and pass checks for valid MP applications, correct assumption use, and proper axiom invocation (§5.1, p.5). Accuracy is the ratio of accepted proofs to total test problems. Training convergence additionally uses exact-match accuracy and early stopping with patience five epochs (§5.1, p.5), but exact match is not the final correctness criterion.

Apply: generate a candidate proof; parse it; check every justification and the claimed goal; count it correct only if all checks pass. Keep validation and testing proof trees separate and ensure formulas are unique across partitions to prevent leakage (§4, p.5). The paper uses 375 validation samples (depths 7/10/13, 125 each), 450 depth-generalization samples (depths 4–28, 50 each), and 400 width-generalization samples (100 at each width) (§4, p.5).

Verus form (inference): run `verus` on generated Rust and count only candidates that verify under the intended contracts. Add executable tests for behavior that the contract does not capture. A Verus success is evidence for the written specification, not proof that the specification is complete.

## technique 4: structured generalization audits

Use four audits to detect memorization. First, semantic variation asks whether a proof survives template substitution (§4.1, p.5). Second, depth generalization tests nine depths from 4 to 28; deeper samples are made by replacing the first MP application near leaves with its deduced statement as a new assumption (§5.3.1, p.7). Third, width generalization keeps depth seven while increasing nested implications across four widths (§5.3.2, p.7). Fourth, diversity measures whether multiple valid proofs can be produced for one query using semantic checking rather than token equality (§4.4, p.5).

Verus form (inference): apply the same audits to renamed data types, larger loop bounds, nested invariants, and alternative valid proof scripts. Require all variants to verify and measure the fraction accepted, proof length, and repair cost.

## measured limits and trust

The 8B model trained on 9,000 examples reaches 98% on depth 7 but falls to 32% at depth 13; GPT-4o few-shot averages 67%±8%, 48%±8%, and 26%±4% at those depths (Table 1, p.6). Increasing αTT helps until 0.7 and then accuracy drops sharply (§5.3.4, p.8). The study therefore measures a controlled implication calculus, not general theorem proving or software verification. Trusted elements are the proof generator, parser, symbolic checker, model fine-tuning code, and synthetic task distribution. The validator proves acceptance under the Hilbert rules; it does not prove that the chosen assumptions express a real requirement.

Inference: threat to VeruLaw is moderate for training-data design and evaluation. Synthetic proof generation and semantics-preserving augmentation could supply varied repair examples, while validator-first scoring can prevent plausible but invalid Verus snippets from entering data. The narrow logic, finite depths, and model-dependent degradation mean VL should not claim that these results establish reliable Rust verification. Existing work on formal proof generation already uses checker feedback; VL should reuse the data and evaluation discipline rather than reproduce a Boolean-only benchmark.

## techniques for the catalog

- randomized backward proof generation — build valid proof trees by random local backward expansion, then linearize them
- template transformation — uniformly substitute variables in a proof, assumptions, and goal to create structurally varied valid examples
- validator-first scoring — accept outputs only after syntax, rule, assumption, and axiom checks
- generalization audits — test semantic substitutions, deeper proofs, wider formulas, and proof diversity on disjoint data
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
