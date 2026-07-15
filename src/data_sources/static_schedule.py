from __future__ import annotations


GROUP_SCHEDULE_SEEDS = [
    ("A", ["2026-06-11", "2026-06-18", "2026-06-24"], ["MEX", "RSA", "KOR", "CZE"]),
    ("B", ["2026-06-12", "2026-06-18", "2026-06-24"], ["CAN", "BIH", "QAT", "SUI"]),
    ("C", ["2026-06-13", "2026-06-19", "2026-06-24"], ["HAI", "SCO", "BRA", "MAR"]),
    ("D", ["2026-06-12", "2026-06-19", "2026-06-25"], ["USA", "PAR", "AUS", "TUR"]),
    ("E", ["2026-06-14", "2026-06-20", "2026-06-25"], ["CIV", "ECU", "GER", "CUW"]),
    ("F", ["2026-06-14", "2026-06-20", "2026-06-25"], ["NED", "JPN", "SWE", "TUN"]),
    ("G", ["2026-06-15", "2026-06-21", "2026-06-26"], ["IRN", "NZL", "BEL", "EGY"]),
    ("H", ["2026-06-15", "2026-06-21", "2026-06-26"], ["KSA", "URU", "ESP", "CPV"]),
    ("I", ["2026-06-16", "2026-06-22", "2026-06-26"], ["FRA", "SEN", "IRQ", "NOR"]),
    ("J", ["2026-06-16", "2026-06-22", "2026-06-27"], ["ARG", "ALG", "AUT", "JOR"]),
    ("K", ["2026-06-17", "2026-06-23", "2026-06-27"], ["POR", "COD", "UZB", "COL"]),
    ("L", ["2026-06-17", "2026-06-23", "2026-06-27"], ["GHA", "PAN", "ENG", "CRO"]),
]

TEAM_NAMES = {
    "MEX": "Mexico",
    "RSA": "South Africa",
    "KOR": "South Korea",
    "CZE": "Czechia",
    "CAN": "Canada",
    "BIH": "Bosnia and Herzegovina",
    "QAT": "Qatar",
    "SUI": "Switzerland",
    "HAI": "Haiti",
    "SCO": "Scotland",
    "BRA": "Brazil",
    "MAR": "Morocco",
    "USA": "United States",
    "PAR": "Paraguay",
    "AUS": "Australia",
    "TUR": "Türkiye",
    "CIV": "Côte d'Ivoire",
    "ECU": "Ecuador",
    "GER": "Germany",
    "CUW": "Curaçao",
    "NED": "Netherlands",
    "JPN": "Japan",
    "SWE": "Sweden",
    "TUN": "Tunisia",
    "IRN": "IR Iran",
    "NZL": "New Zealand",
    "BEL": "Belgium",
    "EGY": "Egypt",
    "KSA": "Saudi Arabia",
    "URU": "Uruguay",
    "ESP": "Spain",
    "CPV": "Cabo Verde",
    "FRA": "France",
    "SEN": "Senegal",
    "IRQ": "Iraq",
    "NOR": "Norway",
    "ARG": "Argentina",
    "ALG": "Algeria",
    "AUT": "Austria",
    "JOR": "Jordan",
    "POR": "Portugal",
    "COD": "Congo DR",
    "UZB": "Uzbekistan",
    "COL": "Colombia",
    "GHA": "Ghana",
    "PAN": "Panama",
    "ENG": "England",
    "CRO": "Croatia",
}

OFFICIAL_GROUP_PAIRINGS = [
    ((0, 1), 0),
    ((2, 3), 0),
    ((0, 2), 1),
    ((3, 1), 1),
    ((3, 0), 2),
    ((1, 2), 2),
]

ROUND_OF_32_FIXTURES = [
    ("M73", "2026-06-28", "RSA", "CAN", "Los Angeles Stadium"),
    ("M76", "2026-06-29", "BRA", "JPN", "Houston Stadium"),
    ("M74", "2026-06-29", "GER", "PAR", "Boston Stadium"),
    ("M75", "2026-06-29", "NED", "MAR", "Estadio Monterrey"),
    ("M78", "2026-06-30", "CIV", "NOR", "Dallas Stadium"),
    ("M77", "2026-06-30", "FRA", "SWE", "New York New Jersey Stadium"),
    ("M79", "2026-06-30", "MEX", "ECU", "Mexico City Stadium"),
    ("M80", "2026-07-01", "ENG", "COD", "Atlanta Stadium"),
    ("M82", "2026-07-01", "BEL", "SEN", "Seattle Stadium"),
    ("M81", "2026-07-01", "USA", "BIH", "San Francisco Bay Area Stadium"),
    ("M84", "2026-07-02", "ESP", "AUT", "Los Angeles Stadium"),
    ("M83", "2026-07-02", "POR", "CRO", "Toronto Stadium"),
    ("M85", "2026-07-02", "SUI", "ALG", "BC Place Vancouver"),
    ("M88", "2026-07-03", "AUS", "EGY", "Dallas Stadium"),
    ("M86", "2026-07-03", "ARG", "CPV", "Miami Stadium"),
    ("M87", "2026-07-03", "COL", "GHA", "Kansas City Stadium"),
]

ROUND_OF_16_FIXTURES = [
    ("M90", "2026-07-04", "17:00", "CAN", "MAR", "Houston Stadium"),
    ("M89", "2026-07-04", "21:00", "PAR", "FRA", "Philadelphia Stadium"),
    ("M91", "2026-07-05", "20:00", "BRA", "NOR", "New York New Jersey Stadium"),
    ("M92", "2026-07-06", "00:00", "MEX", "ENG", "Mexico City Stadium"),
    ("M93", "2026-07-06", "19:00", "POR", "ESP", "Dallas Stadium"),
    ("M94", "2026-07-07", "00:00", "USA", "BEL", "Seattle Stadium"),
    ("M95", "2026-07-07", "16:00", "ARG", "EGY", "Atlanta Stadium"),
    ("M96", "2026-07-07", "20:00", "SUI", "COL", "BC Place Vancouver"),
]

QUARTER_FINAL_FIXTURES = [
    ("M97", "2026-07-09", "20:00", "FRA", "MAR", "Boston Stadium"),
    ("M98", "2026-07-10", "19:00", "ESP", "BEL", "Los Angeles Stadium"),
    ("M99", "2026-07-11", "21:00", "NOR", "ENG", "Miami Stadium"),
    ("M100", "2026-07-12", "01:00", "ARG", "SUI", "Kansas City Stadium"),
]

SEMI_FINAL_FIXTURES = [
    ("M101", "2026-07-14", "19:00", "FRA", "ESP", "Dallas Stadium"),
    ("M102", "2026-07-15", "19:00", "ENG", "ARG", "Atlanta Stadium"),
]

FINAL_ROUND_FIXTURES = [
    ("M103", "2026-07-18", "21:00", "FRA", "ENG", "Miami Stadium", "third_place"),
    ("M104", "2026-07-19", "19:00", "ESP", "ARG", "New York New Jersey Stadium", "final"),
]


def build_static_group_fixtures() -> list[dict[str, str]]:
    fixtures: list[dict[str, str]] = []
    for group_index, (group, dates, positions) in enumerate(GROUP_SCHEDULE_SEEDS):
        for pairing_index, (pair, matchday) in enumerate(OFFICIAL_GROUP_PAIRINGS):
            team_a = positions[pair[0]]
            team_b = positions[pair[1]]
            fixtures.append(
                {
                    "match_id": f"{team_a}-{team_b}-{dates[matchday]}",
                    "date": dates[matchday],
                    "kickoff_time": "12:00",
                    "group": group,
                    "stage": "group",
                    "team_a": TEAM_NAMES[team_a],
                    "team_b": TEAM_NAMES[team_b],
                    "team_a_code": team_a,
                    "team_b_code": team_b,
                    "venue": "",
                    "status": "scheduled",
                    "is_neutral_venue": "true",
                    "fifa_match_number": str(group_index * 6 + pairing_index + 1),
                }
            )
    for match_id, date, team_a, team_b, venue in ROUND_OF_32_FIXTURES:
        fixtures.append(
            {
                "match_id": match_id,
                "date": date,
                "kickoff_time": "12:00",
                "group": "",
                "stage": "round_of_32",
                "team_a": TEAM_NAMES[team_a],
                "team_b": TEAM_NAMES[team_b],
                "team_a_code": team_a,
                "team_b_code": team_b,
                "venue": venue,
                "status": "scheduled",
                "is_neutral_venue": "true",
                "fifa_match_number": match_id.removeprefix("M"),
            }
        )
    for match_id, date, kickoff_time, team_a, team_b, venue in ROUND_OF_16_FIXTURES:
        fixtures.append(
            {
                "match_id": match_id,
                "date": date,
                "kickoff_time": kickoff_time,
                "group": "",
                "stage": "round_of_16",
                "team_a": TEAM_NAMES[team_a],
                "team_b": TEAM_NAMES[team_b],
                "team_a_code": team_a,
                "team_b_code": team_b,
                "venue": venue,
                "status": "scheduled",
                "is_neutral_venue": "true",
                "fifa_match_number": match_id.removeprefix("M"),
            }
        )
    for match_id, date, kickoff_time, team_a, team_b, venue in QUARTER_FINAL_FIXTURES:
        fixtures.append(
            {
                "match_id": match_id,
                "date": date,
                "kickoff_time": kickoff_time,
                "group": "",
                "stage": "quarter_final",
                "team_a": TEAM_NAMES[team_a],
                "team_b": TEAM_NAMES[team_b],
                "team_a_code": team_a,
                "team_b_code": team_b,
                "venue": venue,
                "status": "scheduled",
                "is_neutral_venue": "true",
                "fifa_match_number": match_id.removeprefix("M"),
            }
        )
    for match_id, date, kickoff_time, team_a, team_b, venue in SEMI_FINAL_FIXTURES:
        fixtures.append(
            {
                "match_id": match_id,
                "date": date,
                "kickoff_time": kickoff_time,
                "group": "",
                "stage": "semi_final",
                "team_a": TEAM_NAMES[team_a],
                "team_b": TEAM_NAMES[team_b],
                "team_a_code": team_a,
                "team_b_code": team_b,
                "venue": venue,
                "status": "scheduled",
                "is_neutral_venue": "true",
                "fifa_match_number": match_id.removeprefix("M"),
            }
        )
    for match_id, date, kickoff_time, team_a, team_b, venue, stage in FINAL_ROUND_FIXTURES:
        fixtures.append(
            {
                "match_id": match_id,
                "date": date,
                "kickoff_time": kickoff_time,
                "group": "",
                "stage": stage,
                "team_a": TEAM_NAMES[team_a],
                "team_b": TEAM_NAMES[team_b],
                "team_a_code": team_a,
                "team_b_code": team_b,
                "venue": venue,
                "status": "scheduled",
                "is_neutral_venue": "true",
                "fifa_match_number": match_id.removeprefix("M"),
            }
        )
    return fixtures
