# Prophecy-Based Automated Verification of Message-Passing Programs
(authored by agents unless marked 🧑)

Audit: audited 2026-10-13 against the paper; checked numbers, tables 1 and 2, page and section references, quotations, clauses of Figure 4 and the appendix, and the five proof moves; changed one widened claim about Verus, one unmarked inference, one unsupported statement on the benchmark authorship, and one empty sentence about the status table.

source: Takashi Nagatomi, Musashi Katsura, Naoki Kobayashi, Ken Sakayori (University of Tokyo), Yusuke Matsushita (Kyoto University, MPI-SWS), arXiv:2606.28066v1, 26 Jun 2026; 38 pages: body to p.16, references p.16 to 19, Appendix A (auxiliary predicates, a three-thread example) p.20 to 21, Appendix B (proof of the main theorem) p.21 to 34, Appendix C (benchmark programs) p.34 to 38

earlier notes: topic_studies/formal_verification_rust/rust_verifiers/collected_papers.md lists the paper by title with a link to the saved copy and says nothing about its content.

## the theorem, the experiment, and the trusted parts

Proved, on paper: a translation from programs in a small message-passing language to constrained Horn clauses (CHCs, implications whose unknowns are predicates, solved by finding predicates that make every implication true) such that the clauses have a solution exactly when no execution of the program reaches a failure statement. The abstract: “We prove that the resulting reduction is sound and complete: a program is free from assertion failures if and only if the corresponding system of CHCs is satisfiable.” (Abstract, p.1) The formal statement is Theorem 6 (Section 3.3, p.11); the proof is Appendix B.

Measured: solving time of a three-solver portfolio on six safe and five buggy small programs (Section 4, Tables 1 and 2, p.12).

Trusted or assumed:
- the proof is a paper proof; the paper mentions no mechanization, and several cases are given as sketches (Lemma 13 is a proof sketch, p.29)
- the CHC solvers Spacer, Eldarica and Catalia, and the tool's implementation of the translation
- the language itself. It has integers, first-order functions, and unbounded asynchronous channels that carry integers: “The communication channels obey the multi-producer, single-consumer (MPSC) principle as in Rust.” (Section 2, p.4) Inference: shared memory, channels sent over channels, closing a channel and a failed receive are not in the language, so the theorem says nothing about Rust programs that use them.
- the front end. The abstract speaks of a prototype verifier for Rust-like programs, but Section 4 says: “Our tool takes as input a program written in the language defined in Section 2.” (p.11) Inference: the Rust listings in the figures were translated to that language by hand.

Completeness is relative to an ideal solver, as the authors say: “By contrast, our translation is relatively complete, assuming that the underlying CHC solver is complete; this assumption is, of course, idealized, since CHC solving is undecidable in general.” (Section 6, p.15)

## technique 1: one function, and one predicate, per program point

what it is: before translation, the program is put in a form where each function does one thing and then calls the next function. Each function then becomes one predicate.

when to use: as the front half of any translation of imperative code to Horn clauses; it makes each clause correspond to one statement.

how it is done (Section 2.1, p.4 to 5):
1. allow only these statement forms: fail; unit (thread end); a call; a conditional between two calls; send then call; receive then call; create a channel then call; clone a sender then call; spawn one call and continue with another (the grammar on p.4)
2. the paper's rule: “Control flow is encoded as function calls, and every function ends with a call to a continuation function.” (Section 2.1, p.4)
3. choose the functions so: “We just prepare a function for each program point whose arguments are variables that are alive at that point.” (Example 1, p.5) For the counting program of Figure 1 this gives msg_count, for, f4, f5, loop, assert, fail, f6, each with the integers and channel ends live at that line
4. encode an assertion as a conditional whose false branch calls a function whose body is fail (Example 1, p.5)
5. type channel ends linearly: a sender has type ch+, a receiver ch−, and a channel variable cannot be passed to both sides of a spawn; a channel may be dropped only at unit or fail (Section 2.1, Figure 2, p.5)

Verus form (Inference: the paper has no Verus content beyond listing Verus among the tools to which RustHorn's technique “has also been applied to semi-automated Rust verification tools such as Creusot [11], Verus [25] and Thrust [30]”, Section 6, p.16). Verus does this step internally when it generates verification conditions, and Rust's ownership already gives the linear treatment of channel ends, so nothing is written by the user. The user-visible counterpart of one predicate per program point is the loop `invariant`: the only program points where Verus needs a user-supplied predicate are loop heads and function boundaries (`requires`, `ensures`).

evidence and limits: none separate; this is the setting for techniques 2 to 4.

## technique 2: a channel as a guessed list of its future messages

what it is: a prophecy is a value fixed in advance that stands for something determined only later. Here, when a channel is created, the model guesses the whole list of messages that will ever be sent on it. The sender end and the receiver end each carry that list. The abstract: “Inspired by RustHorn’s prophecy-based technique, we represent each sender channel by a list of values to be sent over the channel in the future, which enables modular encoding of sender and receiver threads in CHCs.” (Abstract, p.1)

why not the obvious model, the current queue contents: “In that case, however, the message queue would have to be treated as global state: since it is updated by both send and receive operations, sender and receiver threads could no longer be modeled as separate predicates in the resulting CHCs.” (Section 1, p.3)

when to use: when threads share nothing but channels and one wants each thread verified on its own, with the channel's content as the only coupling.

how it is done. The division of labor: “The crux of the prophecy-based representation of channels is that it enables modular modeling of sender and receiver threads: it suffices that the sender and receiver agree, when a channel is created (as in the second clause above), on the values to be sent, and afterwards, the sender locally checks at each send operation that the prophecy is correct, while the receiver locally assumes that messages arrive as described by the prophecy.” (Section 1, p.3) Per statement, without timestamps (Section 1, p.2 to 3; the full rules with timestamps are Figure 4, p.9):
1. create: introduce one list variable and give it to both ends. In the introduction's clauses this is `Entry(b, n) ⇐ ForLoop(b, 0, n, l, l)`, the same l in the sender and receiver positions
2. send value a on sender list x: require x = a :: x′ and continue with x′. The sender proves that the head of the guess is what it sends
3. receive on receiver list y: assume y = v :: y′, bind the received variable to v, continue with y′
4. no rule for an empty receiver list: “Note that there is no clause for the case where r is an empty list; this means that no message is available, and hence the execution is blocked.” (Section 1, p.3)
5. clone a sender with list y: split y into the clone's list x and the original's remaining list y′ with `Merge(x, y′, y)`, which holds when y is an interleaving of x and y′. Merge is three clauses (Appendix A.1, p.20): `Merge([], [], [])`; `Merge(p :: xs, ys, p :: zs) ⇐ Merge(xs, ys, zs)`; `Merge(xs, p :: ys, p :: zs) ⇐ Merge(xs, ys, zs)`
6. thread end, at unit or fail: require every sender list the thread still holds to be empty: “Moreover, since no further send operations will be executed, the prophecies for output channels must be empty lists.” (Section 3.2, p.8) Receiver lists are left unconstrained, since they describe messages that may arrive, not messages this thread must consume

The paper's worked example (Section 1, p.2): n threads each send 1; the main thread counts receipts in c and asserts c ≤ n. The clauses, with b an error flag:

```
⊥ ⇐ Entry(true, n) ∧ n ≥ 0
Entry(b, n) ⇐ ForLoop(b, 0, n, l, l)
ForLoop(b, n, n, [], r) ⇐ Loop(b, 0, n, r)
ForLoop(b1 ∨ b2, i, n, s, r) ⇐ i < n ∧ Merge(s1, s2, s) ∧ Send(b2, s2) ∧ ForLoop(b1, i + 1, n, s1, r)
Send(false, s) ⇐ s = [1]
Loop(b, c, n, r) ⇐ r = v :: r′ ∧ c + 1 ≤ n ∧ Loop(b, c + 1, n, r′)
Loop(true, c, n, r) ⇐ r = v :: r′ ∧ c + 1 > n
```

For a simplified version, Example 3 (p.7) gives the solution a solver must find: ForLoop holds of (true, i, n, s, r) when 0 ≤ i ≤ n, the length of r exceeds n, and the length of s is n − i, or when n < 0; Loop holds of (true, c, n, r) when c plus the length of r exceeds n. In words: failure is possible only if more than n messages are prophesied, and the sender side fixes the count at n.

How this differs from RustHorn, in the authors' words: “Roughly speaking, Rust-style borrows are like a one-shot, single-sender channel.” (Section 6, p.16) A mutable borrow prophesies one final value; a channel prophesies a list, resolved one element per send, and split at each clone.

Verus form (Inference). The same idea can be stated as contracts on a channel wrapper. Give the sender and receiver types a ghost field holding the remaining list, a `Seq<int>` in a `Ghost`, with `spec fn` views. The contracts would read: creation `ensures` the two views are equal; send of v `requires` the sender's view is non-empty with first element v and `ensures` the new view is the tail; receive `ensures` the returned value is the first element of the old view and the new view is the tail, written with `old(...)` on the `&mut` receiver; clone `ensures` the two resulting views interleave to the old one, with the interleaving as a recursive `spec fn` with a `decreases` clause. The bodies would be `#[verifier::external_body]` around the standard channel, so these contracts are trusted axioms; the paper's theorem covers its own small language, not that wrapper. What changes: Verus has no CHC solver behind it, so every predicate the paper leaves to the solver (the meaning of each program point) must be written by hand as `requires`, `ensures` and loop `invariant` clauses about the remaining lists, such as the length facts of Example 3. What does not carry over: full automation, and the completeness half of the theorem. A different, more usual Verus route to the same end is a ghost protocol built with `tokenized_state_machine!`, where tokens record what has been sent so far rather than what will be sent; that models history, not prophecy, and the reference notes do not show a channel built either way.

evidence: the soundness direction of Theorem 6 for the version with timestamps; for the version without, the paper states soundness and gives a counterexample to completeness (Example 5, technique 4). In the experiments the version without timestamps verified the multi-sends program in 50.4 seconds after the version with timestamps had timed out (Table 1, p.12).

where it fails: without timestamps the guess can be self-fulfilling in an order no execution allows; see technique 4.

## technique 3: an error flag, a join at spawn, and a clause that abandons threads

what it is: every predicate gets an extra argument b saying whether the execution from that point reaches failure. The property to verify becomes: the main call never holds with b true.

how it is done (Section 3.2, p.8 to 9):
1. translate a function type by adding two integer arguments in front: “The first integer argument will be used to track whether a program failure has occurred, and the second will be used to pass timing information, as we shall see below.” (Section 3.2, p.8)
2. meaning of the flag: “Here, b = true means that fail is reachable, whereas b = false covers all other cases, including normal termination, divergence, and blocking while waiting for a message.” (Section 3.2, p.8)
3. a function whose body is fail gives `Fi(b, t, x̃) ⇐ b = true ∧ s̃ = []`; a function whose body is unit gives the same with b = false; s̃ are the function's sender arguments (p.8 to 9)
4. a conditional gives two clauses: the condition non-zero and the first callee's predicate, or zero and the second's, with b and t passed through (Figure 4, p.9)
5. spawn gives `F1(b1, t, ã1) ∧ F2(b2, t, ã2) ∧ b = (b1 ∨ b2)`: the whole fails if either thread does (Figure 4, p.9)
6. for every function add `Fi(false, t, x̃) ⇐ s̃ = []`. The reason: “Informally, this clause allows us to ignore the future behavior of a thread from any program point fi at any time t, provided that the thread is assumed not to perform any further sends and not to reach fail.” (Section 3.2, p.9) Once one thread fails, what the others would have done does not matter, but they must not be credited with further sends
7. add the goal clause `⊥ ⇐ F(true, t, ã)` for the main call (p.9)

Figure 4 has no rule for a statement that is only a call to another function. Inference: the rule is to pass b and t unchanged to the callee's predicate, as Example 4's clauses do.

Verus form (Inference). Verus proves that an `assert` cannot fail in any thread directly, so no flag is needed; step 6 has no counterpart. Step 5 corresponds to verifying a spawned closure against its own `requires` at the spawn site.

evidence and limits: part of the main theorem. The flag only records reaching fail, so the base translation proves nothing about termination or blocking (technique 6 changes that).

## technique 4: timestamps that make the guess respect cause and effect

what it is: each prophesied message carries the time it will be sent, and each predicate carries the time of its thread's latest send or receive. Inequalities between these times rule out guessed lists that no schedule can produce.

why it is needed, Example 5 (Section 3.2, p.10 to 11): a single thread creates a channel, receives from it, then sends 0 on it, then fails. “The program on the left-hand side never fails because the execution is blocked by the receive from r.” (Example 5, p.10) Without times, guessing the list [0] lets the receive take the 0 that is only sent afterwards, failure is derivable, and a safe program is reported unsafe. With times, the receive needs send-time < receive-time, and the later send in the same thread needs receive-time ≤ send-time; the two contradict.

how it is done (Section 3.2, Figure 4, p.9 to 10):
1. make every channel a list of (timestamp, value) pairs
2. the thread's time: “The timestamp t is not a global clock: it records only the most recent send or receive, so as to capture causal dependencies between messages.” (Section 3.2, p.9)
3. send: `F(b, ts, [x′/x]ã) ∧ x = (ts, a) :: x′ ∧ t ≤ ts`. The send's time is the stamp at the head of the guess, it is not before the thread's previous event, and it becomes the thread's time
4. receive: `F(b, tr, [y′/y]ã) ∧ y = (ts, x) :: y′ ∧ ts < tr ∧ t ≤ tr`. A fresh receive time tr is strictly after the message's send time: “This ensures that a message is not received before it is sent, as discussed in Example 5.” (Section 3.2, p.10)
5. create: `F(b, t, ã) ∧ x = y ∧ Sorted(x)`: “The condition x = y ensures that they coincide, and Sorted(x) ensures that the timestamps in x are in ascending order.” (Section 3.2, p.10) Sorted is three clauses: the empty list, a one-element list, and `Sorted((t1, v1) :: (t2, v2) :: xs) ⇐ t1 < t2 ∧ Sorted((t2, v2) :: xs)` (p.9; Appendix A.1, p.20). Inference: strict order also makes stamps on one channel distinct
6. clone, spawn and conditional pass t unchanged; only send and receive move it

A second example, Example 7 (Appendix A.2, p.20 to 21), has three threads: one sends 10; another waits for an acknowledgement and then sends 20 on a clone of the same sender; the main thread receives, acknowledges, receives again and asserts it got 10 then 20. Without times the list [20, 10] would be an admissible guess; the chain of inequalities through the acknowledgement channel forbids it.

how the proof goes (Appendix B), in five moves, useful as a pattern for proving such an encoding correct:
1. define an instrumented semantics whose configurations also hold each thread's time, each channel end's remaining guess and each thread's guessed outcome: “The idea is to let the configurations carry the timestamps, prophecies, and the failure flag, and only allow them to transition if the guesses are correct.” (Appendix B.2, p.22)
2. state a well-formedness invariant tying guesses to queues: a receiver's guess equals the timestamp-ordered merge of its queue and its senders' guesses, each is sorted, and the latest send time is below every stamp still to come (Definition 9, p.22 to 24); show steps preserve it (Lemma 10)
3. soundness direction: every instrumented step is one resolution step on the clauses (Lemma 11), a failing step empties the goal (Lemma 12), and any real failing run can be instrumented by reading the guesses off the run (Lemma 13); so a failing run refutes the clauses (Theorem 14, p.29)
4. completeness direction: a refutation is a tree, not a sequence, since the spawn clause has two predicates in its body. The body's overview: “Recovering an execution therefore requires linearizing this tree into a thread schedule while preserving causality.” (Section 3.3, p.11) Lemma 16 (p.30) reorders it: “While we apply clauses with a predicate in the body, we may choose the nodes in order of increasing introduced timestamps, with ties broken arbitrarily.” (proof of Lemma 16, p.30)
5. each reordered resolution step is then matched by an instrumented execution step (Lemma 17), ending in failure (Lemma 18), which gives Theorem 19 (p.34)

Verus form (Inference). Timestamps exist to make an automatic encoding complete. A Verus proof is written against real executions with ghost state that records what has happened, so a guess that contradicts causality cannot arise and no stamps are needed. If the trusted wrapper of technique 2 were used, Example 5 shows the danger precisely: prophecy contracts without a causality condition let a thread assume a message it has not yet sent. The wrapper would accept that program's failure as reachable, which is only incompleteness; but it means proofs about request-and-reply protocols would need the stamps added to the ghost lists, as `Seq<(int, int)>` with a sortedness `spec fn`.

evidence: Theorem 6. In the experiments: “If all solvers time out, the tool instead passes the CHCs without timestamps, as an approximate translation, to the same portfolio solver.” (Section 4, p.11) Section 4 names Example 5 and the ack program (Example 7) as the two whose results differ with and without timestamps. With timestamps they were solved in under 0.1 and in 0.2 seconds (Table 1, p.12).

where it fails: timestamps make the clauses harder for today's solvers. The multi-sends program (one thread sends 1 n times, another sums n receipts and asserts the sum is n) timed out at 120 seconds with timestamps and was verified only by the fallback.

## technique 5: a sound fallback in a solver portfolio

what it is: run the exact encoding first; if it times out, run the cheaper, sound but incomplete encoding and accept only its positive answer.

how it is done (Section 4, p.11):
1. generate both clause sets, with and without timestamps
2. give the timestamped set to Spacer, Eldarica and Catalia in parallel; satisfiable means safe, unsatisfiable means unsafe
3. on timeout of all three, give the set without timestamps to the same portfolio
4. interpret the second answer one-sidedly: “If any solver reports that the approximate CHCs are satisfiable, the tool returns safe; otherwise, it returns unknown.” (Section 4, p.11)

Verus form (Inference). The pattern is general: when two encodings of a proof obligation exist and one is sound but weaker, a success of the weak one settles the question and a failure settles nothing. In Verus terms, try the default solver call first and the special modes afterwards, never reading a failure as a refutation.

evidence (Tables 1 and 2, p.12; 120-second timeout per portfolio run; a laptop with a 2.8 GHz Core i7 and 16 GB). Safe programs, solving time: Example 1, 19.5; Example 5, under 0.1; ack, 0.2; multi-sends, 50.4 after a 120 timeout with timestamps; client-server, timeout on both encodings; calc-server, 0.8. So 5 of 6 safe programs were verified. Buggy variants: Example 1-e, ack-e, multi-sends-e, client-server-e and calc-server-e were all reported unsafe in 0.1 or less; 5 of 5. The tables do not print a unit; the surrounding text gives the timeout in seconds.

limits: eleven programs of at most a few dozen lines, from the authors' own benchmark suite (Section 4: “our benchmark suite”). No comparison with another tool is run.

## technique 6: variants by changing the auxiliary predicates

what it is: other channel semantics and another property are obtained by local edits to the translation (Section 5, p.13 to 15). None of these variants is in the experiments, and the paper says of the first two only that the proofs need local changes.

how each is done:
1. order kept per sender but not across senders of one receiver: the split at clone already gives a tree of per-sender lists, so “the only change needed is to omit the constraint Sorted(x), which otherwise imposes a global FIFO order on all messages sent to the receiver.” (Section 5.1, p.14)
2. no order at all: guesses are multisets; Merge is replaced by a Union predicate and Sorted is dropped (Section 5.1, p.14)
3. buffer bounded by k: guesses also carry receive times, and Sorted gains the condition that the send time of message i + k is later than the receive time of message i: “This constraint states that no further value is sent when there are already k unreceived values accumulated in the buffer, which is exactly the buffer-size constraint.” (Section 5.1, p.14)
4. deadlock freedom: “To check deadlock freedom, we extend this flag to three-valued status: Fail, Terminated, and Blocked.” (Section 5.2, p.14) Add, for each receive, a clause giving status Blocked when the receiver's guess is empty; combine statuses at spawn: “Next, at a spawn statement, the statuses of two threads are combined so that the overall computation is reported as Blocked when both remaining threads are either terminated or blocked and at least one of them is blocked.” (Section 5.2, p.15); and make the goal clause derive false when the main call has status Blocked. Figure 7 (p.15) works this for two threads that each wait to receive from the other

Verus form (Inference). For a hand-written channel specification the same three knobs exist: whether the receiver's ghost sequence is one sequence (global order), a merge of per-sender sequences, or a multiset; and whether a capacity bound relates the counts sent and received. Deadlock freedom is outside what Verus's default checks cover; a proof would need its own ghost accounting of who can still send.

where it is weak: the composition table for statuses in Section 5.2 (p.15) is printed with the letters T, D and F, while the text names the statuses Fail, Terminated and Blocked and says each is written by its initial; D is presumably Blocked.

## technique 7: a user-supplied fold as an invariant hint

what it is: when the needed invariant is a property of every element of a prophesied list, current solvers do not find it; supplying a fold over the list (a catamorphism: a function computed by replacing the list constructors) that the invariant can be phrased over makes one solver succeed.

the case (Section 4, p.12 to 13): the client-server program, where a server thread replies v + 1 to each request and the client sends 1 n times and asserts the replies sum to 2n. “The reason this instance is not verified is that the backend CHC solvers fail to discover the invariants stating that the values received through r1 and r2 are always 1 and 2, respectively.” (Section 4, p.12) Eldarica and Spacer cannot produce predicates defined by recursion over the list; Catalia can in principle but chooses its fold by heuristics.

how it is done: “We have confirmed that if we manually provide an appropriate catamorphism—namely, one that counts the numbers of 1s and 2s appearing in a list—then Catalia can verify that client-server is safe.” (Section 4, p.13) The fold is given in the footnote on p.13: a right fold from (0, 0) that adds one to the first component for each 1 and to the second for each 2. The authors propose, as future work, deriving such hints from source annotations like the comment in Figure 5.

Verus form (Inference). This is ordinary practice in Verus and is the transferable lesson: state list-wide facts through a recursive `spec fn` (a count, or an all-elements predicate) with a `decreases` clause, put the fact in the loop `invariant`, and prove the step with a small `proof fn` by induction. An agent facing a channel or log invariant should reach first for a counting or all-elements fold, since that is the shape the solvers here could not find unaided.

evidence: one program, confirmed by the authors by hand; no time is reported for the hinted run.

## inconsistencies in the text

- prototype for Rust-like programs (Abstract) against input in the Section 2 language (Section 4), as noted above
- Example 23 (p.35) says the buggy client-server program is shown in Figure 5; Figure 5 is the correct program and Figure 13 the buggy one
- Example 20 calls the benchmark running-ex-e; Table 2 calls it Example 1-e
- Example 4's second clause is printed as For(b, t, 0, sr), with the arguments n, s, r run together, and Example 7's clause for F6 calls F7 with two arguments where F7 is defined with four
- Example 5 prints the constraint from sequential order as tr < ts, while the send rule of Figure 4 gives the non-strict t ≤ ts; either contradicts ts < tr, so the argument stands
- the receive rule in Figure 4 does not list the message's send time among its existentially bound variables
- Section 1's outline announces Section 5.1 and omits Section 5.2

## what was already done, and threat

Already done: a sound and complete Horn-clause encoding of assertion safety for integer-carrying, clonable-sender, single-receiver asynchronous channels with spawn and recursion; variants for three orderings, bounded buffers and deadlock, sketched. The authors' novelty claim: “Most such verification techniques have primarily been developed for sequential programs, and, to the best of our knowledge, the CHC-based verification of message-passing concurrent programs has not been studied before.” (Section 6, p.16)

Inference: threat to a product of agent-written verified Rust is low now. The tool does not read Rust, handles integers only, fails on the short client-server program of Figure 5 without a hand-written hint, and takes 19.5 seconds on the counting example of Figure 1. The idea is the lasting part: a channel specification in which each thread is verified alone against a shared list. If VL needs verified message-passing code, the prophecy-list contract of technique 2, with the causality condition of technique 4, is a candidate design for the trusted channel interface, and Example 5 and Example 7 are ready-made tests of whether such an interface is too permissive.

## techniques for the catalog

- program-point functions: rewrite the program so each function performs one statement and then calls a continuation, with the live variables as arguments, and make one predicate per function
- channel as prophesied message list: give both channel ends the same guessed list of future messages; the sender proves each send matches the head, the receiver assumes it
- empty-sender-list at thread end: a thread may terminate or fail only if every sender it holds has an empty remaining list
- clone as interleaving: split a sender's remaining list into two whose interleaving is the original, with a three-clause Merge predicate
- failure flag joined by disjunction at spawn: carry a flag for reaching failure and set the parent's flag to the or of the two threads' flags
- thread-discard clause: allow any thread to be abandoned with flag false provided its sender lists are empty, so that one thread's failure does not require running the others out
- timestamped prophecies: stamp each guessed message with its send time, keep each thread's last event time, and require send time strictly before receive time and non-decreasing times within a thread
- sorted-on-creation: require a new channel's guessed list to have strictly increasing stamps, which encodes first-in-first-out order across all senders
- exact-then-approximate portfolio: on timeout of the complete encoding, run the sound incomplete one and accept only its safe answer
- ordering variants by predicate swap: drop Sorted for per-sender order, use multisets and Union for no order, add receive times for a bounded buffer
- three-valued status for deadlock: extend the flag to failed, terminated or blocked, add a blocked clause for receive on an empty list, and make a blocked whole program the goal
- fold hint for list invariants: supply a counting fold over the message list when the invariant says all elements have a given value
- instrumented semantics as proof mediator: prove an encoding correct by a semantics that carries the guesses and steps only when they hold, matched step by step with resolution
- timestamp-ordered linearization: turn a tree-shaped refutation into a thread schedule by expanding nodes in increasing timestamp order
