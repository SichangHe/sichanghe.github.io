# A Certificate-Producing Cascade for Equational Implication: The SAIR EQT2 Stage 2 Solver
(authored by agents unless marked 🧑)
Tag: `ma2026certificate`, [paper](http://arxiv.org/abs/2609.00706v1)

## system contract and trusted boundary

Ma, Zhang, and Cázares build a single-file solver for magma equational implication. A true answer must provide a Lean 4 proof of universal implication; a false answer must provide a concrete magma satisfying the hypothesis but falsifying the conclusion. The competition judge compiles the term, checks it with the Lean kernel, and enforces dependencies. The paper states: “Search results remain outside the trusted base: successful derivations are replayed as small Lean 4 terms, and countermodels are rechecked by the competition judge.” (Abstract, p. 1.)

The solver is a 189,504-byte Python file. The abstract reports accepted certificates for all 1,889 rows in six public sets under judge revision 2848228, plus 800/800 distribution-drill rows, 100/100 Marathon rows, and 200/200 hosted-playground rows. These are local or hosted measurements, not hidden-set or leaderboard evidence. The authors explicitly say: “Neither the countermodel families nor the superposition implementation is proved complete, and the deeper stages stop at wall-clock limits.” (§1, p. 1.)

Inference: the reusable design is a certificate-producing search cascade. A fast heuristic may be wrong or incomplete, but only a verifier-checked certificate can produce an accepted result. This maps directly to a Verus product in which generated proof search is untrusted and `verus` checking is the acceptance boundary.

## technique 1: cheapest-first polarity cascade

what it is

The cascade tries inexpensive countermodel and direct-proof recognizers before expensive search. In Solo mode, each stage constructs a candidate of one polarity and submits it to the judge; an absent or rejected candidate leaves the row for later strategies. Stage A tries shallow countermodels; Stage B tries direct true certificates, a singleton-forced prover, and a quick general-superposition pass; Stage C searches irregular finite models of carriers four through ten; Stage D performs deeper false search; Stage E runs anytime ordered superposition. The paper says: “Every stage independently verifies its candidate before the solver stops.” (§2.2, p. 3.)

how to apply it

1. Normalize the input operation symbol at the protocol boundary: map the allowed asterisk spelling to the internal diamond token (§2.1, p. 2; §5.2, p. 7)
2. Compute term features once—operation count, variable support, depth, and tree size—and reuse them for dispatch and scheduling (§2.3, p. 3)
3. Run shallow model families and direct true recognizers (§2.2)
4. Discard a candidate if local construction or Solo judge checking fails; absence of a witness does not establish the opposite verdict (§2.5, p. 3)
5. Spend the remaining budget on deeper model search and proof search (§2.2)

The implementation uses caps: the irregular shallow search receives eight seconds, deep false passes receive sixty and 120 seconds, and anytime proof search receives `min(600, max(20, T/6))` seconds under the Solo budget (§2.2, p. 2). The paper's invariant is deliberately weak: “Failure to find a finite model does not support truth; failure to derive the goal does not support falsity.” (§2.5, p. 3.)

Verus form

Inference: use a Rust controller that orders candidate proof strategies by expected cost, but call Verus verification after each generated candidate. Keep “not found” distinct from a verified false or true result. Verus constructs such as `requires`, `ensures`, `assert`, and proof functions can check each candidate; the controller itself remains ordinary Rust and must not be treated as proof evidence.

## technique 2: structured and irregular countermodels

what it is

For a false implication, search operations that satisfy every hypothesis assignment and find one goal-falsifying assignment. Structured families include scalar linear/affine operations modulo `n`, matrix-linear operations over small finite fields, vector families, low-degree polynomials, and recognized infinite-carrier operations. Coefficient matching represents `x ⋄ y = ax + by (mod n)` as vectors: universal identity checking becomes vector equality, and differing goal vectors yield a separating assignment. The paper cautions: “coefficient matching remains an untrusted search optimization rather than a proof rule.” (§3.1, p. 4.)

Irregular finite models treat a Cayley table as a constraint problem. Ground hypothesis instances watch table cells; minimum-remaining-values chooses the next cell; partial tables are abandoned as soon as a hypothesis instance becomes unequal. The solver infers Latin row/column constraints, propagates forced values, and checks the completed table independently before emitting Lean. A development example changed an eight-element quasigroup search from no witness within 120 seconds to a witness in 0.3 seconds after propagation (§3.2, p. 4). The shallow production interval is carriers 4–10 with an eight-second cap; the deep pass revisits it with a longer cap.

The authors add a fixed non-natural central-groupoid witness of order nine for twelve distribution-drill residuals (§3.3, p. 5). For recognized Austin pairs, they use a fixed operation on the natural numbers and a concrete tuple falsifying the goal (§3.4, p. 5). These families avoid the unsound inference that failure to find a finite model proves a universal implication.

how to apply it

1. Parse each equation into a non-associative binary tree; do not reassociate or commute terms (§2.3)
2. Alpha-rename variables for cache keys while retaining the judge's binder order in emitted proofs (§2.3)
3. Try coefficient vectors, affine constants, matrix families, polynomial evaluators, and recognized infinite witnesses (§3.1, §3.4)
4. If structured families fail, allocate a finite table and propagate hypothesis and Latin constraints (§3.2)
5. Re-evaluate every hypothesis assignment and at least one goal-falsifying assignment from scratch (§3.2)
6. For finite models, emit a carrier, total binary operation, and finite-decision proof (§3.2, §3.5); for infinite Austin models, emit explicit hypothesis lemmas and a concrete refutation of the goal (§6.2, p. 8)

For carriers through ten, the shape uses `Fin n`, `finOpTable`, and `decideFin!`; larger carriers use a namespaced operation definition whose body computes a linear, affine, polynomial, or packed-table operation (§3.5, p. 5).

Verus form

Inference: encode a candidate finite model as ghost data plus a total operation and prove, with `requires`/`ensures` and quantified `assert` steps, that all hypothesis instances hold and the selected goal instance differs. Verus does not use Lean's `Fin` or `decideFin!`; ordinary Rust arithmetic and explicit bounds must replace them. The Python search and table propagation stay outside the trusted proof, while Verus checks the emitted witness properties.

## technique 3: proof-producing ordered superposition

what it is

The true branch uses unit equational logic. Terms are immutable trees; Knuth–Bendix ordering orients equations; superposition overlaps an oriented side with a non-variable subterm, computes a most-general unifier, and constructs a new equality. Forward and backward demodulation simplify clauses. A negative goal clause `u ≠ v` is used internally, but replay emits a positive equality chain ending at the original goal (§4.1, p. 5).

The engine stores derivation recipes and replays each retained equation into Lean using `congrArg`, symmetry, and transitivity. The exact trust boundary is stated as: “The Python engine can orient an equation incorrectly, use a stale cache, or reconstruct the wrong path; any of these produces a term that fails to elaborate or has the wrong type.” (§4.5, p. 6.)

how to apply it

1. Canonicalize terms and orient usable equations with Knuth–Bendix ordering (§4.1)
2. Index demodulation rules by linear skeleton, then filter retrieved rules by matching and ordering (§4.3, p. 6)
3. Use forward/backward demodulation and a given-clause loop with weight and age queues (§4.1)
4. Cache normal forms, substitutions, term statistics, and renamed overlap pairs; reject overlaps whose estimated instantiated size exceeds the current cap (§4.3)
5. Increase term-size and variable caps across anytime rounds, carrying unused time forward (§4.4, p. 6)
6. Record one derivation recipe per selected inference and replay it as explicit equality steps (§4.5)
7. Submit the generated Lean term; if elaboration fails, re-emit core equality alternatives without rerunning search (§4.5)

A concrete failure fix is important: when demodulation produced a tautology `s = s`, the old prover retained it and starved useful clauses. Deleting the tautology found the hard3_0314 proof in 0.6 seconds in direct measurement and produced an accepted certificate in 14.6 seconds (§4.2, p. 6). This is an implementation diagnosis, not a general speedup claim.

Verus form

Inference: adapt the search/replay separation using Verus proof functions that derive equalities and `assert`/`calc`-style chains accepted by Verus. Search can maintain an external DAG of rewrites; the final Rust proof must restate each equality using valid Verus proof constructs. This design alone establishes neither completeness nor a runtime bound for a Verus implementation.

## evidence, assumptions, and limits

Table 1 reports accepted rows with denominators: sample_20 20/20, sample_200 200/200, hard1 69/69, hard2 200/200, hard3 400/400, and normal 1000/1000; all used zero LLM calls and one judge call per accepted row (Table 1, p. 10). Their sum is 1,889. Table 2 reports 200/200 for each of four 200-row distribution splits, 100/100 for Marathon normal_100, and 200/200 for hosted evaluation_normal (Table 2, p. 10). The hosted measurement reports mean 4.89 seconds per problem; it is an operator attestation, not a repository ledger. A focused development corpus found all 254/254 derivations under a 30-second per-pair cap, and all 819/819 public true problems under the quick cap; these are prover-only measurements and not comparisons with Vampire. The paper says they have “no standalone hash-bound runner ledger” (§7.5, p. 9).

Acceptance depends on the judge-generated goal, Lean elaboration and kernel checking, and dependency inspection (§2.1, p. 2). The emitted term is checked evidence; the solver's parser, search heuristics, model finders, caches, and scheduling are untrusted producers. Provenance hashes bind recorded artifacts; they do not establish mathematical validity. The authors state: “Finally, kernel checking validates each emitted theorem relative to the judge’s imported environment and allowed axioms.” They add: “It does not validate that the benchmark labels, competition problem generator, or provenance narrative are correct.” (§8.2, p. 11.)

The paper also reports 200/200 accepted problems with zero language-model calls on the additional official stage2_stress_test set. It publishes no per-item reference labels; its verdict counts match the announced category composition. On research_order5_hard, the solver certifies none of 100 problems within its budgets. Both result ledgers are described as hash-bound (§8.4, p. 11). Public suites influenced development, and the authors make no hidden-set, completeness, comparative-superiority, or leaderboard claim (§8.1–§8.2, pp. 10–11; §10, p. 12).

Solo submits candidates interactively. Marathon instead appends candidate rows durably, and the runner checks the last complete candidate per identifier after process exit: “Marathon cannot make interactive judge calls.” (§6.4, p. 8.) Its output durability and scheduling therefore differ from Solo's acceptance loop.

Inference: the threat to agent-written verified Rust is moderate. Untrusted search can waste time, emit malformed proofs, or miss a proof, but a sound Verus checker should reject an invalid term. The remaining product risk is specification omission: this paper validates certificates for a fixed mathematical goal, not whether an agent selected the right Rust contract.

## techniques for the catalog

- cheapest-first certificate cascade — order structured countermodels, direct proofs, bounded searches, and anytime proof search by cost, checking every candidate
- structured countermodel search — use coefficient, affine, matrix, polynomial, finite-table, central-groupoid, and infinite-carrier families to find false witnesses
- constraint propagation for tables — watch hypothesis instances, infer Latin constraints, and backtrack partial Cayley tables before independent reevaluation
- proof-producing ordered superposition — orient and saturate equations, retain derivation recipes, then replay positive equality chains in the kernel
- tautology deletion — retire clauses simplified to `s = s` so they cannot starve useful saturation clauses
- certificate provenance — bind solver bytes, judge revision, result files, and table rows to immutable hashes
