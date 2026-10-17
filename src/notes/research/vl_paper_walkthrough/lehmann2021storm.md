# STORM: Refinement Types for Secure Web Applications
(authored by agents unless marked 🧑)
Tag: `lehmann2021storm`, [paper](https://www.usenix.org/conference/osdi21/presentation/lehmann)

## scope and security claim
STORM is an MVC web framework that centralizes data-dependent access and information-flow policies in a refined database model, then enforces them at compile time. The abstract (p. 441) describes “logical assertions that describe the data produced and consumed by the underlying operation and the users allowed access to that data.” The introduction (§1, p. 442) claims “well-typed programs cannot leak or corrupt sensitive data.” Section 6 (pp. 451–452) establishes the formal guarantee for λSTORM, a simplified reference implementation, using a verified Labeled IO (LIO) interface and existing LIO non-interference results. The paper does not present a proof of the full production implementation. The paper link above is the publisher page printed on the cover.

## technique 1: refined data models and field policies

what it is and when to use it

A policy is a predicate over a database row and user. It is attached to a column in a model file, so access rules are written once beside the schema. For example, `Public(row,user)` is true for the owner or when `row.level == "public"`; default policies can allow or deny unspecified operations. Inference: this fits applications whose authorization depends on row values rather than only on a user role. Section 3.1 (pp. 443–444) specifies row insertion policies and column read/update policies.

how to apply it

1. Describe each table and column in the model file.
2. Define a policy predicate `row → user → Bool` and attach it to each protected column. Section 3.1 (p. 443) says, “A policy is a predicate over a row and user that is True if the user has access and False otherwise.”
3. Give each ORM `Field` two refinements: `pol`, the attached policy, and `sel`, a selector describing the column value in a row. The generated type has the shape `Field<pol,sel,row,val>`.
4. Use default `Allow`/`Deny` policies for unspecified read, insert, and update operations.
5. Track read policies for fields used in query filters and projections (§5.1, pp. 448–449); specify separate policies for insertion and updates (§3.1, pp. 443–444).

Verus form (inference)

Inference: model a row and user as Rust/Verus structs, make a policy a `spec fn` returning `bool`, and put it in `requires`/`ensures` on read and update functions. A field selector can be a pure `spec fn` relating a row to its returned value. Use `proof fn` lemmas to show selector facts imply policy facts. These are proposed proof obligations, not a Verus implementation verified by this paper.

evidence and limits

Section 6 (pp. 451–452) simplifies the reference database to primitive values and exactly two columns per table; the full implementation supports arbitrary numbers of columns and SQL types. Section 5 (p. 447) requires decidable refinements for automatic SMT verification. Section 7.1 (p. 452) reports one unsupported Jacqueline policy: a PC member may view a paper only if no conflict row exists. The authors state, “Our specification language does not support policies that depend on the absence of rows, and we thus have to express conflicts differently.”

## technique 2: query refinements and compositional information flow

what it is and when to use it

STORM's `Query<pol,inv,row>` records a policy (`pol`) for the columns read by the query and a row invariant (`inv`) established by its predicate (§5.1, pp. 448–449). Refined operators transfer facts from fields to queries. For equality, equation (2), p. 448, gives the bound `∀r, fv, v. sel(r, fv) ⇒ p(v) ⇒ fv = v ⇒ inv(r)`. Both conjunction and disjunction intersect the authorized users of the input policies; they respectively conjoin and disjoin row invariants. The paper calls policy intersection a join in its security ordering; this does not mean union of authorized users.

how to apply it

1. Construct a refined `Field` for each column.
2. Apply `==.`, `/=.`, `<=.`, or `<-.` with a value predicate. The operator returns a query whose invariant follows from the field selector and comparison.
3. Combine queries with `&&.` or `||.`. The output policy is the intersection of input policies; the output invariant is conjunction or disjunction respectively.
4. Call `select`, which returns an `RIO<auth,obs>` computation producing rows carrying the inferred invariant. It has no observers. The `PolAuth` constraint is `∀r,u. inv(r) ⇒ auth(u) ⇒ pol(r,u)` (Figure 8, p. 449).
5. Call `project` through its refined API. Its `PolAuth` bound restricts the computation's authorizees to users satisfying the field policy for rows with the supplied invariant.
6. For joins, supply the two join fields and a query. The `SelOn`, `Auth1`, and `Auth2` constraints prove equality of join values and authorization for both participating tables.

The WishList example (Figure 5, p. 445; §5.1, p. 449) filters on `Price ≥. min` and adds `Level ==. "public"`. Without the public clause, selecting and responding is ill-typed: the result reveals information about a protected price even though it projects only the public owner column.

Verus form (inference)

Inference: encode `Query` as a ghost/spec wrapper containing a predicate for row authorization and a row invariant. Each query combinator gets `requires` and `ensures` clauses that construct the new predicates. A `select` function's postcondition should state that each returned row satisfies the invariant; a projection proof should show `inv(row)` implies the field policy for the recipient. Rust iterators and SQL drivers still need trusted specifications or verified wrappers.

evidence and limits

Section 6 proves the modeled reference ORM operations. Section 7.1 (p. 452) limits policies to those provable with simple queries, including joins, and leaves grouping and sorting to future work. Inference: a query can satisfy an incorrect policy, so proving conformance does not establish policy intent or validate an external database implementation.

## technique 3: effect tracking with RIO and witnesses for cross-table policies

what it is and when to use it

`RIO<auth,obs,val>` tracks an under-approximation of authorized users and an over-approximation of users receiving data from a computation (§5, p. 448). Sequencing requires the second computation's observers to be contained in the first computation's authorizees. The three bind guarantees (§5.2, p. 450) are leak freedom, authorizee strengthening (intersection), and observer weakening (union). This catches implicit flows where a public result is conditioned on a protected query (§3.4, p. 445).

For cross-table policies, STORM avoids existential refinements that would leave the decidable SMT fragment. It declares an uninterpreted predicate such as `follows(user1,user2)` and adds a row invariant (`OkFollows`) saying each accepted follow row witnesses that predicate. The type checker assumes each `Follower` row satisfies `OkFollows`; evidence for `follows` additionally requires its status to be `"ok"` (§5.3, pp. 450–451).

how to apply it

1. Give every primitive operation an `RIO` type with `auth` and `obs` predicates.
2. Sequence operations with `bind`; prove `obs2 ⊆ auth1` for each step.
3. For an existential relationship, declare an uninterpreted predicate and a table-row invariant that establishes it when the row has the required status.
4. Use a join or a prior query to produce a row carrying the witness, then let the policy predicate consume that evidence.
5. Restrict uninterpreted predicates to positive occurrences, outside negation. Interpret them as holding if established in any database snapshot during the controller action; they remain true through that action even after a row changes. Erase these assertions between actions and re-establish them by querying the database (§5.3, p. 451).

Verus form (inference)

Inference: represent `auth` and `obs` as ghost predicates or sets and make sequencing a function whose proof obligation establishes observer inclusion. Represent a cross-table witness as a ghost relation plus a lemma connecting a verified row to that relation. Choose whether witnesses mean current-state authorization or authorization established at some point during an action. Current-state revocation would need stronger validity conditions than STORM's action-local semantics.

evidence and limits

Section 5.3 (p. 450) reports that 9/11 benchmarks require policies spanning tables. Section 5.3 (p. 451) states, “Predicates are timeless: once the relationship is established it holds forever.” STORM permits an established relationship until the action ends; revocation affects subsequent actions. Inference: this guarantee should not be described as immediate revocation inside an ongoing action.

## technique 4: verified reference implementation and refinement-to-LIO reduction

Section 6 (pp. 451–452) establishes security in two steps: verify an LIO library whose refined API prevents dynamic IFC exceptions in well-typed clients, then implement λSTORM using that library. Liquid Haskell checks the reference implementation against the API; existing LIO non-interference results imply that λSTORM applications do not leak. The reference ORM is about 800 lines, with `label`/`unlabel` implementing insert/project and `downgrade` implementing select, update, and join. `downgrade` runs a Boolean computation with a ceiling label and returns `False` if its label exceeds that ceiling (§6, p. 451). These proof results concern λSTORM, not every feature of the full framework.

Verus form (inference)

Inference: the corresponding Verus strategy is to verify a small abstract security library first, then prove the concrete Rust API refines it. State the non-interference or authorization theorem as a `proof fn` over the abstract state and connect each executable operation with `ensures`. This is a product of two proofs: API implementation correctness and client contract preservation.

## techniques for the catalog

- refined model policies — attach row-and-user predicates to ORM fields so authorization is centralized and statically checked
- query invariant propagation — make query operators produce policy and row-invariant refinements, then check selection and projection
- effect-set sequencing — track authorizees and observers in an effect type and require observer inclusion during `bind`
- witness predicates — encode cross-table existential access with uninterpreted relations plus row invariants that supply evidence
- refinement-to-reference reduction — prove a typed API refines a verified IFC library, then inherit its non-interference theorem
