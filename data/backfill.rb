require 'json'
require 'set'
require 'pp'
require 'byebug'

def data_directory
  'data/test'
end

def each_file
  Dir.glob("#{data_directory}/*.json").each do |file|
    yield file
  end
end

# use this function to print all the team names
# used over the season. Look at the names to develop
# a set of rules to backfill the IDs. Exact team match or a
# regex for the GM name in brackets are good first rules.
def print_all_team_names
  teams = Set.new

  each_file do |file|
    data = JSON.parse(File.read(file))

    teams.add data["homeTeam"]
    teams.add data["awayTeam"]
  end

  pp teams
end

def team_id_lookup
  {
    'data/ocua_18-19/session2' => [
      { rules: [/Wu-hoo!/, /Heat/], zid: 11060 },
      { rules: [/Shantay, You Stay/, /Laura/], zid: 11059 },
      { rules: [/TooTrains TootFurious/, /Railroad Ties: The Last Spike/, /2Toot/], zid: 11056 },
      { rules: [/Pad Tie/, /Nat/], zid: 11058 },
      { rules: [/Tie Hard/, /Travis/], zid: 11055 },
      { rules: [/#TimesUp/, /Two ties don't make a right/, /Kindha/], zid: 11061 },
      { rules: [/Higher Seed/, /Bossy/], zid: 11052 },
      { rules: [/S2: E12 Nowhere to Hyde/, /Ra-Ro/], zid: 11053 },
      { rules: [/Tied Pod Challenge/, /Jon/], zid: 11054 },
      { rules: [/Even/, /Adam/], zid: 11057 },
    ],
    'data/test' => [
      { rules: [/Betty White/], zid: 1 },
      { rules: [/Katy Parity/], zid: 2 },
      { rules: [/lumleysexuals/], zid: 3 },
      { rules: [/Soho/], zid: 4 },
      { rules: [/Kells Angels Bicycle Club/], zid: 5 },
      { rules: [/99 Problems/], zid: 6 },
      { rules: [/Nautical Disaster - Man Overboard!/], zid: 7 },
      { rules: [/Attack/], zid: 8 },
      { rules: [/Huck and Hope School of Handling/], zid: 9 },
      { rules: [/Ultra Tide: Don an unsullied hue/], zid: 10 },
    ]
  }[data_directory]
end

def rollback
  puts "error during backfill. reverting changes"
  `git checkout #{data_directory}`
end

def get_team_id(team_name)
  lookup = team_id_lookup.detect do |t|
    t[:rules].any? { |r| r.match(team_name) }
  end

  raise "No transform rule matched: '#{team_name}'" if lookup.nil?

  lookup[:zid]
end

def backfill
  each_file do |file|
    data = JSON.parse(File.read(file))

    home_name = data["homeTeam"]
    away_name = data["awayTeam"]

    home_id = get_team_id(home_name)
    away_id = get_team_id(away_name)

    data["homeTeam"] = {
      name: home_name,
      id: home_id
    }

    data["awayTeam"] = {
      name: away_name,
      id: away_id
    }

    File.write(file, JSON.pretty_generate(data) + "\n")
  end

rescue => e
  puts e.inspect
  rollback
end


# print_all_team_names
backfill
