# Includes
$ = require('jquery')
_ = require('underscore')
d3 = require('d3')
d3tip = require('d3-tip')(d3)
typeahead = require('typeahead.js')
Tabletop = require('tabletop')

window.jQuery = $
bootstrap = require('bootstrap')

# Globals
window.statsData
window.playerNames


# TableTop
window.onload = ->
  ocua_spreadsheet_url = 'https://docs.google.com/spreadsheets/d/1dxxBgpZ_T5QdLxb6OvY9pH2xuUyNpM8yr5ncUjiGHqQ/pubhtml'
  Tabletop.init key: ocua_spreadsheet_url, callback: init, simpleSheet: false, prettyColumnNames: false


# PlayerComparer
init = (data) ->
  window.graph = new Graph()
  window.statsData = data
  setName = getURLParameter('set') || _.last(_.keys(window.statsData))
  window.playerNames = _.pluck(window.statsData[setName].elements, 'playersname')

  # toggle loading state
  $("div#app > div#loading").hide()
  $("div#app > div#loaded").show()

  initDataDropdown()
  $('#dataDropdown #btn-text').text(setName)
  reRender()

initDataDropdown = ->
  node = $('#dataDropdown > ul.dropdown-menu')

  dataSetNames = _.keys(window.statsData)
  for name in dataSetNames
    li = "\
      <li>\
        <a href='#'>\
        " + name + "\
        </a>\
      </li>\
    "
    node.append(li)

  # Data Set Changed Handler
  $("#dataDropdown li a").click (event) ->
    setName = $(event.target).text().trim()
    $('#dataDropdown #btn-text').text(setName)
    reRender()
    event.preventDefault()

# reRender from scratch or on dataSet change
reRender = ->
  setName = $('#dataDropdown #btn-text').text()

  # get url params if any
  playerAName = getURLParameter('playerA') || 'Male Average'
  playerBName = getURLParameter('playerB') || 'Female Average'

  # get the players
  playerAData = _.find(window.statsData[setName].elements, (player) -> player.playersname == playerAName)
  playerBData = _.find(window.statsData[setName].elements, (player) -> player.playersname == playerBName)

  playerA =
    name: playerAData.playersname
    stats: transformPlayerData(playerAData)

  playerB =
    name: playerBData.playersname
    stats: transformPlayerData(playerBData)

  # graph and set the input state
  window.graph.graphPlayers(playerA, playerB)
  appPushState(setName, playerA, playerB)
  $('input#playerA').typeahead('val', playerA.name)
  $('input#playerB').typeahead('val', playerB.name)

getURLParameter = (name) ->
  query = window.location.search.substring(1)
  raw_vars = query.split("&")
  for v in raw_vars
    [key, val] = v.split("=")
    return decodeURIComponent(val) if key == name

# typeahead.js matcher
# from twitter example
playerNameMatcher = ->
  findMatches = (q, cb) ->
    matches = []
    substrRegex = new RegExp(q, "i")

    for name in window.playerNames
      matches.push value: name if substrRegex.test(name)

    cb matches
    return

$("input.typeahead").on "focus", (event) ->
  $(event.target).val('')

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

$("input.typeahead").on "typeahead:closed", (event) ->
  updatePlayerEvent(event)

$("input.typeahead").on "blur", (event) ->
  updatePlayerEvent(event)

# Update the graph and state when a player input is changed
updatePlayerEvent = (event) ->
  setName = $('#dataDropdown #btn-text').text()

  playerAName = $("input#playerA").val()
  playerAData = _.find(window.statsData[setName].elements, (player) -> player.playersname == playerAName)


  playerBName = $("input#playerB").val()
  playerBData = _.find(window.statsData[setName].elements, (player) -> player.playersname == playerBName)

  if playerAData && playerBData
    playerA =
      name: playerAName
      stats: transformPlayerData(playerAData)

    playerB =
      name: playerBName
      stats: transformPlayerData(playerBData)

    appPushState(setName, playerA, playerB)
    window.graph.graphPlayers(playerA, playerB)


appPushState = (setName, playerA, playerB) ->
  url = window.location.protocol
  url += "//"
  url += window.location.host
  url += window.location.pathname
  url += "?set=" + setName + "&playerA=" + playerA.name + "&playerB=" + playerB.name;

  history.pushState(null, '', url)

 # Transforms the data from a spreadsheet row into
 # a useable JS object for plotting
transformPercent = (str) -> str.substring(0, str.length - 1) / 10.0
transformSalary = (str) -> str.replace(/\D/g,'') / 50000.0
transformPlayerData = (data) ->
  [{name: "G", value: +data.g},
   {name: "A", value: +data.a},
   {name: "2A", value: +data.a_2},
   {name: "D", value: +data.d},
   {name: "Comp.", value: +data['comp.']},
   {name: "TA", value: +data.ta},
   {name: "TD", value: +data.threwdrop},
   {name: "Catch", value: +data.catch},
   {name: "Drop", value: +data.drop},
   {name: "Pick ups", value: +data['pick-up']},
   {name: "Callahan", value: +data.callahan},
   {name: "O+", value: +data['o']},
   {name: "O-", value: +data['o-']},
   {name: "D+", value: +data.d_2},
   {name: "D-", value: +data['d-']},
   {name: "T %", value: transformPercent(data.t)},
   {name: "C %", value: transformPercent(data.c)},
   {name: "Salary", value: transformSalary(data.previous)},
   {name: "New Salary", value: transformSalary(data.nextweekssalary)}]

# Transforms the data the plotted JS object
# into a readable form for the rect tooltip
untransformPlayerData = (d) ->
  name = {
    "G": "Goals"
    "A": "Assists"
    "2A": "2nd Assists"
    "D": "Defenses"
    "Comp.": "Completions"
    "TA": "Throw Aways"
    "TD": "Threw Drops"
    "Catch": "Catches"
    "Drop": "Drops"
    "Pick ups": "Pick ups"
    "Callahan": "Callahan"
    "O+": "O+"
    "O-": "O-"
    "D+": "D+"
    "D-": "D-"
    "T %": "Throwing"
    "C %": "Catching"
    "Salary": "Salary"
    "New Salary": "New Salary"
  }[d.name]

  value = d.value
  value = (value*10) + '%' if(d.name == "Throwing %" || d.name == "Catching %")
  value =  '$' + (value*50000.0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") if(d.name == "Salary" || d.name == "New Salary")

  return {name: name, value: value}

class Graph

  constructor: ->
    # Chart Config
    @margin = {top: 20, right: 30, bottom: 30, left: 40}
    @width = 1080 - @margin.left - @margin.right
    @height = 500 - @margin.top - @margin.bottom

    @x0 = d3.scale.ordinal()
        .rangeRoundBands([0, @width], .1)

    @x1 = d3.scale.ordinal()

    @y = d3.scale.linear()
        .range([@height, 0])

    @klass = d3.scale.ordinal()
        .range(["playerA", "playerB"])

    @xAxis = d3.svg.axis()
        .scale(@x0)
        .orient("bottom")

    @yAxis = d3.svg.axis()
        .scale(@y)
        .orient("left")

    @chart = d3.select(".chart")
        .attr("width", @width + @margin.left + @margin.right)
        .attr("height", @height + @margin.top + @margin.bottom)
      .append("g")
        .attr("transform", "translate(" + @margin.left + "," + @margin.top + ")")

  graphPlayers: (playerA, playerB) ->
    if @chart.selectAll('*')[0].length == 0
      @_initGraphPlayers(playerA, playerB)
    else
      @_updateGraphPlayers(playerA, playerB)

  _initGraphPlayers: (playerA, playerB) ->
    # assemble data
    data = []
    i = 0
    while i  < playerA.stats.length
      stat = playerA.stats[i].name
      playerAStat = playerA.stats[i].value
      playerBStat = playerB.stats[i].value

      data.push({name: stat, playerA: playerAStat, playerB: playerBStat })
      i++

    # scale
    @y.domain([0, d3.max(data, (d) -> Math.max(d.playerA, d.playerB) )])
    @x0.domain(data.map( (d) -> d.name ))
    @x1.domain(['playerA', 'playerB']).rangeRoundBands([0, @x0.rangeBand()])

    # create the x axis
    @chart.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + @height + ")")
        .call(@xAxis)

    # create the y axis
    @chart.append("g")
        .attr("class", "y axis")
        .call(@yAxis)

    # tooltip
    @tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html( (d) ->
           ud = untransformPlayerData(d)
           "<span class='#{d.player}'> #{ud.name}: #{ud.value}</span>"
         )

    @chart.call(@tip)

    # create the rectangles for each stat
    stats = @chart.selectAll(".stat")
      .data(data)
      .enter().append("g")
        .attr("class", "g")
        .attr("transform", (d) => "translate(" + @x0(d.name) + ",0)" )

    # create the rectangles for each player in each stat
    stats.selectAll("rect")
        .data( (d) -> [{player: 'playerA', name: d.name, value: d.playerA}, {player: 'playerB', name: d.name, value: d.playerB}] )
      .enter().append("rect")
        .attr("class", (d) => @klass(d.player) )
        .attr("width", @x1.rangeBand())
        .attr("x", (d) => @x1(d.player) )
        .attr("y", @height)
        .attr("height", 0)
        .on('mouseover', @tip.show)
        .on('mouseout', @tip.hide)
      .transition()
        .duration(200)
        .attr("y", (d) => @y(d.value) )
        .attr("height", (d) => @height - @y(d.value) )

  _updateGraphPlayers: (playerA, playerB) ->
    # assemble data
    data = []
    i = 0
    while i < playerA.stats.length
      stat = playerA.stats[i].name
      playerAStat = playerA.stats[i].value
      playerBStat = playerB.stats[i].value

      data.push({name: stat, player: 'playerA', value: playerAStat})
      data.push({name: stat, player: 'playerB', value: playerBStat})
      i++

    # re-scale
    @y.domain([0, d3.max(data, (d) => d.value )])

    # animate update
    @chart.selectAll("rect")
      .data(data)
      .transition()
        .duration(200)
        .attr("y", (d) => @y(d.value) )
        .attr("height", (d) => @height - @y(d.value) )
