# Syntax-driven Incremental Program Verification of Matching Logic Properties
(authored by agents unless marked 🧑)
Tag: `bianculli2026syntax`, [paper](http://arxiv.org/abs/2606.08824v1)

## purpose and central claim

The paper makes KernelC verification incremental by combining an operator-precedence grammar (OPG), synthesized semantic attributes, and matching-logic reachability checking. Its stated setting is KernelC, a substantial C subset, with properties written in matching logic. The authors report that the approach has comparable from-scratch performance to MatchC and can beat full re-verification after edits.

The design target is an edit loop: parse only the changed region, recompute semantic information on that subtree, and propagate changed values toward the root. The paper says, “SiDECAR defines the verification procedure through semantic attributes, which are computed and propagated through the syntax tree of a program” (Section 1, p. 3). It also says, “This property is the key for an efficient incremental verification procedure: since the verification procedure is encoded within attributes, their evaluation proceeds incrementally, hand-in-hand with parsing of the new version of the program” (Section 1, p. 3).

## technique: local parsing with an operator-precedence grammar

What it is. An OPG uses precedence relations between adjacent terminals to drive bottom-up shift/reduce parsing. The paper's key property is local parsability: a partial tree can be built from a changed substring using only its boundary terminals, then matched back into the old tree. The paper states, “The main reason for the choice of OPGs is that, unlike more commonly used grammars that support deterministic parsing, they enjoy the local parsability property, i.e., the possibility of starting the parsing from any arbitrary point of the sentence to be analyzed, independent of the context within which the sentence is located” (Section 2.1, p. 6).

When to use it. Use it when the language grammar can be expressed as an OPG (or made one with small adjustments) and edits are localized. The tradeoff is generative power: OPGs cannot express every deterministic language. A changed region is reparsed until its new derivation has the same enclosing nonterminal as before; that matching condition identifies the old subtree to replace.

Steps from the paper.

1. Express the language with operator-form productions and construct its operator-precedence matrix (Section 2.1, pp. 4–6).
2. Parse bottom-up using precedence relations; for “n + n * n”, reductions make `*` bind before `+` (Section 2.1, p. 6).
3. After an edit, restart parsing at the changed substring, using suitable left and right precedence relations (Section 2.1, p. 6).
4. Stop when a derivation with the old enclosing nonterminal satisfies the matching condition; replace that old subtree with the new subtree (Section 2.1, pp. 6–7).

Inference: A Verus front end could use an incremental Rust parser with an equivalent stable subtree identity, while Verus source verification remains downstream; Verus has no OPG requirement. Inference: The reusable boundary is the changed syntax subtree, not a Verus proof object, so proof caching would need explicit mapping from syntax nodes to proof obligations.

Evidence and limits. The approach can also parallelize independent changed substrings, but the experiments disable parallel features to isolate incrementality (Section 7.1, p. 38). OPG expressiveness and software's sequential execution remain limitations (Sections 2.1 and 9, pp. 7, 48–49).

## technique: synthesized attributes for incremental semantic verification

What it is. An S-attributed grammar stores only synthesized (bottom-up) attributes. For a changed subtree, recompute its attributes and then only ancestors on the path to the root. The paper explains, “When a change is made, it is only necessary to compute the new values of attributes for the new nodes of the new subtree produced by the incremental parser and then propagate these values to the tree root by recomputing the attributes of the nodes encountered along the path towards the root” (Section 2.1, p. 8).

Steps from the paper.

1. Attach semantic functions to grammar productions and define synthesized attributes (Section 2.1, pp. 7–8).
2. During bottom-up reductions, compute and retain each node's attribute values (Section 2.1, p. 8).
3. On an edit, compute attributes for newly parsed nodes (Section 2.1, p. 8).
4. If the changed subtree's attribute is unchanged, stop; otherwise recompute only its ancestors through the root (Section 2.1, p. 8).

The paper's KernelC instantiation uses attributes `K` (code fragment), `R` (instantiated reachability rules), `V` (pending verification tasks), `C` (whether specifications remain satisfiable), and `S`/`F` for structs (Section 4.2, pp. 21–23). `CompAttribute` composes child `K`, unions child rules with rules generated for the current fragment, creates verification tasks at annotated loops/functions/main, runs `Process`, and retains tasks that are delayed (Section 4.2, pp. 22–24).

Inference: In Verus, `K` could identify a Rust/Verus AST fragment, `V` could identify proof obligations, and a cache could invalidate obligations only along dependent ancestors. The paper's attribute grammar is not a Verus construct; this is an architectural mapping.

## technique: matching-logic verification tasks and reachability rules

What it is. A verification task is `⟨Cr, Rv, ct⟩`: initial configuration patterns, instantiated reachability rules, and a final target pattern (Section 4.1, p. 19). `Process` repeatedly applies applicable rules, keeps satisfiable successor patterns, and reaches a fixed point. `Check` rejects non-final configurations and uses an SMT solver to test containment in the target.

Steps from the paper.

1. Initialize `Cr` with the precondition configuration, collect rules `Rv`, and construct final target `ct` (Section 4.1, p. 19).
2. For every current pattern, test rule applicability structurally, apply each applicable rule, and retain only satisfiable successors (Section 4.1, pp. 19–20).
3. Replace expanded patterns with successors until `Cr` stops changing (Algorithm Process, Fig. 5, p. 19).
4. Abort if a non-final pattern remains; otherwise use SMT containment to check every reachable pattern against `ct` (Algorithm Check, Fig. 5, pp. 19–20).
5. For incomplete information (for example, a function defined later in the file), delay the task, propagate it upward, add missing rules, and resume (Section 4.2.1, pp. 23–24).

The paper gives a complete sorting example and an edit changing `x!=0` to `x!=0 && x->next!=0`; the new symbolic path reaches a final pattern and `Check` verifies it against the target (Sections 5 and 6.1, pp. 25–35). The verifier supports Hoare-style annotations and debugging-style verification; the latter is less compositional because it relies on sequential symbolic execution (Sections 4.1 and 7.2, pp. 19, 40).

Inference: A Verus implementation would express the target as `requires`/`ensures` and loop `invariant` clauses, then let Verus generate proof obligations; matching-logic configurations and `Process`/`Check` are not Verus syntax. Inference: an external reachability engine could still guide which Verus function or invariant to re-check, but soundness would require trusting both the translation and Verus's proof result.

## technique: rule summarization and parallel solver calls

The paper reduces repeated solver work by symbolically executing a subtree and collapsing its path into an intermediate reachability rule. It says, “When a final configuration pattern is reached, the relation between the final and the initial patterns is used to generate a new reachability rule that summarizes the execution” (Section 6.2, p. 36). Loops are limited to one iteration and functions to one call during summary generation when context is incomplete; undeclared variables are added symbolically (Section 6.2, pp. 36–37). The authors also launch parsing, attribute evaluation, and solver calls in parallel when independent (Section 6.2, pp. 37–38).

Inference: A Verus edit loop could cache lemma-level summaries or verified function contracts, but Verus's proof dependency graph and solver behavior would determine whether summaries are reusable. Inference: bounded summary generation is an optimization and cannot replace the full-context proof.

## evidence, trusted base, and measured limits

SCMatchC is implemented in Scala 2.11.6 and Java 8; Z3 4.4 is an external black box. Experiments ran in Docker on an Intel Core i5 3.2 GHz machine with 32 GB memory, and reported averages over five executions after discarding the first warm-up run (Section 7.1, p. 38). Benchmarks contain 29 programs (MB1), 228 (MB2), 201 each (MB3/MB4), 42 (MB5), and 5 red-black-tree versions (MB6), with 6–450 LOC per program (Table 6, p. 39).

The measured MB2 average speedup is 1.19× (non-incremental 61 ms versus incremental 52 ms; Table 8, p. 42). MB3 reports an average 22.99× speedup (1127 ms versus 49 ms; Table 9, p. 43), while MB4 reports 5.38× in Table 10 (1188 ms versus 221 ms). The surrounding prose says “achieving an average speedup of 4.69” for MB4 (Section 7.4, p. 43), which conflicts with Table 10; the table's ratio is 1188/221 ≈ 5.38. MB5's 41-version average is 1.27× (14,054 ms versus 11,110 ms; Table 11, p. 44), and MB6 ranges from 1.28× to 24.81× (seconds; Table 12, p. 45). The conclusion reports an overall observed range of 1.06–109.64× (Section 9, p. 48), but no denominator or aggregate for that range is supplied there.

The trust base includes the formalized KernelC semantics, parser and attribute implementation, SMT solver, and the correctness of benchmark specifications. The paper does not provide a machine-checked proof of SCMatchC itself. Inference: for VL, the strongest product threat is stale or unsound dependency invalidation: an edit loop that skips a changed Verus obligation could report a proof for old code. Missing annotations, solver-heavy nonlinear constraints, inter-procedural dependencies, change position/type, and path explosion reduce gains (Sections 7.4 and 9, pp. 43–49). Inference: fully annotated Verus code is the closest favorable case; debugging-style code without contracts is the closest unfavorable case.

What VL should reuse. Inference: VL should reuse the paper's edit-local invalidation idea, delayed obligations for definitions not yet seen, summary rules for reducing repeated solver calls, and benchmark reporting with explicit denominators and settings. It should not redo a generic claim that incremental parsing is useful; this paper already measures it across six structured benchmarks. It must, however, validate the design against Verus's actual proof dependency behavior.

## techniques for the catalog

- OPG local reparsing — reparse an edited substring and splice it back when the old enclosing nonterminal is matched
- synthesized-attribute invalidation — recompute changed nodes and only their ancestor path
- reachability verification tasks — explore satisfiable rule successors to a fixed point, then check final-pattern containment with SMT
- delayed and summarized verification — defer tasks missing rules and collapse verified fragments into summary transitions
- parallel incremental evaluation — evaluate independent syntax subtrees and solver queries concurrently

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
