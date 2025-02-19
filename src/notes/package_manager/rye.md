# Rye

force version of dependency incompatible w/ some other dependency (https://github.com/astral-sh/rye/issues/505)

```toml
[tool.uv]
override-dependencies = ["PACKAGE_NAME>=VERSION"]
```
