# Can Large Language Models Learn Formal Logic? A Data-Driven Training and Evaluation Framework
(authored by agents unless marked 🧑)
Tag: `xia2025formal`, [paper](http://arxiv.org/abs/2504.20213v1)

## scope and formal setting

The paper trains language models to emit Hilbert-style proofs for an implication-only fragment of Boolean logic and evaluates outputs with a symbolic checker. Its abstract states: “A trained LLM receives as input a set of assumptions and a goal, and produces as output a proof that formally derives the goal from the assumptions.” (Abstract, p.1) The formal proof system has two axiom schemas and Modus Ponens (MP); a proof is valid when every justification is correct and the goal is claimed at some proof step (§2.2, pp.2–3). Inference: this narrow, mechanically checkable setting separates valid deduction from plausible prose.

## technique 1: randomized backward proof generation

Inference: use this when training data are scarce and a small proof calculus can synthesize valid examples. The paper's process starts from a random goal and constructs a proof tree backward (§3.1, p.3).

1. Choose a random goal formula g and label the tree root with g.
2. At each leaf h, randomly choose one action: stop and treat h as an assumption; choose a random formula f and expand by MP into subgoals f and f→h; or close h with an axiom justification when h is an axiom instance (§3.1, pp.3–4).
3. Continue until a size or depth limit. Treat stopped leaves as assumptions, then traverse children before parents to obtain a linear Hilbert proof. The paper says, “A proof tree generated in this way is turned into a valid proof by viewing all formulas of stopped open nodes (case 2) as assumptions required to prove the goal g.” (§3.1, p.4)
4. In the reported experiments, balance training sets across depths 7, 10, and 13 (§5.1, p.5).

Goal-directed generation avoids searching all earlier formulas for MP matches. The paper notes that naive forward generation is quadratic in the number of deductions and can be reduced with hashing, while backward generation chooses each local expansion directly (§3.1, p.4).

Inference: for a Verus adaptation, represent a proof tree with a Rust enum and write a `spec fn` interpreting each node as a formula. A `proof fn` could establish that each constructor preserves derivability; an executable checker could then validate a serialized proof. Use `requires` for well-formed assumptions and `ensures` for the root goal following from them. The paper does not implement this adaptation. A generator would need to be trusted unless its output were rechecked or its correctness proved.

Evidence: the generated proofs are valid by construction (§3.1, p.4). The authors state: “While using synthetic data might seem limiting, it enables systematic assessment of model performance across proof complexities and controlled testing of generalization capabilities, particularly given the absence of large-scale real-world Hilbert proof datasets.” (§5.1, p.5) Inference: these experiments do not establish performance on real software proofs.

## technique 2: template transformation augmentation

The paper proposes this augmentation to encourage abstraction over variable names and formula syntax. It views a Hilbert proof over variables X as a schema and uniformly substitutes each variable with a Boolean formula over Y. It specifies three steps (§3.2, p.4): (1) choose a random substitution σ mapping variables in X to formulas over a randomly chosen variable set Y; (2) replace every proof formula f with σ(f); and (3) apply σ to assumptions and the goal. The justification sequence is unchanged, so validity is preserved by induction on proof length.

The paper's transitivity example replaces q with y1, p with y1→y2, and r with y2→y1; the transformed goal is (y1→y2)→(y2→y1), with correspondingly transformed assumptions (§3.2, p.4). During fine-tuning, Template Transformation is applied with probability αTT=0.7 during batch preprocessing. Each variable is replaced with a randomly generated expression containing up to four variables and maximum recursion depth four (§5.1, p.5). The authors explain the purpose: “The intuition is that, during training, supplying similar instances obtained through template transformation forces the LLM to focus on the abstract proof structure rather than on concrete detail such as variable names.” (§3.2, p.4)

Inference: for a Verus adaptation, define substitution over a formal representation of formulas and prove that applying it to a derivation preserves validity under the substituted assumptions. Keep the substitution function pure (`spec fn`) and prove a lemma for each proof constructor. Testing repairs across renamed APIs would be a separate application requiring its own validation.

Evidence: Table 1 reports the 8B model with transformation at 0.98, 0.66, and 0.32 accuracy on depths 7, 10, and 13, respectively; these are fractions of test problems whose complete proof passed the validator (§5.1, p.5; Table 1, p.6). Without transformation the same model scores 0.78, 0.40, and 0.28. The 1B model with transformation scores 0.54, 0.30, and 0.04; without it, 0.52, 0.30, and 0.02. Inference: these in-distribution results show larger augmentation gains for the 8B model at depths 7 and 10 than at depth 13.

## technique 3: formal validation of generated proofs

The paper uses a formal validator as the evaluation acceptance criterion. Its validator accepts only proofs that are syntactically well formed and pass checks for valid MP applications, correct assumption use, and proper axiom invocation (§5.1, p.5). Accuracy is the ratio of accepted proofs to total test problems. Training convergence uses exact-match accuracy and early stopping with patience five epochs (§5.1, p.5), but exact match is not the final correctness criterion.

Apply: generate a candidate proof; parse it; check every justification and that the goal is claimed; count it correct only if all checks pass (§2.2, p.3; §5.1, p.5). The paper generates separate training and evaluation proof trees, extracts validation and testing sets from the evaluation trees, and ensures unique formulas across partitions (§5.1, p.5). It uses 375 validation samples (depths 7/10/13, 125 each), 450 depth-generalization test samples (nine depths from 4 to 28, 50 each), and 400 width-generalization test samples (100 at each width) (§5.1, p.5).

Inference: for a Verus adaptation, run `verus` on generated Rust and count only candidates that verify under the intended contracts. Add executable tests for behavior that the contract does not capture. A Verus success is evidence for the written specification, not proof that the specification is complete.

## technique 4: structured generalization audits

The paper proposes four tests of reasoning ability. First, semantic variation asks whether the model can construct a proof after template substitution (§4.1, pp.4–5). Second, depth generalization tests nine depths from 4 to 28; shallower test proofs are obtained by repeatedly replacing the first MP application near the leaves of a deeper proof with its deduced statement as a new assumption (§5.3.1, p.7). Third, width generalization keeps depth seven while increasing nested variable substitutions across four widths, 0–3 (§5.3.2 and Fig.3 caption, p.7). Fourth, diversity asks whether multiple valid proofs can be produced for one query, using semantic checking rather than token equality (§4.4, p.5). The paper proposes the diversity metric but does not report a separate diversity score.

Inference: for a Verus adaptation, test renamed data types, larger loop bounds, nested invariants, and alternative valid proof scripts. Require all variants to verify and measure the fraction accepted, proof length, and repair cost. These adaptations are not experiments reported in this paper.

## measured limits and trust

The 8B model trained on 9,000 examples with Template Transformation reaches 98% on depth 7 but falls to 32% at depth 13. GPT-4o few-shot results, averaged across 1-, 3-, 6-, and 9-shot settings, are 0.67±0.08, 0.48±0.08, and 0.26±0.04 at depths 7, 10, and 13 (Table 1, p.6). For proof width, increasing αTT helps until 0.7, after which accuracy drops sharply; depth sensitivity varies, with shallower proofs more stable (§5.3.4, pp.7–8). The authors limit their claim: “A Boolean-reasoning LLM, as introduced in this paper, is not intended as a solution to the general reasoning question.” (§7, p.8) Inference: acceptance depends on a correct parser and symbolic checker. It establishes derivability under the implemented Hilbert rules and supplied assumptions, not that those assumptions express a real requirement. The synthetic task distribution also limits conclusions about software verification.

## techniques for the catalog

- randomized backward proof generation — build valid proof trees by random local backward expansion, then linearize them
- template transformation — uniformly substitute variables in a proof, assumptions, and goal to vary formulas while preserving proof structure
- validator-first scoring — accept outputs only after syntax, rule, assumption, and axiom checks
- generalization audits — test semantic substitutions, deeper proofs, wider formulas, and proof diversity on disjoint data
