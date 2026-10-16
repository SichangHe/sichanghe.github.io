# Towards System-Oriented Formal Verification of Local-First Access Control
(authored by agents unless marked 🧑)
Tag: `jacob2026systemoriented`, [paper](http://arxiv.org/abs/2604.23560v1)

## result and scope
This paper constructs and verifies a simplified capability-based authorization algorithm for Byzantine local-first collaboration groups. It deliberately does not verify Matrix or Keyhive themselves. The authors describe their target as “formally verified authorization algorithms for Byzantine fault-tolerant local-first systems.” (Abstract, PDF p. 1.) Their bottom-up path starts with a replicated hash-linked chronicle, defines capability semantics and security invariants, and then verifies progressively richer Rust/Verus algorithms.

The problem is concurrent, weakly consistent state: events can be omitted, equivocate, or be backdated by Byzantine entities. The chronicle is assumed authenticated, append-only, collision-resistant, and eventually consistent. Capabilities are grant events; revocation events reference grants. Authorization must remain safe despite concurrent events and backdating. The paper concludes that scaling to practical Matrix/Keyhive expressiveness remains future work.

## technique 1: explicit chronicle and capability semantics
Inference: the following construction steps are a restatement and are not in the paper as a numbered procedure. Define an event as an invocation plus a timestamp consisting of precursor event identifiers. Define a group chronicle as a set of events with `create`, `log`, `join`, `events`, `now`, `pre`, and `conc` operations. `join` is set union, yielding the least upper bound of two diverging chronicles. Validity requires one create event, no concurrent events to it, and downward-closed timestamps.

Extend the chronicle with `grant`, `revoke`, `caps`, `authorizes`, and `values`. A grant authorizes a subject to invoke one operation on an object; an invocation carries the grant identifier as its claim. A revoke references a grant and invalidates uses in its successors and concurrent events. `caps` returns authorized, unrevoked grants; `values` returns latest authorized group-name assignments. This is an observed-remove style construction adapted to a partially ordered log.

Evidence is formal rather than performance-based: the paper gives complete mathematical specifications (Specifications 1 and 2, pp. 3–5) and Verus contracts for `authorizes` and executable `log` (Figure 4, p. 6). Inference: Verus should represent identifiers, event sets, precursor relations, and validity as `spec fn` predicates, then connect executable methods through `requires` and `ensures`. Hash collision resistance and authenticated transport are trusted assumptions.

## technique 2: three authorization invariants
Authorization safety requires that only revocations change discursive authorization, and that event identifiers and timestamps are collision-resistant. Query safety says a new event may change a query only if that event is discursively authorized. Revocation safety says an invocation unauthorized at the current timestamp remains unauthorized at every earlier timestamp. These invariants address different failure modes and should be proved as separate lemmas over any valid chronicle.

The subtlety is concurrency. Discursive authorization considers both precursors and concurrent events; a concurrent revocation can change whether an event is authorized. The paper explains: “To make backdating ineffective and revocations safe, authorized revoke events must affect authorization of successors as well as concurrent events.” (Problem specification, PDF p. 5.) The granted-present-revoke predicate in `authorizes()` checks a matching authorized grant and rejects a matching authorized concurrent revocation.

Inference: in Verus, make each invariant a predicate over immutable ghost state and prove that `log` preserves it for all valid inputs, including Byzantine event orderings. Use `old(...)` only in executable contracts where the pre-state is needed; the paper's figure demonstrates this style. The proof must not assume monotonic authorization when revocation makes discursive authorization non-monotonic.

## technique 3: staged algorithm growth
The authors verify three algorithms in increasing complexity. (1) Allow grants on creation and make them immutable; only assignment is authorized. (2) Deny grants on creation but allow later grant events, with no revocation; authorization is monotonic. (3) Allow grants on creation and allow revocations later; capability sets shrink, but discursive authorization can both grow and shrink as concurrent information arrives. The paper says, “In the third step, only revocations are supported after group creation, which introduces non-monotonic effects.” (Section 4.2, p. 7.)

Inference: this staging is a practical method inferred from the paper, not a claim that the paper names it as a method: prove query safety in the monotonic base cases, then add revocation safety before attempting both grant and revoke delegation. Each stage reduces the number of interacting quantifiers and exposes the next missing invariant. The paper's result is a proof of the simplified third algorithm under the chronicle assumptions, not a proof of arbitrary delegation or membership.

Inference: a VL implementation should keep each stage as a separate verified module and carry only stable contracts forward. This avoids asking an SMT solver to discover all non-monotonic cases at once.

## technique 4: purity and totality for convergence
Queries such as `caps`, `authorizes`, and `values` are pure functions of group state. Verus purity lets the authors prove that all replicas with the same chronicle derive the same query result, giving strong convergence once the underlying chronicle eventually converges. Totality is separately required: specification functions terminate, loops and recursive executable calls terminate, and panic paths are excluded with `no_unwind` assumptions.

The paper states that “Pure functions deterministically derive the same output given the same input, and are free of side effects.” (Section 4, p. 6.) It reports that iterator support was insufficient, so many `filter`, `map`, and `any` chains were rewritten as for loops; proving these loops was among the most time-consuming tasks (Discussion, p. 8).

Inference: in Verus, use `spec fn` for mathematical queries and executable functions with `ensures` equating their results to the specification. Add `decreases` clauses and explicit panic-freedom assumptions. A proof of purity does not prove that the chronicle implementation eventually converges.

## what is proved, trusted, and unfinished
The verified security claims hold for any valid chronicle, including events containing Byzantine equivocation and backdating, under eventual consistency of the underlying hash chronicle. Trusted facts include digital-signature authenticity, collision-resistant hashes, append-only Byzantine storage, eventual delivery/consistency, Rust standard-library specifications, and modified `vstd` assumptions. The authors specifically added an assumption that cloning preserves `HashSet` elements and assumed allocation/random-number system calls do not panic (Discussion, p. 8). No throughput or deployment-scale number is reported; this is a proof-of-concept study.

The paper excludes mutual concurrent authorization revocations among equally privileged entities, delegation of grant/revoke capabilities, self-revocation, public joining, sparse replication, and protocol upgrade. Its conclusion says scaling “remains a challenge.” Inference: the threat to VL is specification incompleteness: an agent can prove a sound, total algorithm while omitting a needed capability or choosing a chronicle assumption the product cannot satisfy. The useful reusable work is the explicit separation of chronicle validity, authorization predicates, query safety, revocation safety, and purity/totality. Existing VL should not redo these staged invariants; it should adapt them when a local-first product actually needs Byzantine authorization.

## techniques for the catalog
- hash-linked chronicle model — represent events, causal timestamps, joins, and validity explicitly before verifying authorization
- granted-present-revoke capabilities — authorize grants and invalidate them through matching concurrent or successor revocations
- authorization/query/revocation invariants — separate immutable authorization, query-change, and backdating safety obligations
- staged algorithm verification — add grants, then revocations, in monotonic-to-non-monotonic steps
- pure total queries — prove deterministic convergence and termination while keeping chronicle consistency assumptions explicit

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
