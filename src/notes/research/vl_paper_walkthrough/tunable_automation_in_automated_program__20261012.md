# Tunable Automation in Automated Program Verification
(authored by agents unless marked 🧑)
Tag: `bai2025tunable`, [paper](https://arxiv.org/abs/2512.03926v1)

## scope and result

Bai, Hawblitzel, and Lattuada address the main performance tradeoff in SMT-based Verus proofs: more quantifier instantiation can remove manual hints but can also make the solver search space and response time explode. Their mechanism publishes selected lemmas as quantified facts and imports them at module, function, or nested proof scope. The abstract states: “Our approach lets library authors provide different pre-defined automation levels while giving end-users the ability to further customize quantifier availability at the module, function, or proof context level.” (abstract, p. 1)

The paper adds `broadcast proof fn`, `broadcast group`, and `broadcast use` to Verus, plus reporting based on solver UNSAT cores. It evaluates open projects IronKV, Splinter, Anvil, and CapybaraKV, and separately evaluates broad trigger selection in IronKV. The mechanism is an automation-control technique, not a new soundness proof: every imported lemma still needs a proved body or trusted axiom, and solver outcomes remain subject to Verus's trusted base.

## technique 1: publish reusable quantified facts with broadcast lemmas

Use this when a library abstraction has properties clients need repeatedly but clients should not see the proof's internal details. A `broadcast proof fn` exposes its `ensures` as a universally quantified fact. A `broadcast group` names related facts for bulk import.

The paper's IronKV `Key` trait requires a `key_obligations` proof and exposes transitivity as:

```rust
broadcast proof fn trans_lt_lt(a: Self, b: Self, c: Self)
  ensures a < b && b < c ==> a < c
```

Clients import `broadcast use {group_key_cmp_properties};` and reason about keys abstractly. To apply it:

1. prove the abstraction's obligations
2. mark only client-relevant lemmas as broadcast
3. choose triggers that mention every quantified variable
4. collect related lemmas in a broadcast group
5. import the group where the proof needs the facts

Verus form: `proof fn`, `ensures`, `broadcast proof fn`, `broadcast group`, and `broadcast use` are the constructs. The five numbered steps are the study's summary of the paper's Key example, not a procedure the paper lists. Inference: a Rust verifier without this feature could emulate the pattern with explicit lemma calls or a generated context, which would change proof search behavior. The paper says: “As broadcast proofs share the same ability as moving the input parameters to a universally quantified variable in the ensures clause, they must adhere to trigger rules as if they are universally quantified.” (Sec. 3, p. 5)

## technique 2: tune scope from broad import to the facts actually used

Use broad groups first when developing a proof, then shrink the context after success. The sequence example cannot prove `s.push(3).contains(3)` with the default context. A lemma establishing `(s.push(v).contains(x)) <==> v == x || s.contains(x)` is marked broadcast and imported. Verus can report which broadcast facts were likely used from the solver's UNSAT core. Replace the broad group import with just `lemma_seq_contains_after_push` when that is sufficient.

Steps:

1. mark candidate library facts broadcast
2. import a collection group with `broadcast use`
3. verify the proof
4. query Verus for used broadcast lemmas/groups
5. replace the broad import with the smallest successful set
6. if a local proof still fails, widen only that proof context

Facts can be imported at module level, in a `proof fn`, inside `assert (...) by { ... }`, or in a `calc` proof. The authors summarize the workflow: “The combination of bulk import of quantified facts via broadcast use of broadcast groups and the tooling to report those that are likely relevant to the proof enables a workflow where the developer first imports a broad set of facts in context, and when the proof is successful, trims the set of quantified facts to those relevant to the proof, potentially recovering proof performance by reducing the solver’s search space.” (Sec. 3, p. 6) Inference (not the paper's): for an agent, start with high automation to discover a proof, then minimize context to stabilize runtime and make dependencies auditable.

## technique 3: use assertion minimization as an automation proxy

The paper needs a measurable definition of automation. It linearly scans proof code, tentatively removes `assert` and `assert (...) by {...}` hints, reruns Verus, and keeps an assertion only if removal causes failure. This is a practical approximation to the minimum hint set; exact minimization would examine 2^n subsets.

Apply it as follows:

1. verify the original project
2. remove one assertion
3. rerun verification (the paper reruns it after each removal; it notes that rerunning only the affected condition is complicated by cross-talk between conditions)
4. retain the assertion only when verification fails
5. repeat to obtain a minimized baseline
6. import ambient facts and repeat
7. compare assertions removed by the facts

The authors caution that asserts also document proof structure and that the tool ignores lemma calls, so the count is only a proxy.

## technique 4: choose automation levels for collection libraries

The authors translated omitted Dafny collection lemmas into four Verus broadcast groups: 25 sequence, 2 map, 10 set, and 12 multiset lemmas, 49 total. They imported these ambient facts into all contexts and compared minimized assertion counts. Counts fell from 268 to 245 in IronKV (23, 8.6%), 1158 to 1130 in Splinter (28, 2.4%), 343 to 336 in Anvil (7, 2.0%), and 449 to 415 in CapybaraKV (34, 7.6%).

The technique is useful when a library author wants named automation tiers. The paper says a user can import a group at module level and then tailor the imported set in more granular proof contexts to fix slowdowns. Inference: a Verus-style agent should retrieve groups by datatype and proof context, rather than blindly adding every lemma.

## technique 5: select triggers deliberately and use `all_triggers` sparingly

Quantifiers instantiate when a trigger expression syntactically matches a term in the proof context. In the paper's sequence example, selecting `is_even(s.index(i))` fails to instantiate for `s.index(3)` because that term is absent; selecting `s.index(i)` succeeds. The annotation is `#[trigger]`.

Verus's `#![all_triggers]` selects all valid non-redundant trigger sets instead of its conservative defaults. In IronKV, the authors removed manual triggers where possible, added 206 `all_triggers` annotations to 261 quantifiers, and reduced minimized assertions from 268 to 235, a 33 (12.3%) reduction. One proof broke. The approach did not scale to the other projects: pervasive use produced many failures, likely from enlarged search and misguided matching loops.

The paper's sequence-length axiom illustrates the risk. A trigger on `s1.add(s2).len()` is relevant only when `.add()` appears. The paper says the second trigger set would instantiate the axiom once on each pair of `.len()` calls in the program and proof context, which is excessive.

## evidence and limits

With ambient collection facts, approximately 2% of functions took twice their original verification time; worst slowdowns ranged from 3x to 19x. The extreme examples rose from 34 ms to 669 ms (19.1x) in Splinter and 3508 ms to 43563 ms (12.4x) in Anvil. In failure-time experiments that removed 20 sampled assertions per project, 78% of failed functions still reported failure within twice the original verification time. For IronKV, 98.20% of functions stayed within 2x successful-verification time with ambient facts. With `all_triggers`, 97.22% of IronKV functions stayed within 2x, but the experiment was only one project.

What is proved: Verus checks each program under its selected quantifier context and trigger strategy. What is measured: assertion-count proxy, successful verification time, failure-report time, and selected-project case studies. What stays trusted: Verus, SMT solver, broadcast proof bodies, axioms, UNSAT-core interpretation, and the assumption that fewer asserts measures automation. The datasets are openly available codebases, not randomized programs; the authors explicitly warn that assertion minimization does not capture all proof effort.

## techniques for the catalog

- broadcast quantified facts — mark proved lemmas as reusable quantified context and group them for import
- scope and trim automation — develop with broad groups, inspect likely UNSAT-core usage, then narrow imports
- assertion minimization — remove hints one at a time and rerun verification to estimate automation gain
- trigger-guided instantiation — choose syntactic patterns that occur at the proof obligation and avoid matching loops
- selective all-triggers mode — broaden trigger sets for user quantifiers only after measuring proof and runtime effects
