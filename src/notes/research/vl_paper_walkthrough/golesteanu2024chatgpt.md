# Can ChatGPT Pass a Theory of Computing Course?
(authored by agents unless marked 🧑)
Tag: `golesteanu2024chatgpt`, [paper](http://arxiv.org/abs/2407.07757v1)

## what is measured

Golesteanu, Vowinkel, and Dougherty test ChatGPT version 4 on undergraduate Theory of Computing (ToC) assessments. Experiment 1 uses their institution's exams. Experiment 2 uses 450 questions intended to cover topics in other ToC offerings, not questions collected from those offerings. The resources are identified in §6 (p.5): “we ensured that the questions came only from existing ToC resources, such as the course textbook, class notes, pre-class readings, and former exams; the latter three came from our institution.” The paper's arXiv identifier and date appear on p.1; the ACM citation contains placeholder publication information.

The course includes paper writing, a group presentation, and exams, but Experiment 1 evaluates only the three exams (§3.1, p.2). Table 2 (p.3) reports Midterm 1 at 80.5% initially and 93.0% after retry, Midterm 2 at 87.5% and 92.0%, and the final exam at 81.0% and 88.6%. Its average row is 82.33% and 90.33%. Section 4 calls the weighted initial grade B- and the retry grade A- at the institution. The scores include bonus questions. These are exam grades, not percentages of questions answered correctly.

Experiment 2 divides its 450 questions evenly among regular languages, context-free languages, and Turing machines/decidability/undecidability combined. It also divides them evenly among true/false, multiple-choice, and proof types (§3.2, pp.2–3). Section 4 (p.3), rather than Table 3 itself, reports: “Overall, ChatGPT earned an 85% for Experiment 2; this is 91.5% on true/false questions, 87.3% on multiple choice questions, and 78.8% on proof-type questions.” Table 3 (p.4) gives corresponding average maximum scores of 3.66, 3.49, and 3.15 out of 4. These use the best attempt per question, including retries, rather than only initial answers.

## technique 1: exam simulation with targeted retry feedback

The authors grade exam answers as though ChatGPT were a student (§1, p.1). Section 4 describes revised answers obtained after giving “a hint as to why the answer it gave is wrong.” The paper does not specify that the database's 0–4 rubric or three-attempt limit also applies to the exams.

The reported procedure is:

1. Upload the same exams given to students as Word documents, preserving mathematical notation (§3.3, p.3).
2. Grade the initial answers, including bonus questions (§4, p.3).
3. Give hints about wrong answers and obtain revised answers.
4. Report initial and retry grades separately (Table 2, p.3).

Input interpretation also matters. In §5.1 (pp.3–4), ChatGPT reads a JPG state diagram but struggles with another diagram drawn using Word shapes. The authors then supply its transition table, after which the conversion succeeds. Inference: the resulting score reflects both mathematical reasoning and assistance with reading the input.

## technique 2: question database with consistent grading and retries

The database separates results by topic and question type (§3.2; Table 3). Its questions include definitions, properties, examples, and proofs. Two examples are “What is the formal definition of a Deterministic Finite Automata?” and “Give an example of a language that a DFA cannot model?” (§3.2, p.3).

The procedure is:

1. Prepare the 450 questions with the topic and type balance described above. Format mathematical notation using ASCII; none requires a diagram (§3.3, p.3).
2. Precede every question with the fixed message: “I will ask you a question to test your academic theoretical computer science knowledge, answer to the best of you abilities. Here it is:” (§3.2, p.3).
3. Record the response and grade both its answer and reasoning. The rubric ranges from 4 for a totally correct, complete solution to 0 for a completely wrong answer. Scores 3, 2, and 1 represent minor errors, a major flaw in a somewhat correct response, and a mostly incorrect or incomplete response, respectively.
4. If the response scores below 4, give “You got a x/4, improve the answer.” with the assigned score. Allow at most three attempts total per question (§3.2, p.3).
5. Use each question's best score and average by topic and type (§4; Table 3).

The authors explain that vague feedback limits hints that might supply the knowledge being tested (§5.2, p.5). They also report retries that worsen an answer, including an ambiguous-grammar example that adds an unrelated derivation. Inference: retaining every attempt would expose regressions hidden by maximum scores.

## technique 3: change the initial prompt on a fixed question subset

Section 5.3 (p.5) retests the same 30 NFA questions with the same rubric and a different initial prompt. The replacement asks ChatGPT to act as the preeminent computer science professor, provide intuitive and complete responses, reason methodically, and improve answers using feedback scored out of 4. One exact instruction is: “You will respond methodically and give your complete reasoning for every question.”

The comparison proceeds by holding the question subset and rubric fixed, replacing the initial prompt, and comparing average scores. The reported NFA average rises from 3.23 to 3.53. True/false rises from 3.4 to 3.6, multiple choice from 3.3 to 3.9, and proofs from 3.0 to 3.1. The largest observed increase is for multiple choice. The paper does not report repeated runs or uncertainty estimates for this comparison.

## techniques for the catalog

- exam retry with targeted hints: report initial and revised grades separately
- balanced question database: compare topic/type groups using a shared rubric
- score-only retry feedback: allow three attempts and report best-answer scores
- fixed-subset prompt comparison: change the initial prompt on the same 30 NFA questions
