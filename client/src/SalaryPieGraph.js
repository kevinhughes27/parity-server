import d3 from 'd3'

export default class SalaryPieGraph {

  init (node) {
    this.width = node.clientWidth
    this.height = 480
    this.radius = Math.min(this.width, this.height) / 2

    this.arc = d3.svg.arc()
        .outerRadius(this.radius - 10)
        .innerRadius(0)

    this.pie = d3.layout.pie()
        .sort(null)
        .value((d) => d.salary)

    this.chart = d3.select(node).append('svg')
        .attr('width', this.width)
        .attr('height', this.height)
      .append('g')
        .attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')')
  }

  create (players) {
    let data = []
    players.forEach((player, index) => {
      data.push({
        name: player.name,
        pos: index,
        salary: player.salary
      })
    })

    let g = this.chart.selectAll('.arc')
        .data(this.pie(data))
      .enter().append('g')
        .attr('class', 'arc')

    g.append('path')
        .attr('d', this.arc)
        .attr('class', (d) => 'green-' + d.data.pos)
        .each(function (d) { this._current = d }) // store the initial angles

    g.append('text')
      .attr('class', 'axis')
      .attr('transform', (d) => {
        let c = this.arc.centroid(d)
        let x = c[0]
        let y = c[1]
        let h = Math.sqrt(x * x + y * y)
        let labelr = this.radius - 60
        let command = 'translate(' + (x / h * labelr) + ',' + (y / h * labelr) + ')'
        return command
      })
      .attr('dy', '.35em').style('text-anchor', 'middle')
      .text((d) => d.data.name)
  }

  update (players) {
    let data = []
    players.forEach((player, index) => {
      data.push({
        name: player.name,
        pos: index,
        salary: player.salary
      })
    })

    this.chart.selectAll('text')
      .data(this.pie(data))
      .transition()
        .duration(10)
        .attr('transform', (d) => {
          let c = this.arc.centroid(d)
          let x = c[0]
          let y = c[1]
          let h = Math.sqrt(x * x + y * y)
          let labelr = this.radius - 60
          let command = 'translate(' + (x / h * labelr) + ',' + (y / h * labelr) + ')'
          return command
        })
        .text((d) => d.data.name)

    this.chart.selectAll('path')
      .data(this.pie(data))
      .transition()
      .duration(10)
  }
}
