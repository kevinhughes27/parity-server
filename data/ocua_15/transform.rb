require 'csv'
require 'set'
require 'json'
require 'byebug'

LEAGUE_ID = 3
data_directory = 'data/ocua_15'

def rewrite_event_string(game_string)
  points = []
  point_start_idx = 0

  game_string.each_with_index do |e, idx|
    if e[0] == "POINT"
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
        "offensePlayers" => offensePlayers.compact,
        "defensePlayers" => defensePlayers.compact,
        "event_string" => point_string
      }

      # set point_start_idx
      point_start_idx = point_end_idx + 6 + 1
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
  ended_on_point = (point_start_idx + 1 >= game_string.length)
  if !ended_on_point
    point_string = game_string[point_start_idx..-1]
    points << {
      "offensePlayers" => [],
      "defensePlayers" => [],
      "event_string" => point_string
    }
  end

  # the points data is now grouped by point
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

def build_rosters(points)
  homeRoster = Set.new
  awayRoster = Set.new

  # assume home always pulls. Swap later if required
  homeRoster += points[0]["defensePlayers"].compact.to_set
  awayRoster += points[0]["offensePlayers"].compact.to_set

  scorer = points[0]["events"].last["firstActor"]
  offenseScored = points[0]["offensePlayers"].include?(scorer)

  if offenseScored
    homeRoster += points[1]["offensePlayers"].compact.to_set
    awayRoster += points[1]["defensePlayers"].compact.to_set
  else
    homeRoster += points[1]["defensePlayers"].compact.to_set
    awayRoster += points[1]["offensePlayers"].compact.to_set
  end

  # rosters should be basically correct now
  # fill in against the rest of the game
  points.each do |point|
    home_is_offsense = (homeRoster & point["offensePlayers"].to_set).size > 1

    offensePlayers = point["offensePlayers"].compact.to_set
    defensePlayers = point["defensePlayers"].compact.to_set

    if home_is_offsense
      homeRoster += offensePlayers
      awayRoster += defensePlayers
    else
      homeRoster += defensePlayers
      awayRoster += offensePlayers
    end
  end

  # re-score the game to check if I got home and away right
  homeScore = 0
  awayScore = 0

  points.each do |point|
    next unless point["events"].last["type"] == "POINT"
    scorer = point["events"].last["firstActor"]
    home_scored = homeRoster.include?(scorer)
    if home_scored
      homeScore += 1
    else
      awayScore += 1
    end
  end

  if (homeRoster & awayRoster).size > 0
    raise "roster overlap"
  end

  return {
    homeRoster: homeRoster.to_a,
    homeScore: homeScore,
    awayRoster: awayRoster.to_a,
    awayScore: awayScore
  }
end

def build_game_json(week:, game_num:, home_row:, away_row:, event_string:)
  homeTeam = home_row[0]
  homeScore = home_row[1]

  awayTeam = away_row[0]
  awayScore = away_row[1]

  event_string = event_string.map { |s| s.compact }.reject { |r| r.empty? }

  points = rewrite_event_string(event_string)

  data = build_rosters(points)

  score = "#{homeScore} - #{awayScore}"
  calcScore = "#{data[:homeScore]} - #{data[:awayScore]}"
  revScore = "#{data[:awayScore]} - #{data[:homeScore]}"

  if score != calcScore
    if score == revScore
      tmpRoster = data[:homeRoster]
      data[:homeRoster] = data[:awayRoster]
      data[:awayRoster] = tmpRoster
    else
      # yay the score calc always matches!!
      # except for 1 instance of bad data
      raise "score mismatch" unless week == 4 && game_num == 1
    end
  end

  return {
    "league_id" => LEAGUE_ID,
    "week" => week,
    "homeTeam" => homeTeam,
    "homeScore" => homeScore,
    "homeRoster" => data[:homeRoster],
    "awayTeam" => awayTeam,
    "awayScore" => awayScore,
    "awayRoster" => data[:awayRoster],
    "points" => points,
  }
end

def transform(data_directory)
  csv_files = Dir.glob("#{data_directory}/*.csv")

  csv_files.sort.each do |file|
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

    # Each Game in the CSV
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

      game_num = j + 1

      game = build_game_json(
        week: week,
        game_num: game_num,
        home_row: csv[home_row_idx],
        away_row: csv[away_row_idx],
        event_string: csv[game_string_start..game_string_end]
      )

      File.write("#{data_directory}/week#{week}_game#{game_num}.json", JSON.pretty_generate(game) + "\n")
    end
  end
end

if ARGV[0] == "undo"
  `find #{data_directory} -name "*.json" -type f|xargs rm -f `
else
  transform(data_directory)
end
