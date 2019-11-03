require 'json'
require 'set'
require 'pp'
require 'byebug'


# these IDs are wrong now
def backfill
  leagues = [
    # { id: 1 },
    { id: 2, data_directory: 'data/ocua_18-19/session2' },
    { id: 3, data_directory: 'data/ocua_18-19/session1' },
    { id: 4, data_directory: 'data/ocua_17-18/session2' },
    { id: 5, data_directory: 'data/ocua_17-18/session1' },
    { id: 6, data_directory: 'data/ocua_16-17/session2' },
    { id: 7, data_directory: 'data/ocua_16-17/session1' },
  ]

  leagues.each do |league|
    league_id = league[:id]
    data_directory = league[:data_directory]

    Dir.glob("#{data_directory}/*.json").each do |file|
      data = JSON.parse(File.read(file))
      data.delete('league')
      data['league_id'] = league_id
      File.write(file, JSON.pretty_generate(data) + "\n")
    end
  end
end


backfill
