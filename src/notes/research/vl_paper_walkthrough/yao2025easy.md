# Easy As Child’s Play: An Empirical Study on Age Verification of Adult-Oriented Android Apps
(authored by agents unless marked 🧑)
Tag: `yao2025easy`, [paper](https://www.usenix.org/conference/usenixsecurity25/presentation/yao-yifan)

## purpose and findings

This paper evaluates age-verification mechanisms in adult-oriented Android apps and introduces GUARD, a static-plus-dynamic detector built on Soot with about 2,000 lines of Java (Section 5, p. 25). The abstract says, “GUARD determines relevant components (e.g., those that can accept the user’s age or birthdate) based on the spatial relationships of the components in a layout” (p. 21). It analyzes 31,750 adult-only apps identified from metadata of 693,334 Android apps in the Androzoo dataset (May 2024 snapshot), using Google Play's adult-only tags (Section 7.1, pp. 29–30). The abstract, introduction, and conclusion report 1,165 apps with age verification (3.67%); Q5 (p. 31) reports “1,165 (3.75%)”. 1,165 / 31,750 = 3.67%; the paper does not explain the 3.75% figure.

The detector is a security-analysis workflow rather than a proof of an app's policy.

## technique 1: static UI processing

Use this first to find age-related input, instruction, and output elements without analyzing every Java file. GUARD's Static UI Processor unpacks the APK and executes three steps (Section 5.1, pp. 25–27):

1. parse XML layout files and inspect attributes such as `android:text`, `android:hint`, and `android:contentDescription` with regular expressions for strings such as “age”, “birth”, “verify”, “18”, and “National ID number”
2. scan `strings.xml` once for strings of interest, then search the layout files for their IDs; also collect hard-coded strings and the IDs of their UI elements
3. decide which element IDs to record from element type and layout nesting (Table 4): Button, ImageButton, Switch, or checkbox for confirmation input; EditText or DatePicker for concrete input; for an instructing element such as a TextView label, record instead the input elements in the same layout view; for output strings, record only Toast or Dialog IDs

The authors state, “Our idea leverages the context of the strings within UI elements (we examine which UI elements contain age verification-related strings and the types of these UI elements) to infer their relationship with the actual input” (Section 5.1, p. 26). They rejected an LLM for this step because of latency and communication overhead with apps holding hundreds or thousands of strings (p. 26). In the Figure 1 example, “the EditText’s ID et_idCard will be recorded, and TextView’s ID tv_idCard will not” (p. 27).

Inference: in Verus, represent an Android form as a sequence of typed controls and prove a specification that every accepted age input has a corresponding validation path. Use `requires` and `ensures` on Rust model functions; do not claim that the APK parser or regex is verified. Verus's supported Rust subset and proof APIs can establish the model relation, not the Android framework behavior.

## technique 2: static taint and entry-point analysis

Use this when the UI processor has produced IDs but the verification logic is spread through Java methods. The Static Behavior Analyzer follows two steps (Section 5.2, pp. 27–28):

1. find entry points: start from the launching activity in `AndroidManifest.xml` and locate Java files that bind the collected IDs via `findViewById`; after finding offline age-verification logic, check its associated functions for an online verification process; if an online implementation is found, stop, because “developers rarely implement multiple age verification methods in a single app” (p. 27)
2. mark taint sources at controls that accept confirmation or concrete input (and input elements in the same layout view as instructing elements), then mark sinks at age comparisons (for example `i >= 18`), API calls to online services such as `HttpURLConnection`/`OkHttpClient`, and UI elements that display verification results; track data flow and control flow between them

The paper explains why code pattern matching is insufficient: “Our idea is to use taint analysis to construct the relationship between the source and the sink and pinpoint the verification logic” (Section 5.2, p. 27). Treating result messages as sinks filters cases where an ID number's format is validated but its embedded birthday is not checked (p. 28). For online checks, the authors say they “cannot be entirely certain that the input age is used specifically for age verification” (p. 28).

Inference: a Verus analogue is a typed source-to-sink data-flow model in which a proof function establishes that an age value reaching a decision has passed the required predicate. `ensures` can state that a successful decision implies `age >= 18`; it cannot prove that a remote HTTP endpoint applied that predicate. External calls, reflection, obfuscation, and Android lifecycle behavior are trusted unless separately specified.

## technique 3: dynamic behavior tester

Use dynamic analysis to recover layouts and strings loaded from a backend, which static APK analysis cannot see. GUARD uses Appium to install and launch an app on a test device or emulator and runs three steps (Section 5.3, p. 28; Algorithm 1, Appendix A, pp. 37–38):

1. extract the XML structure of the current interface: UI elements, attributes, hierarchy, and `android:clickable`
2. search for age-related keywords; if found, record IDs and types; otherwise click clickable elements and recursively analyze each newly loaded interface until all UI elements have been examined, except those reachable only with specific inputs such as a password
3. rerun taint analysis on the collected IDs and types, marking the input-collecting element as a source and dialogs such as “Age verification failed” as sinks

The paper states, “Static analysis alone is often insufficient for age verification in Android applications, primarily because it does not account for dynamic network interactions and can miss important elements downloaded from the backend” (Section 5.3, p. 28). Not entering inputs is acknowledged as a limitation (p. 28, Section 8).

Inference: a Rust/Verus test harness can model the explored-state graph and prove that every visited transition preserves an age policy, but dynamic coverage is empirical evidence, not exhaustive verification. The tester's Appium driver, emulator, network, and remote backend remain trusted.

## technique 4: attack taxonomy and verification-strength analysis

The paper defines six attacks (Section 6, pp. 28–29): false age self-declaration (A1), fake ID number self-declaration (A2), OAuth trust-chain abuse (A3), identifier spoofing (A4), age verification downgrade via regional versions and VPNs (A5), and tool-based data manipulation via a MitM proxy (A6). Table 5 (p. 29) marks, per attack, which of six methods it affects; its caption does not define the marks. Inference: a check mark means vulnerable, because the age-declaration method is marked for every attack. Under that reading: A1 affects only self-declared age checks; A2 also affects template-based checks; A3, A5, and A6 affect all six methods; A4 affects all except biometric verification.

The authors classify methods by code features (Q6, p. 32): local age checks are the self-declaration method (the first offline method in Table 2, p. 23); ID entry with purely local validation is a template-based check; ID sent to a remote server is online ID verification; credit-card verification is found by keywords and regular expressions; document upload by file upload APIs; biometric verification by APIs such as Amazon or Azure Face. Reported shares (Figure 6 and Q7, pp. 32–33): self-declaration 31.84%, template-based 15.62%, online ID 8.67%, credit card 17.59%, document upload 18.88%, biometric 8.48%. The introduction places the 8.48% “Among those” 1,165 apps with age verification (p. 22). Inference: the six shares sum to 101.08%, so they are not an exact partition; the paper does not explain this. Q7 also reports 32.53% of apps using OAuth, treated as potentially exposed to A3; A5 and A6 were not evaluated because they depend on server-side implementations (p. 33).

## evidence, limits, and product relevance

Shopping apps “had the highest vulnerability rate (91%)”, with 52% relying on self-declared age (introduction, p. 22); the paper does not state the denominator. Of 17+-rated apps, 152 enforce an age limit of 21 and 309 set it at 16; all 21+ apps relied solely on self-declared age, and “63% of 16+ apps used stronger methods like credit card or ID upload” (Q6, p. 32).

Accuracy evidence conflicts. Section 7.1 (p. 30) samples 100 apps with and 100 without detected age verification, verified manually, and reports three false positives and two false negatives. Section 8 (p. 34) says “our static sampling and analysis of the apps revealed zero false positives”. The paper does not reconcile the two.

The limitations in Section 8 (p. 34): taint analysis may miss data flows in complex or obfuscated apps; dynamic exploration may miss paths that require valid input; the remote end is a black box, so back-end manipulation may not be detected. Section 8 calls OAuth abuse “Attack A4”, while Section 6 numbers it A3.

## techniques for the catalog

- UI-context source discovery — parse layouts and string resources, then use control type and layout nesting to select age-input IDs
- static source-to-sink taint analysis — follow age values from Android input controls to comparisons, network calls, and result displays
- dynamic path exploration — load runtime layouts, recursively click reachable controls, and feed discovered IDs back into taint analysis
- attack-oriented verification assessment — classify age methods and test false-age, fake-ID, OAuth, spoofing, downgrade, and interception attacks
