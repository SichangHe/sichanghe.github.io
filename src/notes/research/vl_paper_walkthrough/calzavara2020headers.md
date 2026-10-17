# A Tale of Two Headers: A Formal Analysis of Inconsistent Click-Jacking Protection on the Web
(authored by agents unless marked 🧑)
Tag: `calzavara2020headers`, [paper](https://www.usenix.org/conference/usenixsecurity20/presentation/calzavara)

## formalize browser-dependent policy semantics

The paper studies X-Frame-Options (XFO) and Content Security Policy (CSP) framing controls, whose behavior differs across browsers. CoreCSP source expressions represent sets of origins; a directive value is a set of source expressions. Values are ordered by inclusion of the origins they represent. For a page `w` and browser `b`, `⟦w⟧b` denotes the directive value enforced by that browser (§3.1, p. 685). A policy is consistent when every browser pair permits the same origins, expressed as inclusion in both directions (§3.2, p. 686).

Inference: Use this technique when one security policy is interpreted by multiple clients or implementations. The paper's method is:
1. Define the policy language and a semantic value set (CoreCSP's origins and directive values; Table 1, p. 685).
2. Define an order by inclusion of permitted origins (§3.2, p. 685).
3. Implement each browser's header semantics as a function from HTTP headers to a directive value (§4.1, p. 687).
4. Compare all browser pairs using equality (consistency) or inclusion (security-oriented and compatibility-oriented classes; §3.2, p. 686).

Both relaxed classes require consistency within the legacy browser group and within the modern browser group. Security-oriented policies additionally require legacy browsers to be at least as restrictive as modern browsers; compatibility-oriented policies require the reverse. Here, modern means supporting CSP framing control; legacy means lacking it. Consistent policies belong to both classes. Policies belonging to neither are “unduly inconsistent” (§§2.3, 3.2, pp. 685–687). Inference: Verus could model finite sets of source expressions and prove subset/equality lemmas about their denotations. The represented origin sets need not be finite because expressions can contain wildcards. Browser behavior and HTTP parsing would remain assumptions unless verified against the model.

## build a differential policy analyzer

FRAME CHECK is parameterized by a browser set. Each browser has a user-agent string and a semantic function `J·Kb` (§4.1, p. 687). Given a URL, the analyzer requests it once per browser user-agent, records redirects and landing pages, computes each browser's directive value, and emits a consistency report. The paper says: “Given a URL to analyze, F RAME C HECK produces a security report on its state of click-jacking protection.” (§4, p. 687). The authors also state: “In total, we developed more than 40 test cases to reconstruct the semantics of the underspecified XFO header in our set of browsers.” (§4.2, p. 687).

Reproduce the method:
1. Define the browser inventory and user-agent strings.
2. Reverse-engineer or inspect each browser's XFO/CSP semantics, using ambiguous-header tests to reconstruct behavior.
3. Send one request per user-agent and group browsers by the resulting landing page.
4. Compute enforced directive values for each group.
5. Classify consistency, security orientation, compatibility orientation, and undue inconsistency.

The tests found only 3 of 10 browsers supported `ALLOW-FROM`: Edge 18, Firefox 69, and Internet Explorer 11 (§4.2.1, p. 687; Table 2). Edge, Internet Explorer, and Opera Mini enforced only the first of multiple XFO headers; other tested browsers enforced all of them. The same three browsers did not split comma-separated values, which could void protection (§§4.2.2–4.2.3, p. 688). Double framing remained possible in Edge, Internet Explorer, and UC Browser. The subsequent policy analysis explicitly excludes inconsistencies caused by double framing and therefore does not model the full browsing context (§4.2.4, p. 688).

Inference: In Verus, a trusted corpus of browser semantics could be represented as `spec fn` mappings and checked against a parser implementation. A differential harness can generate reports, but Verus proofs cover only the supplied semantics; they cannot prove that proprietary browser behavior matches the model.

## measure policies in the wild

The authors crawled the top 10,000 sites in the October 29, 2019 Tranco list, collecting links and following at most 500 items per site, including headers from embedded iframes. They fetched headers for each browser user-agent and deduplicated identical XFO/CSP combinations within each origin. Python Requests combines repeated headers; when a comma appeared in XFO or CSP, they used curl to preserve individual header lines. They visited 989,875 URLs; 369,606 URLs across 5,835 sites carried framing headers; after cleaning, 17,613 policies remained (§5.1, p. 689). They found 1,800 inconsistent policies from 1,779 origins, 10% of analyzed policies (§5.2, p. 689). Table 4 reports 15,415 XFO-only (88%), 714 CSP-only (4%), and 1,484 combined (8%). Of combined policies, 805/1,484 (54%) were inconsistent (§5.2, p. 690).

The inconsistent policies comprised 590 security-oriented (33%), 795 compatibility-oriented (44%), and 415 unduly inconsistent (23%) (§5.3, p. 690). Table 7 reports policies allowing unrestricted framing in at least one browser: 13/590 (2%) security-oriented, 758/795 (95%) compatibility-oriented, and 380/415 (92%) unduly inconsistent; aggregate 1,151/1,800 (64%). For modern browsers alone, the aggregate was 294/1,800 (16%) (§5.3.4, pp. 691–692). These denominators are policy counts, not website counts, and unrestricted framing does not establish an exploitable attack.

The authors also tested Referer sniffing, in which a server selects an XFO value from the request's Referer. They requested pages using a CSP-whitelisted host, synthesizing a matching host for wildcard expressions, and checked whether the Referer was reflected in XFO. Only 11 of 2,198 tested pages used this mechanism, limiting this potential source of false positives (§5.2, p. 690).

Inference: The central engineering lesson is to report both security and compatibility orderings, because “inconsistent” alone hides whether a mismatch is conservative or dangerous. VL's policy-verification tooling should preserve denominators, browser versions, and crawler selection as part of evidence.

## retrofit a consistent policy at the server

The paper's proxy (~800 lines of Python) rewrites response headers (§6.3, p. 694). For responses with XFO but no CSP frame-ancestors directive, it folds multiple XFO headers into one comma-separated value, simplifies the directives to their conjunction using Table 8, and adds an equivalent CSP header. For responses with CSP frame-ancestors, it strips XFO and, as described in the paper, computes the union of source expressions from all frame-ancestors directives. It adds `DENY` when CSP denies framing, `SAMEORIGIN` when CSP allows only same-origin framing, and otherwise `ALLOW-FROM` set to the Referer's origin when that URL matches a collected expression. An absent or nonmatching Referer yields `DENY` (§6.3, p. 694).

Steps are explicit in §6.3:
1. detect XFO/CSP headers;
2. fold and simplify multiple XFO directives;
3. prefer CSP when a frame-ancestors directive is present;
4. synthesize an XFO value for legacy browsers from the CSP allowed-origin set;
5. test against the full browser case suite (§6.3, pp. 694–695).

The reported consistency guarantee is for the tested browser set and excludes double framing. Opera Mini ignores a synthesized `ALLOW-FROM`, permitting a request with an allowed Referer, but enforces `DENY` otherwise. The authors tested the proxy against the full §4.2 suite (§6.3, pp. 694–695).

Inference: A Verus proof would need to model Referer handling, browser precedence, and multiple CSP headers before establishing a rewriting guarantee. The paper says multiple CSP headers enforce their conjunction (§6.3, p. 694), whereas its proxy description takes a union of source expressions. These operations differ for multiple frame-ancestors directives; the prose alone does not establish equivalence in that case.

## assumptions, limitations, and product threat

The framework models selected browser versions (10 browsers in Table 2, p. 687), not every implementation or future version. Header collection can miss user-agent-dependent responses; the authors filtered pages where one user agent lacked headers and acknowledge this may lose inconsistencies (§5.1, p. 689). Firefox dropped ALLOW-FROM in version 70; excluding Internet Explorer and Opera Mini reduced inconsistencies from 1,800 to 289 (§5.4, p. 692). The proxy prioritizes CSP and can relax XFO when CSP is less restrictive, based on an assumption that administrators intended the modern-browser behavior (§6.3, pp. 694–695).

The paper explicitly does not establish practical exploitability: “we cannot show that even policies that do not provide any form of framing control in some browsers lead to exploitable vulnerabilities in practice.” Its top-10,000-site sample also limits generalization (§5.5, p. 692). The authors leave systematic compatibility evaluation of countermeasures to future work (§8, p. 696).

Inference: Agent-written verified Rust faces the same specification-drift threat: a proof of an abstract policy does not establish that every client enforces it. The paper already supplies a reusable formal classification, differential testing workflow, and fail-closed rewriting strategy. VL should not redo generic header consistency analysis; it should apply these ideas to its own protocol and browser boundaries, with explicit model-version and denominator records.

## techniques for the catalog

- denotational policy model — map each implementation's headers to an allowed-origin set
- consistency ordering — classify policies by equality or subset relations across clients
- browser differential analyzer — request each user-agent, compute semantics, and compare reports
- adversarial header test suite — probe unsupported directives, repeated headers, commas, and nested framing
- wild-policy measurement — crawl, deduplicate, and report vulnerability fractions with class denominators
- fail-closed policy proxy — synthesize conservative legacy headers from modern policy semantics
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The first analysis we perform aims at understanding how much security legacy browsers sacrifice for such policies."): read the complete paper text; checked quotations, counts, section/page references, definitions, analyzer, collection method, proxy steps, and limitations; corrected the link to the publisher page printed in the paper, references, class conditions, and finite-set inference; added the double-framing exclusion, collection details, exploitability limitation, and a labeled inference about union versus conjunction; did not inspect artifact code, reproduce experiments, verify browser implementations, or validate the proposed Verus applications.
