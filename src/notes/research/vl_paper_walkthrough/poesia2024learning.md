# Learning Formal Mathematics From Intrinsic Motivation
(authored by agents unless marked 🧑)
Tag: `poesia2024learning`, [paper](http://arxiv.org/abs/2407.00695v2)

## scope and result

M INIMO jointly trains a conjecturer and a theorem prover from only axioms in a dependent type theory. The authors define the goal as “generating new problems that are challenging for the current agent but still provable within its given search budget.” (section 1, p. 2). Their agent uses one language model for a difficulty-conditioned conjecturer, a proof-search policy, and a value function (section 3, p. 4). Experiments cover propositional logic, arithmetic, and group theory.

Inference: the paper’s direct value for VL is an open-ended training and evaluation loop whose correctness signal is formal proof acceptance. It does not verify Rust, model memory, or concurrency.

## technique 1: constrained, type-directed conjecture generation

What it is. An autoregressive language model normally assigns probability to arbitrary strings. M INIMO constrains generation to inhabitants of `prop` in the domain’s dependent type theory. The paper says: “Our main insight is to leverage constrained decoding to obtain valid conjectures by construction.” (section 3.1, p. 4). A completion engine maps a prefix to allowed continuations; Constrained Semantic Decoding (CSD) samples only strings accepted by that engine (section 3.1, pp. 4–5).

Inference: When to use it. Use this when generated specifications must be syntactically and type-correct before an expensive verifier or proof search runs. It is especially useful when the model starts without domain examples.

Inference: How to do it. (1) Represent the formal domain as a context Γ of names and types, including axioms (section 3.1, p. 5). (2) Define a completion engine `f_t` for an arbitrary target type t. For `type`, allow names of that type or function types; for `prop`, allow proposition-valued names or functions returning `prop`; for a function type, recursively emit parameters and the result; for any other t, allow application of a context function whose output unifies with t (section 3.1, p. 5). (3) Parse the incomplete term with recursive descent, compute its current target type, and return the union of tokens allowed by these rules (section 3.1, p. 5). (4) Run constrained decoding until a complete proposition is produced. (5) Cap generation at K=150 tokens; discard failures. The reported rejection rate for propositions is below 10% (section 3.1, p. 5).

Verus form. Inference: generate a Rust specification term only after checking its type against a model of the intended API. A practical analogue is a generator that emits `spec fn` propositions and compiles a small Verus harness before adding them to training. Verus’s `requires` and `ensures` express contracts, and `assert` plus lemma calls establish them; the paper’s dependent-type unification and CSD are generator logic outside Verus. A generated proposition still needs a proof: type-correct syntax is not semantic truth.

Evidence and limits. The paper reports only the <10% rejection rate and later proof outcomes, not completeness of the parser implementation. It explicitly notes that type inhabitation is undecidable, so bounded generation may fail to terminate without K (section 3.1, p. 5). Inference: a sound token filter can prevent malformed statements but cannot prevent a well-typed false contract.

## technique 2: MCTS proof search with policy and value

What it is. Given a conjecture, M INIMO runs Monte Carlo Tree Search in Peano, guided by a policy πθ and value Vθ represented by the same model (section 3.2, p. 6). Peano exposes a finite action space. The policy scores each available action by the next-token likelihood after `STATE: «s»; POLICY:`, and the value scores 1 or 0 after `STATE: «s»; VALUE:` (section 3.2, p. 6). State objects have types and open goals; actions add objects, rewrite propositions, or change goals through backward chaining.

Inference: When to use it. Use this when proof actions are enumerable but search is combinatorial, and a learned policy can prioritize actions while a value model estimates promising states.

Inference: How to do it. (1) Encode the current typed objects and open goals as state s. (2) Enumerate Peano’s legal actions. (3) Normalize policy and value likelihood over completions that remain valid (section 3.2, p. 6). (4) Expand the MCTS tree, using policy scores for selection and value scores for evaluation. (5) On success, extract the actions on the proof path as policy examples; mark proof-completing states value 1 and randomly sampled other states value 0 (section 3.2, p. 6). (6) On failure, retain the tree for hindsight relabeling below.

Verus form. Inference: the search environment can be a Rust model of proof states, with an executable action enumerator and a specification that every action preserves well-typedness. A `proof fn` can establish a successful path’s final proposition; policy and value inference remain external ML components. Verus can check the resulting proof obligations but does not provide MCTS.

Evidence. Training uses 200 conjectures per batch, 1000 MCTS expansions, five iterations, and three axiomatic domains (section 4, p. 7). The paper’s evidence is improvement curves and extrinsic theorem success, not a controlled comparison of alternative tree policies.

## technique 3: hindsight relabeling of failed proof trees

What it is. A failed conjecture can contain subproofs for other goals. The paper states: “We apply this idea to extract training examples for both the policy and value functions from proof search trees, by picking nodes after forward actions that produced a proof, and walking upwards in the tree until we find a backward action.” (section 3.3, p. 6). The path is relabeled with the achieved goal and treated as successful.

Inference: How to do it. (1) Find a node after a forward action whose result type is a proposition and whose subgoal was proved (section 3.3). (2) Walk upward until a backward action changes the goal. (3) Relabel that path with the achieved proposition. (4) Remove steps irrelevant to that proposition. (5) Keep only goals never seen before, avoiding repeated trivial facts such as `0 = 0` (section 3.3). (6) Use the resulting proof both as policy/value data and as a true conjecture for the conjecturer; score its difficulty by proof log-likelihood (section 3.3).

Inference: When to use it. Use this when sparse proof rewards make failed searches otherwise useless and when search trees contain reusable local proofs.

Verus form. Inference: record each verified lemma reached in a proof search trace, then create a new training example with that lemma as the target. A Verus lemma’s `ensures` is the relabeled proposition; proof-only trace metadata must be erased and must not affect executable behavior. The relabeling algorithm is external to Verus, while Verus supplies the truth check for each retained lemma.

Evidence and limits. Without hindsight, the conjecturer receives mostly timeout signals; the authors report that it collapses toward easy conjectures. With hindsight, failed searches expose hundreds of true statements per domain (section 4.1, p. 8). Figure 3 compares five iterations and three random seeds, but the paper does not give a single aggregate percentage in the text. Inference: the technique improves data efficiency but can reinforce shallow or redundant lemmas; the “never seen before” filter is a heuristic, not a novelty proof.

## technique 4: difficulty-conditioned self-improvement loop

The loop alternates conjecture generation, proof search, extraction, and cross-entropy training (section 3.4, p. 7). For a proved statement, difficulty is its proof log-likelihood. The 10% least likely proofs are “hard,” the 50% most likely are “trivial,” and the rest are “easy” (section 3.4, p. 7). The conjecturer is conditioned on these labels in the next iteration.

Inference: How to do it. (1) Generate a batch of conjectures conditioned on difficulty. (2) Search each with MCTS. (3) Extract direct and hindsight proofs. (4) Compute log-likelihood under the current policy. (5) Assign percentile labels. (6) Train the LM for the next iteration on policy, value, and conjecturer examples (section 3.4). The appendix gives an 8.45M-parameter GPT-2-style character model, 2000 AdamW steps per iteration, learning rate 10^-4, and 288 GPU-hours for the main runs (Appendix A, p. 14).

Verus form. Inference: a VL training harness can classify verified Rust contracts by measured proof-search cost, then generate harder contracts. Difficulty must remain metadata; it cannot weaken a `requires` or `ensures` clause. The proof itself must still pass Verus.

Evidence. In groups, average proof length rises from 2.67 steps in iteration 1 to 5 in iteration 4; hard proofs rise from 3.67 to 6.10, and the longest from 4 to 9 (section 5, p. 9). Propositional logic averages rise 2.75→4.21 and longest 5→11; arithmetic averages 2.36→3.35 and longest 4→7 (section 5, p. 9). These are step counts, not success fractions. The paper also reports improving success on 35 Kleene propositional theorems and 10 Natural Number Game levels, but the figure contains the rates rather than a textual table (section 4.2, p. 8).

## what is proved, trusted, and missing

Formal proof checking establishes truth in Peano’s axioms and rules. The conjecture generator, parser, model training, MCTS implementation, and Peano environment remain trusted for data production. The paper itself identifies two scaling limits: the axiom library is fixed, so proofs without lemmas can be exponentially longer, and a large library makes action enumeration prohibitively slow (section 5, p. 9). It recommends premise selection and cumulative theory growth.

Inference: the threat to agent-written verified Rust is indirect but material. A model can learn to propose difficult-looking contracts, exploit shallow proof patterns, or optimize for search likelihood rather than useful system properties. Verus proof acceptance protects the formal claim, but does not ensure that the claim models memory, scheduling, external libraries, or product intent.

Inference: Already done that VL should not redo: constrained type-directed generation, MCTS policy/value guidance, hindsight relabeling, percentile difficulty conditioning, and axiom-only self-improvement. A VL contribution should add Rust/Verus semantics, system-level contracts, or maintenance evidence.

## techniques for the catalog

- type-directed constrained conjecturing: use recursive type rules and constrained decoding to generate only well-formed propositions
- MCTS proof search: guide finite formal actions with learned policy and value likelihoods
- hindsight relabeling: turn proved subgoals in failed trees into new proof and conjecture data
- percentile difficulty loop: label proof log-likelihoods and train the next conjecturer on hard, easy, and trivial bands
- formal acceptance signal: retain examples only when the proof assistant checks the proposition
Checked 2026-10-15 against paper poesia2024learning: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
