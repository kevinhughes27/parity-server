# This script transforms the 2014-2015 raw csv data into the modern format
# as part of the transform it performs a few sanity checks:
#
# * I enforce 0 overlap between the parsed rosters to try and catch roster
#   parsing bugs or inconsistencies in the original data
#
# * I re-calculate the score from the modern data and newly parsed rosters
#   and confirm this score matches the recorded score in the original CSV
#
# The transformed data is then uploaded, stats are calculated using the current
# server then we can validate the results against the original stats csv files.
#
# Note that in 2014-2015 we did not record who was on the field for O/D plus minus
# I was able to parse partial results for this but if a player produce an event
# there is no way to know for sure if they were on.

require 'csv'
require 'set'
require 'json'
require 'byebug'

LEAGUE_ID = 2
data_directory = 'data/ocua_14-15'
validation_dir = 'validation/ocua_14-15'

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
    left_is_offense = nil

    leftPlayers = Set.new
    rightPlayers = Set.new
    event_string = []

    stat_keywords = [
      "Throw Away",
      "POINT",
      "Drop",
      "D",
      "Pass",
      "Sides",
      "Switch"
    ]

    point_string.each_with_index do |line, idx|
      line = line.compact
      event_string << line

      if line[0] == "Pull"
        next_line = point_string[idx+1]
        next_direction = next_line.compact[1] == ">>>>>>" ? "left" : "right"

        puller = line[1]
        if next_direction == "left"
          rightPlayers.add puller
        else
          leftPlayers.add puller
        end

      elsif line[0] == "Direction"
        direction = line[1] == ">>>>>>" ? "left" : "right"

      else
        players = line.reject { |w| stat_keywords.include?(w) }

        if direction == "left"
          leftPlayers += players.to_set
        else
          rightPlayers += players.to_set
        end

        # there should be no overlap
        if (leftPlayers & rightPlayers).size >= 1
          byebug
        end
      end

      if left_is_offense.nil?
        left_is_offense = direction == "left"
      end
    end

    offensePlayers = []
    defensePlayers = []

    if left_is_offense
      offensePlayers = leftPlayers.uniq
      defensePlayers = rightPlayers.uniq
    else
      offensePlayers = rightPlayers.uniq
      defensePlayers = leftPlayers.uniq
    end

    # useful for sanity check but subs can happen
    # there is one point with 10 people but it isn't
    # an overlap bug
    # if offensePlayers.size > 7
    #   byebug
    # end

    # if defensePlayers.size > 7
    #   byebug
    # end

    if (offensePlayers.to_set & defensePlayers.to_set).size >= 1
      byebug
    end

    # remove empty arrays from the event string
    event_string = event_string.reject { |ev| ev == [] }

    # only append valid event strings
    valid_event_string =
      event_string.size > 0 && event_string != [["Direction", ">>>>>>"]] && event_string != [["Direction", "<<<<<<"]]

    if valid_event_string
      points << {
        "offensePlayers" => offensePlayers,
        "defensePlayers" => defensePlayers,
        "event_string" => event_string
      }
    end
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

# load rosters from validation data
def load_rosters(validation_dir, week, homeTeam, awayTeam)
  homeRoster = []
  awayRoster = []

  raw_stats = File.read("#{validation_dir}/week#{week}.csv")
  stats = CSV.parse(raw_stats)
  stats_start = 15
  stats[stats_start..-1].each do |row|
    player = row[0]
    team = row[1]
    if team == homeTeam
      homeRoster << player
    elsif team == awayTeam
      awayRoster << player
    end
  end

  return homeRoster, awayRoster
end

# unlike 2015-2016 where we recorded who was on the field I can't bootstrap
# the rosters from the first 2 points reliably. Load the rosters from the stats sheet to
# start
def build_rosters(points, loadedHomeRoster, loadedAwayRoster, loadedHomeScore, loadedAwayScore)
  loadedHomeRoster = loadedHomeRoster.to_set
  loadedAwayRoster = loadedAwayRoster.to_set

  homeRoster = Set.new
  awayRoster = Set.new

  # rosters should be basically correct now
  # fill in against the rest of the game
  points.each do |point|
    offensePlayers = point["offensePlayers"].to_set
    defensePlayers = point["defensePlayers"].to_set

    home_roster_overlap = (loadedHomeRoster & offensePlayers).size
    away_roster_overlap = (loadedAwayRoster & offensePlayers).size

    home_is_offense = if home_roster_overlap >= 1 && away_roster_overlap == 0
      true
    elsif home_roster_overlap == 0 && away_roster_overlap >= 1
      false
    else
      # we know nothing. skip
      nil
    end

    next if home_is_offense.nil?

    if home_is_offense
      homeRoster += offensePlayers
      awayRoster += defensePlayers
    else
      homeRoster += defensePlayers
      awayRoster += offensePlayers
    end

    if (homeRoster & awayRoster).size > 0
      byebug
      raise "roster overlap"
    end
  end

  # re-score the game to check if I got home and away right
  homeScore = 0
  awayScore = 0

  points.each do |point|
    byebug if point["events"] == []
    next unless point["events"].last["type"] == "POINT"
    scorer = point["events"].last["firstActor"]
    home_scored = homeRoster.include?(scorer)
    if home_scored
      homeScore += 1
    else
      awayScore += 1
    end
  end

  score = "#{loadedHomeScore} - #{loadedAwayScore}"
  calcScore = "#{homeScore} - #{awayScore}"
  revScore = "#{awayScore} - #{homeScore}"

  if score != calcScore
    if score == revScore
      tmpRoster = homeRoster
      homeRoster = awayRoster
      awayRoster = tmpRoster
    else
      # yay the score calc always matches!!
      raise "score mismatch"
    end
  end

  return {
    homeRoster: homeRoster.to_a,
    homeScore: homeScore,
    awayRoster: awayRoster.to_a,
    awayScore: awayScore
  }
end

def transform(data_directory, validation_dir)
  csv_files = Dir.glob("#{data_directory}/*.csv")

  csv_files.sort.each do |file|
    week = file.split("week").last.gsub(".csv", "").to_i

    data = File.read(file)

    csv = CSV.parse(data)

    game_name_rows = []
    csv.each_with_index do |row, idx|
      row = row.compact
      if row[0]
        game_name_rows << idx if row[0].include?("vs")
      end
    end

    # Each Game in the CSV
    game_name_rows.each_with_index do |idx, j|
      game_name = csv[idx].compact[0]
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

      puts "week#{week}_game#{game_num}"
      points = rewrite_event_string(csv[game_start..game_end])

      homeRoster, awayRoster = load_rosters(validation_dir, week, homeTeam, awayTeam)
      data = build_rosters(points, homeRoster, awayRoster, homeScore, awayScore)

      game = {
        "league_id" => LEAGUE_ID,
        "week" => week,
        "homeTeam" => homeTeam,
        "homeScore" => homeScore,
        "homeRoster" => data[:homeRoster],
        "awayTeam" => awayTeam,
        "awayScore" => awayScore,
        "awayRoster" => data[:awayRoster],
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

        puts "week#{week}_game#{game_num}"
        points = rewrite_event_string(csv[game_start..game_end])

        homeRoster, awayRoster = load_rosters(validation_dir, week, homeTeam, awayTeam)
        data = build_rosters(points, homeRoster, awayRoster, homeScore, awayScore)

        game = {
          "league_id" => LEAGUE_ID,
          "week" => week,
          "homeTeam" => homeTeam,
          "homeScore" => homeScore,
          "homeRoster" => data[:homeRoster],
          "awayTeam" => awayTeam,
          "awayScore" => awayScore,
          "awayRoster" => data[:awayRoster],
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
  transform(data_directory, validation_dir)
end
