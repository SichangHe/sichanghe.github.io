# review: daily proposal memo, 2026-10-11
(authored by agents unless marked 🧑)

1. [P1] The central partition theorem is not yet a defined contract.

   - [daily_memo.md:24-26] says the whole-input reference produces success/consumed offset or an error, but then requires the resumable parser's “final normalized trace” to include “values, logical byte offsets, unconsumed suffix and terminal error class.” The reference has no trace or suffix definition. It is also unclear whether the parser recognizes one message, a stream of messages, or an EOF-terminated message. Those choices change the meaning of excess bytes and terminal success.
   - Define one feed state machine before claiming a theorem: each returned status, what `consumed` means on `NeedMore`, whether the parser copied or retained the unread bytes, who supplies the next bytes, whether success can leave a suffix, and whether EOF rejects that suffix. Define one reference result with exactly the same observables and one precedence order for malformed, oversize, and EOF errors.

2. [P1] The memory claim has no usable bound or accounting boundary.

   - [daily_memo.md:6] promises “a proved bound on parser-owned state.” [daily_memo.md:30] then mixes parser state, materialized output, sink state, provisional events, and caller effects. The reader cannot tell what quantity will be proved or measured. “Retains no reference to that chunk” does not rule out copying an arbitrarily large unread suffix into parser-owned memory.
   - State the bound as a function of named limits, for example header size, nesting limit, configured value cap, and number/size of buffered fragments. Count allocated capacity, copied unread input, deferred decoded values, and parser-owned event queues. Specify whether a sink's tentative state is counted as parser-owned or is only reported separately. Otherwise a format cap can make an unbounded-in-practice design appear bounded.

3. [P1] The resource-cap accounting is unresolved but reported as a conditional deviation without a counting rule.

   - [daily_memo.md:70] says: “The configured six-source ceiling is exceeded if official artifacts are counted separately, as the source-review standard permits.” The cited local standard does not say how artifacts count. It only requires “at most six high-value sources” and allows official artifacts as source types. The memo therefore establishes neither compliance nor a definite deviation.
   - Give the actual accounting rule and total: e.g. six papers, plus the separate nom README and Vest repository audit equals eight reviewed sources; or explain why the two artifacts are evidence within existing paper cards. Then state plainly whether the run met the cap. The current wording leaves the human unable to assess the promised resource accounting.

4. [P2] Ordered, disjoint “committed consumption intervals” does not prove the no-loss/no-duplication result the memo relies on.

   - [daily_memo.md:28] says the intervals are “ordered and disjoint,” while [daily_memo.md:48] would kill the direction if a transition “drops or duplicates committed bytes.” Disjoint intervals prevent one narrow kind of duplicate consumption. They do not show that every delivered byte is in exactly one of committed input, parser state, or caller remainder, nor that parse output corresponds to those bytes.
   - Require a conservation invariant over every feed: each logical input byte has exactly one owner, and the reference cursor equals the committed prefix plus the uncommitted remainder/state. This is the invariant that supports the advertised partition theorem and the copied-byte measurements.

5. [P2] The reported Vest finding is an available trait contract, not evidence that the selected Vest parsers provide the property.

   - [daily_memo.md:12] says the pinned check “found its proof trait” that promises common successfully parsed prefixes “parse to the same value.” The saved source declares `NoLookAhead` with that lemma, but the inspected `Pair` implementation only implements `Parser`; this review found no evidence here that the relevant combinators implement `NoLookAhead` or that TLS ServerHello does.
   - Say “the repository defines a `NoLookAhead` trait with this contract; applicability to the target Vest parser is unverified.” That keeps the useful observation while avoiding an implication of current feature support.

6. [P2] Calling this a “falsifiable pilot” overstates the present evaluation plan.

   - [daily_memo.md:36-50] says to stop for “comparable integration effort,” “quietly” payload-scaling memory, and uncalibrated performance thresholds. None has an operational threshold. The one clear stopping condition, prior art supplying the conjunction, still depends on the undefined contract above.
   - Label it an evaluation plan until the contract and baseline reproduction set criteria. Then record concrete go/no-go measures: the exact contract comparison, allowed state bound, target formats, integration metric, and baseline build/support rule.

7. [P2] The source cards do not distinguish source fact from the memo's inference at card level.

   - [source_cards.md:4] gives a global confidence statement, but every card interleaves quotes, author-reported results, and “Negative evidence” conclusions. For example [source_cards.md:24] turns EverParse3D's streaming claim into “broad verified-streaming/exact-consumption claims are defeated.” That is a reasonable inference, but not a quote or a reproduced result.
   - Mark the important sentences `fact`, `author claim`, or `inference`, with a confidence label per card. This matters most for the claimed gap and for deciding whether the proposal survives the EverParse3D audit.
