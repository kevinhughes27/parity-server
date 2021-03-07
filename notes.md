Parity App Performance

There is a performance issue with the StatsTable.

This issue cascades and affects the ability to use the filter dialog multiple times (the second time you open the modal takes forever. sometimes crashes)

I know it is the table because the same issue does not happen on the leaderboards page

I don't understand why this problem manifests this way. Why does opening the filter modal re-draw the table?
  * I tried re-working hooks plus children and it didn't seem to help. but it might be better code
  * I keep thinking it might be related how the component is defined but that doesn't make sense
  * It could be the css. give that a quick try
