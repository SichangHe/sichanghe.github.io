# Learning Formal Mathematics From Intrinsic Motivation
(authored by agents unless marked 🧑)
Tag: `poesia2024learning`, [paper](http://arxiv.org/abs/2407.00695v2)

## scope and result

M INIMO jointly trains a conjecturer and a theorem prover from only axioms in a dependent type theory. The authors define the goal as “generating new problems that are challenging for the current agent but still provable within its given search budget.” (section 1, p. 2). Their agent uses one language model for a difficulty-conditioned conjecturer, a proof-search policy, and a value function (section 3, p. 4). Experiments cover propositional logic, arithmetic, and group theory. Appendix D.3 includes commutativity among the group axioms (pp. 16–17).

## technique 1: constrained, type-directed conjecture generation

What it is. An autoregressive language model normally assigns probability to arbitrary strings. M INIMO constrains generation to inhabitants of `prop` in the domain’s dependent type theory. The paper says: “To that end, our main insight is to leverage constrained decoding to obtain valid conjectures by construction.” (section 3.1, p. 4). A completion engine maps a prefix to allowed continuations; Constrained Semantic Decoding (CSD) samples only strings accepted by that engine (section 3.1, pp. 4–5).

Inference: When to use it. Use this when generated specifications must be syntactically and type-correct before an expensive verifier or proof search runs. It is especially useful when the model starts without domain examples.

Inference: How to do it. (1) Represent the formal domain as a context Γ of names and types, including axioms (section 3.1, p. 5). (2) Define a completion engine `f_t` for an arbitrary target type t. For `type`, allow names of that type or function types; for `prop`, allow names of type `prop` or function types whose output has type `prop`; the function-type formation rule recursively emits parameter types and a final output type. Also allow context objects of the target type and function application whose output type unifies with t (section 3.1, p. 5). (3) Parse the incomplete term with recursive descent, compute its current target type, and return the union of tokens allowed by these rules (section 3.1, p. 5). (4) Run constrained decoding until a complete proposition is produced. (5) Cap generation at K=150 tokens; discard failures. The reported rejection rate for propositions is below 10% (section 3.1, p. 5).

Verus form. Inference: generate a Rust specification term only after checking its type against a model of the intended API. A practical analogue is a generator that emits `spec fn` propositions and compiles a small Verus harness before adding them to training. Verus’s `requires` and `ensures` express contracts, and `assert` plus lemma calls establish them; the paper’s dependent-type unification and CSD are generator logic outside Verus. A generated proposition still needs a proof: type-correct syntax is not semantic truth.

Evidence and limits. The paper reports a <10% rejection rate for proposition generation. It notes that type inhabitation is undecidable and the unbounded procedure might not terminate; the token cap bounds each attempt (section 3.1, p. 5). Inference: a sound token filter can prevent malformed statements but cannot prevent a well-typed false contract.

## technique 2: MCTS proof search with policy and value

What it is. Given a conjecture, M INIMO runs Monte Carlo Tree Search in Peano, guided by a policy πθ and value Vθ represented by the same model (section 3.2, p. 6). Peano exposes a finite action space. The policy scores each available action by its likelihood as a completion after `STATE: «s»; POLICY:`, and the value scores 1 or 0 after `STATE: «s»; VALUE:` (section 3.2, p. 6). State objects have types and open goals; actions add objects, rewrite propositions, or change goals through backward chaining.

Inference: When to use it. Use this when proof actions are enumerable but search is combinatorial, and a learned policy can prioritize actions while a value model estimates promising states.

Inference: How to do it. (1) Encode the current typed objects and open goals as state s. (2) Enumerate Peano’s legal actions. (3) Normalize policy and value likelihood over completions that remain valid (section 3.2, p. 6). (4) Expand the MCTS tree, using policy scores for selection and value scores for evaluation. (5) On success, extract the actions on the proof path as policy examples; mark proof-completing states value 1 and randomly sampled other states value 0 (section 3.2, p. 6). (6) On failure, retain the tree for hindsight relabeling below.

Verus form. Inference: the search environment can be a Rust model of proof states, with an executable action enumerator and a specification that every action preserves well-typedness. A `proof fn` can establish a successful path’s final proposition; policy and value inference remain external ML components. Verus can check the resulting proof obligations but does not provide MCTS.

Evidence. Training uses 200 conjectures per batch, 1000 MCTS expansions, five iterations, and three axiomatic domains (section 4, p. 7). The paper’s evidence is improvement curves and extrinsic theorem success, not a controlled comparison of alternative tree policies.

## technique 3: hindsight relabeling of proof trees

What it is. A failed conjecture can contain subproofs for other goals. The paper states: “We apply this idea to extract training examples for both the policy and value functions from proof search trees, by picking nodes after forward actions that produced a proof, and walking upwards in the tree until we find a backward action (since those change the goal).” (section 3.3, p. 6). The path is relabeled with the achieved goal and treated as successful. The experiments apply relabeling to all proof searches, successful or not (section 4.1, p. 8).

Inference: How to do it. (1) Find a node after a forward action that produced a proof of a proposition, whether or not it helps the original goal (section 3.3, p. 6). (2) Walk upward until a backward action changes the goal. (3) Relabel that path with the achieved proposition. (4) Remove steps irrelevant to that proposition. (5) Keep only goals never seen before, avoiding repeated trivial facts such as `0 = 0` (section 3.3). (6) Use the resulting proof both as policy/value data and as a true conjecture for the conjecturer; score its difficulty by proof log-likelihood (section 3.3).

Inference: When to use it. Use this when sparse proof rewards make failed searches otherwise useless and when search trees contain reusable local proofs.

Verus form. Inference: record each verified lemma reached in a proof search trace, then create a new training example with that lemma as the target. A Verus lemma’s `ensures` is the relabeled proposition; proof-only trace metadata must be erased and must not affect executable behavior. The relabeling algorithm is external to Verus, while Verus supplies the truth check for each retained lemma.

Evidence and limits. Without hindsight, the conjecturer receives mostly timeout signals; the authors report that it collapses toward easy conjectures. With hindsight, failed searches expose hundreds of true statements per domain (section 4.1, p. 8). Figure 3 compares five iterations and three random seeds, but the paper does not give a single aggregate percentage in the text. Inference: the technique improves data efficiency but can reinforce shallow or redundant lemmas; the “never seen before” filter is a heuristic, not a novelty proof.

## technique 4: difficulty-conditioned self-improvement loop

The loop alternates conjecture generation, proof search, extraction, and cross-entropy training (section 3.4, p. 7). For a proved statement, difficulty is its proof log-likelihood. The 10% least likely proofs are “hard,” the 50% most likely are “trivial,” and the rest are “easy” (section 3.4, p. 7). The conjecturer is conditioned on these labels in the next iteration.

Inference: How to do it. (1) Generate a batch of conjectures conditioned on difficulty. (2) Search each with MCTS. (3) Extract direct and hindsight proofs. (4) Compute log-likelihood under the current policy. (5) Assign percentile labels. (6) Train the LM for the next iteration on policy, value, and conjecturer examples (section 3.4). The appendix gives an approximately 8.45M-parameter GPT-2-style character model, 2000 AdamW steps per iteration, learning rate 10^-4, and 288 GPU-hours for the main runs (Appendix A, p. 14).

Verus form.

Evidence. For generated conjectures, excluding hindsight discoveries, groups average proof length rises from 2.67 steps in the first iteration to 5 in iteration 4; hard proofs rise from 3.67 to 6.10, and the longest from 4 to 9 (section 5, pp. 9–10). Propositional logic averages rise 2.75→4.21 and longest 5→11; arithmetic averages 2.36→3.35 and longest 4→7 (section 5, p. 10). These are step counts, not success fractions. Section 4.2 reports improving success on human-written problems within 2000 MCTS expansions (pp. 8–9; Figure 4, p. 9). It describes “35 useful statements of Propositional Logic” (p. 8), but Appendix E.2 says “there are 30 statements, even if the last one is labeled 25.” (p. 18). Inference: the paper is inconsistent about this evaluation count. Arithmetic uses 10 Natural Number Game levels (section 4.2, p. 9; Appendix E.1, p. 17).

## what is proved, trusted, and missing

The authors state: “In M INIMO, since our problems are formal conjectures and our solutions are formal proofs, we can guarantee correctness in a much stronger form than self-generated test cases.” (section 2, p. 4). Inference: this establishes derivability relative to Peano’s axioms and proof rules, assuming a correct implementation; it does not independently validate the generator, parser, training, search, or environment code. The paper itself identifies two scaling limits: the axiom library is fixed, so proofs without lemmas can be exponentially longer, and a large library can make action enumeration prohibitively slow (section 5, p. 10). It identifies premise selection and cumulative theory growth as future directions (section 5, p. 10).

Inference: the threat to agent-written verified Rust is indirect but material. A model can learn to propose difficult-looking contracts, exploit shallow proof patterns, or optimize for search likelihood rather than useful system properties. Verus proof acceptance protects the formal claim, but does not ensure that the claim models memory, scheduling, external libraries, or product intent.

## techniques for the catalog

- type-directed constrained conjecturing: use recursive type rules and constrained decoding to generate only well-formed propositions
- MCTS proof search: guide finite formal actions with learned policy and value likelihoods
- hindsight relabeling: turn proved subgoals in failed trees into new proof and conjecture data
- percentile difficulty loop: label proof log-likelihoods and train the next conjecturer on hard, easy, and trivial bands
- formal proof signal: use discovered proofs to supply successful policy/value examples and true conjecture examples (sections 3.2–3.3); the value function also receives randomly sampled states labeled 0
