require 'json'
require 'set'
require 'pp'
require 'byebug'


def backfill
  data_directory = 'data/ocua_19-20/session1'

  Dir.glob("#{data_directory}/*.json").each do |file|
    data = JSON.parse(File.read(file))
    File.write(file, JSON.pretty_generate(data) + "\n")
  end
end


backfill
