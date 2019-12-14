require 'json'
require 'set'
require 'pp'
require 'byebug'

data_directory = 'data/ocua_16-17/session1'

def backfill(data_directory)
  Dir.glob("#{data_directory}/*.json").sort.each do |file|
    data = JSON.parse(File.read(file))

    # fix bad serialization
    if data["events"]
      data["points"] = data["events"]["points"]
      data.delete("events")
    end

    # the new data format was not ready yet and contains bad data
    data.delete("points")

    # group the event string into points
    #
    # references:
    #
    #   event string parse at the commit of the python re-write
    #   https://raw.githubusercontent.com/kevinhughes27/parity-server/760c96082fa929276566b6eca8ac762fca591b05/node_server/lib/calc_stats.js
    #
    #   parse lib from full google sheet days as a node module
    #   https://github.com/kevinhughes27/parity-parser/blob/master/lib/parser.js

    game_string = data["event_string"]

    points = []

    point_start_idx = 0
    direction_left = nil
    last_point_left = nil

    game_string.each_with_index do |line, idx|
      e = line.split(",")

      if e[0] == "Pull"
        last_point_left = (game_string[idx+1].split(",")[1] == ">>>>>>")

      elsif e[0] == "POINT"
        point_end_idx = idx
        left_team_start = point_end_idx + 1
        right_team_start = left_team_start + 6

        left_players = game_string.slice(left_team_start, 6).map { |l| l.split(",")[1] }
        right_players = game_string.slice(right_team_start, 6).map { |l| l.split(",")[1] }
        event_string = game_string[point_start_idx..point_end_idx]

        points << {
          "offensePlayers" => last_point_left ? left_players : right_players,
          "defensePlayers" => last_point_left ? right_players : left_players,
          "event_string" => event_string
        }

        # set idx and direction
        point_start_idx = point_end_idx + 12 + 1
        last_point_left = !direction_left

      elsif e[0] == "Direction"
        direction_left = (e[1] == ">>>>>>")
      end
    end

    # the data is now grouped by point
    # and shaped like this:
    # {
    #    offensePlayers: [],
    #    defensePlayers: [],
    #    event_string: []
    # }

    # re-write the grouped event string into the new
    # event array format
    points.each do |point|
      new_events = []

      point["event_string"].each do |line|
        old_events = line.split(",").reverse

        old_events.each_with_index do |old_event, idx|
          if old_event == "Pull"
            new_events << {
              "type" => "PULL",
              "firstActor" => old_events[idx-1]
            }
          elsif old_event == "D"
            new_events << {
              "type" => "DEFENSE",
              "firstActor" => old_events[idx-1]
            }
          elsif old_event == "Throw Away"
            new_events << {
              "type" => "THROWAWAY",
              "firstActor" => old_events[idx-1]
            }
          elsif old_event == "Drop"
            new_events << {
              "type" => "DROP",
              "firstActor" => old_events[idx-1]
            }
          elsif old_event == "POINT"
            new_events << {
              "type" => "POINT",
              "firstActor" => old_events[idx-1]
            }
          elsif old_event == "Pass"
            new_events << {
              "type" => "PASS",
              "firstActor" => old_events[idx-1],
              "secondActor" => old_events[idx+1]
            }
          end

        end
      end

      point["events"] = new_events
      point.delete("event_string")
    end

    # write new points
    data["points"] = points
    data.delete("event_string")

    # backfill teams to homeTeam and awayTeam
    home_team = data["teams"].keys[0]
    away_team = data["teams"].keys[1]

    home_roster = data["teams"][home_team]
    away_roster = data["teams"][away_team]

    data.delete("teams")
    data["homeTeam"] = home_team
    data["homeRoster"] = home_roster

    data["awayTeam"] = away_team
    data["awayRoster"] = away_roster

    # backfill score to homeScore and awayScore
    if data["score"]
      home_score = data["score"][home_team]
      away_score = data["score"][away_team]

      data.delete("score")
      data["awayScore"] = away_score
      data["homeScore"] = home_score
    # fix missing scores
    else
      home_score = 0
      away_score = 0

      data["points"].each do |point|
        last_event = point["events"].last

        scorer = last_event["firstActor"]
        sub_scored = scorer.include?("(S)")

        offense_scored = point["offensePlayers"].include?(scorer)

        scoring_players = offense_scored ? point["offensePlayers"] : point["defensePlayers"]

        home_scored = if sub_scored
          sub_team_mate = scoring_players[ scoring_players.index(scorer) + 1 ]
          home_roster.include? sub_team_mate
        else
          home_roster.include? scorer
        end

        if home_scored
          home_score += 1
        else
          away_score += 1
        end
      end

      data["awayScore"] = away_score
      data["homeScore"] = home_score
    end

    File.write(file, JSON.pretty_generate(data) + "\n")
  end
end

if ARGV[0] == "undo"
  `git checkout #{data_directory}`
else
  backfill(data_directory)
end
