#!/usr/bin/env ruby

require 'byebug'

def main
  each_file do |f|
    new_lines = []
    skip_lines = 0

    File.open(f) do |file|
      loop do
        break if not line = file.gets

        if on_field_line?(line)
          working_lines = [line]
          5.times { working_lines << file.gets }

          # add O only lines
          working_lines.each do |wl|
            sp = wl.split('\t')
            if sp[0].strip == 'O+'
              new_lines << "    \"1\\t#{sp[1]}\",\n"
            else
              new_lines << "    \"-1\\t#{sp[1]}\",\n"
            end
          end

          # add D only lines
          working_lines.each do |wl|
            sp = wl.split('\t')
            next if sp.size < 4

            if sp[2].strip == 'D+'
              new_lines << "    \"1\\t#{sp[3]}" # s3 already includes the "\n
            else
              new_lines << "    \"-1\\t#{sp[3]}"
            end
          end
        else
          new_lines << line
        end
      end

      File.write(file, new_lines.join)
    end
  end
end

def each_file
  Dir.glob('./test/files/*.json').each do |f|
    yield f
  end
end

def on_field_line?(line)
  line.start_with?('    "O+') || line.start_with?('    "O-')
end

main()
