from sqlmodel import Session, select

import server.db as db


class StatsCalculator:
    def __init__(self, game: db.Game):
        self.game = game

        league = game.league
        self.league_id = league.id
        self.stat_values = league.stat_values

    def run(self, session: Session):
        self.session = session
        self.stats: dict[str, db.Stats] = {}

        for point in self.game.points:
            self.process_point(point)

        for name, player_stats in self.stats.items():
            self.session.add(player_stats)

        self.session.commit()

    def process_point(self, point):
        events = point["events"]
        offensePlayers = point["offensePlayers"]
        defensePlayers = point["defensePlayers"]

        for idx, event in enumerate(events):
            self.process_event(idx, event, events, offensePlayers, defensePlayers)

    def process_event(self, idx, event, events, offensePlayers, defensePlayers):
        if event["type"] == "PASS":
            more_events = idx + 1 < len(events)
            if more_events:
                next_event = events[idx + 1]
                if next_event["type"] != "DROP":
                    self.add_stat(event["firstActor"], "completions")
                    self.add_stat(event["secondActor"], "catches")

        elif event["type"] == "DROP":
            previous_event = events[idx - 1]
            self.add_stat(event["firstActor"], "drops")
            self.add_stat(previous_event["firstActor"], "threw_drops")

        elif event["type"] == "THROWAWAY":
            self.add_stat(event["firstActor"], "throw_aways")

        elif event["type"] == "DEFENSE":
            self.add_stat(event["firstActor"], "d_blocks")

        elif event["type"] == "POINT":
            self.add_stat(event["firstActor"], "goals")

            # Assist and 2nd Assist
            previous_previous_event = events[idx - 2]
            previous_event = events[idx - 1]

            was_pass = previous_event["type"] == "PASS"
            was_d = previous_event["type"] == "DEFENSE"
            was_drop = previous_event["type"] == "DROP"

            if was_pass and previous_event["secondActor"] == event["firstActor"]:
                self.add_stat(previous_event["firstActor"], "assists")

                if previous_previous_event["type"] == "PASS":
                    prev_actor = previous_previous_event["firstActor"]
                    self.add_stat(prev_actor, "second_assists")

            # Callahan
            elif was_d or was_drop:
                self.add_stat(event["firstActor"], "callahan")

            # Finish Point
            offenseScored = event["firstActor"] in offensePlayers

            if offenseScored:
                [self.add_stat(player, "o_points_for") for player in offensePlayers]
                [self.add_stat(player, "d_points_against") for player in defensePlayers]
            else:
                [self.add_stat(player, "o_points_against") for player in offensePlayers]
                [self.add_stat(player, "d_points_for") for player in defensePlayers]

        elif event["type"] == "PULL":
            self.add_stat(event["firstActor"], "pulls")

    def add_stat(self, player_name, stat):
        player = self.get_or_create_player(player_name)

        if player.name not in self.stats:
            self.stats[player.name] = db.Stats(
                league_id=self.league_id,
                game_id=self.game.id,
                player_id=player.id,
                stat_values=self.stat_values,
            )

        self.stats[player.name].count_stat(stat)

    def get_or_create_player(self, player_name):
        statement = select(db.Player).where(db.Player.league_id == self.league_id, db.Player.name == player_name)
        instance = self.session.exec(statement).first()

        if instance:
            return instance
        else:
            instance = db.Player(name=player_name, league_id=self.league_id)
            self.session.add(instance)
            self.session.commit()
            return instance
