# Joint Verification and Refinement of Language Models for Safety-Constrained Planning
(authored by agents unless marked 🧑)
Tag: `yang2024joint`, [paper](https://arxiv.org/abs/2410.14865)

## what the paper proves
The paper defines a system with subscribing functions that read text observations, execution functions that publish actions, atomic propositions mapped from those APIs, and temporal safety specifications. A generated program is a set of possible function sequences. The central target is universal trace safety: every trace of the product automaton must belong to the safety property (section 3, page 3; Proposition 1, page 6). The paper states, “Formal verification provides guarantees of compliance with specifications Baier & Katoen (2008); MacConville & Monahan (2024); Shu et al. (2019); Sun et al. (2024), but applying it to LLM-generated programs presents unique challenges.” (section 1, pages 1–2)

## technique 1: compile a generated program to an automaton and model-check it
Inference: Use this when an LLM emits imperative robot code but the safety requirement is a temporal formula over API-level observations and actions. The method is deliberately insensitive to variable names and irrelevant assignments because it verifies the abstract API behavior.

Steps from section 4.1 (pages 4–5), Algorithm 1 (page 5), and Appendix A (page 16):
1. Build the environment transition system `TS=(Qs,Ts,Ls)`, whose states encode all conjunctions of truth values of subscribing propositions, with transitions between every such conjunction and labels that are sets of atomic propositions
2. Parse program `Pi` into an abstract syntax tree (AST)
3. Define keyword processors for AST structures (the paper gives `while`, `if`, and `if-else` rules in Table 1, page 6)
4. Run the paper's preorder `Tree2FSA` algorithm: create an initial state; recursively process each child or keyword node; merge each returned sub-automaton; connect the current state to the sub-automaton initial state with a true transition; return states, initial state, transitions, and labels
5. Form the product automaton `P=A⊗TS`, whose states pair an FSA state with an environment state and whose transitions agree with both automata
6. Use a model checker to test every specification in `Φ`; retain the program only if the product satisfies all of them

The paper's example requirement is `G(pedestrian → X ¬ publish velocity)`: whenever the pedestrian proposition holds, the publish-velocity proposition must be false at the next trace position (section 5.1, page 9). One generated turn-right program checks for a pedestrian, stops, and then publishes velocity; its automaton fails because a new pedestrian can appear after the stop. The second program checks in a loop and satisfies the specification. The authors write, “The verification results indicate that the first program fails the specification.” (section 5.1, page 9)

Verus form: Inference: model the robot state and API calls as Rust datatypes and ghost state, express the safety property as a `spec fn` over sequences or state transitions, and prove each transition with `requires`/`ensures` and loop `invariant`s. Inference: an adaptation would need separate tools for the AST-to-FSA and product constructions. These Verus suggestions are not part of the paper and have not been checked against Verus documentation here.

Evidence and limits: the demonstrations use GPT-4o-mini and explicitly defined API mappings (sections 5–5.2, pages 9–10). Appendix A states, “The keyword processor cannot handle AST structures beyond the domain of built-in rules.” (page 16) Inference: the guarantee depends on the API abstraction and transition system faithfully representing the robot; unmodeled sensor values, API side effects, or unsupported Python structures can defeat that correspondence.

## technique 2: compose verified components with a safety theorem
Inference: Use this when a long-horizon task can be split into subprograms and direct whole-program model checking is too expensive. For each component obtain a product automaton `Pi` that satisfies the safety property. Construct a joint automaton by taking the union of component states, transitions, and labels, then adding transitions from selected states of one component to initial states of another.

Theorem 1 requires (1) both component automata satisfy `Psafe`, and (2) for every prefix `ψ̂` outside `BadPref(Psafe)` and every added transition `(q,q′)`, the extended prefix `ψ̂ L1(q) L2(q′)` is also outside `BadPref(Psafe)`. This quantifies over every non-bad prefix, not merely prefixes reachable at the join. Under these assumptions the theorem states that the joint automaton satisfies `Psafe` (section 4.2, page 7). The paper says, “if each subprogram satisfies the safety specification in isolation, then their composition also satisfies the specification under mild assumptions.” (section 4.2, page 5) Proposition 2 extends the result by induction to any finite number of automata, with the same condition for cross-component transitions (page 7).

Inference: to apply the theorem, verify each component, establish its bad-prefix condition for every permitted join and every non-bad prefix, then use the theorem for the joint automaton. The paper does not provide an algorithm for discharging this universally quantified join condition. Verus form: Inference: represent each verified component by a transition lemma with a postcondition preserving a safety predicate, and prove a composition lemma that establishes the join precondition before calling the next component. The join condition is an explicit `requires`; the resulting safety is an `ensures`.

Evidence: Appendix C reports an outdoor-robot execution of composed driving subprograms (page 18). The composition claim is mathematical; the paper does not provide a verification-speedup table. It reports that avoiding whole-composition verification reduces computational complexity, but the theorem depends on the join condition. Inference: arbitrary concatenation is unsafe when a join creates a bad prefix; the theorem does not eliminate environment-model or specification errors.

## technique 3: verification-guided fine-tuning
Inference: Use this when verified programs can serve as labels but manual safety annotations are unavailable. The paper's five-step procedure (section 4.3, page 8) is: query the model on task descriptions, varying random seeds; build and verify an FSA for every generated program; retain passing programs and pair each with its task description; repeat to obtain a dataset; supervised-fine-tune on task/program pairs. The composition theorem lets training target safe subprograms instead of complete long-horizon programs.

The quantitative setup uses 100 verified training samples, a maximum of 400 epochs, negative log-likelihood loss, and early stopping. The three training specifications are `φ1=G(pedestrian→X ¬publish velocity)`, `φ2=G(¬(pedestrian∨¬stop sign)→X ¬stop)`, and `φ3=G(car→X ¬publish velocity)`. The paper reports, “In addition, this fine-tuning procedure only consumes 100 samples and less than 5 minutes of training on a single Nvidia A100 GPU.” (section 6.1, page 11) It reports over 50 percent improvement versus the initial model, an average 30 percent improvement on out-of-domain tasks (20 programs per task), and a 50 percent training-time reduction when subprograms are used. Section 6.2 (page 12) specifies 20 generated programs per task but does not tabulate the per-specification pass counts. The reported training durations differ: the introduction says 20 minutes (page 2), section 6.1 says less than 5 minutes (page 11), and section 6.3 says less than one hour (page 12). The paper does not reconcile these durations. Its percentage improvements are not explicitly distinguished as relative changes or percentage-point differences.

Verus form: Inference: generate candidate Rust functions, verify them in CI, and add only proof-checking candidates to the supervised corpus. A Verus proof result is the acceptance filter; model training remains outside Verus. Inference: this creates a sound data-selection loop only if the verifier, specifications, and generated API model are trusted.

## techniques for the catalog
- AST-to-FSA abstraction: parse generated control flow, map API keywords to finite-state transitions, and model-check the product with an environment system
- compositional safety theorem: compose individually safe automata only after checking every join against bad-prefix conditions
- verification-guided refinement: use only model-checked programs as labels for supervised fine-tuning, preferably at component granularity
