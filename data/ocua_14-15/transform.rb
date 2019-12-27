require 'csv'
require 'set'
require 'json'
require 'byebug'

LEAGUE_ID = 2
data_directory = 'data/ocua_14-15'

def rewrite_event_string(game_string)
  # 1. Group the game_string by Point
  point_strings = []
  point_start_idx = 0

  game_string.each_with_index do |e, idx|
    if e[3] == "POINT"
      point_end_idx = idx
      point_string = game_string[point_start_idx..point_end_idx]
      point_strings << point_string
      point_start_idx = point_end_idx + 1
    end
  end

  ended_on_point = (point_start_idx + 1 >= game_string.length - 1)

  if !ended_on_point
    point_string = game_string[point_start_idx..-1]
    point_strings << point_string
  end

  # 2. Intermediate step. Parse into a cleaner event_string
  # and parse who was on the field
  points = []

  point_strings.each do |point_string|
    direction = nil
    left_is_offsense = nil

    leftPlayers = []
    rightPlayers = []
    event_string = []

    stat_keywords = [
      "Throw Away",
      "POINT",
      "Drop",
      "D",
      "Pass"
    ]

    point_string.each_with_index do |line, idx|
      line = line.compact
      event_string << line

      if line[0] == "Pull"
        next_line = point_string[idx+1]
        direction = next_line.compact[1] == ">>>>>>" ? "left" : "right"

      elsif line[0] == "Direction"
        direction = line[1] == "<<<<<<" ? "left" : "right"

      else
        players = line.reject { |w| stat_keywords.include?(w) }

        if direction == "left"
          leftPlayers += players
        else
          rightPlayers += players
        end
      end

      if left_is_offsense.nil?
        left_is_offsense = direction == "left"
      end
    end

    offensePlayers = []
    defensePlayers = []

    if left_is_offsense
      offensePlayers = leftPlayers.uniq
      defensePlayers = rightPlayers.uniq
    else
      offensePlayers = rightPlayers.uniq
      defensePlayers = leftPlayers.uniq
    end

    points << {
      "offensePlayers" => offensePlayers,
      "defensePlayers" => defensePlayers,
      "event_string" => event_string
    }
  end

  # 3. The data is now grouped by point shaped like this:
  # {
  #    offensePlayers: [],
  #    defensePlayers: [],
  #    event_string: []
  # }
  # offensePlayers and defensePlayers may not be complete, players
  # who never touched the disc won't be included and there is no
  # way to know who else was on the field if they didn't affect
  # any play.
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

      point["events"] = new_events
      point.delete("event_string")
    end
  end

  points
end

def transform(data_directory)
  csv_files = Dir.glob("#{data_directory}/*.csv")

  csv_files.sort.each do |file|
    week = file.split("week").last.gsub(".csv", "").to_i

    data = File.read(file)

    csv = CSV.parse(data)

    game_name_rows = []
    csv.each_with_index do |row, idx|
      row = row.compact
      if row[0]
        game_name_rows << idx if row[0].include?("vs") || row[0].include?("_VS_")
      end
    end

    # Each Game in the CSV
    game_name_rows.each_with_index do |idx, j|
      game_name = csv[idx].compact[0]
      game_name = game_name.gsub("vs.", "vs").gsub("_VS_", " vs ")
      homeTeam = game_name.split(" vs ").first
      awayTeam = game_name.split(" vs ").last

      score_row = csv[idx+3]
      homeScore = score_row[3]
      awayScore = score_row[4]

      game_start = idx + 5
      next_game_start = game_name_rows[j+1]
      game_end = if next_game_start.nil?
        -1
      else
        next_game_start - 2
      end

      game_num = j + 1

      points = rewrite_event_string(csv[game_start..game_end])

      homeRoster = []
      awayRoster = []

      game = {
        "league_id" => LEAGUE_ID,
        "week" => week,
        "homeTeam" => homeTeam,
        "homeScore" => homeScore,
        "homeRoster" => homeRoster,
        "awayTeam" => awayTeam,
        "awayScore" => awayScore,
        "awayRoster" => awayRoster,
        "points" => points
      }

      File.write("#{data_directory}/week#{week}_game#{game_num}.json", JSON.pretty_generate(game) + "\n")
    end

    # team row format wtf
    if game_name_rows == []
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

        homeTeam = csv[home_row_idx][0]
        homeScore = csv[home_row_idx][1]

        awayTeam = csv[away_row_idx][0]
        awayScore = csv[away_row_idx][1]

        game_start = team_row_nums[idx+1] + 1
        next_game_start = team_row_nums[idx+2]

        game_end = if next_game_start.nil?
          -1
        else
          next_game_start - 1
        end

        game_num = j + 1

        points = rewrite_event_string(csv[game_start..game_end])

        homeRoster = []
        awayRoster = []

        game = {
          "league_id" => LEAGUE_ID,
          "week" => week,
          "homeTeam" => homeTeam,
          "homeScore" => homeScore,
          "homeRoster" => homeRoster,
          "awayTeam" => awayTeam,
          "awayScore" => awayScore,
          "awayRoster" => awayRoster,
          "points" => points
        }

        File.write("#{data_directory}/week#{week}_game#{game_num}.json", JSON.pretty_generate(game) + "\n")
      end
    end
  end
end

if ARGV[0] == "undo"
  `find #{data_directory} -name "*.json" -type f|xargs rm -f `
else
  transform(data_directory)
end
