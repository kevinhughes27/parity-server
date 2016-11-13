# Globals
window.stats_ur
window.salary_url
window.trades_url

window.statsData
window.salaryCap
window.salaryFloor

window.teamNames
window.teamPlayers  # global var containing the players of the current team
window.otherPlayers # global var of all the players not on the current team
window.savedTrades  # global var holding all the trades

window.onload = ->
  window.stats_url  = 'https://script.google.com/macros/s/AKfycbwMUwbXgU-bbMrQ8SCLBloLV9EPefKn6ira8QlsAEyKNouXCEw/exec?resource=Stats'
  window.salary_url = 'https://script.google.com/macros/s/AKfycbwMUwbXgU-bbMrQ8SCLBloLV9EPefKn6ira8QlsAEyKNouXCEw/exec?resource=Salaries'
  window.trades_url = 'https://script.google.com/macros/s/AKfycbwMUwbXgU-bbMrQ8SCLBloLV9EPefKn6ira8QlsAEyKNouXCEw/exec?resource=Trades'

  # this will break the compare link if the player uses a nickname
  if getURLParameter('gm') == '1'
    window.stats_url += '&realnames=YES'
    window.trades_url += '&realnames=YES'

  window.pieChart = new PieChart()
  window.barChart = new BarChart()

  load()

getURLParameter = (name) ->
  query = window.location.search.substring(1)
  raw_vars = query.split("&")
  for v in raw_vars
    [key, val] = v.split("=")
    return decodeURIComponent(val) if key == name

# kicks off the loading steps, a bunch of data is fetched and initialized.
# these calls are chained so that one happens after the other
load = ->
  fetchStats()

fetchStats = ->
  $.ajax
    url: stats_url
    type: "GET"
    dataType: "jsonp"
    success: (data) ->
      initStats(data)

initStats = (data) ->
  window.statsData = data.slice(1)
  transformData()
  fetchSalaries()

transformData = ->
  nameIndex = 0
  teamNameIndex = 31
  salaryIndex = 29
  window.statsData.forEach (player) ->
    player.name = player[nameIndex]
    player.team = player[teamNameIndex]
    player.salary = player[salaryIndex]

fetchSalaries = ->
  $.ajax
    url: salary_url
    type: "GET"
    dataType: "jsonp"
    success: (data) ->
      initSalaries(data)

initSalaries = (data) ->
  window.salaryCap = data[2][1]
  window.salaryFloor = data[2][2]
  initApp()

initApp = ->
  window.teamNames = _.uniq(_.pluck(window.statsData, "team"))
  window.teamNames = _.reject(window.teamNames, (teamName) -> teamName is "Substitute" or teamName is "(sub inc)" or teamName is "Injury")
  window.teamNames = sortTeams(window.teamNames)

  window.savedTrades = []

  # toggle loading state
  $("div#app > div#loading").hide()
  $("div#app > div#loaded").show()

  initTeamDropdown window.teamNames
  reRenderForTeam window.teamNames[0]

  window.barChart.graph()

# sorts teams by alternating name length (looks best for the bar chart)
sortTeams = (teamNames) ->
  lengthSortedNames = _.sortBy(teamNames, (name) -> name.length)
  sortedNames = []
  while lengthSortedNames.length > 0
    sortedNames.push lengthSortedNames.shift()
    sortedNames.push lengthSortedNames.pop()
  _.compact(sortedNames)

playersFromTeam = (teamName) ->
  _.where(window.statsData, team: teamName)

playersNotFromTeam = (teamName) ->
  otherTeams = _.reject(window.teamNames, (name) -> name is teamName)
  _.filter(window.statsData, (player) -> _.contains(otherTeams, player.team) )

sortPlayersBySalary = (players) ->
  _.sortBy(players, (player) -> player.salary)

salaryString = (salary) ->
  "$ " + salary.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")

initTeamDropdown = (teamNames) ->
  node = $("#teamDropdown > ul.dropdown-menu")
  teamNames.reverse().forEach (teamName) ->
    li = "<li> <a href='#'>#{teamName}</a> </li>"
    node.append li

  # Team Changed Handler
  $("#teamDropdown li a").click (event) =>
    event.preventDefault()
    teamName = $(event.target).text().trim()
    if window.savedTrades.length > 0
      if confirm("Changing teams will clear trades") is true
        window.savedTrades = []
        renderTrades(window.savedTrades)
        reRenderForTeam(teamName)
    else
      reRenderForTeam(teamName)

# Trade Handler
$("#tradeForm").on "submit", (event) ->
  event.preventDefault()
  node = $(event.target)

  tradedPlayerName = node.find("#tradedPlayer").val()
  receivedPlayerName = node.find("#receivedPlayer").val()

  tradedPlayer = _.find(window.teamPlayers, (player) -> player.name is tradedPlayerName)
  receivedPlayer = _.find(window.otherPlayers, (player) -> player.name is receivedPlayerName)

  if tradedPlayer and receivedPlayer
    trade = {tradedPlayer: tradedPlayer, receivedPlayer: receivedPlayer}
    savedTrades.push trade
    applyTrade(trade)
    event.target.reset()
    _.defer(tradeUpdate)
  else
    alert "Invalid Trade!"

# update compare link handlers
$("select#tradedPlayer").change (event) ->
  tradeUpdate(event)

$("input#receivedPlayer").on "typeahead:closed", (event) ->
  tradeUpdate(event)

$("input#receivedPlayer").on "blur", (event) ->
  tradeUpdate(event)

tradeUpdate = (event) ->
  tradedPlayerName = $("#tradedPlayer").val()
  receivedPlayerName = $("#receivedPlayer").val()

  url = "https://player-comparer.5apps.com/?playerA=#{tradedPlayerName}&playerB=#{receivedPlayerName}"
  $("a#compare").attr "href", url

  tradedPlayer = _.find(window.teamPlayers, (player) -> player.name is tradedPlayerName)
  receivedPlayer = _.find(window.otherPlayers, (player) -> player.name is receivedPlayerName)

  if tradedPlayer and receivedPlayer
    trade = {tradedPlayer: tradedPlayer, receivedPlayer: receivedPlayer}
    window.barChart.graph(trade)

# typeahead.js matcher
# from twitter example
playerNameMatcher = ->
  findMatches = (q, cb) ->
    matches = []
    substrRegex = new RegExp(q, "i")

    for name in _.pluck(window.otherPlayers, 'name')
      matches.push value: name if substrRegex.test(name)

    cb matches
    return

$('input.typeahead').typeahead({
  hint: true
  highlight: true
  minLength: 1
}
{
  name: 'players'
  displayKey: 'value'
  source: playerNameMatcher()
})

reRenderForTeam = (teamName) ->
  $("#teamDropdown #btn-text").text teamName

  window.teamPlayers = playersFromTeam(teamName)
  window.teamPlayers = sortPlayersBySalary(window.teamPlayers)

  renderTradeDropdown window.teamPlayers

  window.otherPlayers = playersNotFromTeam(teamName)

  window.pieChart.graph window.teamPlayers
  renderPlayerTable window.teamPlayers

renderTradeDropdown = (players) ->
  node = $("select#tradedPlayer")
  $(node).empty()
  players.forEach (player) ->
    opt = "<option>#{player.name}</option>"
    node.append opt

renderPlayerTable = (players) ->
  node = $("#players-table > tbody")

  # clear data in the table
  node.find("tr").remove()

  teamSalary = 0
  players.reverse().forEach (player, index) ->
    teamSalary += player.salary
    tr = """
    <tr>
      <td>#{index + 1}</td>
      <td>#{player.name}</td>
      <td>#{salaryString(player.salary)}</td>
    </tr>
    """
    node.append(tr)

  tr =''
  if teamSalary < window.salaryCap
    tr = "<tr class='underCap'><td></td> <td>Total:</td><td>#{salaryString(teamSalary)}</td></tr>"
  else
    tr = "<tr class='overCap'><td></td> <td>Total:</td><td>#{salaryString(teamSalary)}</td></tr>"

  node.append(tr)

renderTrades = (trades) ->
  node = $("#trades")

  # clear old data
  $(node).empty()

  # the underscore _.max finds the longest string and puts it in the option
  # this is a hack to keep the size the same
  # it breaks if the player with the longest name is traded.
  savedTrades.forEach (trade, index) ->
    undo = "<button class='btn btn-sm btn-default' id='undoTrade'>Undo</button>"
    html = """
    <div class='form-inline'>
      <div class='form-group'>
        <select class='form-control input-sm' disabled='true'>
          <option>#{trade.tradedPlayer.name}</option>
          <option>#{_.max(teamPlayers, (player) -> player.name.length).name}</option>
        </select>
      </div>
      <span>  &nbsp;  --------&gt;  &nbsp;  </span>
      <div class='form-group'>
        <input type='text' class='form-control input-sm' disabled='true' value='#{trade.receivedPlayer.name}'>
      </div>
      #{((if index is savedTrades.length - 1 then undo else ""))}
    </div>
    <br>
    """
    node.append html

  # Undo Trade Handler
  $("#undoTrade").click (event) ->
    trade = window.savedTrades.pop()
    revertedTrade = {tradedPlayer: trade.receivedPlayer, receivedPlayer: trade.tradedPlayer}
    applyTrade revertedTrade

applyTrade = (trade) ->
  tradingTeam = trade.tradedPlayer.team
  trade.tradedPlayer.team = trade.receivedPlayer.team
  trade.receivedPlayer.team = tradingTeam

  window.barChart.graph()
  reRenderForTeam tradingTeam
  renderTrades window.savedTrades

class PieChart
  constructor: ->
    @width = 920
    @height = 480
    @radius = Math.min(@width, @height) / 2

    @arc = d3.svg.arc()
        .outerRadius(@radius - 10)
        .innerRadius(0)

    @pie = d3.layout.pie()
        .sort(null)
        .value( (d) -> d.salary )

    @chart = d3.select(".pie-chart")
        .attr("width", @width)
        .attr("height", @height)
      .append("g")
        .attr("transform", "translate(" + @width / 2 + "," + @height / 2 + ")")

  graph: (players) ->
    data = []
    players.forEach (player, index) ->
      data.push
        name: player.name
        pos: index
        salary: player.salary

    if @chart.selectAll("*")[0].length == 0
      @_initPlot(data)
    else
      @_updatePlot(data)

  _initPlot: (data) ->
    g = @chart.selectAll(".arc")
        .data(@pie(data))
      .enter().append("g")
        .attr("class", "arc")

    g.append("path")
        .attr("d", @arc)
        .attr("class", (d) -> "green-" + d.data.pos)
        .each( (d) -> this._current = d ) # store the initial angles

    g.append("text")
      .attr("transform", (d) =>
        c = @arc.centroid(d)
        x = c[0]
        y = c[1]
        h = Math.sqrt(x * x + y * y)
        labelr = @radius - 60
        "translate(" + (x / h * labelr) + "," + (y / h * labelr) + ")")
      .attr("dy", ".35em").style("text-anchor", "middle")
      .text( (d) -> d.data.name )

  _arcTween: (a) ->
    # Store the displayed angles in _current.
    # Then, interpolate from _current to the new angles.
    # During the transition, _current is updated in-place by d3.interpolate.
    i = d3.interpolate(this._current, a)
    this._current = i(0)
    (t) ->
      window.pieChart.arc(i(t))

  _updatePlot: (data) ->
    @chart.selectAll("text")
      .data(@pie(data))
      .transition()
        .duration(10)
        .attr("transform", (d) =>
          c = @arc.centroid(d)
          x = c[0]
          y = c[1]
          h = Math.sqrt(x * x + y * y)
          labelr = @radius - 60
          "translate(" + (x / h * labelr) + "," + (y / h * labelr) + ")")
        .text( (d) -> d.data.name )

    @chart.selectAll("path")
      .data(@pie(data))
      .transition()
      .duration(10)
      .attrTween("d", @_arcTween)

class BarChart
  constructor: ->
    @margin = {top: 20, right: 20, bottom: 30, left: 40}
    @width = 1100 - @margin.left - @margin.right
    @height = 500 - @margin.top - @margin.bottom

    @x = d3.scale.ordinal()
        .rangeRoundBands([0, @width], .1)

    @y = d3.scale.linear()
        .rangeRound([@height, 0])

    @xAxis = d3.svg.axis()
        .scale(@x)
        .orient("bottom")

    @yAxis = d3.svg.axis()
        .scale(@y)
        .orient("left")
        .tickFormat(d3.format(".2s"))

    @chart = d3.select(".chart")
        .attr("width", @width + @margin.left + @margin.right)
        .attr("height", @height + @margin.top + @margin.bottom)
      .append("g")
        .attr("transform", "translate(" + @margin.left + "," + @margin.top + ")")

  graph: (trade) ->
    data = []
    for teamName in window.teamNames
      players = playersFromTeam(teamName)
      @_performTrade(players, trade) if trade
      players = sortPlayersBySalary(players)

      salaries = []
      y0 = 0
      players.forEach (player, index) ->
        salaries.push {name: player.name, salary: player.salary, pos: index, y0: y0, y1: y0 += player.salary}

      data.push {team: teamName, salaries: salaries, total: salaries[salaries.length - 1].y1}

    @x.domain data.map( (d) -> d.team )
    @y.domain [0, d3.max(data, (d) -> d.total)]

    if @chart.selectAll("*")[0].length == 0
      @_initPlot(data)
    else
      @_updatePlot(data)

  _performTrade: (players, trade) ->
    for player, index in players
      if player is trade.tradedPlayer
        players[index] = trade.receivedPlayer
      else if player is trade.receivedPlayer
        players[index] = trade.tradedPlayer

  _initPlot: (data) ->
    @chart.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + @height + ")")
      .call @xAxis

    @chart.append("g")
      .attr("class", "y axis")
      .call @yAxis

    # salary cap line
    @chart.append("svg:line")
      .attr("x1", 0)
      .attr("x2", @width - 20)
      .attr("y1", @y(window.salaryCap))
      .attr("y2", @y(window.salaryCap))
      .style("stroke", "#000")
      .style("fill", "none")
      .style("stroke-width", 1)
      .style("shape-rendering", "crispEdges")

    # salary cap line
    @chart.append("svg:line")
      .attr("x1", 0)
      .attr("x2", @width - 20)
      .attr("y1", @y(window.salaryFloor))
      .attr("y2", @y(window.salaryFloor))
      .style("stroke", "#238B45")
      .style("fill", "none")
      .style("stroke-width", 1)
      .style "shape-rendering", "crispEdges"

    # tooltip
    @tip = d3.tip()
      .attr("class", "d3-tip").offset([-10, 0])
      .html((d) ->
        "<p>#{d.name}</p> <p>#{salaryString(d.salary)}</p>"
      )

    @chart.call(@tip)

    team = @chart.selectAll(".team")
        .data(data)
      .enter()
        .append("g")
        .attr("class", "g")
        .attr("transform", (d) => "translate(" + @x(d.team) + ",0)")

    team.selectAll("rect")
        .data((d) -> d.salaries)
      .enter()
        .append("rect")
        .attr("transform", (d) => "translate(" + @x.rangeBand() * 0.25 + ",0)")
        .attr("width", @x.rangeBand() * 0.5)
        .attr("class", (d) ->
          if d.y1 > window.salaryCap
            "yellow-11"
          else
            "green-" + d.pos
        )
        .attr("y", @height)
        .attr("height", 0)
        .on("mouseover", @tip.show)
        .on("mouseout", @tip.hide)
      .transition(300)
        .attr("y", (d) => @y(d.y1) )
        .attr("height", (d) => @y(d.y0) - @y(d.y1) )

  _updatePlot: (data) ->
    flatData = []
    data.forEach (d) ->
      flatData = flatData.concat(d.salaries)

    @chart.selectAll("rect")
      .data(flatData)
      .transition(300)
        .attr("y", (d) => @y(d.y1) )
        .attr("height", (d) => @y(d.y0) - @y(d.y1) )
        .attr("class", (d) ->
          if d.y1 > window.salaryCap
            "yellow-11"
          else
            "green-" + d.pos
        )
