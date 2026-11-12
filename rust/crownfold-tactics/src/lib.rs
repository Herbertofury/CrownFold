//! CrownFold's engine-independent tactical kernel. No renderer, clock or RNG.
//! Geometry intentionally preserves the browser simulation's existing semantics.
pub mod objectives;
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};

pub const MAX_COVERS: usize = 1024;
pub const MAX_STEPS: usize = 10_000;
const CELL: f64 = 7.0;
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Point {
    pub x: f64,
    pub z: f64,
}
impl Point {
    fn valid(self) -> bool {
        self.x.is_finite() && self.z.is_finite()
    }
    fn distance(self, p: Self) -> f64 {
        (self.x - p.x).hypot(self.z - p.z)
    }
}
#[derive(Clone, Copy, Debug)]
pub struct Cover {
    pub point: Point,
    pub radius: f64,
    pub hp: f64,
}
impl Cover {
    fn valid(self) -> bool {
        self.point.valid() && self.radius.is_finite() && self.radius >= 0.0 && self.hp.is_finite()
    }
}
/// Closest point parameter, not the ray's entry surface, matching reference JS.
pub fn segment_circle(a: Point, b: Point, c: Point, r: f64) -> Option<f64> {
    if !a.valid() || !b.valid() || !c.valid() || !r.is_finite() || r < 0.0 {
        return None;
    }
    let dx = b.x - a.x;
    let dz = b.z - a.z;
    let len = dx * dx + dz * dz;
    if len < 1e-7 {
        return (a.distance(c) <= r).then_some(0.0);
    }
    if !len.is_finite() {
        return None;
    }
    let t = (((c.x - a.x) * dx + (c.z - a.z) * dz) / len).clamp(0.0, 1.0);
    let x = a.x + t * dx - c.x;
    let z = a.z + t * dz - c.z;
    (x * x + z * z <= r * r).then_some(t)
}
pub fn first_cover(a: Point, b: Point, covers: &[Cover], extra: f64) -> Option<usize> {
    let mut best = None;
    let mut time = f64::INFINITY;
    for (i, c) in covers.iter().enumerate() {
        if c.hp <= 0.0
            || !c.valid()
            || a.distance(c.point) < c.radius * 0.75
            || b.distance(c.point) < c.radius * 0.75
        {
            continue;
        }
        if let Some(t) = segment_circle(a, b, c.point, c.radius + extra) {
            if t < time {
                time = t;
                best = Some(i);
            }
        }
    }
    best
}
pub fn position_blocked(p: Point, covers: &[Cover], padding: f64) -> bool {
    !p.valid()
        || !padding.is_finite()
        || p.x < -133.0
        || p.x > 133.0
        || p.z < -182.0
        || p.z > 49.0
        || covers
            .iter()
            .any(|c| c.hp > 0.0 && c.valid() && p.distance(c.point) < c.radius + padding)
}
type Cell = (i32, i32);
fn point(c: Cell) -> Point {
    Point {
        x: f64::from(c.0) * CELL,
        z: f64::from(c.1) * CELL,
    }
}
fn nearest_free(p: Point, covers: &[Cover]) -> Cell {
    // JavaScript Math.round rounds negative ties toward positive infinity.
    let ix = (p.x / CELL + 0.5).floor() as i32;
    let iz = (p.z / CELL + 0.5).floor() as i32;
    for radius in 0_i32..7 {
        for dz in -radius..=radius {
            for dx in -radius..=radius {
                if dx.abs().max(dz.abs()) != radius {
                    continue;
                }
                let cell = (ix + dx, iz + dz);
                if !position_blocked(point(cell), covers, 2.3)
                    && first_cover(p, point(cell), covers, 2.3).is_none()
                {
                    return cell;
                }
            }
        }
    }
    (ix, iz)
}
#[derive(Clone, Copy)]
struct Node {
    cell: Cell,
    g: f64,
    f: f64,
}
/// Bounded A* with stable insertion-order tie breaking and line-of-sight smoothing.
pub fn war_path(start: Point, destination: Point, covers: &[Cover], limit: usize) -> Vec<Point> {
    if !start.valid()
        || !destination.valid()
        || start.x.abs() > 1e6
        || start.z.abs() > 1e6
        || destination.x.abs() > 1e6
        || destination.z.abs() > 1e6
        || covers.len() > MAX_COVERS
    {
        return vec![];
    }
    if first_cover(start, destination, covers, 2.3).is_none() {
        return vec![destination];
    }
    let origin = nearest_free(start, covers);
    let goal = nearest_free(destination, covers);
    if position_blocked(point(origin), covers, 2.3) || position_blocked(point(goal), covers, 2.3) {
        return vec![];
    }
    let h = |c: Cell| f64::from(goal.0 - c.0).hypot(f64::from(goal.1 - c.1));
    let mut open = vec![Node {
        cell: origin,
        g: 0.0,
        f: h(origin),
    }];
    let mut came = HashMap::new();
    let mut scores = HashMap::from([(origin, 0.0)]);
    let mut closed = HashSet::new();
    let mut found = false;
    let mut steps = 0;
    while !open.is_empty() {
        steps += 1;
        if steps >= limit.min(MAX_STEPS) {
            break;
        }
        let mut best = 0;
        for i in 1..open.len() {
            if open[i].f < open[best].f {
                best = i;
            }
        }
        let here = open.remove(best);
        if closed.contains(&here.cell) {
            continue;
        }
        if here.cell == goal {
            found = true;
            break;
        }
        closed.insert(here.cell);
        for (dx, dz) in [
            (1, 0),
            (-1, 0),
            (0, 1),
            (0, -1),
            (1, 1),
            (-1, 1),
            (1, -1),
            (-1, -1),
        ] {
            let next = (here.cell.0 + dx, here.cell.1 + dz);
            if closed.contains(&next) || position_blocked(point(next), covers, 2.3) {
                continue;
            }
            if dx != 0
                && dz != 0
                && (position_blocked(point((here.cell.0 + dx, here.cell.1)), covers, 2.3)
                    || position_blocked(point((here.cell.0, here.cell.1 + dz)), covers, 2.3))
            {
                continue;
            }
            if first_cover(point(here.cell), point(next), covers, 2.3).is_some() {
                continue;
            }
            let cost = here.g
                + if dx != 0 && dz != 0 {
                    std::f64::consts::SQRT_2
                } else {
                    1.0
                };
            if cost >= *scores.get(&next).unwrap_or(&f64::INFINITY) {
                continue;
            }
            came.insert(next, here.cell);
            scores.insert(next, cost);
            open.push(Node {
                cell: next,
                g: cost,
                f: cost + h(next),
            });
        }
    }
    if !found {
        return vec![];
    }
    let mut raw = vec![];
    let mut current = goal;
    for _ in 0..150 {
        raw.push(point(current));
        if current == origin {
            break;
        }
        match came.get(&current) {
            Some(c) => current = *c,
            None => return vec![],
        }
    }
    raw.reverse();
    let mut points = vec![];
    let mut cursor = start;
    let mut i = 0;
    while i < raw.len() {
        let mut furthest = None;
        for (j, p) in raw.iter().enumerate().skip(i) {
            if first_cover(cursor, *p, covers, 2.3).is_none() {
                furthest = Some(j);
            }
        }
        let Some(furthest) = furthest else {
            return vec![];
        };
        points.push(raw[furthest]);
        cursor = raw[furthest];
        i = furthest + 1;
    }
    if first_cover(cursor, destination, covers, 2.3).is_none() {
        points.push(destination);
    }
    points
}

// The synchronous single-thread Wasm ABI owns its buffers. No raw pointers or
// unsafe code cross the JS boundary. Native consumers use the pure functions.
#[derive(Default)]
struct Bridge {
    covers: Vec<Cover>,
    path: Vec<Point>,
}
thread_local! { static BRIDGE: RefCell<Bridge> = RefCell::new(Bridge::default()); }
#[no_mangle]
pub extern "C" fn cf_version() -> u32 {
    1
}
#[no_mangle]
pub extern "C" fn cf_reset_covers() {
    BRIDGE.with(|s| s.borrow_mut().covers.clear());
}
#[no_mangle]
pub extern "C" fn cf_add_cover(x: f64, z: f64, radius: f64, hp: f64) -> u32 {
    let cover = Cover {
        point: Point { x, z },
        radius,
        hp,
    };
    BRIDGE.with(|s| {
        let mut s = s.borrow_mut();
        if !cover.valid() || s.covers.len() >= MAX_COVERS {
            return 0;
        }
        s.covers.push(cover);
        1
    })
}
#[no_mangle]
pub extern "C" fn cf_segment_circle(
    ax: f64,
    az: f64,
    bx: f64,
    bz: f64,
    cx: f64,
    cz: f64,
    r: f64,
) -> f64 {
    segment_circle(
        Point { x: ax, z: az },
        Point { x: bx, z: bz },
        Point { x: cx, z: cz },
        r,
    )
    .unwrap_or(-1.0)
}
#[no_mangle]
pub extern "C" fn cf_first_cover(ax: f64, az: f64, bx: f64, bz: f64, extra: f64) -> i32 {
    BRIDGE.with(|s| {
        first_cover(
            Point { x: ax, z: az },
            Point { x: bx, z: bz },
            &s.borrow().covers,
            extra,
        )
        .map_or(-1, |i| i as i32)
    })
}
#[no_mangle]
pub extern "C" fn cf_position_blocked(x: f64, z: f64, padding: f64) -> u32 {
    BRIDGE.with(|s| {
        u32::from(position_blocked(
            Point { x, z },
            &s.borrow().covers,
            padding,
        ))
    })
}
#[no_mangle]
pub extern "C" fn cf_war_path(sx: f64, sz: f64, gx: f64, gz: f64, limit: u32) -> u32 {
    BRIDGE.with(|s| {
        let mut s = s.borrow_mut();
        s.path = war_path(
            Point { x: sx, z: sz },
            Point { x: gx, z: gz },
            &s.covers,
            limit as usize,
        );
        s.path.len() as u32
    })
}
#[no_mangle]
pub extern "C" fn cf_waypoint_x(i: u32) -> f64 {
    BRIDGE.with(|s| s.borrow().path.get(i as usize).map_or(f64::NAN, |p| p.x))
}
#[no_mangle]
pub extern "C" fn cf_waypoint_z(i: u32) -> f64 {
    BRIDGE.with(|s| s.borrow().path.get(i as usize).map_or(f64::NAN, |p| p.z))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn p(x: f64, z: f64) -> Point {
        Point { x, z }
    }
    fn cover() -> Cover {
        Cover {
            point: p(0.0, 0.0),
            radius: 8.0,
            hp: 300.0,
        }
    }
    #[test]
    fn segment_cases() {
        assert_eq!(
            segment_circle(p(-20.0, 0.0), p(20.0, 0.0), p(0.0, 0.0), 8.0),
            Some(0.5)
        );
        assert_eq!(
            segment_circle(p(20.0, 20.0), p(20.0, 20.0), p(0.0, 0.0), 8.0),
            None
        );
        assert_eq!(
            segment_circle(p(0.0, 0.0), p(0.0, 0.0), p(0.0, 0.0), 0.0),
            Some(0.0)
        );
    }
    #[test]
    fn living_cover_only() {
        let mut c = cover();
        assert_eq!(first_cover(p(-20.0, 0.0), p(20.0, 0.0), &[c], 0.0), Some(0));
        c.hp = 0.0;
        assert_eq!(first_cover(p(-20.0, 0.0), p(20.0, 0.0), &[c], 0.0), None);
    }
    #[test]
    fn endpoint_cover_exemption() {
        assert_eq!(
            first_cover(p(0.0, 0.0), p(20.0, 0.0), &[cover()], 0.0),
            None
        );
    }
    #[test]
    fn blocked_bounds() {
        assert!(position_blocked(p(134.0, 0.0), &[], 2.0));
        assert!(position_blocked(p(0.0, 0.0), &[cover()], 2.0));
        assert!(!position_blocked(p(20.0, 0.0), &[cover()], 2.0));
    }
    #[test]
    fn route_is_deterministic_and_clear() {
        let s = p(-25.0, 0.0);
        let d = p(25.0, 0.0);
        let covers = [cover()];
        let path = war_path(s, d, &covers, 2100);
        assert!(path.len() > 1);
        assert_eq!(path.last(), Some(&d));
        assert_eq!(path, war_path(s, d, &covers, 2100));
        let mut prior = s;
        for next in path {
            assert_eq!(first_cover(prior, next, &covers, 2.3), None);
            prior = next;
        }
    }
    #[test]
    fn destroyed_cover_opens_route() {
        let mut c = cover();
        c.hp = 0.0;
        assert_eq!(
            war_path(p(-25.0, 0.0), p(25.0, 0.0), &[c], 2100),
            vec![p(25.0, 0.0)]
        );
    }
    #[test]
    fn budget_is_bounded() {
        assert!(war_path(p(-25.0, 0.0), p(25.0, 0.0), &[cover()], 1).is_empty());
    }
    #[test]
    fn invalid_inputs_are_safe() {
        assert!(war_path(p(f64::NAN, 0.0), p(0.0, 0.0), &[], 2100).is_empty());
        assert!(war_path(p(f64::MAX, 0.0), p(0.0, 0.0), &[], 2100).is_empty());
        assert!(position_blocked(p(f64::INFINITY, 0.0), &[], 2.0));
        assert_eq!(
            segment_circle(p(0.0, 0.0), p(20.0, 0.0), p(10.0, 0.0), -3.0),
            None
        );
    }
    #[test]
    fn bridge_capacity_and_reset() {
        cf_reset_covers();
        for _ in 0..MAX_COVERS {
            assert_eq!(cf_add_cover(0.0, 0.0, 8.0, 1.0), 1);
        }
        assert_eq!(cf_add_cover(0.0, 0.0, 8.0, 1.0), 0);
        cf_reset_covers();
        assert_eq!(cf_add_cover(f64::NAN, 0.0, 8.0, 1.0), 0);
        assert_eq!(cf_add_cover(0.0, 0.0, 8.0, 1.0), 1);
        assert_eq!(cf_first_cover(-20.0, 0.0, 20.0, 0.0, 0.0), 0);
        assert!(cf_war_path(-25.0, 0.0, 25.0, 0.0, 2100) > 1);
        assert!(cf_waypoint_x(u32::MAX).is_nan());
        cf_reset_covers();
        assert_eq!(cf_first_cover(-20.0, 0.0, 20.0, 0.0, 0.0), -1);
    }
}
