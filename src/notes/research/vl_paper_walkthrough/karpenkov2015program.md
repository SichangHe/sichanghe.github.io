# Program Analysis with Local Policy Iteration
(authored by agents unless marked 🧑)
Tag: `karpenkov2015program`: [paper](http://arxiv.org/abs/1509.03424v3)

## what the paper proves or measures

The paper presents local policy iteration (LPI), a configurable program analysis for deriving numerical inductive invariants. It combines policy iteration with CPA fixpoint propagation and adjustable-block encoding. The abstract states: “We present local policy iteration (LPI), a new algorithm for deriving numerical invariants that combines the precision of max-policy iteration with the flexibility and scalability of conventional Kleene iterations.” (Abstract, p. 1). LPI works over template linear constraint domains such as intervals and octagons, and can synthesize templates from program variables or assertions. Its proof claims concern the abstract analysis: termination and soundness of the produced invariant, and optimality relative to classical policy iteration in the absence of integers; the implementation evaluation is empirical.

## technique 1: template linear-constraint abstract interpretation

what it is: choose linear templates `t·X ≤ d`; the unknown bounds `d` form an abstract state denoting the conjunction of all template inequalities. Intervals use `±x`; octagons use `±x ± y` and `±x`. For each transition and template, compute the strongest abstract postcondition by maximizing the output template subject to the input bounds and transition relation.

when to use: use this when safety depends on numeric loop invariants and a finite family of linear relations is sufficient. Inference: it is an over-approximation, and a property outside the chosen templates cannot be represented.

how to do it:
1. model the C program as a control-flow automaton whose edges carry formulas `τ(X,X′)` (Section 2, p. 3)
2. choose a coefficient matrix of templates; each bound `d_i` ranges over extended rationals, where `+∞` means the template is unbounded and `−∞` means an unreachable abstract state (Section 2, p. 3)
3. for every edge and template maximize `t·X′` under `t_i·X ≤ d_i` and `τ(X,X′)`; the resulting bounds are the abstract postcondition (Equation on p. 4)
4. iterate (Kleene or value iteration, Section 2, p. 4) until every successor is subsumed by an existing abstract state; that state is an inductive invariant. The paper notes such iterations may fail to converge in finite time, hence widening.

The paper's running loop `i=0; while(i<1000000) i++;` illustrates why widening can lose precision: adding an unrelated nested loop makes widening plus narrowing leave `[0,+∞)` (Section 1, pp. 1–2). The paper defines a TCD abstract state as a vector `(d1,…,dm)` representing `∧ t_i·X≤d_i` (Section 2, p. 3). “A set C of concrete states is represented using a first-order formula φ with free variables from X, such that for all c ∈ C we have c |= φ.” (Section 2, p. 3)

Verus form: Inference: represent the executable state with a Rust struct and state bounds with a `spec fn` predicate such as `0 <= i && i <= bound`; put the predicate in a loop `invariant` and prove each body transition preserves it. Verus has no generic template-domain solver interface (this is not from the paper), so template selection and maximization remain an external analyzer that supplies candidate bounds; Verus checks the resulting concrete invariant. An invariant is written as a clause, not an `invariant(...)` call.

evidence and limits: the domain is only as expressive as its templates. Rational semantics supports the policy-iteration guarantees; integer constraints are not concave and can over-approximate. The paper's integer example terminates at `x ≤ 2` although the least fixpoint is `x ≤ 1` (Section 4, p. 14). Machine overflow is ignored in the evaluation, so this abstraction can be unsound for C integers.

## technique 2: global policy iteration

what it is: replace each max equation's disjunction by one selected argument (a policy), solve the resulting monotone concave system, then improve policies whose local value is larger. The initial policy selects `⊥` for every disjunction. Value determination computes the least fixpoint of the selected policy; policy improvement searches for a better incoming edge. Each policy is selected at most once under the real-valued assumptions.

how to do it:
1. write one supremum equation for each template at each control location, including an infeasible `⊥` alternative (Section 2, pp. 4–5)
2. start with the all-`⊥` policy and value `−∞`
3. perform policy improvement using the current global bounds substituted on the right-hand side; select an argument whose local maximum exceeds its current bound
4. perform value determination by solving the selected policy's linear program
5. repeat steps 3–4 until no policy improves; the final values satisfy the original fixpoint equations.

The paper's trace on two loops has nine steps: initial policy improvement, value determination, then successive loop-edge selections and determinations ending at `(10,0,10,10)` (Example 1, p. 6). It says: “The iteration starts with the policy having least possible value (⊥ for each disjunction, the solution is −∞ assignment to all unknowns), and eventually terminates when a solution of the original equation system (an inductive invariant) is found.” (Section 2, p. 5)

Verus form: Inference: use policy iteration only as a candidate-invariant generator. Encode each chosen bound as a Verus loop invariant and discharge the preservation proof with `assert`/`lemma` steps. The LP/SMT search is not a Verus proof; the final `ensures` and loop clauses are. Call lemmas from `proof { }` blocks inside executable functions.

evidence and limits: value determination uses linear programming when transitions are conjunctions of linear inequalities, and the resulting value is an under-approximation of the least inductive invariant. The paper says solving all policies one by one is exponential (“(exponentially many) policies”, Section 2, p. 5) and that most queries are redundant in the global scheme (Section 3, p. 7); this motivates LPI. “Each policy improvement requires at least four (small) linear programming (LP) queries, and each value determination requires one (rather large) LP query.” (Example 1, p. 6)

## technique 3: adjustable-block encoding and CPA integration

what it is: keep formulas through loop-free program sections and abstract only at loop heads, avoiding intermediate convex states. CPA supplies an initial state, transfer relation, merge, and stop operator, allowing LPI to communicate with location, congruence, bounded-model-checking, or other analyses.

how to do it:
1. convert an abstracted state `a` to an intermediate state `(a,true)`
2. symbolically execute an edge by existentially composing its transition: `φ′(X,X′)=∃X̂.φ(X,X̂)∧τ(X̂,X′)` (Section 3, p. 11)
3. merge intermediate states with equal starting states by disjoining their formulas; keep different starts separate
4. at loop heads, run the abstraction procedure (Algorithm 2) to maximize every template and record the selected policy and backpointer
5. use CPA's merge and stop rules to propagate until the waitlist is empty (Algorithm 1, p. 8).

The authors explain the precision motivation: “Adjustable block encoding [10] gets the same advantages without the need for CFA pre-processing.” (Section 2, p. 7). Algorithm 2 marks each disjunction with a Boolean, maximizes each template in one OPT-SMT query, fixes the marks to the model, and stores the resulting disjunction-free policy. This preserves path distinctions until abstraction.

Verus form: Inference: keep the Rust state transition executable, and place the full path condition in ghost/spec predicates until a loop boundary. Use a `spec fn` for the path relation and lemmas to connect each branch to the loop invariant. CPA's merge/stop orchestration has no direct Verus construct; it is a front-end that emits proof obligations.

## technique 4: local value determination (LPI)

what it is: solve only the strongly connected component and policies that can influence the current loop head, rather than recomputing a whole-program policy system. Backpointers identify predecessor abstract states; namespaced policy formulas become one optimization problem.

how to do it:
1. on abstraction, store `(bound, policy, backpointer)` for every template (Definition 1, p. 9)
2. when a loop-head merge closes a loop, follow backpointers transitively to form `influencing`
3. namespace every selected policy's input/output variables; constrain inputs by predecessor bounds
4. maximize the current node's template bound subject to all selected policies (Algorithm 3, p. 12; description pp. 10–11)
5. retain the policy and backpointer and continue CPA propagation.

Example 3 obtains the same `(i≤10,j≤10)` invariant with two value-determination LPs and ten LP queries, versus four value-determination problems and more than twenty LP queries for the original method (Example 3, p. 13). The paper claims that with `N` independent loops, the analysis time of classic policy iteration grows quadratically while LPI scales linearly (Example 3, p. 13).

The formal properties are explicit: “Hence the obtained invariant is sound.” and “In the absence of integers, LPI terminates with the same invariant as classical policy iteration with SMT” (Properties of LPI, pp. 12–13). Inference: the optimality claim is stated only for the absence of integers; for integers the paper says its encoding “may still result in an over-approximation” (Section 4, p. 14).

Verus form: Inference: use LPI to propose loop bounds and branch facts, then write a single Verus invariant covering all states in the SCC. Prove each backpointer relation as a lemma; no Verus notion of a policy or local LP exists. The SCC decomposition is a proof-planning aid, not trusted evidence.

## technique 5: template synthesis, refinement, and cooperating analyses

The paper synthesizes interval templates `±x`, octagon templates `±x±y`, and assertion-directed templates such as `±(x−2y)` for `assert(x >= 2*y)` (Section 4, p. 13). Rich templates `±2x±y`, `±x±y±z`, and `±2x±y±z` improve precision. It can conjoin a parity/congruence analysis during maximization, unroll loops to depth two, and try configurations in sequence: intervals, octagons, unrolling, rich templates, then congruence (Section 4, pp. 15–16). Optimization heuristics drop input constraints for input-independent policies, merge LP unknowns with a fallback if the result is not inductive, skip irrelevant template queries, and use weak-topological iteration order.

Verus form: Inference: translate only the selected final relations into contracts and ghost lemmas; parity can be a predicate over `%` or a mathematical evenness relation, while unrolling is ordinary loop reasoning. Keep integer overflow explicit because the paper's analyzer ignores it.

## what is proved, measured, and trusted

The evaluation uses 142 SV-COMP’15 “Loops” C programs, 93 correct, with 15 GB RAM and 900 seconds CPU per program on an Intel Core i7-4770 (Section 5, p. 16). LPI refinement verified 61 programs, versus PAGAI 52, BLAST 45, and CPAchecker 58; it uniquely verified seven programs. In Table 1, “Verified” is the total number of programs a tool could verify and “Incorrect” counts programs that contained a bug yet were deemed correct (Table 1, p. 17; the Incorrect column is 1 for PAGAI, LPI and BLAST, 2 for CPAchecker). LPI's one incorrect result is attributed to unsound overflow handling (Section 6, p. 18). The timing plots exclude timeouts, and Fig. 3a stacks configurations cumulatively. The paper says LPI “compares favorably with lazy abstraction, but that it is considerably outperformed by abstract interpretation” (Section 5, p. 17). Inference: the timing results do not establish a universal speedup.

Trusted assumptions include the CFA encoding, templates, solver/LP answers, integer semantics, and the CPA implementation. Inference: a Verus product should treat LPI as an untrusted invariant-hint generator and retain Verus checking, explicit machine-integer bounds, and specification review. The product threat is high for numeric loops if agents accept rational or overflow-ignoring bounds; a successful Verus proof of a wrong contract still proves only that contract. Inference: existing LPI already covers automatic numeric invariant generation, adjustable blocks, refinement, and congruence cooperation; VL should not redo those as a new algorithm. Its gap is connecting such hints to Rust ownership, heap structures, and requirement-level contracts.

## techniques for the catalog

- template linear constraints — express numeric invariants as maxima of selected linear templates
- policy iteration — alternate policy improvement and linear-program value determination to reach an inductive fixpoint
- adjustable-block encoding — retain symbolic path formulas through loop-free blocks and abstract at loop heads
- CPA integration — expose transfer, merge, stop, and initial-state hooks so analyses cooperate
- local policy iteration — solve only backpointer-reachable policies in the current strongly connected component
- template refinement — add octagon, rich, assertion-directed, unrolling, and congruence information when simpler domains fail

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Unlike classic policy iteration, we only run local value determination after merges on loop heads, because in other cases the value obtained by abstraction is the same as the value which could be obtained by value determination."): read all 20 pages of the paper text; checked every quotation, number, table figure, algorithm and example reference, and section and page citation; changed several page citations (Example 1 is p. 6, Algorithm 3 is p. 12, Example 3 is p. 13), removed an unsupported "denominator is 142" claim, added the paper's statement that abstract interpretation is considerably faster, fixed an incorrect Verus remark about proof functions, and marked own conclusions as Inference; did not check the PDF figures beyond the text extraction, the cited references, or any Verus claims against Verus itself.
