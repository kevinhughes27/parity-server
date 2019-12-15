require 'csv'
require 'json'
require 'byebug'

LEAGUE_ID = 3
data_directory = 'data/ocua_15'

def rewrite_event_string(game_string)
  points = []

  point_start_idx = 0
  direction_left = nil
  last_point_left = nil

  game_string.each_with_index do |e, idx|
    if e[0] == "Pull"
      last_point_left = (game_string[idx+1][1] == ">>>>>>")

    elsif e[0] == "POINT"
      point_end_idx = idx

      players_start = point_end_idx + 1
      players = game_string.slice(players_start, 6)

      offensePlayers = []
      defensePlayers = []

      players.each do |players_row|
        offensePlayers << players_row[1]
        defensePlayers << players_row[3]
      end

      point_string = game_string[point_start_idx..point_end_idx]

      points << {
        "offensePlayers" => offensePlayers,
        "defensePlayers" => defensePlayers,
        "event_string" => point_string
      }

      # set idx and direction
      point_start_idx = point_end_idx + 6 + 1
      last_point_left = !direction_left

    elsif e[0] == "Direction"
      direction_left = (e[1] == ">>>>>>")
    end
  end

  # handle last point which may not have finished
  # we don't know who was on the field because this data
  # was only added when the point was finished.
  # the old parse would still calc stats from this
  # unfinished point.
  #
  # what will adding this break?
  #
  ended_on_point = (point_start_idx + 1 == game_string.length)
  if !ended_on_point
    point_string = game_string[point_start_idx..-1]
    points << {
      "offensePlayers" => [],
      "defensePlayers" => [],
      "event_string" => point_string
    }
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
      old_events = line.reverse

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

  points
end

def build_game_json(week:, home_row:, away_row:, event_string:)
  homeTeam = home_row[0]
  homeScore = home_row[1]

  awayTeam = away_row[0]
  awayScore = away_row[1]

  event_string = event_string.map { |s| s.compact }.reject { |r| r.empty? }

  points = rewrite_event_string(event_string)

  return {
    "league_id" => LEAGUE_ID,
    "week" => week,
    "homeTeam" => homeTeam,
    "homeScore" => homeScore,
    "homeRoster" => [],
    "awayTeam" => awayTeam,
    "awayScore" => awayScore,
    "awayRoster" => [],
    "points" => points,
  }
end

def transform(data_directory)
  Dir.glob("#{data_directory}/*.csv").sort.each do |file|
    week = file.split("week").last.gsub(".csv", "").to_i

    data = File.read(file)

    data.gsub!(",Direction,>>>>>>,", ",Direction,>>>>>>\n,")
    data.gsub!(",Direction,<<<<<<,", ",Direction,<<<<<<\n,")

    File.write("wat", data)

    csv = CSV.parse(data)

    team_row_nums = []

    csv.each_with_index do |row, idx|
      if row[0]
        team_row_nums << idx
      end
    end

    game_starts = (0..team_row_nums.length / 2 - 1).to_a.map { |i| i*2 }

    game_starts.each_with_index do |idx, j|
      home_row_idx = team_row_nums[idx]
      away_row_idx = team_row_nums[idx+1]

      game_string_start = team_row_nums[idx+1] + 1
      game_string_end = team_row_nums[idx+2]

      if game_string_end.nil?
        game_string_end = -1
      else
        game_string_end -= 1
      end

      game = build_game_json(
        week: week,
        home_row: csv[home_row_idx],
        away_row: csv[away_row_idx],
        event_string: csv[game_string_start..game_string_end]
      )

      game_num = j + 1
      File.write("#{data_directory}/week#{week}_game#{game_num}.json", JSON.pretty_generate(game) + "\n")
    end
  end
end

if ARGV[0] == "undo"
  `find #{data_directory} -name "*.json" -type f|xargs rm -f `
else
  transform(data_directory)
end
