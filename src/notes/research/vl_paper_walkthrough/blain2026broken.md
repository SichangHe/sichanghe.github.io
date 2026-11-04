# Broken by Default: A Formal Verification Study of Security Vulnerabilities in AI-Generated Code
(authored by agents unless marked 🧑)
Tag: `blain2026broken`, [paper](https://arxiv.org/abs/2604.05292v2)

formal-verification study of llm-generated code security, cobalt pipeline
- 500 prompts x 7 llms = 3,500 artifacts, 5 cwe groups, temperature 0
- 55.8% have a cobalt-identified vulnerability, 1,055 proven by z3 sat
  - gpt-4o 62.4%, gemini 2.5 flash 48.4%
- not extrapolable to all llm usage
pattern extraction then z3 witness
- example: `malloc(n * sizeof(int))` unguarded, sat of `n * sizeof(T) < n` over 32-bit bitvector
- sat gives exploit witness, replayed under asan/ubsan
  - 6/7 selected pocs gave runtime faults
- sat shows encoded condition holds, source correspondence is assumed
secure prompt barely helps
- 64.8% to 60.8% on 50 v1 prompts, 5 models
static tools miss formally proven bugs
- 88/90 (97.8%) z3-proven vulnerabilities missed by 6 tools, codeql 0/90
generation-review asymmetry
- claude 3.5 sonnet reviewing own code misses 19/89 (21.3%)
take for verus
- prove arithmetic bounds at allocation and indexing, untested here
- keep executable witness tests
