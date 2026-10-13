use vstd::prelude::*;
verus! {
proof fn check()

{ let x: int = 3; let y: int = 2; let z = x * y; assert(z == 7); }
}
fn main() {}
