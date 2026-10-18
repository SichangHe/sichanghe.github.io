# A Framework for the Automated Verification of Algebraic Effects and Handlers
(authored by agents unless marked 🧑)
Tag: `soares2023automated`, [paper](http://arxiv.org/abs/2302.01265v3)

## scope and contribution

The paper extends Cameleer, an OCaml deductive verifier whose GOSPEL specifications are translated to WhyML/Why3, to algebraic effects and handlers. Its abstract states: “In this paper, we present an extension to Cameleer, a deductive verification tool for OCaml code, that allows one to reason about algebraic effects and handlers.” (Abstract, p.1). The technical problem is that an effect handler exposes a delimited continuation; the translation must represent that continuation while retaining automated proofs. The authors state that effects are embedded “using exceptions and employs defunctionalization to deal with continuations exposed by effect handlers.” (Abstract, p.1).

Inference: this is a verification architecture for control effects, not a proof that arbitrary OCaml effects are safe. Its reusable ideas for VeruLaw are an explicit client/server protocol, a handler invariant, an exception encoding, and a one-shot continuation contract.

## technique 1: specify an effect as a client/server protocol

What it is. A protocol is the contract shared by the code that performs an effect (Client) and the handler that calls its continuation (Server). Section 3 defines protocols as “preconditions (the conditions Client must respect when performing an effect), postconditions (the conditions that Server must respect when calling the continuation) and a modifies clause with all the variables Server is given write permissions to.” (Section 3, p.4).

When to use it. Use a protocol whenever an effect communicates values through a handler and the continuation must be resumed with a state-dependent reply. The paper’s XCHG example has a reference `p` and an effect carrying an integer. Its complete contract is:

```
(*@ protocol XCHG x :
    ensures !p = x && reply = old !p
    modifies p *)
```

(Section 3.1, p.4). The postcondition says that the handler stores the client value and returns the old reference value; `modifies p` gives the handler write permission.

How to apply it, following the paper. (1) Declare the mutable state and effect (`p : int ref`, `effect XCHG : int -> int`) (Section 3.1, p.4). (2) Name a protocol after the effect and write its precondition, postcondition, and modifies set (Section 3.1, p.4). (3) Write the Client as a function that performs the effect and give it the protocol postcondition plus `performs XCHG` (Section 3.1, p.4). The paper’s client is `let xchg (n : int) : int = perform (XCHG n)` with `ensures !p = n && result = old !p` (Section 3.1, p.4). (4) Verify that every possible reply satisfies the client postcondition.

Verus form. Inference: model the message and abstract state with Rust data or ghost values; state the client contract with `requires`, `ensures`, and a proof-side effect summary. A protocol predicate can be a `spec fn` over the argument, pre-state, post-state, and reply. Rust ownership supplies the concrete permission discipline; the protocol’s `modifies` meaning needs an explicit mutable borrow or a ghost state invariant. The OCaml `performs` clause has no direct Verus syntax, so an effect summary must be represented by the function’s contract and the chosen handler API.

Evidence and limits. The XCHG client generates one VC, which is proved trivially (Section 4.4, p.10). This demonstrates contract propagation, not scalability. The protocol assumes the handler obeys the stated postcondition; the protocol itself does not prove that a handler implementation meets it.

## technique 2: use a handler invariant for deep handlers

What it is. A deep handler remains installed when it resumes a continuation, so verification must state what is true when execution leaves through either the normal or exceptional branch. The paper introduces `try_ensures` for this purpose. Its server example is `try xchg (xchg 42) with | effect (XCHG n) k -> let old_p = !p in p := n; continue k old_p` (Section 3.2, p.5). The associated invariant is:

```
try_ensures !p = old !p && result = 42
returns int
```

(Section 3.2, p.5). The authors explain: “Since the handler remains installed (again, due to it being a deep-handler), it keeps calling continue until no more effects are performed.” (Section 3.2, p.5).

When to use it. Use a handler invariant when a continuation can re-enter the same handler or when correctness depends on both exceptional and normal exits. It captures the state after all resumed effects have been handled.

How to apply it. (1) Write the handler around the client call (Section 3.2, p.5). (2) Add `try_ensures` for the final state/result and `returns` for the return type (Section 3.2, p.5). (3) In the exceptional branch, the protocol postcondition must hold when `continue` is called, because it is the continuation's precondition (Section 4.4, p.9). (4) Use the continuation’s postcondition to re-establish the handler invariant when the branch exits (Section 4.4, pp.8–9).

Verus form. Inference: represent the deep-handler invariant as a predicate over ghost handler state and the concrete mutable state. Put it in loop or recursive-call `invariant` clauses where the handler is encoded as an explicit Rust loop/dispatcher. A continuation wrapper can expose a `requires` predicate for the protocol postcondition and an `ensures` predicate for the handler invariant. Verus does not have `try_ensures`; this is an encoding pattern, not a claim of a built-in construct.

Evidence and limits. For XCHG the server translation produces four VCs: normal-branch invariant, continuation validity, continuation precondition, and exceptional-branch invariant (Section 4.4, p.10). All are discharged for the example (Section 4.4, p.10). The method requires deep-handler behavior; the conclusion says handlers that can produce an unhandled effect after continuation are future work (Section 7, p.13).

## technique 3: translate effects to exceptions

What it is. WhyML lacks OCaml’s effect return mechanism, so each effect is represented as an exception carrying the same arguments. The paper gives `exception XCHG int` (Section 4.2, p.6) and translates `performs` clauses into a WhyML `raises` clause: `raises { XCHG }` on `perform_XCHG` (Section 4.2, p.6).

How to apply it. (1) Declare one WhyML exception per effect with matching payload (Section 4.2, p.6). (2) Give the simulated perform function the protocol postcondition and `writes` clause (Section 4.1, p.6). (3) Add `raises` for every effect the function may perform (Section 4.2, p.6). (4) Translate the OCaml handler into a WhyML exception handler (Section 4.2, p.6). (5) Prove client VCs against the perform function and server VCs against the exception branch.

Verus form. Inference: use an explicit Rust enum for effect requests and a dispatcher returning a `Result`-like value, with a ghost protocol state. `requires`/`ensures` on the dispatcher replace the WhyML `raises` contract; the enum is executable data, not a Verus exception feature. Preserve the effect payload and state transition exactly, and prove that each dispatch arm establishes the protocol postcondition.

Evidence and limits. The paper says the verification conditions generated by Why3 “must ensure the original OCaml program adheres to its specification” (Section 4, p.5), and says the scheme “could be adapted to any proof-aware language with exceptions” (Section 4.4, p.10; belief, stated as “We believe”). I found no semantic proof in the paper that the exception encoding is equivalent to the OCaml runtime. Inference: the encoding’s trusted boundary includes the correspondence between OCaml effects and generated WhyML exceptions.

## technique 4: defunctionalize one-shot continuations

What it is. Why3 has limited higher-order support. The paper models a continuation as an abstract record:

```
type continuation 'a 'b = abstract { mutable _valid : bool; }
```

(Section 4.3, p.7). `_valid` enforces one-shot use. Two uninterpreted predicates specify its behavior: `pre (continuation 'a 'b) 'a state` and `post (continuation 'a 'b) 'a state state 'b` (Section 4.3, p.7). The continuation call is:

```
val continue (k : continuation 'a 'b) (arg : 'a) : 'b
  requires { k._valid }
  requires { pre k arg {_p = !p} }
  ensures { post k arg (old {_p = !p}) {_p = !p} result }
  writes { k._valid, p }
```

(Section 4.3, p.8). The authors characterize this as defunctionalization: “This encoding of the continuation data type is in fact a form of defunctionalization” (Section 4.3, p.8).

How to apply it. (1) Define an abstract continuation record with a validity bit (Section 4.3, p.7). (2) Define state type containing every mutable location relevant to the continuation (Section 4.3, p.7). (3) Define `pre` and `post` predicates, axiomatized for each handler (Section 4.3, p.7). (4) Require validity and `pre` at `continue`; ensure `post`; write the validity bit and mutable state (Section 4.3, p.8). (5) At each handler arm, introduce a local abstract continuation and `assume` its validity and predicates (Section 4.4, pp.8–9). (6) Instantiate `pre` with the protocol postcondition and `post` with the handler invariant (Section 4.4, pp.8–9).

Verus form. Inference: define an enum or struct for a one-shot continuation token plus a ghost validity flag, and use a `spec fn` for the continuation pre/post relation. A proof function for `continue` can require validity and the precondition and ensure the postcondition while consuming the ghost token. Rust ownership can enforce linear token movement, but the semantic relation still needs proof. Do not treat a runtime `proof fn` as the continuation; proof code is erased, so the executable dispatcher must carry the actual control state.

Evidence and limits. The XCHG proof’s continuation obligations are reported as proved (Section 4.4, p.10); the Section 5 claim is that the reported case studies are “all automatically verified” (Section 5, p.10). The predicates are axiomatized per program, so those axioms are trusted assumptions unless separately justified. The framework cannot currently handle hidden state (only top-level mutable state), and cannot prove handlers whose continuation may produce an unhandled effect (Section 7, p.13).

## technique 5: verify a case-study portfolio with generated VCs

The evaluation verifies control inversion, a division interpreter, mutable state, the Koda–Ruskey algorithm, and a shallow-handler construction (Section 5, pp.10–11). The table reports 13–142 VCs per case, 13–37 implementation LOC, 7–25 specification LOC, 0–3 ghost LOC, and replay times from 0.54 to 17.60 seconds (Figure 1, p.10). The largest case is Koda–Ruskey: 142 VCs, 26 implementation LOC, 20 specification LOC, 0 ghost LOC, and 17.60 seconds (Figure 1, p.10). The runs used Alt-Ergo 2.4.2, CVC4 1.8, and Z3 4.8.6, averaged over ten runs on a Lenovo Thinkpad X1 Carbon 8th Generation running Linux Mint 20.1, OCaml 5.0.0, and Why3 1.5.1 (Section 5, p.11).

Inference: these denominators measure tiny illustrative programs, so they are evidence that the encoding works on the selected examples, not evidence for production-scale OCaml or Rust. The paper says shallow-handler support is experimental and incurs “a significant number of bureaucratic verification conditions” (Section 5, p.10).

The Koda–Ruskey protocol is local because it refers to the forest argument and states coloring validity at each `Yield` effect (Section 5, pp.11–12). Inference: a Verus port should keep such protocols local to the function whose ghost state they quantify, rather than making one global predicate with unconstrained forest parameters.

## what is proved, measured, and trusted

Proved: generated VCs establish the GOSPEL contracts for the clients, servers, continuation validity, protocol preconditions, and handler invariants in the listed examples (Sections 4.4–5, pp.9–11). Measured: VC counts, implementation/specification/ghost LOC, and ten-run average replay time under the stated machine and solver versions (Figure 1; Section 5, pp.10–11). Trusted (Inference, not stated by the paper): the Why3 and SMT solver implementations, the translation from OCaml to WhyML, axiomatized continuation predicates, the protocol specifications, and the semantic correspondence between effect syntax and the library/runtime. The paper also says the syntax used throughout the paper is a “friendly syntax” not supported natively by the OCaml compiler, while “all of our case studies are written using the effects and handlers library supported by OCaml 5.0.0” (Section 5, p.11).

Inference: a VeruLaw product should expose these assumptions in its proof report. The threat from agent-written verified Rust is high when effect protocols or continuation predicates are generated without review: a solver can prove a wrong contract, and an axiomatized relation can hide an incorrect handler. The paper credits protocols to de Vilhena and Pottier [5] and the pre/post continuation specification technique to [11, 20] (Sections 3, 4.3, 6), though it also claims “the use of defunctionalization in a proof scenario is novel” (Section 1, p.2). Inference: VL should treat the exception/defunctionalization pattern and protocol decomposition as existing work, not a novel technique. The open product question is whether an agent can generate faithful, ownership-safe Rust encodings and check the semantic link to the intended effect API.

## contradictions and boundaries

The conclusion says the extension is “the first framework that proposes an automated verification path to algebraic effects” (Section 7, p.13), while the case study discussion says the shallow-handler feature remains experimental and produces many additional VCs (Section 5, p.10). Inference: this is a scope qualification, not a numerical contradiction. The reported replay times are averages over ten runs, but no variance is given (Section 5, p.11), so stability is unknown. The conclusion limits mutable state to top-level definitions and excludes continuations that produce unhandled effects (Section 7, p.13).

## techniques for the catalog

- protocol contracts — specify client preconditions, server postconditions, and writable state for each effect
- handler invariants — use `try_ensures` to connect normal and exceptional exits of deep handlers
- exception embedding — represent each algebraic effect as a WhyML exception and translate `performs` to `raises`
- continuation defunctionalization — represent one-shot continuations with an abstract validity record and `pre`/`post` predicates
- local effect protocols — scope a protocol to the function whose mutable or forest state it must describe
- automated VC evaluation — report VC counts, code/spec/ghost LOC, solver versions, machine, and ten-run replay averages
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "The runtimes were measured by averaging over ten runs on a Lenovo Thinkpad X1 Carbon 8th Generation, running Linux Mint 20.1, OCaml 5.0.0, and Why3 1.5.1."): I read the whole paper text (pp.1-20, including Appendix A) and the whole study; checked every quotation, the Figure 1 numbers (VC, LOC, spec, ghost, time), solver and machine details, and section and page references. Changed: VC citations moved to Section 4.4 pp.9-10 (they were cited to Section 4.1 and p.9); the protocol-postcondition step now cites Section 4.4; the claim that the abstract calls it automated is now attributed to the conclusion (Section 7, p.13); the friendly-syntax versus OCaml 5.0.0 library wording follows the paper; the "existing work" claim now reports the paper's own credits and its novelty claim for defunctionalization; unsupported claims about the exception encoding are marked Inference or replaced by quotes. Not checked: Appendix A translation rules in detail (not cited by the study), the external repository and proof sessions, the Verus-form suggestions (the study's own inferences), and the PDF layout beyond the text extraction.
