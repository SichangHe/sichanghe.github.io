# Revisiting Borrow Checking with Abstract Interpretation
(authored by agents unless marked 🧑)
Tag: `coet2026revisiting`, [paper](https://doi.org/10.5381/jot.2026.25.1.a14)

## what is formalized

The paper recasts Rust borrow checking as abstract interpretation over a language-agnostic intermediate representation called MIMIR (Memory Inspection Mid-level Intermediate Representation). The abstract says: “Our methodology captures the aliasing and initialisation properties of variables through the construction of abstract program traces that enable fine-grained, path-sensitive verification of memory safety properties.” The framework has a formal syntax, dynamic semantics, origin-aware type system, liveness analysis, alias analysis, initialization analysis, and a final borrow-checking pass (Secs. 3–6, pp. 4–14). The dynamic semantics uses big-step evaluation over a module, a variable-to-address context, and an address-to-value memory. Calls allocate fresh cells for parameters, locals, and `ret`; assignment and borrowing update the addressed cell (Sec. 4.2, pp. 8–9).

Inference: its main precision improvement is retaining correlations at control-flow joins. Rust's current checker rejects some programs that are safe because it unions aliases or treats maybe-initialized variables conservatively. MIMIR instead keeps a set of path-specific environments. The paper presents examples, figures, and a prototype compiler translating a small Rust-inspired language, but it does not report a benchmark count, runtime denominator, or machine-level soundness experiment. The authors call the implementation a proof of concept and say that MIMIR omits move assignments, user-defined types, polymorphism, and higher-order functions (Sec. 4, p. 7; conclusion, p. 14). The authors claim soundness for the modeled fragment; the paper does not establish acceptance or safe execution for arbitrary Rust programs.

## technique: source-agnostic MIMIR representation

What it is: MIMIR keeps only constructs needed for ownership and borrowing: functions with origin parameters, `Int`, `Bool`, function and reference types, mutable/immutable capabilities, loops, conditionals, sequences, calls, borrows, assignments, and returns (Fig. 7, p. 7). Each function has locals and an implicit `ret` variable. Reference types carry an origin and capability, such as `&'a mut Int` or `&'b cst Int`.

When to use it: use an IR when multiple front ends should share borrow checking and when a compiler's surface syntax and internal MIR are too Rust-specific. The paper's proposed architecture translates Rust and other source languages into MIMIR, performs type and borrow checking, and then lowers to LLVM IR (Fig. 6, p. 7).

How: (1) parse and lower a source function into MIMIR instructions; (2) attach declared origins to reference parameters and returns; (3) type-check each function, call, borrow, assignment, and control-flow construct; (4) run the abstract analyses over the resulting instruction graph; (5) reject any abstract state containing a borrow or initialization violation; (6) lower accepted code onward. The paper states: “By decoupling borrow checking from Rust’s surface syntax and embedding it within a language-agnostic IR, our work lays the foundation for integrating Rust-style memory safety into a broader class of programming languages and compiler infrastructures.” (abstract, p. 1)

Verus form: Inference: Verus verifies Rust source rather than implementing a compiler IR. The closest usable form is a `spec fn` model of places and alias states plus proof functions that establish invariants over a finite `Seq`/`Map`; executable Rust remains subject to Rust's own borrow checker. MIMIR's type and operational semantics would be a separate verified analyzer, not a Verus annotation on application code.

Limits: MIMIR models only copy semantics and intentionally excludes move assignments and richer types (Sec. 4, p. 7). Therefore its origin and alias rules do not cover all Rust ownership behavior.

## technique: origin-based type safety

What it is: origins express which input reference a function may return. A local origin `'_'` cannot escape a function. Subtyping permits compatible origin and capability substitutions but prevents a local reference from being assigned to a broader-lived reference. The typing rules require calls to match argument and return types, and require assigned values and borrowed-reference types to be subtypes of target types (Secs. 4.1 and 5.1, pp. 7–10).

How: (1) declare a function's origin parameters and reference types; (2) require every origin in a signature to be declared and non-local; (3) check that an origin-annotated return is compatible with its arguments; (4) on a borrow, check the borrowed place's type against the target; (5) on a call, substitute actual origins into the callee signature and check all arguments; (6) reject local-origin references in return positions. Listing 10's `first<'a,'b>(a: &'a Int, b: &'b Int) -> &'a Int` allows the result to alias only `a`; Listing 8 shows a call where the result may alias `x` or `z`, but not `y`, because the return origin is `'m`.

Evidence: the authors claim that type safety prevents local references escaping and permits intra-procedural analysis based on signatures rather than callee bodies. They write: “Since the dynamic semantics of MIMIR is defined using big-step inference rules, the soundness proof of our type system departs from the standard progress and preservation methodology (Wright & Felleisen 1994).” They describe a definitional-interpreter approach, then omit the full proof (Sec. 5.2, p. 11). No empirical count of accepted/rejected programs is supplied.

Verus form: Inference: represent origin relationships as ghost tokens or an enum of abstract places, then prove lemmas that a returned reference's token is one of the permitted input tokens. Verus's Rust ownership already prevents many concrete escapes, but an abstract origin model can specify API relationships. Do not write a runtime `proof fn` call as if it were executable behavior.

## technique: four-stage abstract trace

What it is: the checker computes (1) live variables, (2) aliases, (3) initialization, and (4) a combined abstract trace. The trace is intended to over-approximate possible execution paths, and each instruction is checked for single-writer/multiple-reader violations, multiple mutable aliases, and use before initialization (Sec. 3, pp. 4–5; Sec. 6.3, p. 13).

How: (1) represent a function's variables as a finite liveness lattice; (2) run liveness backwards from the end; (3) compute alias and initialization states forwards; (4) combine them at each program point; (5) inspect every live reference and accessed place; (6) reject a trace if a mutable and immutable reference overlap, two live mutable references overlap, or a read accesses an uninitialized place. For Listing 5, where `let mut x = 42; let a = &mut x; let b = &x` is followed by a print using both references, the trace maps both `a` and `b` to `x` while both are live and reports the SWMR violation (Listing 5, Fig. 2a, pp. 4–5). If `a` is no longer used before `b` is created, liveness maps `a` to bottom and the program is accepted (Fig. 2b, p. 5).

Verus form: Inference: model each abstract state as a ghost `Set`/`Map` and prove preservation of a state invariant through each branch and loop. Use Verus `invariant` clauses for the trace relation and `decreases` for fixed-point iteration when represented explicitly. This does not replace Rust's concrete borrow checker or prove arbitrary unsafe code.

Evidence and limits: the paper argues that finite domains and monotone iteration give termination; the authors claim that loop-liveness iteration stabilizes within the number of function variables (Sec. 6.1, pp. 11–12). This is a theoretical bound, not a measured runtime. The paper gives no measured runtime or memory results for the prototype. Quote: “The analysis thus detects a violation of the aliasing constraints and reports an error.” (Sec. 3.1, p. 4)

## technique: path-sensitive environment sets

What it is: the initial abstraction maps each variable to a set of possible locations and unions branches. The refinement represents an abstract state as a set of environments, each environment mapping variables to one concrete abstract location. This preserves correlations between aliases on different paths (Sec. 3.2, pp. 5–6). The concrete Rust example is rejected when it borrows uninitialized variables; the paper uses it to motivate the more precise MIMIR analysis, which permits initialization through the resulting reference (Sec. 3.2, p. 5).

How: (1) analyze each branch independently; (2) retain one environment per path rather than unioning all locations inside one map; (3) at a join, take the set union of environments; (4) update each environment independently on a borrow or assignment; (5) check each resulting environment for alias and initialization violations. In Listing 6, one branch makes `rf` point to `v0` and initializes `v1`; the other makes `rf` point to `v1` and initializes `v0`; at the join, dereferencing `rf` initializes the other variable on each path, so both are initialized before printing. The conservative union would reject this valid program; the refined domain accepts it (Fig. 4, pp. 5–6).

Inference: this is the paper's main precision technique. A Verus implementation would need lemmas that preserve path correlations; a single map from variables to a broad set of places loses the same information.

Limits: environment sets can grow as the Cartesian product of places. Updating each environment costs extra work, especially with many branches (Sec. 6.4, p. 13). The authors propose MFDDs but provide no benchmark showing a speed or memory improvement.

## technique: fixed-point liveness and forward alias rules

Liveness uses a powerset lattice ordered by subset inclusion. For conditionals, analyze both branches and union live sets; for loops, repeatedly analyze the body until the entry set stabilizes. Assignment kills the target and gens variables in the right-hand side; calls kill the target, add argument variables, and add variables in all call operands (Sec. 6.1, pp. 10–12).

Alias and initialization use a powerset of partial maps. Although introduced as separate phases, they are performed together in one forward traversal (Sec. 6.2, p. 12). Borrow updates each environment by mapping the target variable to a mutable or immutable reference to the borrowed place; assignment maps it to an operand alias or top; calls select aliases allowed by the callee's origin-annotated return type (Sec. 6.2, pp. 12–13). The `alias` predicate returns an allowed argument alias or the full abstract set for dereference/unknown cases. After all analyses, the checker enforces the SWMR constraints and initialization checks (Sec. 6.3, p. 13).

Verus form: Inference: encode the finite lattice operations as ghost functions and prove monotonicity and fixed-point stabilization with `decreases` on the remaining height. Use `ensures` to state that each transfer function preserves sound over-approximation. These are a new verified-analysis project; the paper does not provide Verus code.

## technique: MFDD compact state representation

What it is: Map Family Decision Diagrams (MFDDs) encode sets of partial maps as a DAG with shared prefixes and suffixes. Each path represents one map; union, intersection, and bulk updates can operate homomorphically on all maps (Sec. 6.4, pp. 13–14).

When to use it: use MFDDs when path-sensitive environment sets have repeated structure or deeply nested conditionals. The authors expect benefits for large branching structures over relatively few variables but explicitly call for empirical benchmarks.

How: (1) create a node for each map key; (2) label edges with abstract values; (3) share common subgraphs; (4) represent missing keys with dashed edges; (5) apply union/intersection/update operations as graph transformations; (6) hash-cons nodes to maintain uniqueness. Inference: a Verus prototype could specify MFDD invariants and prove graph operations preserve represented map sets, but executable performance and memory behavior require separate measurement.

## techniques for the catalog

- language-agnostic MIMIR — lower multiple source languages to an ownership-aware IR before analysis
- origin type system — track which input reference a function may return and prevent local escapes
- four-stage abstract trace — combine backward liveness, forward aliasing, initialization, and final safety checks
- path-sensitive environment sets — retain correlated branch states instead of unioning aliases prematurely
- fixed-point liveness — iterate loop transfer functions until the finite live-variable lattice stabilizes
- alias and initialization transfer — update abstract environments for borrows, assignments, calls, and dereferences
- MFDD compression — encode sets of abstract maps as shared decision diagrams for branching programs
- abstract-domain refinement — increase precision while preserving over-approximation and soundness
