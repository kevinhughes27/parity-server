require "byebug"
require "net/http"
require "json"
require "uri"
require "csv"

LEAGUE_ID = 3
validation_dir = 'data/validation/ocua_15-16'

def load_validation_data(validation_dir, week)
  data_string = File.read("#{validation_dir}/week#{week}.csv")

  # remove front matter
  lines = data_string.split("\n")

  stats_start = lines.find_index do |line|
    line.include?("Player's Name")
  end

  lines = lines[stats_start..-1]
  csv = CSV.parse(lines.join("\n"), headers: true)

  # strip out male and female average rows
  csv = csv[2..-1]

  stats_hash = {}

  csv.each do |csv_row|
    # strip out players who don't actually have stats this week
    zero_line = csv_row[3..-9].all? { |s| s.to_i == 0}
    next if zero_line

    name = csv_row["Player's Name"]

    # the csvs are super fragile
    # if I save them in: vscode, vim, or libre office they are
    # no longer parseable in ruby...
    if week == 1
      stats_hash[name] = {
        "team" => csv_row["Current Team"],

        "goals" => csv_row["G"].to_i,
        "assists" => csv_row["A"].to_i,
        "catches" => csv_row["Catch"].to_i,
        "completions" => csv_row["Comp."].to_i,
        "d_blocks" => csv_row["D"].to_i,
        "drops" => csv_row["Drop"].to_i,
        "threw_drops" => csv_row["Threw Drop"].to_i,
        "throw_aways" => csv_row["TA"].to_i
      }
    else
      stats_hash[name] = {
        "team" => csv_row["Current Team"],

        "goals" => csv_row[" G"].to_i,
        "assists" => csv_row[" A"].to_i,
        "catches" => csv_row[" Catch"].to_i,
        "completions" => csv_row[" Comp."].to_i,
        "d_blocks" => csv_row[" D"].to_i,
        "drops" => csv_row[" Drop"].to_i,
        "threw_drops" => csv_row[" Threw Drop"].to_i,
        "throw_aways" => csv_row[" TA"].to_i
      }
    end
  end

  stats_hash
end

def fetch_data(league_id, week)
  host = "http://localhost:5000"
  uri = URI.parse("#{host}/api/#{league_id}/weeks/#{week}")
  http = Net::HTTP.new(uri.host, uri.port)
  response = http.request(Net::HTTP::Get.new(uri.request_uri))
  data = JSON.parse(response.body)
  data["stats"]
end


def compare_stat(data, validation, stat_name)
  errors = {}

  player_names = data.keys
  extra_players = []
  nicknames_found = []

  player_names.each do |player_name|
    stat = data[player_name][stat_name]

    expected_stat = if validation.has_key?(player_name)
      validation[player_name][stat_name]
    else
      # we didn't show stats for subs
      extra_players << player_name unless player_name.include?("S")
      nil
    end

    next if expected_stat.nil?

    if stat != expected_stat && expected_stat != "Substitute"
      puts "Player: #{player_name} #{stat} #{stat_name} expected: #{expected_stat}"
      errors[player_name] = {got: stat, expected: expected_stat}
    end
  end

  # I don't really care about extra data. It seems to be un-marked Subs.
  # if extra_players.size > 0
  #   puts "extra data players:\n#{extra_players.join("\n")}"
  #   puts ""
  # end

  expected_player_names = validation.keys
  missing_players = (expected_player_names - player_names - nicknames_found)
  if missing_players.size > 0
    puts "missing data players:\n#{missing_players.join("\n")}\n"
    puts ""
  end

  if errors.size > 0
    return {errors: errors}
  else
    return "100% match"
  end
end

N = 20
report = []

[*1..N].each do |week|
  puts "checking week #{week}"
  validation_data = load_validation_data(validation_dir, week)
  data = fetch_data(LEAGUE_ID, week)

  report << {
    week: week,
    team: compare_stat(data, validation_data, 'team'),

    goals: compare_stat(data, validation_data, 'goals'),
    assists: compare_stat(data, validation_data, 'assists'),
    d_blocks: compare_stat(data, validation_data, 'd_blocks'),
    drops: compare_stat(data, validation_data, 'drops'),
    threw_drops: compare_stat(data, validation_data, 'threw_drops'),
    throw_aways: compare_stat(data, validation_data, 'throw_aways'),

    catches: compare_stat(data, validation_data, 'catches'),
    completions: compare_stat(data, validation_data, 'completions'),
  }

  File.write("#{validation_dir}/report.json", JSON.pretty_generate(report) + "\n")
end
