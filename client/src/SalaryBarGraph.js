import _ from 'lodash'
import d3 from 'd3'

const SALARY_CAP = 9999999999999

export default class SalaryBarGraph {

  init (node) {
    this.margin = {top: 20, right: 20, bottom: 80, left: 40}
    this.width = node.clientWidth - this.margin.left - this.margin.right
    this.height = 500 - this.margin.top - this.margin.bottom

    this.x = d3.scale.ordinal()
        .rangeRoundBands([0, this.width], 0.1)

    this.y = d3.scale.linear()
        .rangeRound([this.height, 0])

    this.xAxis = d3.svg.axis()
        .scale(this.x)
        .orient('bottom')

    this.yAxis = d3.svg.axis()
        .scale(this.y)
        .orient('left')
        .tickFormat(d3.format('.2s'))

    this.chart = d3.select(node).append('svg')
        .attr('width', this.width + this.margin.left + this.margin.right)
        .attr('height', this.height + this.margin.top + this.margin.bottom)
      .append('g')
        .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')')
  }

  create (teams, stats) {
    let data = []
    for (let team of teams) {
      let players = this._playersFromTeam(team, stats)

      let salaries = []
      let y0 = 0
      players.forEach((player, index) => {
        salaries.push({name: player.name, salary: player.salary, pos: index, y0: y0, y1: y0 += player.salary})
      })

      data.push({team: team, salaries: salaries, total: salaries[salaries.length - 1].y1})
    }

    let avgSalary = _.sum(_.map(data, (d) => {
      return _.sum(_.map(d.salaries, (player) => player.salary))
    })) / data.length
    this.salaryCap = avgSalary + 0.02 * avgSalary
    this.salaryFloor = avgSalary - 0.02 * avgSalary

    this.x.domain(data.map((d) => d.team))
    this.y.domain([0, d3.max(data, (d) => d.total)])

    this.chart.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + this.height + ')')
      .call(this.xAxis)
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('transform', 'rotate(-20)')

    this.chart.append('g')
      .attr('class', 'y axis')
      .call(this.yAxis)

    // salary cap line
    this.chart.append('svg:line')
      .attr('x1', 0)
      .attr('x2', this.width - 20)
      .attr('y1', this.y(this.salaryCap))
      .attr('y2', this.y(this.salaryCap))
      .style('stroke', '#000')
      .style('fill', 'none')
      .style('stroke-width', 1)
      .style('shape-rendering', 'crispEdges')

    // salary cap line
    this.chart.append('svg:line')
      .attr('x1', 0)
      .attr('x2', this.width - 20)
      .attr('y1', this.y(this.salaryFloor))
      .attr('y2', this.y(this.salaryFloor))
      .style('stroke', '#238B45')
      .style('fill', 'none')
      .style('stroke-width', 1)
      .style('shape-rendering', 'crispEdges')

    // tooltip
    // this.tip = d3.tip()
    //   .attr('class', 'd3-tip').offset([-10, 0])
    //   .html((d) =>
    //     '<p>#{d.name}</p> <p>#{salaryString(d.salary)}</p>'
    //   )
    //
    // this.chart.call(this.tip)

    let team = this.chart.selectAll('.team')
        .data(data)
      .enter()
        .append('g')
        .attr('class', 'g')
        .attr('transform', (d) => 'translate(' + this.x(d.team) + ',0)')

    team.selectAll('rect')
        .data((d) => d.salaries)
      .enter()
        .append('rect')
        .attr('transform', (d) => 'translate(' + this.x.rangeBand() * 0.25 + ',0)')
        .attr('width', this.x.rangeBand() * 0.5)
        .attr('class', (d) => {
          if (d.y1 > this.salaryCap) {
            return 'yellow-11'
          } else {
            return 'green-' + d.pos
          }
        })
        .attr('y', this.height)
        .attr('height', 0)
        // .on('mouseover', this.tip.show)
        // .on('mouseout', this.tip.hide)
      .transition(300)
        .attr('y', (d) => this.y(d.y1))
        .attr('height', (d) => this.y(d.y0) - this.y(d.y1))
  }

  _playersFromTeam (team, stats) {
    let players = []
    _.mapKeys(stats, (playerStats, playerName) => {
      if (playerStats['Team'] === team) {
        players.push({name: playerName, salary: playerStats['Salary']})
      }
    })

    players = _.sortBy(players, (p) => p.salary)

    return players
  }

  update (data) {
    let flatData = []
    data.forEach((d) => {
      flatData = flatData.concat(d.salaries)
    })

    this.chart.selectAll('rect')
      .data(flatData)
      .transition(300)
        .attr('y', (d) => this.y(d.y1))
        .attr('height', (d) => this.y(d.y0) - this.y(d.y1))
        .attr('class', (d) => {
          if (d.y1 > this.salaryCap) {
            return 'yellow-11'
          } else {
            return 'green-' + d.pos
          }
        })
  }
}
