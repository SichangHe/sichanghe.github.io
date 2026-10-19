# Formal Verification of Minimax Algorithms
(authored by agents unless marked 🧑)
Tag: `wesselink2025minimax`, [paper](https://arxiv.org/abs/2509.20138v2)

## problem and model

The checked paper is arXiv:2509.20138v2, dated 22 April 2026; the tag retains the initial arXiv year, 2025. The paper verifies minimax and negamax search in Dafny, including alpha-beta pruning and transposition tables (TTs). Its difficult case is depth-limited search: a cached value may have been computed at another depth and under another search window, so the returned value need not be justified by one ordinary execution tree. The paper states, “The central challenge we address is the formalization of correctness for depth-limited search with transposition tables, where cached results obtained at different depths and under different search windows break the simple tree-traversal semantics typically used to justify minimax and alpha-beta pruning.” (section 1, PDF p. 2).

A node contains an integer evaluation, a player color, and an ordered child sequence. `minimax` takes a minimum at a minimizing node and a maximum at a maximizing node; `negamax` requires each child to have the opposite color and takes the maximum of the negated child results. At a leaf, minimax returns the evaluation and negamax returns color times evaluation. The model assumes an acyclic game tree and structural node equality. Depth truncation keeps nodes at distance at most `d`. For true value `e` and window `(alpha,beta)`, alpha-beta accepts `x` precisely when `e <= x <= alpha`, `alpha < e = x < beta`, or `beta <= x <= e`, using the paper's `is-ab-result` predicate (sections 2–2.1, PDF pp. 2–4).

## technique 1: witness-based correctness for transposition tables

What it is. A witness is a concrete expansion of the depth-`d` truncated tree that includes every node required through depth `d` and may extend below that depth, keeping either all or none of each node’s children. Correctness means that the returned value is an acceptable alpha-beta result for some witness. The paper requires, “The algorithm’s returned value matches the negamax alpha-beta result on the witness u′, as defined in (6).” (section 4.1, condition 4, PDF p. 7). Thus equality with the witness value is required inside the window; outside it, the appropriate bound suffices (equations 5, 6 and 9, PDF pp. 3 and 8).

How to apply it.

1. Define an expansion relation between a candidate witness `u'` and original tree `u` (section 4.1, PDF p. 8).
2. Require equal root evaluation and color; through positive depth require all children and recursively expand each corresponding child (equation 8, section 4.1, PDF p. 8).
3. At depth zero, permit either no children or all original children; in the latter case recursively require expansions of the corresponding children at depth zero (equation 8).
4. Define the returned result as an existential witness satisfying the expansion relation and the alpha-beta-result predicate (equation 9).
5. Require each TT entry to have its own witness: an upper bound is at least the witness negamax value, an exact entry equals it, and a lower bound is at most it (equation 10, section 4.1, PDF p. 8).
6. Allow table contents to change arbitrarily between iterations only when every entry remains valid; this models hash collisions and replacement policies (section 4.1, PDF p. 8).

Inference: in Verus, encode the tree and TT as Rust datatypes and maps, state the expansion and result relations as `spec fn`s, and use `requires`/`ensures` to require valid table entries and return a witness-backed result. Loop `invariant`s would carry the partial witness and table validity. The paper is about Dafny, so this Verus encoding and any finite tree representation are inferences. `ensures` belongs on the executable search function; a specification relation itself should remain a `spec fn`.

Inference: the witness criterion helps test whether an optimization preserves a stated meaning for its results. The paper reports verification of “preservation of the expansion property when a subtree is replaced by a witness justified by a transposition table lookup” (section 4.2, PDF p. 9).

## technique 2: verify the conservative NegamaxTTW algorithm

The two practical algorithms have three phases: table lookup, negamax search, and table update (section 3, PDF p. 5). NegamaxTTW first saves the original lower bound `alpha0`; it considers a cached entry only if `t.depth >= d`, returning an exact cached value or a lower/upper bound that immediately cuts off the current window. After lookup, depth zero or a leaf returns `color * eval`. Otherwise it searches each child with window `(-beta,-alpha)` and depth `d-1`, maximizes the negated results, updates `alpha`, and breaks on `alpha >= beta`. It stores an upper bound when `value <= alpha0`, a lower bound when `value >= beta`, and an exact value otherwise (Algorithm 3, PDF p. 6).

The verification procedure is explicit. Translate the pseudocode and datatypes to Dafny; require `alpha0 < beta0`, turn-based nodes, and a valid table; ensure the witness-backed result and table validity; maintain loop invariants for table validity, index bounds, alpha/window relationships, partial alpha-beta results, and the final result (Listing 2, PDF p. 10). When quantifier-heavy reasoning times out or exhausts memory, separate obligations into lemma calls at table-lookup returns, the depth-zero base case, loop maintenance and termination, and table updates. The paper reports “five dedicated lemma calls in the implementation (Listing 2)” and states, “This decomposition proved essential for scaling the verification to realistic algorithm variants.” (section 4.2, PDF p. 9).

Evidence. The paper states, “The Dafny development for this algorithm comprises approximately 850 lines of code, and verification completes in about 4 seconds on a standard workstation.” (section 4.2, PDF p. 8). Across the paper's broader artifact set, the authors verified over 15 minimax/negamax variations; the artifacts include Dafny proofs and executable Python implementations with randomized testing (section 5, PDF p. 16). The paper does not give the number of randomized tests, tree sizes, or machine specification, so those denominators are unavailable here. The paper claims this is the first formal proof, to its knowledge, of a depth-limited TT negamax with alpha-beta pruning (section 5, PDF p. 16).

Inference: a Verus port should use a `decreases` measure for recursive depth, preserve the original alpha in a local value for table classification, and isolate difficult witness transformations in `proof fn`s. Each returned value must be checked by Verus; randomized testing can find candidates but cannot replace the proof.

## technique 3: find a counterexample by failed proof and inspect the configuration

NegamaxTTM narrows the alpha-beta window using cached bounds, rather than returning only on an immediate cutoff. The authors could not prove its postcondition. The failed configuration had `alpha0 < x <= alpha < beta0`, where a cached lower bound raises `alpha` above the eventual return `x` (section 4.3, PDF p. 11). They then constructed a concrete case: a lower-bound entry `(value = 3, depth = 4)` for node `v`, followed by a depth-2 search of `v` with window `(0,5)`.

Inference: the counterexample procedure is reusable: inspect the unprovable proof state; characterize the inequality that prevents the postcondition; construct a table entry and call sequence satisfying that inequality; then check the result against all admissible witnesses. Starting from an empty table, the root call at depth 6 first stores `(3, depth 4, lowerbound)` for `v` under window `(0,2)`, then reuses it in a wider-window depth-2 call and returns `2` (equation 11(a–c), section 4.3, PDF p. 12). The paper states, “The root cause of this failure is the reuse of a lower bound computed under a narrower alpha-beta window (0, 2) in a subsequent search with wider window (0, 5).” (section 4.3, PDF p. 12).

There are only two admissible expansions in the shown case: the depth-2 truncation and the full tree. Their negamax alpha-beta results are `1` and `4`; no witness yields `2` (section 4.3, PDF p. 12). In the execution, the cached lower bound changes `alpha` from 0 to 3, causing a cutoff that skips a child with value 1 (section 4.4, PDF p. 14). The authors limit this conclusion: “These observations do not imply that NegamaxTTM is incorrect as a practical search algorithm. However, it remains an open question whether a useful correctness criterion exists.” (section 4.3, PDF p. 13).

Inference: in Verus, use the inequality as a lemma precondition and attempt to prove the witness-result postcondition, then encode the small tree as a concrete test harness and prove that no admissible witness justifies the returned value. This is a debugging pattern, not a claim that Verus automatically synthesizes counterexamples.

## technique 4: isolate algorithmic differences and reverify variants

The authors compare table lookup, fail-soft negamax search, and table-update classification. After finding the lookup failure, they study the remaining differences by incorporating them separately into NegamaxTTW and reverifying. The extra depth condition that preserves deeper entries does not affect correctness under their permissive table model. Fishburn's fail-soft search also preserves correctness after adapting loop-maintenance and loop-break lemmas. Classifying against the current `alpha` is subtler because the three update cases overlap; correctness is recovered by ordering the cases so the right flag is assigned (section 4.5, PDF pp. 15–16).

Inference: define a semantic criterion, change one algorithmic choice at a time, and rerun the proof, reusing existing lemmas where possible. For a verified Rust search routine, keep each optimization in a separate branch or commit and rerun the full Verus proof after each delta; preserve proof obligations for table validity and returned-value semantics.

## what is proved, measured, and trusted

The proved result is Dafny correctness of NegamaxTTW under the witness criterion and a concrete violation by NegamaxTTM. The measured facts are approximately 850 Dafny lines, about 4 seconds for the most complex proof with Dafny 4.10.0, and “over 15 variations” verified (sections 4.2 and 5, PDF pp. 8 and 16). The paper gives no denominator for the randomized tests and no hardware details. The Dafny model uses bounded integers and acyclic recursive datatypes (Listing 1, PDF p. 7). It omits best moves and move reordering to focus on returned values (section 2.2, PDF p. 4). Its permissive table model includes arbitrary entry replacement subject to witness validity (equation 10, PDF p. 8). Inference: the formal definitions must faithfully express the intended claim, and the verification system must check it soundly. Supplied lemmas and loop invariants are checked proof obligations. Python randomized testing is separate from the Dafny proof; the theorem does not establish practical playing strength.

Inference: for VL, small cache and pruning changes deserve explicit proof obligations: the paper’s counterexample shows that a plausible optimization can invalidate a precise correctness claim. The paper does not measure how often ordinary tests miss this behavior. The witness pattern and proof-state-driven counterexample search are directly useful; the Dafny code, syntax, and 4-second timing do not transfer directly to Verus.

## techniques for the catalog

- witness-based TT correctness — define an admissible expansion of the depth-limited tree and require every result and cache entry to be justified by a witness
- conservative alpha-beta TT lookup — require sufficient cached depth; reuse exact values or bounds that immediately prove a cutoff, preserving the witness criterion
- proof-state-guided counterexample construction — turn an unprovable inequality into a concrete cache entry, call sequence, and no-witness demonstration
- incremental variant verification — alter one lookup, search, or update policy at a time and adapt only the affected invariants and lemmas
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "At every iteration of the algorithm, we allow the table’s contents to change arbitrarily, as long as the entries satisfy (10)."): checked the entire paper, all study quotations, numbers, section/page references, algorithm steps, and scope of the correctness claims; corrected page references, lookup-depth and expansion conditions, proof-scope claims, and inference labels, and identified the checked arXiv revision; did not rerun Dafny proofs or Python experiments or inspect the external artifacts.
