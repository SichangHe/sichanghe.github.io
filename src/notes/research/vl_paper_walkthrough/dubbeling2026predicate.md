# Predicate Subtypes in VerCors
(authored by agents unless marked 🧑)
Tag: `dubbeling2026predicate`, [paper](https://doi.org/10.4204/eptcs.444.6)
## scope and result

Dubbeling, Huisman, and Şakar add predicate subtypes to VerCors, a contract-based verifier for Java, C, and PVL. A subtype is a base type restricted by a Boolean predicate, such as a nonzero divisor, a non-null array, or an integer range. The implementation translates subtype declarations into ordinary VerCors preconditions, postconditions, and assertions, then sends the rewritten program to Viper.

The paper’s central claim is automation: “the advantage of our work is that generating appropriate specifications that capture that variables are within a specific range is fully automated” (section 1, p. 58). It also adds strict subtypes for checking intermediate arithmetic expressions. No benchmark table or pass-rate denominator is reported; the evidence is the encoding, examples, and prototype implementation.

## technique 1: encode subtype annotations as contracts and assignment assertions

what it is

A predicate subtype declaration names a Boolean predicate over a base value. VerCors rewrites each use according to its program position. The paper gives the rules: “Subtypes on method input parameters are encoded by preconditions for the method that assert that the subtyped parameters fulfill the relevant predicates.” (section 3.1, p. 60). Return subtypes become postconditions, and assignments to subtyped variables receive assertions after the assignment.

when to use it

Use this when a value must satisfy a condition throughout its lifetime and ordinary language types cannot express it, for example `NonZero`, `NonNull`, an array length, an index bound, or a numeric range.

how to do it

1. Declare a predicate with a Boolean body. The paper’s syntax is `//@ subtype <subtypeName>(<arg>)(<argList>) = <body>;` (section 3.2, p. 62).
2. Annotate a parameter, result, or local variable with one or more subtype names. Figure 2 uses `NonZero` for a divisor, `nonNull len2` for a two-element array, and `Index(array.length)` for an array index (section 3.2, pp. 61–62).
3. Rewrite an input annotation as a precondition, a result annotation as a postcondition, and each assignment as a post-assignment assertion (section 3.1, p. 60).
4. Handle casts to a subtype by asserting that the cast result satisfies the target predicate (section 3.1, p. 60).
5. Verify the rewritten contracts. Figure 3 shows `requires y != 0`, `ensures \result == x/y`, and assertions for `Byte`, `NonNull`, and `Index` (section 3.2, pp. 62–63).

The authors put assertions after assignments because a pre-assignment check could evaluate a side-effecting right-hand side twice (section 3.1, p. 60).

Verus form

Inference: In Verus, a subtype-like condition can be written as a `spec fn` predicate and attached to executable functions with `requires` and `ensures`. For local updates, use `assert` after the assignment or establish the predicate in a proof function. For loops, maintain the condition with a loop invariant. Verus does not provide this paper’s subtype annotation syntax or automatic rewriting pass, so the programmer or a source transformer must emit the contracts.

evidence and limits

The Figure 2 examples show the generated obligations for division, swapping arrays of length two, a cross product over arrays of length three, and bounded `result`. The paper reports no measured success percentage. Its encoding is “not necessarily exhaustive” because languages with other mutation forms need additional generated assertions (section 3.1, p. 60). The prototype supports Java and PVL, not C, at the time of the paper (section 7, p. 66).

## technique 2: compose predicates with conjunction, disjunction, implication, and negation

what it is

Multiple subtype annotations on one declaration mean conjunction. The language also provides explicit disjunction, implication, and negation so that subtype definitions can be reused. The paper lists the operators as “Disjunction,” “Implication,” “Conjunction,” and “Negation” with the forms `<subtype>|<subtype>`, `<subtype> ==> <subtype>`, adjacent subtype names, and `!<subtype>` (section 3.3, p. 63).

when to use it

Use composition when a value has alternatives or when one condition should constrain another. A nullable array that may have one of several lengths is a direct example.

how to do it

1. Define small predicates such as `isNull`, `length(10)`, `length(3)`, and `nonNull` (Figure 4, p. 63).
2. Attach multiple predicates for conjunction, as with `nonNull len2` in Figure 2 (section 3.2, p. 61).
3. Use `|` for alternatives, `==>` for conditional requirements, and `!` for negation (section 3.3, p. 63).
4. Rewrite the composite expression to a Boolean contract. Figure 4 accepts null, length 10, or non-null length 3 arrays, and rejects assignment `x = 0` when `x` has the `nat !(negOrZero)` subtype (section 3.3, p. 63).

Verus form

Inference: In Verus, compose `spec fn` predicates with `&&`, `||`, and `!`; implication can be expressed as `!p || q` in a specification. Use `requires` for parameter combinations and `ensures` for returned combinations. The logical content carries over, but automatic subtype propagation and diagnostic source locations require a separate macro or transformation layer.

limits

The paper does not report solver cost for composite predicates. Inlining predicates can create many obligations, and the authors chose inlining to keep proof effort reasonable because otherwise names would need explicit unfolding (section 5, p. 65).

## technique 3: strict subtypes check every intermediate expression for overflow

what it is

A non-strict subtype checks values at declared boundaries. A strict subtype additionally requires every subexpression to satisfy the predicate. This catches overflow that disappears in the final result. The paper gives `strict range(0,128)` with `(x-2)+2`: the final value is in range, but the intermediate `x-2` is not (section 4, p. 63).

when to use it

Use strict mode for machine integers or casts where intermediate arithmetic must remain representable. Use non-strict mode when only stored values need checking.

how to do it

1. Mark a subtype declaration `strict` (section 4, p. 63).
2. Define the allowed range, for example 0 through 128 (section 4, p. 63).
3. Generate checks for every numeric binary subexpression, not only assignment results.
4. Enable `--strict-arithmetic` to convert every Java `int` to a generated strict subtype bounded by -2,147,483,648 through 2,147,483,647 (section 4, p. 64).
5. Verify the resulting assertions; reject an expression if any intermediate value leaves the range.

Verus form

Inference: In Verus, represent machine bounds explicitly in `requires`, `ensures`, and assertions around each arithmetic operation, or use a wrapper type with proof lemmas that establish range preservation. A loop invariant can carry the range across iterations. Verus integer arithmetic and overflow behavior must be checked against the actual Rust type and compilation mode; the VerCors generated subtype does not automatically model Rust’s machine operations.

evidence and limits

The prototype’s strict flag checks signed 32-bit Java integers only. The paper says strict checking is implemented for “expressions built from Numeric Binary operators” (section 7, p. 66). Different integer widths require AST and transformation distinctions that the prototype did not yet implement (section 7, p. 66). There are no reported benchmark counts or percentages.

## technique 4: implement subtype support as a compiler rewrite pipeline

what it is

The implementation adds parser support, stores subtype expressions in a type node, and rewrites the syntax tree before Viper verification. The paper describes five phases: “(1) VerCors parses the program… (2) We build a syntax tree… (3) VerCors tries to resolve references and types… (4) During the transformation step… rewriters… (5) The rewritten syntax tree is given to the Viper back-end for verification.” (section 5, p. 64).

how to do it

1. Extend the language and specification grammars with subtype declarations and annotations (section 5, p. 64).
2. Parse subtype operators into expression nodes and store strictness in a `TSubtype` type node (section 5, p. 64).
3. If strict arithmetic is enabled, create a generated bounded subtype and add it to global scope (section 5, p. 64).
4. Rewrite nested subtypes by conjoining the outer predicate with the inner subtype body (section 5, p. 64).
5. Rewrite parameters, results, assignments, and casts into standard contracts and assertions (sections 3.1 and 5, pp. 60, 64).
6. Inline predicate bodies where needed, then pass the ordinary specification language to Viper (section 5, p. 65).

Verus form

Inference: A Verus implementation could use a procedural macro or AST pass that turns annotations into `requires`, `ensures`, `assert`, and invariant clauses before invoking Verus. Generated predicates should remain `spec fn` or be inlined only when necessary for solver performance. Error mapping must preserve the source annotation, because VerCors currently transforms predicates away and reports can lose the subtype location (section 7, p. 66).

## what is proved, trusted, and threatening to VL

The verifier proves the generated contracts and arithmetic assertions through Viper. The subtype parser, rewrite rules, Viper translation, solver, and the programmer’s predicates remain trusted components. The paper provides examples and a prototype, but no empirical denominator for successful programs, proof time, or false alarms.

Inference: For agent-written verified Rust, predicate subtypes are a practical way to make range, nonzero, nonnull, and index conditions systematic. The threat is that generated contracts can be wrong, incomplete, or too expensive, while still producing accepted proofs. Strict checking is valuable for overflow-sensitive code, but it can increase obligations and does not establish that a chosen range matches the product requirement.

what VL should not redo

VL should not claim predicate-to-contract rewriting or strict intermediate range checks as new ideas. A useful Verus study would measure the cost and diagnostic quality of a Rust macro that generates these obligations, including nested predicates, casts, loops, and actual `u32`/`i32` behavior.

## techniques for the catalog

- predicate-to-contract rewriting: turn subtype annotations into parameter preconditions, result postconditions, and assignment assertions
- composable subtype logic: combine reusable predicates with conjunction, disjunction, implication, and negation
- strict arithmetic subtypes: require every intermediate expression to remain within machine bounds
- verifier rewrite pipeline: parse subtype AST nodes, normalize nested predicates, generate checks, and send ordinary contracts to the backend
Checked 2026-10-13: audit record dubbeling2026predicate; paper-study comparison complete; gate executed; experiments not rerun
