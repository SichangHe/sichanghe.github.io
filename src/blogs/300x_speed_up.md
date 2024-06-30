<!-- toc -->
# ~300x Speed Up: Finding Inexact Matches in Nested Sets

In a research project, I built a parser to analyze routes on the Internet,
but it bottlenecked on finding inexact matches of IP address prefixes in
nested sets.
So, I applied various optimizations,
and eventually made the parser around 300 times faster,
analyzing around 800 million routes in 3hr[^cpu].

The exact multiply of speedup does not matter,
but I find the data structure changes, profiling,
and algorithm experiments to be valuable experiences to discuss (no,
I did not rewrite from a Python implementation to gain a trivial 50x speedup;
I started in Rust).

## Simplified background

Instead of explaining routing policies, RFC 2622, etc.,
I construct a simplified context where we try to
implement a method `match_as_set` on a data structure `Matcher`.
This method should try to find if there is a match for `Matcher`'s (IP address)
prefix $p$ in an AS Set $\mathcal A$ at the presence of a range operator $o$.
The relationships among the data structures are as follows.

$$
\begin{alignat*}{3}
    &\text{Route}\xrightarrow{\quad\text{specifies}\quad}\text{prefix }p\\
    {}_{\text{goes through}}&\downarrow\qquad\qquad\qquad\qquad
        \uparrow_{\text{is a match?}}\\
    \text{AS Set }\mathcal A\ni&
        \text{AS }a_i\xleftrightarrow{\text{correspond to}}
        \text{Prefixes }\mathcal R_i,\text{ Range Operator }o
\end{alignat*}
$$

1. A **route** basically says a **prefix**
    $p$`:IpNet` like `193.254.30.0/24` can go through a sequence of
    Autonomous Systems (**AS**es),
    which are basically the stops on a route path.
    `Matcher` stores $p$ in its `prefix` field.
1. Each **AS** $a_i$`:usize` corresponds to one set of prefixes
    $\mathcal R_i$`:Vec<IpNet>`$=\{p_1,p_2,\ldots\}$,
    stored in the `as_routes` field of `Matcher`.
1. A **range operator** $o$`:RangeOperator` can modify the prefix $p_i$,
    and $(p_i,o)$ together can be **a match** for many different prefixes.
    For example,
    the prefix-operator pair `(212.5.128.0/19,^19-24)` is a match for
    prefixes including `212.5.128.0/24` and `212.5.129.0/24`.
    A set of prefixes $\mathcal R_i$ is a match for a prefix
    $p$ at the presence of $o$ if there is a
    $p_j\in\mathcal R_i$ such that $(p_i,o)$ is a match for $p$.
1. For our analysis, we want to know if,
    at the presence of range operator $o$,
    $p$ has a match in an **AS Set** $\mathcal A$`:AsSet`$=\{a_1,a_2,\ldots\}$.
    This match is defined by an
    $a_i\in\mathcal A$ whose corresponding $\mathcal R_i$ is a match of $p$.

```rust
struct Matcher {
    prefix: IpNet,
    as_routes: BTreeMap<usize, Vec<IpNet>>,
    as_sets: BTreeMap<String, AsSet>,
}
```

This matching requires more complicated implementation than
simple lookups because:

- Prefix matching is inexact.
    Depending on $o$, $(p_i,o)$ may be a match of $p$ if $p_i$ equals $p$,
    contains $p$, or contains but not equals $p$, or,
    $p$ itself must satisfy some condition.
    So, simple lookups like hash table lookup and binary search do not suffice.
- AS Sets can be nested.
    $\mathcal A_i=\{a_1,a_2,\ldots,\mathcal A_{i1},\mathcal A_{i2},\ldots\}$
    may contain both ASes $a_j$ and other AS Sets $\mathcal A_{ij}$.
    So,
    finding a match for $p$ in
    $\mathcal A_i$ may require checking an *unbounded* number of sets.
- There are too many prefix ranges.
    Flattening the set of all prefixes for
    each AS Set would eliminate the nesting,
    but I tried that and ran out of all 300GiB of RAM,
    causing the server to hang for a while
    (fortunately my admin did not notice it).

## Naive implementation

To understand the problem, I started with a straightforward implementation.
Below is the simplified mock Rust code.

```rust
impl Matcher {
    fn match_as_set(
        &self,
        name: &str,
        op: RangeOperator,
        visited: &mut Vec<AsName>,
    ) -> bool {
        let Some(as_set) = self.as_sets.get(name) else {
            return false;
        };
        for as_name in as_set {
            if match_as_name(as_name, op, visited) {
                return true;
            }
        }
        false
    }

    fn match_as_name(
        &self,
        as_name: AsName,
        op: RangeOperator,
        visited: &mut Vec<AsName>,
    ) -> bool {
        if visited.contains(&as_name) {
            return false;
        }
        visited.push(as_name);
        match as_name {
            AsName::Num(num) => self.match_as_num(num, op),
            AsName::Set(name) => self.match_as_set(name, op, visited),
        }
    }

    fn match_as_num(&self, num: usize, op: RangeOperator) -> bool {
        let Some(routes) = self.as_routes.get(&num) else {
            return false;
        };
        routes
            .iter()
            .any(|prefix| prefix_and_op_matches(prefix, op, &self.prefix))
    }
}
```

The three `Matcher` methods above all search for a match for
the matcher's prefix in the presence of the range operator `op`,
and they return true only if a match is found.
`match_as_set` searches the AS Set called `name`;
`match_as_name` searches `as_name`,
which is either a number for an AS (`AsName::Num`)
or a name for an AS Set (`AsName::Set`);
`match_as_num` searches an AS of number `num`.

- `match_as_num` and `match_as_set` use the AS `num` or AS Set `name` to
    query the corresponding set of prefixes `routes` ($R_i$)
    in the `Matcher`'s `self.as_routes` or the AS Set `as_set` ($\mathcal A$)
    in `self.as_set`, respectively.
    When the query fails, we return `false` early.
- `match_as_set` simply checks each AS number or AS Set name in an AS Set for
    a match.
- The `visited` argument records all the AS numbers and
    AS Set names we have encountered to prevent checking them again,
    so we don't recurs infinitely.
- `match_as_num` calls a helper function `prefix_and_op_matches` on
    each prefix $p_i$ in the set and the `Matcher`'s `self.prefix` ($p$),
    and returns true if any of the calls returns true.

My early implementation using this naive approach was taking XXmin to
check 10,000 routes on a single CPU. I ran it on a single CPU for better profiler output:

<!-- TODO: Find the bloody flamegraph or re-generate one. -->

[Cargo-FlameGraph](TODO) generated the above flame graph.

<!-- TODO: Finish this off. -->

[^cpu]: Run on a server with dual EPYC 7763 64-Core processors.

---

*2024-05-30*

{{ #include footer.md }}
