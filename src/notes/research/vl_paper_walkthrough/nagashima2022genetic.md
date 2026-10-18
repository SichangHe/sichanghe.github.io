# Genetic Algorithm for Program Synthesis
(authored by agents unless marked 🧑)
Tag: `nagashima2022genetic`, [paper](http://arxiv.org/abs/2211.11937v2)

## purpose and result
Nagashima improves SuSLik, a deductive synthesizer for heap programs, by evolving its proof-search strategy rather than evolving programs. The paper's abstract states: "To speed up such program derivation, we improve the search strategy of a deductive program synthesis tool, SuSLik, using evolutionary computation." SuSLik searches an OR-tree whose nodes are synthesis goals and whose edges are rule applications. A strategy orders rules and chooses the next node with a cost function. The paper reports four random-split cross-validations on a 65-problem benchmark, with a 2.5-second timeout per problem, and finds that general rule-weight mutation improves results on validation sets even though evolution uses only training sets (§4).

## technique: evolutionary tuning of deductive proof search

what it is

The search strategy has two parameter families: the order of derivation rules in each group (SuSLik's rules form 10 ordered lists, §2) and weights in the best-first cost function. The paper says, "The aim of our evolutionary computation is to optimise the order of each group of derivation rules and the weights of the cost function, which is used to implement best-first search." Evolution changes these parameters; SuSLik still constructs a proof and certified program deductively.

when to use it

Use it when a deductive verifier is sound but its search times out because the proof tree is large and hand-tuned parameters work unevenly across tasks. The paper (§1) cites Itzhaky et al. that "different synthesis tasks benefit from different search parameters" and describes the timeout problem as: "The drawback is that the search algorithm often fails to find a proof within a realistic timeout." Inference: the method is suitable for Verus proof-script or lemma-search configuration when the generated proof remains checked by Verus; it does not make an incorrect proof acceptable.

how to do it

1. choose a training set of synthesis problems; the algorithm takes "synthesis problems for SuSLik" as input (Algorithm 1, §3)
2. create an initial population and evaluate every individual with `fitness(old_pop)` (Algorithm 1, lines 1–2)
3. repeat for 40 generations (Algorithm 1, lines 3–5)
4. copy the previous population, mutate the copies, and evaluate them (lines 6–8)
5. concatenate old and new populations, sort by fitness, and retain the best 20 (lines 9–11)
6. use elitist selection: the best individual, the “champion,” gets one unchanged copy and two mutated children; each of the other 19 winners gets one unchanged copy and one mutated child (§3, Fig. 1)
7. encode rule orders as permutations and weights as floating-point numbers; the paper says "each individual has the probability of 0.1 to be moved" for permutation encoding, and weights change "by multiplying a random number between 0.8 and 1.2" (§3, p. 4; the paper does not say whether this is per element or per weight)

The three mutations are: order-only (change rule order), general rule-weight (change node weights based on rules already applied), and goal-specific rule-weight (choose a weight from properties of the current node) (§3). The fitness score is the number of problems solved within 2.5 seconds; ties use the number of rules fired, preferring fewer applications (§3). No crossover is applied to the permutation encoding; the paper says rule-order sequences tend to be short and it is "not sure if crossovers would result in a better performance" (§3). The paper does not describe crossover for weights. The output is one strategy after 40 generations; the evaluation instead scores the best training individual of each generation (§4).

verus form

Inference: represent a candidate Verus proof-search policy outside the verified Rust program (for example, a driver that orders candidate `proof fn` lemmas or solver-trigger configurations). For each candidate, run Verus on a fixed benchmark and score completed proofs, then retain the best 20 and mutate policy parameters. The generated Rust still uses ordinary Verus specifications (`requires`, `ensures`, loop `invariant` clauses, and `proof fn` lemmas); the evolutionary layer cannot replace those contracts. Inference: unlike SuSLik's rule permutations, Verus does not expose a paper-defined OR-tree API, so the exact mutation targets must be implemented in a proof-generation tool rather than in Verus source.

evidence and limits

The evaluation used a consumer laptop with Ubuntu 20.04.3 LTS, 16 CPUs of AMD Ryzen 7 4,800H, and 15,854MB of main memory (§4). The benchmark has 65 problems, from earlier SuSLik work and new problems, covering integers, singly and doubly linked lists, sorted lists, lists of lists, binary trees, and packed trees (§4). The benchmark was randomly split into training and validation sets, and the experiment was run four times; the y-axis labels of Figs. 2–5 read "Unsolved problems out of" 33, 24, 34, and 34 respectively (Fig. 3's label is as printed). The paper does not say in the text which set each denominator refers to or how many problems each set holds. The paper reports that general rule-weight mutation improved validation capability, while order-only and goal-specific mutation were less promising; goal-specific mutation over-fitted in cross-validations 1 and 4 (§4). It explicitly cautions: "The limited size of available dataset is the main challenge we faced in this project." The authors report that static parameters (general rule-weight mutation) generalised well, while their efforts toward dynamic goal-specific parameters were "unsuccessful so far"; they hope "a larger training dataset would allow for such optimisation" (§5). For the over-fitting they say "probably due to its capability to fine tune the strategy for our small dataset" (§4).

Inference: reuse the separation between search optimisation and proof checking, the explicit timeout-based fitness score, tie-breaking by proof effort, elitist retention, and held-out validation. Do not redo the paper's static-parameter experiment as if it proved dynamic policy learning; goal-specific mutation failed on this dataset.

## techniques for the catalog

- evolutionary proof-search tuning — evolve rule orders and cost weights while retaining deductive proof checking
- three mutation families — compare order-only, general rule-weight, and goal-specific rule-weight mutations
- timeout-and-effort fitness — score solved tasks within 2.5 seconds and break ties by rule applications
- elitist population update — keep 20 winners, with extra mutated offspring for the champion
