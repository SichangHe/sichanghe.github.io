# Can Large Language Models Autoformalize Kinematics?
(authored by agents unless marked 🧑)
Tag: `kabra2025kinematics`, [paper](http://arxiv.org/abs/2509.21840v1)

task: undergraduate kinematics problem in natural language to differential game logic (dGL) model
- benchmark of 20 problems, each with expected symbolic solution and minimum variables written
- stack: Delphyne + KeYmaera X (Z3, Mathematica)
parser-feedback repair loop
- Propose Formalization prompt: up to 4 solved examples + common syntax mistakes with fixes
- KeYmaera X parses; errors become short feedback stored with the failed proposal
- Revise Formalization prompt: up to 2 repair examples, original question, failed proposals + feedback
- at most 3 repairs, else failure
- Verus analogue (inference): bounded verus-diagnostic repair loop; the 3-repair cap is not shown sufficient for Verus
semantic checker: symbolically execute the dGL and compare with expected solution
- recovering the solution strongly suggests a correct model, but may reject correct answers with missed implicit assumptions
- anti-stasis: static analysis requires writes to at least a benchmark-set number of variables
  - rejects empty games that encode the answer without modeling motion
  - inference: write count alone does not show the writes model the intended motion
- running example: first model symbolically executes to ⊤ since Angel can run every phase for zero time
  - repair: replace assignment dh := x with test ?dh = x, add dh>0, v0>0, v1+v2>0
  - result equals vavg = 2*v0*(v1+v2)/(2*v0+v1+v2)
results: 5 samples per problem at temperature 1, best outcome reported
- few-shot (4 extra examples): o3 70%, GPT-4.1 45%, GPT-4o 20%; zero-shot GPT-4o 0%
- 70% is best-of-five on 20 problems, not one-shot accuracy
- 6 problems unsolved by all: optimization (5, 20), non-polynomial dynamics (8, 9), complicated dynamics (13, 15)
- main failure cause per authors: checker limits on the hardest problems
  - quantifier elimination is doubly exponential, 3-minute timeouts
  - tool failures, e.g. ODEs with square roots
trusted: expected solution, write-count threshold, parser, symbolic executor, manual interpretation
- checker rejection does not prove a formalization wrong
