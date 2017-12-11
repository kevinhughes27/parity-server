import graphene
from graphene import relay
from graphene_sqlalchemy import SQLAlchemyConnectionField, SQLAlchemyObjectType

from models import Player as PlayerModel
from models import Team as TeamModel
from models import Game as GameModel

from upload import StatsCalculator


class Player(SQLAlchemyObjectType):

    class Meta:
        model = PlayerModel
        interfaces = (relay.Node, )


class Team(SQLAlchemyObjectType):

    class Meta:
        model = TeamModel
        interfaces = (relay.Node, )


class Game(SQLAlchemyObjectType):

    class Meta:
        model = GameModel
        interfaces = (relay.Node, )


class uploadGame(graphene.Mutation):
    class Arguments:
        league = graphene.String()
        week = graphene.String()

        home_team = graphene.String()
        home_score = graphene.String()
        home_roster = graphene.types.json.JSONString()

        away_team = graphene.String()
        away_score = graphene.String()
        away_roster = graphene.types.json.JSONString()

        points = graphene.types.json.JSONString()

    ok = graphene.Boolean()

    @classmethod
    def mutate(cls, root, info, **args):
        game = Game(
            league=args['league'],
            week=args['week'],
            home_team=args['homeTeam'],
            home_score=args['homeScore'],
            home_roster=args['homeRoster'],
            away_team=args['awayTeam'],
            away_score=args['awayScore'],
            away_roster=args['awayRoster'],
            points=args['points'],
        )

        db.session.add(game)
        db.session.commit()

        # calculate and save stats
        stats = StatsCalculator(game.id, points).run()
        for stat in stats:
            db.session.add(stat[1])
        db.session.commit()

        ok = True
        return uploadGame(ok=ok)


class Query(graphene.ObjectType):
    node = relay.Node.Field()

    player = SQLAlchemyConnectionField(Player)
    all_players = SQLAlchemyConnectionField(Player)
    find_player = graphene.Field(lambda: Player, name = graphene.String())

    def resolve_find_player(self, info, **args):
        name = args['name']
        return PlayerModel.query.filter_by(name=name).first()


    team = SQLAlchemyConnectionField(Team)
    all_teams = SQLAlchemyConnectionField(Team)
    find_team = graphene.Field(lambda: Team, name = graphene.String())

    def resolve_find_team(self, info, **args):
        name = args['name']
        return TeamModel.query.filter_by(name=name).first()


    game = SQLAlchemyConnectionField(Game)
    all_games = SQLAlchemyConnectionField(Game)
    find_game = graphene.Field(lambda: Game, id = graphene.Int())

    def resolve_find_game(self, info, **args):
        id = args['id']
        return GameModel.query.get(id)


class Mutations(graphene.ObjectType):
    uploadGame = uploadGame.Field()


schema = graphene.Schema(query=Query, mutation=Mutations, types=[Player, Team, Game])
