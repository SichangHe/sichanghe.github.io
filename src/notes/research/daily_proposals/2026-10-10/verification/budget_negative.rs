include!("budget.rs");

// 🧑 "Also have it do the program verification, Verus stuffs"
verus! {
proof fn overspend()
{
    let tracked one = Budget { remaining: 1nat };
    let tracked rest = spend(one, 2);
}
}
