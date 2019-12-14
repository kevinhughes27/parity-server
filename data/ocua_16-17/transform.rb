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

    # bad events?
    # data["points"].each do |point|
    #   point["events"].each_with_index do |event, idx|
    #     missing_actor = event['firstActor'].nil?
    #     event['type'] = nil if missing_actor
    #   end
    # end
    # yes.
    # and in fact I don't think the new event model
    # was in use yet and can't be trusted

    # backfill teams to homeTeam
    home_team = data["teams"].keys[0]
    away_team = data["teams"].keys[1]

    home_roster = data["teams"][home_team]
    away_roster = data["teams"][away_team]

    data.delete("teams")
    data["homeTeam"] = home_team
    data["homeRoster"] = home_roster

    data["awayTeam"] = away_team
    data["awayRoster"] = away_roster

    # backfill score to homeScore
    # not sure why some games are missing scores
    if data["score"]
      home_score = data["score"][home_team]
      away_score = data["score"][away_team]

      data.delete("score")
      data["awayScore"] = away_score
      data["homeScore"] = home_score
    else
      # calculate score
      home_score = 0
      away_score = 0

      data["points"].each do |point|
        last_event = point["events"].last
        puts "last event is not point!" unless last_event["type"] == "POINT"

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
      rescue => e
        byebug
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
