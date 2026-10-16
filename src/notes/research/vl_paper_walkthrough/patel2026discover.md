# Learning to Discover Interesting Mathematics
(authored by agents unless marked 🧑)
Tag: `patel2026discover`, [paper](http://arxiv.org/abs/2609.28603v1)

## purpose and result
The paper builds a value model for conditional proof difficulty and uses it to steer Lean theorem generation toward statements that are short to state but long to prove. It defines interestingness as proof cost divided by conditional description length, trains a 27B model to estimate cost, trains a conjecturer with that estimate, and then prunes an iterative theorem graph. The authors report mean ground-truth interestingness 1.76 for the base Qwen model versus 7.58 for the trained model over 160 verified statements per model (20 statements in each of eight areas). They also report mathlib containment scores 91.9% for Base and 30.6% for Trained at “substantially or fully contained” (scores 4–5; 160 statements per model).

## technique 1: make a premise-conditioned proof-cost dataset
Use this when proof difficulty depends on which lemmas are already available. The target is `V(T | P)`, where `T` is a theorem and `P` is a premise set. The paper states: “We formalize proof difficulty as the computational cost of deriving a target theorem from a given mathematical context in Lean 4.” It defines ground truth `C_D(T|P)` as the number of proof-code lines in library `D` and requires grounding (`V=C_D` where defined), premise monotonicity (`V(T|Q) ≤ V(T|P)` when `P⊆Q`), and composition (`V(T|P) ≤ V(L|P)+V(T|P∪{L})`).

Build the data from mathlib: extract each theorem's rendered type, required local definitions, proof source, and direct premises. Apply premise expansion: remove a directly used lemma `L`, add `P(L)`, and add `L`'s proof-line count to the target label; repeat backward through the dependency DAG. This changes the atomized library into about 100,000 theorem/premise/proof examples. Train Qwen3.6-27B with GRPO for 350 steps. The reward combines log absolute error to true cost, a Bellman consistency penalty, and a penalty when adding premises fails to reduce predicted cost. Evaluate on 4,615 held-out validation prompts, reporting MAE and Spearman correlation only for parsed non-negative answers.

Inference: in Verus, `P` can be a set of available lemmas, contracts, and type invariants, while `C_D` can count proof statements or measured verification effort. A training corpus should record the exact linked Verus definitions and proof code; Lean declarations and mathlib's line semantics do not carry over unchanged. Verus can check each generated theorem, but a value model remains an estimator and is not evidence of correctness.

## technique 2: normalize proof difficulty by statement description
Use this when raw proof length rewards artificially long statements. For Lean declaration `X`, let `S(X)` be statement characters and `C(X)` recursively include definitions needed to state it. The conditional description length is `L(T|P)=S(T)+Σ_{d∈C(T)\C(P)}S(d)`. The intrinsic score is `I(T|P)=100 V(T|P)/L(T|P)`. The paper explains: “We claim that a statement T is interesting given a set of premises P if it is easy to state, and has a long and incompressible proof.” The factor 100 is a scale choice; the paper says it makes the mean near 1 in its figure.

The authors also define utility `U0(T)=|D(T)|·V(T|∅)`, where `D(T)` is the set of direct downstream users. On mathlib, excluding zero-utility declarations, interestingness and utility have Spearman ρ=0.756 (Figure 3). This is a correlation on that library, not a correctness guarantee.

Inference: for Verus, use a specification-size denominator that includes referenced type and model definitions, and a numerator measured from a verified proof artifact. This can rank candidate lemmas for reuse, but line count is sensitive to automation and solver behavior; it should not be used as a security requirement.

## technique 3: optimize a conjecturer with estimated interestingness
Condition a conjecturer on at least 16 premises (median 77) and definitions, then emit a standalone Lean proposition. Use frozen `Vθ` and reward `R(T,P)=0.25+log(1+Vθ(T|P)/L(T|P))`. Give parse failures −0.5, Lean-invalid or irrelevant statements −0.25, and statements proved by simple automation zero reward. Train Qwen3.6-27B with GRPO for 75 steps on 10,000 premise sets sampled from mathlib. For evaluation, generate candidates in each of eight areas, prove each with a Claude Code/Opus agent, retain 20 verified statements per model per area, and compute ground-truth `I` from the real proof.

The measured cohort contains 160 statements per model. Mean `I` rises from 1.76 (base) to 7.58 (trained); area-level ratios range from 2.10× in combinatorics to 8.72× in number theory. The trained model's statements judged substantially or fully contained in mathlib are 30.6%, versus 91.9% for Base and 92.5% for Claude 4.6; the judge uses a five-level containment rubric. The authors caution that the proof assistant verifies the produced statement, while the value model only supplies a training signal.

Inference: a Verus conjecturer could emit candidate contracts or lemmas, have Verus compile and prove them, and reward verified candidates by a normalized proof-cost score. The semantic filter must reject candidates unrelated to available APIs; this requirement is analogous to the paper's relevance check, but it is an engineering inference.

## technique 4: inference-time iterative theorem discovery and pruning
Start with premise set `P0`. At round `n`, sample 20 premises (five from the newest frontier and the rest from earlier premises), generate 400 candidate statements, filter equivalent statements and enforce family diversity, prove survivors independently in Lean, rank by exact verified interestingness, and promote the ten highest into `Pn`. Repeat for six rounds. Compare four promotion rules: retain all verified statements, choose ten uniformly at random, choose ten with longest proof, or choose ten with highest interestingness. The paper states: “Successfully verified statements are ranked by the interestingness as computed from the ground-truth proof, and the ten highest scoring results are ‘promoted’ and added to the next set of premises.”

The reported outcome is that interestingness pruning has the highest running mean interestingness and highest quality, diversity, and most-interesting judgments; raw proof-length pruning performs worse. The same conjecturer, semantic filter, proving agent, initial graph-theory premises, and six rounds are held fixed while the promotion rule varies (Figure 7 and Tables 3–4).

Inference: the Verus version is a verified-lemma queue: generate candidate `proof fn`s and contracts, run Verus, de-duplicate by normalized specifications, score only accepted proofs, and promote a bounded number of lemmas to later search contexts. A long-running product would need persistent dependency and API checks; the paper does not evaluate Rust compilation, external crates, or concurrent verification.

## what is proved, measured, and trusted
Lean checks the syntax and proofs of retained statements. The measured numbers use 4,615 validation prompts for value prediction, 160 verified statements per model for interestingness, and six fixed discovery rounds for pruning comparisons. The learned value model, conjecturer, Claude proving agent, semantic judge, mathlib definitions, and the choice that mathematical interestingness predicts practical value remain trusted or empirical. The paper explicitly limits its metric: “Proof length in terms of lines of code can be a stylistic artifact, as automation tactics, such as aesop and grind, often trade proof length for runtime.”

Inference: for agent-written verified Rust, this reduces proof-search effort only after a specification is written and accepted. The major product threat is specification and API selection: a highly ranked Verus lemma can be irrelevant, vacuous, or expensive to maintain even if its proof passes. Existing VL should already use proof assistants for checking; it need not redo this paper's premise-expansion and candidate-pruning experiments unless it wants autonomous lemma discovery.

## techniques for the catalog
- premise expansion unwraps dependency DAG edges and adds proof costs to create non-atomic training labels
- conditional value axioms train a proof-cost predictor with grounding, monotonicity, and Bellman composition rewards
- interestingness divides verified proof cost by conditional statement-description length
- GRPO rewards a conjecturer for valid, relevant statements with high estimated normalized proof cost
- iterative discovery proves candidate theorems, de-duplicates them, and promotes the highest interestingness into later premise sets

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
