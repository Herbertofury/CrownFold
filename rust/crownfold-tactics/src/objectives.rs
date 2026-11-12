//! Renderer-independent siege objectives. Serialized state uses schema version 1.
//! Combat supplies observations; this module alone chooses objective transitions.
use std::cell::RefCell;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Objectives {
    pub act: u32, // foothold, anchors, throne, extraction
    pub foothold: f64,
    pub foothold_target: f64,
    pub extraction: f64,
    pub extraction_target: f64,
    pub active: bool,
    pub victory: u32, // ongoing, allied, enemy
}
impl Objectives {
    pub fn valid(self) -> bool {
        self.act < 4
            && self.victory <= 2
            && self.foothold.is_finite()
            && self.extraction.is_finite()
            && self.foothold_target == 24.0
            && [24.0, 36.0].contains(&self.extraction_target)
            && (0.0..=self.foothold_target).contains(&self.foothold)
            && (0.0..=self.extraction_target).contains(&self.extraction)
            && (!self.active || self.act == 3)
    }
}
#[derive(Clone, Copy, Debug)]
pub struct Observation {
    pub wells: u32,
    pub anchors: u32,
    pub throne_alive: bool,
    pub home_alive: bool,
    pub present: bool,
    pub contested: bool,
}
/// Returns one transition at most. No rewards are granted while loading state.
pub fn step(mut state: Objectives, observation: Observation, dt: f64) -> Option<Objectives> {
    if !state.valid() || !dt.is_finite() || !(0.0..=1.0).contains(&dt) {
        return None;
    }
    if state.victory != 0 {
        return Some(state);
    }
    if !observation.home_alive {
        state.victory = 2;
        return Some(state);
    }
    match state.act {
        0 => {
            state.foothold = (state.foothold
                + if observation.wells >= 2 {
                    dt
                } else {
                    -dt * 0.7
                })
            .clamp(0.0, state.foothold_target);
            if state.foothold >= state.foothold_target {
                state.act = 1;
            }
        }
        1 if observation.anchors == 0 => state.act = 2,
        2 if !observation.throne_alive => state.act = 3,
        3 if state.active => {
            let rate = if !observation.present {
                -0.2
            } else if observation.contested {
                -0.6
            } else {
                1.0
            };
            state.extraction = (state.extraction + rate * dt).clamp(0.0, state.extraction_target);
            if state.extraction >= state.extraction_target {
                state.victory = 1;
            }
        }
        _ => {}
    }
    Some(state)
}
thread_local! { static OUTPUT: RefCell<Option<Objectives>> = const { RefCell::new(None) }; }
#[no_mangle]
pub extern "C" fn cf_objective_version() -> u32 {
    1
}
#[no_mangle]
pub extern "C" fn cf_objective_step(
    act: u32,
    foothold: f64,
    foothold_target: f64,
    extraction: f64,
    extraction_target: f64,
    active: u32,
    victory: u32,
    wells: u32,
    anchors: u32,
    throne_alive: u32,
    home_alive: u32,
    present: u32,
    contested: u32,
    dt: f64,
) -> i32 {
    let result = if [active, throne_alive, home_alive, present, contested]
        .iter()
        .any(|v| *v > 1)
    {
        None
    } else {
        step(
            Objectives {
                act,
                foothold,
                foothold_target,
                extraction,
                extraction_target,
                active: active == 1,
                victory,
            },
            Observation {
                wells,
                anchors,
                throne_alive: throne_alive == 1,
                home_alive: home_alive == 1,
                present: present == 1,
                contested: contested == 1,
            },
            dt,
        )
    };
    let status = result.map_or(-1, |s| (s.act | (s.victory << 4)) as i32);
    OUTPUT.with(|out| *out.borrow_mut() = result);
    status
}
#[no_mangle]
pub extern "C" fn cf_objective_progress(extraction: u32) -> f64 {
    OUTPUT.with(|out| {
        out.borrow().map_or(f64::NAN, |s| {
            if extraction == 0 {
                s.foothold
            } else {
                s.extraction
            }
        })
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    fn initial() -> Objectives {
        Objectives {
            act: 0,
            foothold: 0.0,
            foothold_target: 24.0,
            extraction: 0.0,
            extraction_target: 36.0,
            active: false,
            victory: 0,
        }
    }
    fn clear() -> Observation {
        Observation {
            wells: 2,
            anchors: 0,
            throne_alive: false,
            home_alive: true,
            present: true,
            contested: false,
        }
    }
    #[test]
    fn sequential_campaign_and_resumed_extraction() {
        let mut s = initial();
        for _ in 0..24 {
            s = step(s, clear(), 1.0).unwrap();
        }
        assert_eq!(s.act, 1);
        s = step(s, clear(), 0.1).unwrap();
        assert_eq!(s.act, 2);
        s = step(s, clear(), 0.1).unwrap();
        assert_eq!(s.act, 3);
        s.active = true;
        for _ in 0..18 {
            s = step(s, clear(), 1.0).unwrap();
        }
        let checkpoint = s;
        for _ in 0..18 {
            s = step(s, clear(), 1.0).unwrap();
        }
        assert_eq!(s.victory, 1);
        let mut resumed = checkpoint;
        for _ in 0..18 {
            resumed = step(resumed, clear(), 1.0).unwrap();
        }
        assert_eq!(s, resumed);
    }
    #[test]
    fn loss_wins_over_extraction_and_rewards_cannot_repeat() {
        let mut s = initial();
        s.act = 3;
        s.active = true;
        s.extraction = 35.9;
        let mut o = clear();
        o.home_alive = false;
        s = step(s, o, 0.1).unwrap();
        assert_eq!(s.victory, 2);
        assert_eq!(step(s, clear(), 1.0), Some(s));
    }
    #[test]
    fn reject_corrupt_state_without_output() {
        let mut s = initial();
        s.foothold = f64::NAN;
        assert!(step(s, clear(), 0.1).is_none());
        s = initial();
        s.act = 8;
        assert!(step(s, clear(), 0.1).is_none());
        s = initial();
        s.active = true;
        assert!(step(s, clear(), 0.1).is_none());
        assert!(step(initial(), clear(), f64::INFINITY).is_none());
    }
}
