Python: Use uv, ruff. Use Python 3.13 syntax; never import List, etc.
Avoid `cast` to `Any` and prefer `type:ignore`.
Use strongly typed code and pass basedpyright, prefer dataclass or
NamedTuple and exploit `__post_init__`.
Prefer Pydantic for serialization over `json` etc.
Prefer printing dataclass over JSON/dict.
Use multi-line strings; never ever concatenate constant or template strings.
Remember Python coroutines are not run until await or `create_task`.
Never use `__all__` unless absolutely necessary.
Remember to source `.venv` before running Python.
Use `py_gen_server` for actor model as suitable.
