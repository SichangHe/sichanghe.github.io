# Language Models For Generalised PDDL Planning: Synthesising Sound and Programmatic Policies
(authored by agents unless marked 🧑)
Tag: `chen2025pddl`, [paper](https://arxiv.org/abs/2508.18507)

## problem and core method
Chen, Zenn, Cinquin, and McIlraith use language models to generate Python programs for generalised planning over PDDL domains. Their abstract says: "our approach synthesises policies that are provably sound relative to the PDDL domain without reliance on external verifiers." (Abstract, p. 1.) The input is a domain, two training problems, and prompts containing PDDL and a Gripper code example; the LM emits a value function or policy once per domain, then a planner instantiates it for each test problem (§3, pp. 4–5). The program example teaches syntax and class structure, not the solution (§3.1, p. 4).

## technique 1: sound reactive policies by applicable-action restriction
what it is and when to use it
A policy receives state s and applicable actions A(s), and must return π(s) ∈ A(s). The implementation wraps generated code: if an error or mistake produces π(s) ∉ A(s), the wrapper chooses a random applicable action (§3.2.a, p. 5). The authors state: "Furthermore, a plan is only returned when the goal is reached so any returned action sequence reaches the goal." (Theorem 1 proof sketch, §3.2.a, p. 5.)

steps
1. Compute A(s) from the PDDL transition model (§2, p. 3)
2. Call the generated policy with s and A(s) (§3.2.a, p. 5)
3. Replace an output outside A(s) with a random member of A(s), provided A(s) is nonempty (§3.2.a, p. 5)
4. Repeatedly apply f(s,π(s)) until a goal is reached or no actions exist (§3.2.a, p. 5)
5. Return a plan only after checking the goal (§3.2.a, p. 5)

Theorem 1's proof is structural: every action is applicable at its current state, so the sequence is applicable, and goal checking makes the returned plan valid (§3.2.a, p. 5). The policy is sound but has no completeness or termination guarantee (§4, Limitations, p. 8).

Verus form (inference)
Inference: define an executable Rust transition function and a policy `fn choose(s: State, a: Set<Action>) -> (x: Action) ensures a.contains(x)`. A wrapper can choose a fallback action after checking membership. Use a `requires` clause for nonempty A(s), and a loop invariant that the current state is reachable by applicable transitions. Verus can prove legality and goal-checking; it cannot prove an LM will choose a useful action or that the external PDDL parser is correct.

## technique 2: safe value functions with complete search
A generated value function h:S→R∪{∞} guides greedy best-first search (GBFS). The wrapper converts ∞ to a large constant, making the heuristic safe; GBFS is then sound and complete for finite state spaces (§3.2.b, p. 5). The paper states: "Theorem 2. Approach (3.2.b) is sound with respect to an input planning problem P and complete if the state space of P is finite." (§3.2.b, p. 5.)

steps
1. Generate a Python class implementing h from the domain and two training problems (§3.1, p. 4)
2. Replace ∞ outputs by a large constant (§3.2.b, p. 5)
3. Initialize a queue with the initial state; pop lowest h, generate every applicable successor, track visited states, and stop at a goal (§2, p. 4)
4. Rely on finite-state GBFS completeness (§3.2.b, p. 5)

Inference: in Verus, prove a wrapper returns a bounded integer heuristic and prove the search loop's visited-state and queue invariants. Completeness requires a finite-state model and termination argument; it does not follow for arbitrary Rust heaps or unbounded integers.

## technique 3: combine policy and value queues
The planner uses two queues ordered by h: qH holds successors from exhaustive expansion, and qP holds states predicted by the policy. It checks the initial goal, initializes qH with the initial state and qP empty, then alternates queue selection, adds the policy-predicted state to qP, and expands all applicable successors for qH (§3.2.c and Algorithm 1, lines 1–12, p. 5). The pseudocode writes qP.push(π(s)), although §3.2.a defines π(s) as an action; the accompanying prose describes a predicted state. Inference: the intended insertion is the successor f(s,π(s)). Theorem 3 claims soundness and completeness for finite state spaces because the search remains exhaustive (§3.2.c, p. 5).

Inference: represent the two queues as ghost or executable sequences and prove every qP insertion satisfies transition legality; retain the standard GBFS visited invariant. The paper's completeness proof assumes finite state spaces and exhaustive expansion, so it does not carry to a product with external side effects without additional modeling.

## technique 4: validation and portfolio choice
For each of 10 domains, each LM is called 10 times for value and policy programs. The best value function and policy are selected by average score over 10 small training problems; a solved problem scores (1+log(t+1))^-1 for t<60 seconds, otherwise 0 (§4, p. 6). The portfolio πLM⊗VLM chooses between policy rollout and combined search πLM⊕VLM according to whether πLM or VLM, respectively, achieves the higher average validation score (§4, Approaches, p. 6). Appendix D (p. 18) separately analyzes correlation using 11 small training problems and 10 test problems sampled every ninth problem from their respective splits.

On 900 test problems (90 in each of 10 domains), 1,800 seconds and 8 GB per problem, πLM solved 563, VLM 397, πLM⊕VLM 424, and portfolio πLM⊗VLM 630 (Table 2, p. 7). LAMA solved 557. πLM was sound but incomplete; VLM and πLM⊕VLM were sound and complete (Table 2). These denominators are the table's 900 problems, with each domain's maximum 90.

## technique 5: symbol-ablation test
The authors replace every type, predicate, function, schema, and object name with symbols such as p1, a1, and o1, then rerun generation and planning (§4, pp. 7–8). The abstract reports that models "sometimes plan more effectively over PDDL problems written in meaningless symbols" (Abstract, p. 1). Table 3 (p. 8) reports total value-function coverage rising from 397 with semantic names to 406 with symbols, but policy coverage falling from 563 to 424. Symbolic policies still solve all 90 problems in Ferry, Miconic, and Spanner. Section 4 (p. 6) cautions: "more experimentation is required to draw conclusive results." Inference: the results weaken an assumption that semantic names are necessary, but do not establish symbolic reasoning or rule out prompt and distribution effects.

## techniques for the catalog
- applicable-action wrapper: restrict policy outputs to actions legal in the current state and replace invalid outputs
- safe heuristic wrapper: replace unsafe infinity outputs so GBFS remains sound and complete on finite spaces
- dual-queue search: combine policy proposals with exhaustive heuristic expansion while retaining completeness
- training validation: select generated programs by timed performance on small training problems
- symbol ablation: replace semantic identifiers with symbols to test dependence on lexical meaning
