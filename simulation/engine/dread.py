from dataclasses import dataclass


@dataclass
class DreadScore:
    damage: int
    reproducibility: int
    exploitability: int
    affected_users: int
    discoverability: int

    def average(self) -> float:
        total = (
            self.damage
            + self.reproducibility
            + self.exploitability
            + self.affected_users
            + self.discoverability
        )
        return round(total / 5.0, 1)


def idor_default_scores() -> dict:
    before = DreadScore(
        damage=8,
        reproducibility=9,
        exploitability=8,
        affected_users=8,
        discoverability=7,
    )
    after = DreadScore(
        damage=5,
        reproducibility=3,
        exploitability=3,
        affected_users=4,
        discoverability=4,
    )
    return {
        "before": before,
        "after": after,
        "before_avg": before.average(),
        "after_avg": after.average(),
        "risk_reduction": round(before.average() - after.average(), 1),
    }
