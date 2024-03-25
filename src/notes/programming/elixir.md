<!-- toc -->
# Elixir

print Charlist as list of integer

```elixir
[1, 2, 3] |> inspect(charlists: :as_lists) |> IO.puts()
```

control sequence introducer `\e` instead of `\033[`

# function

## anonymous function

```elixir
f = fn arg0, arg1, … -> result end
```

need a dot to call

```elixir
f.(a0, a1, …)
```

### capture syntax

```elixir
&fn1/n_args
&(&1…)
```

- `&1` for the first argument, `&2` for the second, etc.