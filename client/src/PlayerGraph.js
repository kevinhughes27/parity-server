import d3 from 'd3'

export default class PlayerGraph {

  init (node) {
    this.margin = {top: 60, right: 30, bottom: 30, left: 30}
    this.width = node.clientWidth - this.margin.left - this.margin.right

    if (this._isSmallScreen()) {
      this.margin.bottom = 60
    }

    this.height = 500 - this.margin.top - this.margin.bottom

    this.x0 = d3.scale.ordinal()
        .rangeRoundBands([0, this.width], 0.1)

    this.x1 = d3.scale.ordinal()

    this.y = d3.scale.linear()
        .range([this.height, 0])

    this.klass = d3.scale.ordinal()
        .range(['playerA', 'playerB'])

    this.xAxis = d3.svg.axis()
        .scale(this.x0)
        .orient('bottom')

    this.yAxis = d3.svg.axis()
        .scale(this.y)
        .orient('left')

    this.chart = d3.select(node).append('svg')
        .attr('width', this.width + this.margin.left + this.margin.right)
        .attr('height', this.height + this.margin.top + this.margin.bottom)
      .append('g')
        .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')')
  }

  _isSmallScreen () {
    return this.width < 500
  }

  create (playerA, playerB, statNames) {
    let data = []
    for (let stat of statNames) {
      let playerAStat = playerA[stat] || 0
      let playerBStat = playerB[stat] || 0

      if (stat === 'Salary' || stat === 'SalaryDelta') {
        playerAStat /= 50000
        playerBStat /= 50000
      }

      data.push({
        name: stat,
        playerA: playerAStat,
        playerB: playerBStat
      })
    }

    // scale
    this.y.domain([0, d3.max(data, (d) => Math.max(d.playerA, d.playerB))])
    this.x0.domain(data.map((d) => d.name))
    this.x1.domain(['playerA', 'playerB']).rangeRoundBands([0, this.x0.rangeBand()])

    // create the x axis
    if (this._isSmallScreen()) {
      this.chart.append('g')
          .attr('class', 'x axis')
          .attr('transform', 'translate(0,' + this.height + ')')
          .call(this.xAxis)
          .selectAll('text')
          .style('text-anchor', 'end')
          .attr('transform', 'rotate(-65)')
    } else {
      this.chart.append('g')
          .attr('class', 'x axis')
          .attr('transform', 'translate(0,' + this.height + ')')
          .call(this.xAxis)
    }

    // create the y axis
    this.chart.append('g')
        .attr('class', 'y axis')
        .call(this.yAxis)

    // tooltip
    // this.tip = d3.tip()
    //     .attr('class', 'd3-tip')
    //     .offset([-10, 0])
    //     .html((d) => {
    //       let ud = this.untransformPlayerData(d)
    //       return `<span class='${d.player}'> ${ud.name}: ${ud.value}</span>`
    //     })
    //
    // this.chart.call(this.tip)

    // create the rectangles for each stat
    let stats = this.chart.selectAll('.stat')
      .data(data)
      .enter().append('g')
        .attr('class', 'g')
        .attr('transform', (d) => 'translate(' + this.x0(d.name) + ',0)')

    // create the rectangles for each player in each stat
    stats.selectAll('rect')
        .data((d) => [{player: 'playerA', name: d.name, value: d.playerA}, {player: 'playerB', name: d.name, value: d.playerB}])
      .enter().append('rect')
        .attr('class', (d) => this.klass(d.player))
        .attr('width', this.x1.rangeBand())
        .attr('x', (d) => this.x1(d.player))
        .attr('y', this.height)
        .attr('height', 0)
        // .on('mouseover', this.tip.show)
        // .on('mouseout', this.tip.hide)
      .transition()
        .duration(200)
        .attr('y', (d) => this.y(d.value))
        .attr('height', (d) => this.height - this.y(d.value))
  }

  update (playerA, playerB, statNames) {
    let data = []
    for (let stat of statNames) {
      let playerAStat = playerA[stat] || 0
      let playerBStat = playerB[stat] || 0

      if (stat === 'Salary' || stat === 'SalaryDelta') {
        playerAStat /= 50000
        playerBStat /= 50000
      }

      data.push({name: stat, player: 'playerA', value: playerAStat})
      data.push({name: stat, player: 'playerB', value: playerBStat})
    }

    // re-scale
    this.y.domain([0, d3.max(data, (d) => d.value)])

    // animate update
    this.chart.selectAll('rect')
      .data(data)
      .transition()
        .duration(200)
        .attr('y', (d) => this.y(d.value))
        .attr('height', (d) => this.height - this.y(d.value))
  }
}
