# A Concurrent Constraint Programming Interpretation of Access Permissions
(authored by agents unless marked 🧑)
Tag: `vazou2018concurrent`, [paper](http://arxiv.org/abs/1802.04695v1)

## scope and contribution
The paper gives a declarative and executable verification method for object-oriented concurrent programs annotated with access permissions (APs). Its central move is to translate AP programs into Linear Concurrent Constraint (lcc) processes, where linear-logic constraints represent references, permissions, objects, calls, and synchronization. The paper states: “We interpret AP programs as lcc agents that produce and consume APs when evolving” (Section 1, p. 2). It targets three questions: deadlocks, permitted concurrency, and whether annotations obey the intended permission flow. The paper states: “The proposed program verification includes: (1) deadlock detection; (2) whether it is possible for methods to be executed concurrently or not; and (3) whether annotations adhere to the intended semantics associated with the flow of APs or not” (Section 1, p. 2).

## technique 1: permission-flow encoding as lcc

what it is

An AP is a resource describing aliases and access: `unq` is exclusive, `imm` is read-only and duplicable, `shr:g` allows shared mutation controlled by data group `g`, and `none` describes null. A method signature gives required and restored permissions. The core operational rule is lexical enabling: a statement consumes its needed permissions, the next statement becomes enabled, and the permissions are restored on termination. The paper says: “a statement s is executed only if the evaluation context possesses all the permissions required by s” and “non-conflicting blocks lead to concurrent executions and conflicting blocks are sequentialized according to the lexical order of the program” (Section 2.2, pp. 7–8).

when to use it

Use this encoding when aliases and mutable sharing determine which calls may overlap, especially when ordinary locks obscure the dependency structure. Use data-group permissions when shared calls need an explicit higher-level ordering. A unique permission can be split into immutable permissions for concurrent readers and joined afterward; an atomic data-group permission can be split into concurrent group permissions, then joined.

how to do it

1. Annotate constructors and methods with input and output permissions. For example, the paper’s collection example uses `sort() unq(this) => unq(this)`, `print() imm(this) => imm(this)`, and `compStats(...) imm(this),unq(s) => imm(this),unq(s)` (Section 2, p. 4).
2. Represent each variable/object relationship by a linear constraint such as `ref(x,o,p,g)` and count aliases with `ct(o,n)`. The encoding also emits process-state tokens `act(z)`, `run(z)`, and `end(z)`.
3. Translate assignments with rules that consume the old reference/count constraints and produce the new alias permissions. A unique source becomes shared aliases; immutable and shared sources preserve their permission kind. The paper’s formal syntax includes `rh⟨g⟩ := rhs`, calls, allocation, `split⟨g⟩{...}`, and blocks (Section 2.2, Fig. 3, p. 7).
4. Translate calls and constructors to guarded ask agents. A guard can fire only when the store entails the required permission constraints; firing consumes them, marks the call running, and later restores them before emitting `end`.
5. Encode sequencing with `sync(z)`. The paper defines `P ; Q` as a fresh synchronization variable whose `sync` token is emitted when `P` terminates and consumed to start `Q` (Section 3.2, Fig. 6, pp. 12–13).
6. For nondeterministic guarded choices, consume a most-general choice (mgc), so a guard removes only the minimal store information needed for entailment. This avoids the unsound weakening in which `!c` is consumed down to `1` merely because it entails `c` (Section 3.2, p. 12).

verus form

Inference: In Verus, model the permission protocol as ghost state and proof predicates rather than runtime AP annotations. Use `struct` fields and ghost maps/sets for object identities, alias counts, and group membership; use `requires` and `ensures` clauses on `fn` or `proof fn`; use `assert`, `assert forall`, `open spec fn`/`spec fn`, and quantified invariants to express preservation. Verus ownership and borrowing enforce Rust’s exclusive/mutable alias discipline, but the paper’s fractional `imm`/`shr:g` flow and lcc scheduler are not automatically reproduced. Inference: To preserve the paper’s concurrency meaning, expose each permission transition as a ghost transition and prove that conflicting transitions cannot be simultaneous; use `assert`/lemmas about disjoint sets rather than treating `invariant(...)` as a call.

evidence and limits

The paper proves adequacy of the translation. It states: “The following invariants show that the lcc model correctly keeps track of the variables and their corresponding pointed objects” (Section 4.4, p. 24), then gives reference-count and statement-state invariants. The adequacy theorem says a pair of statements conflicts exactly when the later statement cannot be running before the earlier one ends, and non-conflicting statements have a reachable configuration in which both are running (Section 4.4, pp. 25–26). The encoding assumes no circular recursive definitions for the decidability result (Section 5.4, p. 32). Inference: The guarantee is about the encoded AP semantics; it does not prove that an implementation outside this model has the same memory behavior.

## technique 2: focused intuitionistic-linear-logic reachability proofs

what it is

The lcc process is translated to an intuitionistic linear logic (ILL) formula: parallel composition becomes multiplicative conjunction, asks become linear implications, and process definitions become universally quantified implications. The paper states: “we take the lcc agents generated from the AP program and translate them as an intuitionistic linear logic (ILL) formula” (Section 5, p. 26). It uses focusing, specifically the ILLF fragment, to make proof search finite and structured.

how to do it

1. Translate each tell, parallel process, hidden variable, guarded process, and process call with the `L[[·]]` clauses in Fig. 15 (Section 5.1, p. 26).
2. Put method/constructor definitions, assignment, and upgrade/downgrade axioms in a reusable theory `∆`; translate the main program to `F`.
3. Express a desired reachable state as a positive formula `G`, such as `∃z,c. end(c,...,z) ⊗ ⊤` or a conjunction of two `run` tokens.
4. Ask the prover for `!∆, F ⊢ G`. A proof establishes reachability; failure establishes that the target state is unreachable within the complete focused fragment.
5. Bound proof search by the formula complexity. The paper states: “if such a sequent is provable, then its proof is bounded in ILLF by the depth comp(F) + 1” (Theorem 5.2, p. 32).

applications

For deadlock detection, prove the final `end` token for the suspect call. In the aliasing example, the query for line 15 is not provable, showing that the call cannot finish (Section 5.5, pp. 32–33). For concurrency, prove a conjunction of two `run` tokens. The paper reports a provable query for `print` and `compStats`, and a non-provable query for `compStats` and `removeDuplicates` (Section 5.5, pp. 33–34). For method-specification checking, start from a formula satisfying a method’s precondition and prove its `end`; failure means the implementation cannot restore its postcondition (Section 5.5, p. 34).

verus form

Inference: Encode each target as a Verus postcondition over ghost state: a successful method returns with the expected permission predicate, and a concurrent-state claim is a lemma about two disjoint ghost transition witnesses. Use `requires` for the starting formula, `ensures` for the reachable-state relation, and `proof fn` for the focused proof argument. Verus does not provide ILLF proof search or lcc’s linear store; the translation and finite bound must be represented by explicit ghost invariants and solver-friendly assertions.

evidence and limits

The paper distinguishes the executable interpreter from the prover: “the lcc interpreter only computes a possible trace of the program while the theorem prover is able to check all the reachable configurations for the same program” (Section 5.5, p. 33). This is a scope distinction, not a runtime performance measurement. Inference: this coverage is relative to the finite, nonrecursive encoded model and its axioms; it is not evidence that arbitrary recursive Rust programs are decidable.

## technique 3: animator plus prover workflow

The Alcove tool parses AP programs with ANTLR, translates them to lcc, executes an interpreter, and feeds the same model to an ILL prover. The paper says: “The interpreter and the parser have been integrated into Alcove (Access Permission Linear COnstraints VErifier) Animator” (Section 4.3, p. 22). The recommended workflow is to inspect a trace first, then issue a logical proof query. The paper states: “The use of ‘animators’ and provers is complementary” (Section 5.5, p. 33).

For the two critical-zone example, Alcove reports a blocked acquisition and no final `ok` for the deadlocking code; the reordered release-before-acquire code reaches `ok()` after 3,517 processes are created (Section 6.1, p. 36). For producer/consumer, `produce` and `consume` are launched in a `split<g>` and share group permissions, while each acquires a lock before `write` or `read`; the trace shows overlap of the outer methods but serialization at the buffer operation (Section 6.2, pp. 36–38). These counts are tool-trace counts for those examples, not general efficiency results.

Inference: A Verus workflow can mirror this by writing a ghost transition model and proving safety properties, while running ordinary Rust tests only as an exploratory trace. The executable trace remains evidence about one schedule; the proof obligations must cover every schedule represented by the model.

## what is proved, measured, and trusted

The formal results are the encoding invariants, adequacy theorem, decidability bound, and success/failure of reachability sequents. The examples demonstrate deadlock detection, concurrency queries, and method-contract failure. The trusted base includes the ILLF proof rules, the non-logical AP axioms, the lcc-to-ILL translation, and the correctness of the implementation of Alcove/ANTLR/Teyjus. Inference: A product using agent-written verified Rust still has threat from an incorrect model, missing AP annotations, unsound ghost abstraction, or trusted runtime/FFI code; the paper’s result reduces protocol errors only when the product’s behavior is captured by the AP model.

The paper does not give a denominator-based benchmark of verification time across programs. It reports 3,517 processes for one deadlock-free critical-zone run and 567 processes for one collection trace (Section 4.5, Fig. 13; Section 6.1, p. 36). Those are generated-process counts, not success percentages. Inference: They cannot support a general scalability claim.

## techniques for the catalog

- permission-flow lcc encoding — translate AP references, counts, method guards, and synchronization into linear constraints and processes

- adequacy invariants — prove reference-count, state-ordering, conflict, and concurrency correspondence between AP programs and lcc

- focused ILL reachability — translate lcc to ILLF and prove deadlock, concurrency, and method-contract properties as sequents

- most-general-choice consumption — make guarded linear-store transitions consume only the minimal information needed for entailment

- animator-plus-prover analysis — inspect one executable trace with Alcove, then use the theorem prover for all reachable configurations in the encoded model
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
