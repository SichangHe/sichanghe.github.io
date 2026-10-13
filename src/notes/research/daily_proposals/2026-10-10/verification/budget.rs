use vstd::prelude::*;

// 🧑 "Also have it do the program verification, Verus stuffs"
verus! {
pub tracked struct Budget { pub ghost remaining: nat }

proof fn spend(tracked budget: Budget, amount: nat) -> (tracked rest: Budget)
    requires amount <= budget.remaining,
    ensures rest.remaining == budget.remaining - amount,
{
    Budget { remaining: (budget.remaining - amount) as nat }
}

proof fn split(tracked budget: Budget, amount: nat)
    -> (tracked pair: (Budget, Budget))
    requires amount <= budget.remaining,
    ensures pair.0.remaining == amount,
        pair.1.remaining + pair.0.remaining == budget.remaining,
{
    (Budget { remaining: amount }, Budget { remaining: (budget.remaining - amount) as nat })
}

fn counted_identity(value: u64, Tracked(budget): Tracked<Budget>)
    -> (result: (u64, Tracked<Budget>))
    requires budget.remaining >= 1,
    ensures result.0 == value,
        result.1@.remaining + 1 == budget.remaining,
{
    let tracked rest = spend(budget, 1);
    (value, Tracked(rest))
}
}
fn main() {}
