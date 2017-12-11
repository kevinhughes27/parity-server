import graphene
from graphene import relay
from graphene_sqlalchemy import SQLAlchemyConnectionField, SQLAlchemyObjectType

from models import Player as PlayerModel
from models import Team as TeamModel
from models import Game as GameModel


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



schema = graphene.Schema(query=Query, types=[Player, Team, Game])
