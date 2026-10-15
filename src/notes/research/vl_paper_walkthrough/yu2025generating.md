# Generating Symbolic World Models via Test-time Scaling of Large Language Models
(authored by agents unless marked 🧑)
Tag: `yu2025generating`, [paper](https://arxiv.org/abs/2502.04728)

## problem and representation
The paper translates natural-language planning descriptions or PDDL problem instances into PDDL domains, then uses classical search. Its central claim is that extra inference computation can compensate for limited PDDL training data. The authors write: “PDDL employs a logical system to express atoms and predicates derived from STRIPS [16] ... and therefore it provides a formal and unambiguous syntax for representing world models.” (section 3.1, p. 6) A generated domain is validated with VAL and supplied to a search planner such as A*.

## technique 1: Best-of-N initialization

What it is and when to use it. Best-of-N (BoN) samples many candidate PDDL domains in parallel, scores them by model token likelihood, and keeps the top K as starting points for refinement. Use it when one greedy generation is unreliable and no training-time adaptation is available.

How to do it. (1) Prompt the LLM with the input description and chain-of-thought format. (2) Generate N independent candidates at temperature τ. The paper gives the token distribution: “Higher temperature (e.g. τ ≥ 0.7) increases randomness and diversity in the generated candidates by flattening the probability distribution.” (section 3.2, p. 6) (3) For candidate `c_i`, sum the log probabilities of its generated tokens, `S_i = Σ_t log p_t(w_t^(i))`. (4) Retain the K highest-scoring candidates as `D_0` for refinement.

Verus form. Inference: BoN can generate candidate Rust specifications, invariants, or proof scripts, but likelihood is only a search heuristic. Each candidate must compile and satisfy Verus `requires`/`ensures`; the candidate with the highest model score is not evidence of correctness. Keep the best candidate by an independently checked proof result, with likelihood only breaking ties.

Evidence. On the paper’s International Planning Competition data, BoN-8 raised Qwen2.5-Instruct 14B NL2Domain validation from 21.6% to 51.6%; the denominator is the task set used for that percentage, and the metric is domains passing VAL without errors (Table 2, p. 9). Qwen2.5-Coder 7B rose from 21.9% to 73.1% on NL2Domain and from 18.4% to 63.3% on Problem2Domain under BoN-8 (Table 2). Sampling saturates: the authors report diminishing returns beyond a critical N and degradation at high budgets (section 4.3, p. 10). A likelihood score can prefer syntactically fluent but semantically wrong PDDL, so selection assumes model likelihood correlates with validity.

## technique 2: instance verbalized machine learning (iVML)

What it is and when to use it. iVML adapts verbalized machine learning to one instance without a training set. An optimizer LLM critiques the current PDDL and a learner LLM rewrites it. The paper states: “PDDL domain refinement is an instance learning task without training data to produce verbalized gradients.” (section 2.3, p. 3) Use it after BoN to exploit promising candidates and repair grammar, type, predicate, and action-logic errors.

How to do it. (1) Initialize `D_0` and chain-of-thought `T_0` from BoN. (2) Call an optimizer prompt with the task `G`, current thoughts, and domain; ask it to evaluate grammar, logic, and intermediate reasoning. (3) Call a separate update prompt with the same task plus optimizer feedback; ask for a new domain and thoughts. (4) Iterate for a fixed number of steps, producing `F_i = f_opt(L,G,T_{i-1},D_{i-1})` and `(T_i,D_i)=f_update(F_i,T_{i-1},D_{i-1})`. The paper’s optimizer prompt explicitly asks to “evaluate the grammar and logic of the PDDL domain codes, and the logic error in the intermediate thoughts.” (section 3.3, p. 7) (5) Validate the final domain with VAL and then plan with A*.

Verus form. Inference: the optimizer/update split maps to a verifier-guided proof-repair loop. The optimizer can identify failed obligations and suggest invariant or specification edits; the learner rewrites Rust. The trusted boundary remains Verus verification: optimizer text, chain-of-thought, and generated code are untrusted until checked. Use actual Verus constructs (`requires`, `ensures`, loop `invariant`, `assert`, and proof functions) rather than treating a model critique as a lemma.

Evidence. Five iVML iterations initialized with BoN-8 raised Qwen2.5-Instruct 32B to 86.2% NL2Domain and 90.9% Problem2Domain, compared with 66.8% and 71.1% for BoN-8 (Table 2, p. 9). Qwen2.5-Coder 7B reached 85.2% and 71.4%; Yi-1.5-Chat 9B reached 93.9% and 93.0%. These are percentages of generated domains passing VAL, not proof soundness. The method can reach local minima, and optimizer critiques may themselves be wrong.

## technique 3: formal abstraction plus classical planning

What it is and when to use it. Instead of having an LLM emit a plan token by token, generate a symbolic PDDL world model, validate it, and let a planner search transitions. This separates model synthesis from execution and makes state constraints explicit.

How to do it. (1) Encode typed objects, predicates, initial state, goals, and actions with preconditions/effects. (2) Run VAL for syntax, type, predicate, and semantic checks. (3) Give the accepted domain and problem to Fast Downward/A*; compare the resulting plan with the reference plan. The evaluation defines planning accuracy as “the percentage of synthesized domains that produce plans identical to the ground-truth reference plans.” (section 4.1, p. 9)

Verus form. Inference: this is analogous to translating a Rust algorithm into a mathematical state transition model, proving each transition’s preconditions and postconditions, then executing the verified code. PDDL/VAL cannot be substituted for Verus proofs of Rust memory and arithmetic properties; they can serve as an external model-level test oracle.

Evidence and limits. Direct LLM-as-planner o1-preview achieved only 5.0 on Floortile, 6.7 on Barman, and 4.7 on Termes under the paper’s planning-accuracy scale, while BoN/iVML-generated PDDL plus heuristic search solved nearly all tested instances; the text reports 100.0 on Termes for BoN-4-iVML-5 and comparable performance to an oracle-interaction method (section 4.6, p. 13). However, the paper’s own limitations state that VAL-based checks do not establish semantic equivalence to the natural-language description; generated models may be consistently wrong while passing syntax checks. Inference: semantic review remains necessary for VL.

## what is proved, measured, and trusted

Measured outcomes are VAL pass rates, exact-plan accuracy, and convergence as N or iVML iterations change. No theorem proves that a natural-language description and generated PDDL are equivalent. Trusted components include LLM prompts, token likelihood, VAL, Fast Downward/A*, benchmark reference plans, and the translation from prose to PDDL. Inference: for agent-written verified Rust, the reusable design is search plus independent proof checking, while model likelihood and textual self-critique should only prioritize candidates. The product threat is moderate: a syntactically valid but semantically wrong specification can direct an agent toward proving the wrong property.

## techniques for the catalog

- best-of-N formal candidate search — sample diverse PDDL/specification candidates, rank by token likelihood, and retain several initializations
- instance verbalized refinement — have an optimizer LLM critique one candidate and a learner LLM rewrite it for several iterations
- validator-gated symbolic abstraction — validate a generated formal model, then delegate state-space search to A*/a classical planner
- exploration–exploitation scheduling — combine stochastic candidate exploration before iterative self-critique to avoid poor cold starts
Checked 2026-10-15 against paper yu2025generating: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
