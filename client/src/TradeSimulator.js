import _ from 'lodash'
import React, { Component } from 'react'
import Stats from './Stats'
import Trades from './Trades'
import SalaryBarGraph from './SalaryBarGraph'

type Props = {
  week: number,
  stats: Stats
}

export default class TradeSimulator extends Component {
  props: Props

  state: {
    week: number,
    stats: Stats
  }

  constructor (props: Props) {
    super(props)

    this.state = {
      week: this.props.week,
      stats: this.props.stats
    }
  }

  componentDidMount () {
    this.renderD3()
  }

  componentDidUpdate () {
    this.updateD3()
  }

  renderD3 () {
    let stats = this.state.stats

    this.barChart = new SalaryBarGraph()
    this.barChart.init(this.barChartNode)
    this.barChart.create(stats.teamNames(), stats, stats.salaryCap(), stats.salaryFloor())
  }

  updateD3 () {
    this.barChart.update()
  }

  render () {
    return (
      <div>
        <div className="row" style={{paddingTop: 20}}>
          <Trades applyTrade={ (trade) => this.applyTrade(trade) }/>
        </div>

        <div className="row" style={{paddingTop: 20}}>
          <div id="chart" ref={(node) => { this.barChartNode = node }}></div>
        </div>
      </div>
    )
  }

  applyTrade (trade) {

  }
}
