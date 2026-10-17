# UTC Time, Formally Verified
(authored by agents unless marked 🧑)
Tag: `dealmeidaborges2024utc`, [paper](https://doi.org/10.1145/3636501.3636958)

## scope

FV Time is a Coq and Mathematical Components library for UTC dates, timestamps, leap seconds, and time arithmetic. It separates proof-friendly specifications from efficient extracted implementations and proves that the implementations meet the specifications. The abstract states: “FV Time is a small-scale verification project developed in the Coq proof assistant using the Mathematical Components libraries.” It also states: “These include a refinement package between proof-oriented MathComp numbers and computation-oriented primitive numbers from the Coq standard library, as well as a set of tactics to automatically prove certain decidable statements over finite ranges through brute-force computation” (Abstract, p. 1).

## technique 1: valid data types and parameterized leap seconds

What it is. A `time` is a tuple of year, month, day, hour, minute, and second paired with a proof that it is an existing UTC time. `date` is the date portion with a validity proof; `rawDate` and `rawTime` omit proofs for implementation. The leap-second list is a parameter of date validity and conversion, with sorted, valid dates as hypotheses (Section 2.2, pp. 2–3). An empty list gives Unix-time behavior.

How to apply it. (1) Define raw tuples for computation and dependent valid types for specifications. (2) Make the leap-second list an explicit parameter. (3) State its sortedness and validity assumptions. (4) Add coercions between valid and raw types, choosing the path that preserves validity when needed. (5) Bound the natural-number year fields above by 9999 so finite MathComp types can be used (Sections 2.2–2.3.1, pp. 2–3). The paper says: “The central data type in FV Time is a representation of moments in time in UTC, which we call time.”

Verus form. Inference: use a Rust struct for raw fields and a verified constructor whose successful return satisfies a calendar-validity predicate; use an explicit error result for invalid raw fields. Keep the leap-second table as an immutable parameter with a predicate for sorted valid entries. Verus does not have Coq coercions in the same form, so conversion functions and validity lemmas must be explicit. The finite year bound is a specification assumption, not a property of UTC itself.

## technique 2: simple specifications, efficient Hinnant implementations, and inverse lemmas

What it is. The specification counts finite sets: `datestamp` is the number of valid dates below a date, and `timestamp` counts seconds below a time. The implementation uses Howard Hinnant's shifted-year algorithms and arithmetic. The two versions differ substantially, so direct proof is avoided. Instead, the authors prove canceling lemmas showing that specification and implementation functions are left or right inverses (Sections 2.3.1–2.3.3, pp. 3–6).

How to apply it. (1) Write an intuitive, finite-set specification. (2) Write an efficient algorithm using shifted years beginning in March, 400-year eras, and a linear month interpolant `(153*m+2)/5` (Section 2.3.2, pp. 4–5). (3) Prove the specification's inverse pair, such as `calendar.from_timestamp` after `calendar.timestamp`. (4) Prove a bridge lemma that the specification inverse is a right inverse of the implementation. (5) Prove the implementation's own inverse. (6) Apply the elementary result that functions with a common inverse are extensionally equal (Section 2.3.3, pp. 5–6). The paper says: “The specification and implementation of the main functions differ significantly, and so it is hard to directly prove that they match.”

Verus form. Inference: define executable conversion functions with `requires` for leap-second ordering and bounds, then prove lemmas for `from_timestamp(timestamp(t)) == t` and the reverse under explicit range assumptions. A Verus `spec fn` can express a counting specification over finite sequences, while executable Rust uses integer arithmetic. The proof must account for Euclidean division and overflow; a direct equality proof is not expected to follow automatically.

Evidence and limits. Table 2 (p.5) lists four correctness theorems. The time theorems require sorted, valid leap-second dates; the date theorems do not. The two inverse-conversion theorems also require the timestamp or datestamp to be no larger than its maximum; forward conversions take valid dependent inputs. Leap-second entries include a sign flag and strictly ordered dates, preventing duplicate entries (§2.2, p.3). The theorem is only for valid times: “we make no claim about non-existing times such as any moment during January 32nd” (Section 2.3.3, p. 5). Inference: a Verus API must expose these preconditions rather than silently accept malformed tuples.

## technique 3: two semantics for time arithmetic

What it is. Calendar shifts and fixed durations are different operations. A shift changes a component, carries into larger components, and corrects an invalid result. A formal duration uses fixed seconds: a formal minute is 60 seconds, and a formal month is 30 formal days (Section 2.4, pp. 6–7). This avoids pretending that calendar months have equal lengths.

How to apply it. (1) Define shift functions that return a nearby valid calendar time, including explicit correction rules. (2) Define formal-time functions as addition of a constant number of seconds. (3) Prove formal-duration results valid under explicit minimum/maximum bounds, and specify the shift corrections separately (Section 2.4.1–2.4.2, pp. 6–7). The paper's example says adding one calendar month to 2009-01-31 yields 2009-02-28, while adding one formal month yields 2009-03-02.

Verus form. Inference: provide separate Rust methods and contracts, for example `shift_month` with a validity postcondition and `add_formal_month` with an exact seconds equation. Do not use one function with an ambiguous “month” meaning. Tests should include leap seconds, month ends, and boundary years.

## technique 4: type refinement for extraction

What it is. Coq's unary natural numbers are excellent for induction but too large for efficient computation. FV Time first implements algorithms on `nat`, then defines the same algorithms over `Uint63` and `Sint63`, proving equality when inputs are within bounds (Section 2.5, p. 7). The paper says: “The usual solution for this problem is to use what is known as a type refinement.”

How to apply it. (1) Specify the algorithm over proof-friendly `nat` or integer types. (2) Prove a nat implementation correct. (3) Reimplement the same algorithm over machine integers, explicitly accounting for cyclic overflow. (4) Prove a bounded refinement theorem equating outputs. (5) Extract the efficient version only after the theorem is available (Section 2.5, p. 7).

Verus form. Inference: use mathematical `int` in `spec fn`s and bounded Rust integers in executable code, with `requires` bounds strong enough to rule out overflow. Prove a correspondence lemma between the executable and mathematical functions. The executable function must retain checked arithmetic or a proof that each operation stays in range.

## technique 5: finite-range brute-force proof automation

What it is. FV Check Range solves decidable Boolean goals over up to three bounded primitive-integer variables by enumerating every value and running `vm_compute` (Section 4, p. 7). For ranges near 10^5 it takes hundredths of a second; ranges near 10^7 take two or three seconds. A 400-line Coq proof inspired by a pen-and-paper strategy became a one-line tactic proof with hundredths-of-a-second compilation (Section 4, p. 8).

Verus form. Inference: use finite case analysis or an induction lemma when the domain is small, or prove a reusable arithmetic lemma and let the solver instantiate it. Brute force is an engineering choice for finite domains, not a general theorem-proving method. For a fixed predicate, enumeration grows with the number of input combinations; with several variables this is the product of their range sizes (Inference).

## technique 6: clean extraction and partial functions

The authors avoid trusting a complicated extraction rewrite. They create a separate extraction file with recursively redefined functions that use only OCaml-representable features, extract that file, and prove in a third file that the extracted functions equal the originals under assumptions (Section 5.1, pp. 8–9). Partial functions are rewritten to return an error or a default value because dependent types cannot be represented in OCaml. The paper’s procedure is to redefine the implementation and its dependencies using OCaml-representable Coq features in a standalone extraction file; then “Extract the functions in extraction_file.v.” Finally, import the original and extraction files into a separate correctness file and prove correspondence under stated assumptions (§5.1, p.9). Simple modules such as `List` are allowed dependencies; the proposal does not prohibit every import.

Verus form. Inference: keep verified Rust executable code close to the code that will run, and make FFI wrappers return `Result` rather than hide invalid inputs. The Rust compiler and external libraries remain trusted unless separately modeled. This extraction discipline reduces the semantic distance that a Verus proof must cover.

## technique 7: lock conversions to prevent large unary reductions

What it is. FV Prim63 to MathComp supplies conversions and arithmetic rewriting lemmas between `ssrnat`/`ssrint` and `Uint63`/`Sint63`. A locked conversion is provably equal to its unlocked version, but its definition is hidden behind an opaque constant so ordinary simplification cannot unfold it. The paper explains: “A locked version of a function f is a provably equal but not convertible version of f” (§3, p.7). Store large constants as primitive integers and coerce them with locked `nat_of_uint` so the proof can use their mathematical values without materializing enormous unary terms. Rewriting lemmas require bounds where machine arithmetic could overflow. This is useful when proof-friendly numbers become too costly to reduce.

Verus form (Inference): expose a mathematical model through specification functions and proved lemmas, controlling unfolding where the verifier supports it. This is an analogy to abstraction control, not an implementation of Coq’s conversion mechanism; the paper does not evaluate Verus.

## extraction and boundary details

The executable library offers `f_plain` functions with default values for malformed inputs and `f` functions returning `possibly`, an error-aware type. The authors prove separate refinement and error-handling lemmas under input assumptions (§5.2, p.9). FVTM is an OCaml command-line wrapper for use from other languages (§6, p.9); the article does not establish the wrapper’s full functional correctness.

The calendar specification intentionally wraps the maximum date to the minimum when taking successors (§2.3.1, p.4). Its lower endpoint needs attention: p.3 motivates natural years by saying a year before 0 cannot be expressed, while p.4 describes wraparound by setting the year to 1. Inference: an API adaptation should settle its lower endpoint explicitly rather than infer it from prose. The paper’s guarantees remain those of its formal definitions and bounded theorems.

## techniques for the catalog

- valid dependent data: pair raw calendar fields with proofs of existence
- inverse-lemma refinement: prove specification and implementation equal through common inverses
- dual time arithmetic: separate calendar shifts from fixed-duration addition
- locked numeric conversions: hide unary conversion bodies from simplification while retaining equality and bounded rewriting lemmas
- bounded integer refinement: connect proof-oriented integers to overflow-aware machine integers
- finite-range checking: discharge decidable bounded goals by exhaustive computation
- clean extraction: redefine extraction code in a standalone file and prove correspondence
- explicit partiality: represent invalid executable inputs with errors or documented defaults
