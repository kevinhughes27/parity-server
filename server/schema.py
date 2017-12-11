import graphene
from graphene import relay
from graphene_sqlalchemy import SQLAlchemyConnectionField, SQLAlchemyObjectType

from models import Player as PlayerModel
from models import Team as TeamModel
from models import Game as GameModel
from models import Stats as StatsModel


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


class Stats(SQLAlchemyObjectType):

    class Meta:
        model = StatsModel
        interfaces = (relay.Node, )


class Query(graphene.ObjectType):
    node = relay.Node.Field()
    all_players = SQLAlchemyConnectionField(Player)
    all_teams = SQLAlchemyConnectionField(Team)
    all_games = SQLAlchemyConnectionField(Game)
    all_stats = SQLAlchemyConnectionField(Stats)


schema = graphene.Schema(query=Query, types=[Player, Team, Game, Stats])
