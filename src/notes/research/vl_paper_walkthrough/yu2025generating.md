# Generating Symbolic World Models via Test-time Scaling of Large Language Models
(authored by agents unless marked 🧑)
Tag: `yu2025generating`, [paper](https://arxiv.org/abs/2502.04728)

## problem and representation
The paper translates natural-language planning descriptions or PDDL problem instances into PDDL domains, then uses classical search. Its central claim is that extra inference computation can compensate for limited PDDL training data. The authors write: “PDDL employs a logical system to express atoms and predicates derived from STRIPS [16] (i.e., Stanford Research Institute Problem Solver), and therefore it provides a formal and unambiguous syntax for representing world models.” (section 3.1, p. 6) The paper evaluates generated domains with VAL and uses Fast Downward for the planning comparison (Table 5, p. 14). Its limitation is explicit: “While VAL ensures syntactic correctness (e.g., predicate arity, type consistency) and plan executability (e.g., action preconditions and effects), it cannot detect semantic inconsistencies that violate domain intent or commonsense logic.” (section 5, p. 15)

## technique 1: Best-of-N initialization

What it is and when to use it. Best-of-N (BoN) samples many candidate PDDL domains in parallel, scores them by model token likelihood, and keeps the top K as starting points for refinement. Inference: use it when a single generation is unreliable and no training-time adaptation is available.

How to do it. (1) Prompt the LLM with the input description and chain-of-thought format. (2) Generate N independent candidates at temperature τ. The paper gives the token distribution: “Higher temperature (e.g. τ ≥ 0.7) increases randomness and diversity in the generated candidates by flattening the probability distribution, giving relatively more weight to lower-probability tokens, in contrast, a lower temperature (e.g. τ ≤ 0.3) sharpens the distribution, favoring high-probability tokens and producing more deterministic outputs.” (section 3.2, p. 6) (3) For candidate `c_i`, sum the log probabilities of its generated tokens, `S_i = Σ_t log p_t(w_t^(i))`. (4) Retain the K highest-scoring candidates and their thoughts as initializations for refinement (section 3.2, p. 6; Figure 1, p. 2). Both BoN and iVML use temperature 0.7 in the experiments (section 4.1, p. 10).

Verus form. Inference: BoN can generate candidate Rust specifications, invariants, or proof scripts, but likelihood is only a search heuristic. Each candidate must compile and satisfy Verus `requires`/`ensures`; the candidate with the highest model score is not evidence of correctness. Keep the best candidate by an independently checked proof result, with likelihood only breaking ties.

Evidence. On the paper’s International Planning Competition data, BoN-8 raised Qwen2.5-Instruct 14B NL2Domain validation from 21.6% to 51.6%; the metric is the percentage of generated domains passing VAL without errors (Table 2, p. 9). Qwen2.5-Coder 7B rose from 21.9% to 73.1% on NL2Domain and from 18.4% to 63.3% on Problem2Domain under BoN-8 (Table 2). Sampling saturates: the authors report diminishing returns beyond a critical N and degradation at high budgets (section 4.3, p. 11). Inference: likelihood ranks candidates but does not establish their semantic correctness.

## technique 2: instance verbalized machine learning (iVML)

What it is and when to use it. iVML adapts verbalized machine learning to one instance without a training set. An optimizer LLM critiques the current PDDL and a learner LLM rewrites it. The paper states: “PDDL domain refinement is an instance learning task without training data to produce verbalized gradients.” (section 1, p. 3) Inference: use it after BoN to refine promising candidates and attempt to repair grammar, type, predicate, and action-logic errors.

How to do it. (1) Initialize `D_0` and chain-of-thought `T_0` from BoN. (2) Call an optimizer prompt with the task `G`, current thoughts, and domain; ask it to evaluate grammar, logic, and intermediate reasoning. (3) Call a separate update prompt with the same task plus optimizer feedback; ask for a new domain and thoughts. (4) Iterate for a fixed number of steps, producing `F_i = f_opt(L,G,T_{i-1},D_{i-1})` and `(T_i,D_i)=f_update(F_i,T_{i-1},D_{i-1})`. The optimizer prompt states: “You should evaluate the grammar and logic of the PDDL domain codes, and the logic error in the intermediate thoughts.” (section 3.3, p. 8) The critique/update loop uses LLM feedback rather than VAL or oracle feedback; VAL is used for evaluation (sections 2.2 and 4.1, pp. 5 and 10). The planning comparison uses Fast Downward (Table 5, p. 14).

Verus form. Inference: the optimizer/update split maps to a verifier-guided proof-repair loop. The optimizer can identify failed obligations and suggest invariant or specification edits; the learner rewrites Rust. The trusted boundary remains Verus verification: optimizer text, chain-of-thought, and generated code are untrusted until checked. Use actual Verus constructs (`requires`, `ensures`, loop `invariant`, `assert`, and proof functions) rather than treating a model critique as a lemma.

Evidence. Five iVML iterations initialized with BoN-8 raised Qwen2.5-Instruct 32B to 86.2% NL2Domain and 90.9% Problem2Domain, compared with 66.8% and 71.1% for BoN-8 (Table 2, p. 9). Qwen2.5-Coder 7B reached 85.2% and 71.4%; Yi-1.5-Chat 9B reached 93.9% and 93.0%. These are percentages of generated domains passing VAL, not proof soundness. The paper describes susceptibility to local minima (section 3.3, p. 8). Inference: optimizer critiques may themselves be wrong.

## technique 3: formal abstraction plus classical planning

What it is and when to use it. Generate a symbolic PDDL world model and let a classical planner search its state transitions. The paper states: “By adopting PDDL as representation, we transform this task into explicit classical planning.” (section 3.1, p. 6) Inference: use this separation when explicit state transitions and constraints help planning.

How to do it. (1) Generate a domain defining predicates and actions with preconditions/effects; combine it with a PDDL problem specifying objects, the initial state, and goals (section 3.1, pp. 6–7). (2) Evaluate with VAL for syntax and plan executability; this does not establish agreement with the intended domain (section 5, p. 15). (3) Use Fast Downward for heuristic search and plan validation (Table 5, p. 14); compare the resulting plan with the reference plan for the reported planning metric. The evaluation defines planning accuracy as “the percentage of synthesized domains that produce plans identical to the ground-truth reference plans.” (section 4.1, p. 10)

Verus form. Inference: this is analogous to translating a Rust algorithm into a mathematical state transition model, proving each transition’s preconditions and postconditions, then executing the verified code. PDDL/VAL cannot be substituted for Verus proofs of Rust memory and arithmetic properties; they can serve as an external model-level test oracle.

Evidence and limits. With self-critique, o1-preview achieved planning accuracy of 5.0% on Floortile, 6.7% on Barman, and 4.7% on Termes. BoN-16-iVML-5 with Qwen2.5-Coder 7B achieved 100.0% on Floortile, Barman, Tyreworld, Grippers, and Termes, and 81.0% on Blockworld (Table 5, p. 14). The paper reports that BoN-4-iVML-5 and the oracle-interaction method both achieved 100.0% on Termes (section 4.6, p. 15). However, the paper’s own limitations state that VAL-based checks do not establish semantic equivalence to the natural-language description; generated models may be consistently wrong while passing syntax checks.

## what is proved, measured, and trusted

Measured outcomes are VAL pass rates, exact-plan accuracy, convergence as N or iVML iterations change, and goal correctness for Planetarium problem synthesis (section 4.1, p. 10). For the last metric, the paper states: “This metric is defined as the percentage of generated problems whose goals correctly match the ground-truth goals.” (section 4.5, p. 13) No theorem proves equivalence between a natural-language description and generated PDDL. Inference: the reported measurements depend on VAL, Fast Downward, and benchmark reference plans or goals; prompts, likelihood scores, and LLM critiques do not independently establish correctness. Inference: for agent-written verified Rust, the reusable design is search plus independent proof checking, while model likelihood and textual self-critique should only prioritize candidates. Inference: a syntactically valid but semantically wrong specification can direct an agent toward proving the wrong property.

## techniques for the catalog

- best-of-N formal candidate search — sample diverse PDDL/specification candidates, rank by token likelihood, and retain several initializations
- instance verbalized refinement — have an optimizer LLM critique one candidate and a learner LLM rewrite it for several iterations
- symbolic abstraction plus classical planning — generate a PDDL model, evaluate it with VAL, and use a classical planner to search state transitions
- exploration–exploitation scheduling — combine stochastic candidate exploration with iterative self-critique to improve initialization and refinement
