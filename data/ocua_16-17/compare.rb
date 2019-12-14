require "byebug"
require "net/http"
require "json"
require "uri"

first_game_id = 49

data_directory = 'data/ocua_16-17/session2_withstats'

def compare_stats(old_stat, new_stat, player, stat)
  if old_stat != new_stat
    puts "old data had #{old_stat} #{stat} for #{player}, got #{new_stat}"
  end
end

Dir.glob("#{data_directory}/*.json").sort.each_with_index do |file, idx|
  # puts "checking game: #{file}"

  uri = URI.parse("http://localhost:5000/api/5/games/#{first_game_id + idx}")
  http = Net::HTTP.new(uri.host, uri.port)
  response = http.request(Net::HTTP::Get.new(uri.request_uri))
  game = JSON.parse(response.body)
  data = JSON.parse(File.read(file))

  # make sure we have the right game.
  # they all match yay!
  raise "home team mismatch" unless game["homeTeam"] == data["teams"].keys[0]
  raise "away team mismatch" unless game["awayTeam"] == data["teams"].keys[1]

  # compare stats!
  game["stats"].keys.each do |player|
    new_stats = game["stats"][player]
    old_stats = data["stats"][player]

    compare_stats(old_stats["Goals"], new_stats["goals"], player, "goals")
    compare_stats(old_stats["Assists"], new_stats["assists"], player, "assists")
    compare_stats(old_stats["2nd Assist"], new_stats["second_assists"], player, "second_assists")

    # compare_stats(old_stats["Drops"], new_stats["drops"], player, "drops")
    # missing two drops because the game didn't end in a point so I chomped the end of the data

    # compare_stats(old_stats["ThrewDrop"], new_stats["threw_drops"], player, "threw_drops")
    compare_stats(old_stats["Throwaways"], new_stats["throw_aways"], player, "throw_aways")
  end

rescue => e
  byebug
end
