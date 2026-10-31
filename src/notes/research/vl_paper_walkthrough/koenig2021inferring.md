# Inferring Invariants with Quantifier Alternations: Taming the Search Space Explosion
(authored by agents unless marked 🧑)
Tag: `koenig2021inferring`, [paper](https://arxiv.org/abs/2112.05304)

## scope and result

Koenig, Padon, Shoham, and Aiken extend PDR/IC3 invariant inference to quantified first-order invariants with alternating universal and existential quantifiers. Their implementation combines quantified separation, breadth-first search over quantifier prefixes, a restricted Boolean matrix form called k-term pseudo-DNF (k-pDNF), EPR restrictions, multi-block generalization, and robust SMT scheduling. The paper's problem setting is a transition system with initial states `Init`, transition relation `Tr`, axioms `Ax`, and safe states `Safe`; an invariant `I` must satisfy `Init ⇒ I`, `I ⇒ wp(I)`, and `I ⇒ Safe` (Section 2, pp. 3–4).

The contribution is an automated invariant learner for distributed protocols. The authors emphasize the search problem: “the search space for quantified separators explodes as the number of symbols in the vocabulary and number of quantifiers increases.” (Section 1, p. 2) Their evaluation has 30 safe protocol problems, including Paxos variants, on a 56-thread machine with 16 threads and 20 GiB per experiment; every algorithm is run five times with a six-hour limit (Section 6.2, p. 12).

## technique 1: breadth-first quantified inductive generalization

what it is

PDR/IC3 blocks a state `s` with an inductive-generalization (IG) lemma `p` satisfying `s ⊭ p`, `Init ⇒ p`, and `Fi−1 ∧ p ⇒ wp(p)`. Quantified separation searches a predetermined formula space for a separator matching positive, negative, and implication structure constraints. The paper lifts the choice of quantifier prefix out of the separator solver: each prefix gets an independent refinement loop, and worker threads explore prefixes in breadth-first order.

when to use it

Use this when quantified formulas have very different search costs or when a depth-first separator search gets trapped in a difficult quantifier region. Breadth-first scheduling lets an easy universal or shallow alternating prefix find a useful lemma before an expensive prefix consumes the search budget. The authors state the intended effect: “we search in multiple parts of the search space simultaneously rather than exhaustively exploring one region before moving to the next.” (Section 1, p. 2)

how to apply it

1. Start an IG query with a negative constraint for the state being blocked (Section 3.1, p. 5).
2. Enumerate quantifier prefixes in categories, prioritizing low depth, few alternations, universal starts, and few existential variables (Section 3.2, p. 6).
3. Give each worker a prefix `P` and its own constraint set `C(P)`; call quantified separation to propose a matrix (Figure 1, p. 7).
4. Check `Init ⇒ p` and `Fi−1 ∧ p ⇒ wp(p)` with SMT. Add any countermodel as a positive or implication constraint, then repeat for that prefix (Sections 3.1 and 3.3, pp. 5–7).
5. Reuse constraints from immediate sub-prefixes `S(P)` through `RC(P)=⋃ C(P′)`, but avoid copying every global constraint (Section 3.3, p. 7).
6. Return the first lemma that passes both checks as the IG solution (Figure 1, p. 7). Separately, the full algorithm cancels an IG query when another task learns or pushes a lemma that solves it (Section 5.5, p. 12).

evidence and limits

Parallelism changes both wall-clock time and lemma quality. In Table 3, five trials of `multi-paxos-epr` succeed in parallel in 3 trials versus 1 serially, with 67 versus 84 average IG queries; the authors say the parallel algorithm "learns fewer lemmas overall, which suggests it generalizes better" (Table 3 and Section 6.4, p. 15). Table 3 uses a single prefix category with a static prefix order and multi-block generalization disabled, with 3-hour (parallel) and 48-hour (sequential) timeouts. Inference: this is an empirical proxy, not a proof that breadth-first lemmas are globally better; prefix categories and the fixed worker count are hand-designed search biases.

## technique 2: k-term pseudo-DNF matrices

what it is

The quantifier-free matrix of a separator is restricted to k-term pseudo-DNF: `¬c1 ∨ c2 ∨ … ∨ ck`, where each `ci` is a conjunction (cube) of literals. Equivalently, any number of free literals may precede up to `k−1` cubes. One-term pDNF equals one-clause CNF; two-term pDNF expresses a cube implication to a cube. This form keeps the same SAT indicator-variable scale as k-clause CNF or k-term DNF while matching human-written quantified invariants better (Section 4, pp. 8–9).

when to use it

Use k-pDNF when quantifier alternations make CNF distribution duplicate antecedents across many clauses, or when DNF would require a separate cube for every antecedent literal. The Paxos example in Section 4 needs three CNF clauses after distributing an implication, and k = 4 in k-term DNF, but in pDNF the antecedent stays as one negated cube (p. 8).

how to apply it

1. Select a small `k`; the implementation uses `k=1` for universal prefixes and `k=3` for other prefixes (Section 6.2, p. 12).
2. Encode the candidate matrix as SAT variables indicating whether each literal occurs in each clause or cube (Section 3.1, pp. 5–6; Section 4, p. 9).
3. Add separation constraints for positive, negative, and implication structures and solve for a matrix in the selected pDNF space.
4. Check the resulting formula with SMT and refine the prefix's constraints when it fails initialization or relative inductiveness (Figure 1, p. 7).

Verus form (Inference): encode a pDNF candidate as a `spec fn` over ghost protocol records, with each cube a conjunction and the outer form a disjunction. Use `assert` and `proof fn` lemmas to prove initialization and transition preservation for the selected candidate. Assumption about Verus, not from the paper and not checked here: quantified specs need suitable triggers or bounded domains, so a pDNF search tool would have to generate and test those. The paper's SAT encoding and pDNF grammar do not carry over as Verus syntax.

evidence and limits

The ablation isolates this representation: replacing pDNF with five-clause CNF causes many difficult examples to fail and makes successful `flexible-paxos-epr` runs much slower (Table 2, p. 14; Section 6.4, p. 15). The technique is still bounded by `k`: the paper says 2-term pDNF is “sufficient for all but a handful of the lemmas required for invariants in our benchmark suite” and gives one 3-term exception (Section 4, pp. 8–9).

## technique 3: multi-block and heuristic proof obligations

what it is

Classic PDR blocks states required to prove a safety property (“must” obligations). The system also speculatively blocks pushing preventers of existing lemmas (“may” obligations) to discover lemmas that make those existing lemmas inductive. After one successful IG lemma, it can accumulate additional same-frame preventers and search for a single lemma blocking all of them (Section 5.1–5.2, pp. 9–10).

how to apply it

1. Select a pushing preventer for a safety lemma or, heuristically, for another frame lemma (Section 5.1, p. 9).
2. Recursively block predecessors in the prior frame; if recursion reaches `F0`, mark the chain reachable and the speculative lemma unsuitable (p. 9).
3. After finding a candidate that blocks `s`, compute the next preventer `s′`. If it is in the same frame, add `s′` as another negative separation constraint and continue until timeout (Section 5.2, p. 10).
4. Stop when no suitable state remains or the time spent equals that of the original query, which bounds generalization to half the time; then add the lemma to frame `i` and push (Section 5.2, p. 10; Figure 2, p. 11).

evidence and limits

The ablation shows mixed effects: the paper says multi-block generalization (No Gen.) “makes many problems faster or more reliable, but disabling it allows block-cache-async to succeed” (Section 6.4, p. 15). Inference: it is therefore a heuristic rather than a monotonic improvement. May-obligation lemmas are chosen at random (Section 5.1, p. 9); the paper repeats each algorithm five times “to account for noise caused by randomness in seed selection” (Section 6.2, p. 12) and notes the “non-determinism of parallelism” (Section 6.3, p. 14).

## technique 4: EPR restriction and quantified SMT robustness

what it is

Effectively Propositional Reasoning (EPR) is a decidable first-order fragment with finite-model property. The tool enforces EPR by preselecting allowed sort-to-sort function edges and skipping prefixes whose Skolem functions create cycles. It also supports a non-prenex mode that pushes quantifier scopes into pDNF disjuncts when a prenex form would violate EPR (Section 5.3, pp. 10–11).

For solver robustness, the implementation periodically restarts, runs Z3 and CVC5 in parallel, and sends SMT assertions incrementally. A subset that proves unsatisfiable can return immediately; a satisfying model is accepted only when no unasserted formula is violated (Section 5.4, p. 11).

how to apply it

1. Choose an acyclic set of allowed edges from domain sorts to function codomains before inference (Section 5.3, p. 10).
2. Skip any quantifier prefix whose Skolemization would add a disallowed cycle; keep the allowed set fixed because PDR cannot remove a lemma later (p. 10).
3. For each hard SMT query, assert a small subset of frame lemmas, return on UNSAT, or add one violated formula from a SAT model and repeat (Section 5.4, p. 11).
4. Run multiple instances of both solvers in parallel and restart periodically, since some queries take minutes to hours (p. 11).

Verus form (Inference): express EPR-like protocol states with finite ghost maps and acyclic function dependencies, and make any environment assumptions explicit in `requires`. A separate orchestration layer can run Verus or SMT checks with incrementally added lemmas, and solver portfolio control would live in that layer (assumption about Verus tooling, not checked). A proof that succeeds under a bounded finite model still needs a refinement argument for the executable Rust state.

evidence and limits

The allowed-edge set is a stated limitation: the authors say requiring it as input “is a limitation of our technique and other state-of-the-art approaches” (Section 5.3, p. 10). Without EPR, ablation causes timeouts for all but simple Paxos variants (Section 6.4, p. 15). The full system cannot solve `vertical-paxos-epr`, which requires a seven-quantifier formula and is “very expensive for our IG solver” (Section 6.3, p. 14).

## evaluation and boundary of evidence

The benchmark has 30 safe transition systems with known human-written invariants (Section 6.1, p. 12). Each result in Table 1 is a median wall-clock time and successes out of five trials, under 16 hardware threads, 20 GiB RAM, and six hours. The system uniquely solves `multi-paxos-epr`, `fast-paxos-epr`, and `stoppable-paxos-epr` in some trials, but the success counts are 4/5, 3/5, and 2/5 respectively; these are not guaranteed outcomes (Table 1, p. 13; Section 6.3, p. 14). It solves `paxos-epr` in 5/5 trials at 920 seconds median and `flexible-paxos-epr` in 5/5 at 418 seconds, under the same setup (Table 1, p. 13). Inference: trusted elements include the transition-system models, human-selected safety predicates, allowed EPR edges, quantifier-prefix categories, SAT/SMT solvers, and the known-safe benchmark assumption. The paper states no soundness theorem and does not discuss whether the benchmark models faithfully encode deployed protocols. Inference: a returned formula is trusted through the SMT checks of the invariant conditions, and fidelity of the models to deployed protocols is outside the evidence.

## techniques for the catalog

- breadth-first quantified IG — distribute quantifier-prefix separation across workers and refine each prefix with initialization and inductiveness counterexamples
- k-term pDNF — restrict quantified separator matrices to a compact negated-cube plus cubes form that fits alternating invariants
- multi-block generalization — accumulate same-frame blocking states so one lemma generalizes across several PDR preventers
- EPR edge control — preselect acyclic sort/function edges and reject prefixes whose Skolemization would leave the decidable fragment
- incremental SMT portfolio — assert lemmas incrementally while running solver instances in parallel with restarts
