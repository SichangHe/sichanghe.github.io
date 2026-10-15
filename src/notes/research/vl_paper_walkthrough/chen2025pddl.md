# Language Models For Generalised PDDL Planning: Synthesising Sound and Programmatic Policies
(authored by agents unless marked 🧑)
Tag: `chen2025pddl`, [paper](https://arxiv.org/abs/2508.18507)

## problem and core method
Chen, Zenn, Cinquin, and McIlraith use language models to generate Python programs for generalised planning over PDDL domains. Their abstract says: "our approach synthesises policies that are provably sound relative to the PDDL domain without reliance on external verifiers." (Abstract, p. 1.) The input is a domain, two training problems, and prompts containing PDDL and a Gripper code example; the LM emits a value function or policy once per domain, then a planner instantiates it for each test problem (§3, pp. 4–5). The program example teaches syntax and class structure, not the solution (§3.1, p. 4).

Inference: the useful pattern for VL is to constrain an agent's generated code behind an interface whose outputs are legal in the current state, then prove the wrapper's safety independently of the model's algorithmic quality.

## technique 1: sound reactive policies by applicable-action restriction
what it is and when to use it
A policy receives state s and applicable actions A(s), and must return π(s) ∈ A(s). The implementation wraps generated code: if it returns an inapplicable action or errors, the wrapper chooses a random applicable action (§3.2.a, p. 5). The authors state: "Notably, a plan is only returned when the goal is reached so any returned action sequence reaches the goal." (§3.2.a, p. 5.)

steps
1. Compute A(s) from the PDDL transition model (§2, p. 3)
2. Call the generated policy with s and A(s) (§3.2.a, p. 5)
3. Replace an error or output outside A(s) with a random member of A(s) (§3.2.a, p. 5)
4. Repeatedly apply f(s,π(s)) until a goal is reached or no actions exist (§3.2.a, p. 5)
5. Return a plan only after checking the goal (§3.2.a, p. 5)

Theorem 1's proof is structural: every action is applicable at its current state, so the sequence is applicable, and goal checking makes the returned plan valid (§3.2.a, p. 5). The policy is sound but incomplete: it can loop or fail despite an existing plan (§4, p. 6).

Verus form (inference)
Inference: define an executable Rust transition function and a policy `fn choose(s: State, a: Set<Action>) -> (x: Action) ensures a.contains(x)`. A wrapper can choose a fallback action after checking membership. Use a `requires` clause for nonempty A(s), and a loop invariant that the current state is reachable by applicable transitions. Verus can prove legality and goal-checking; it cannot prove an LM will choose a useful action or that the external PDDL parser is correct.

## technique 2: safe value functions with complete search
A generated value function h:S→R∪{∞} guides greedy best-first search (GBFS). The wrapper converts ∞ to a large constant, making the heuristic safe; GBFS is then sound and complete for finite state spaces (§3.2.b, p. 5). The paper states: "Theorem 2. Approach (3.2.b) is sound with respect to an input planning problem P and complete if the state space of P is finite." (§3.2.b, p. 5.)

steps
1. Generate a Python class implementing h from the domain and two training problems (§3.1, p. 4)
2. Replace ∞ outputs by a large constant (§3.2.b, p. 5)
3. Initialize a queue with the initial state; pop lowest h, generate every applicable successor, track visited states, and stop at a goal (§2, p. 3; Algorithm 1, p. 5)
4. Rely on finite-state GBFS completeness (§3.2.b, p. 5)

Inference: in Verus, prove a wrapper returns a bounded integer heuristic and prove the search loop's visited-state and queue invariants. Completeness requires a finite-state model and termination argument; it does not follow for arbitrary Rust heaps or unbounded integers.

## technique 3: combine policy and value queues
The planner alternates a heuristic queue qH and a policy queue qP. It pops from one, pushes π(s) into qP, and expands all applicable successors into qH (Algorithm 1, lines 1–13, p. 5). Theorem 3 says this remains sound and complete for finite state spaces (§3.2.c, p. 5). This lets a fast but incomplete policy propose useful states while exhaustive search preserves coverage.

Inference: represent the two queues as ghost or executable sequences and prove every qP insertion satisfies transition legality; retain the standard GBFS visited invariant. The paper's completeness proof assumes finite state spaces and exhaustive expansion, so it does not carry to a product with external side effects without additional modeling.

## technique 4: validation and portfolio choice
For each of 10 domains, each LM is called 10 times for value and policy programs. The best program is selected by average score over 10 small training problems; a solved problem scores (1+log(t+1))^-1 for t<60 seconds, otherwise 0 (§4, p. 6). The selected policy, value search, and combined method are compared under fixed budgets.

On 900 test problems (90 in each of 10 domains), 1,800 seconds and 8 GB per problem, πLM solved 563, VLM 397, πLM⊕VLM 424, and portfolio πLM⊗VLM 630 (Table 2, p. 7). LAMA solved 557. πLM was sound but incomplete; VLM and πLM⊕VLM were sound and complete (Table 2). These denominators are the table's 900 problems, with each domain's maximum 90.

Inference: for VL, validation can choose among generated proof-oriented components, but the training score is a performance heuristic, not a correctness proof. A Verus CI gate must still verify every selected component against its contract.

## technique 5: symbol-ablation test
The authors replace every type, predicate, function, schema, and object name with symbols such as p1, a1, and o1, then rerun generation and planning (§4, pp. 7–8). The abstract reports that models "sometimes plan more effectively over PDDL problems written in meaningless symbols" (Abstract, p. 1). The paper treats this as provocative and says more experimentation is needed (§4, p. 7). Inference: this weakens an assumption that semantic names are necessary, but it does not establish symbolic reasoning or rule out prompt and distribution effects.

## evidence, trust, and product threat
The implementation uses Python for heuristic evaluation, C++ data structures, and SQLite for applicable-action queries (§4, p. 6). Models were DeepSeek-R1, Gemini 2.0 Flash, and Gemini 2.5 Flash Preview; training selected among 10 generations per domain (§4, p. 6). The experiments support these benchmark comparisons only. Trusted parts include the PDDL domain, parser, generated Python, wrapper, planner implementation, model serving, and hardware. The soundness theorem is relative to the formal PDDL transition function; it does not prove that the domain captures the real world or that policy performance generalizes beyond the 10 domains and 101 validation/test-size ranges (§4, p. 6).

Inference: threat to agent-written verified Rust is moderate to high when generated code controls state transitions without an applicable-action wrapper. With a Verus contract on every transition and a separately checked search loop, the pattern is useful: an LM can propose a policy while the verifier enforces local legality. VL should not redo generic claims that generated plans without soundness checks are unsafe; this paper already quantifies the value of sound wrappers and complete search.

## techniques for the catalog
- applicable-action wrapper: restrict policy outputs to actions legal in the current state and fallback on errors
- safe heuristic wrapper: replace unsafe infinity outputs so GBFS remains sound and complete on finite spaces
- dual-queue search: combine policy proposals with exhaustive heuristic expansion while retaining completeness
- training validation: select generated programs by timed performance on held-out small problems
- symbol ablation: replace semantic identifiers with symbols to test dependence on lexical meaning
Checked 2026-10-15 against paper chen2025pddl: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
