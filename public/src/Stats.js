import $ from 'jquery';
import _ from 'lodash';
import React, { Component } from 'react';
import Griddle from 'griddle-react';
import Loading from './Loading';

const columns = [
  'Name',
  'Team',
  'Goals',
  'Assists',
  '2nd Assist',
  'D-Blocks',
  'Catches',
  'Completions',
  'Throwaways',
  'Drops',
  'Salary'
];

export default class Stats extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      week: this.props.week,
      stats: null
    };
  }

  componentWillMount() {
    this._fetchWeek(this.state.week);
  }

  componentWillReceiveProps(nextProps) {
    let week = nextProps.week;

    this.setState({
      loading: true,
      week: week,
      stats: null
    });

    this._fetchWeek(week);
  }

  _fetchWeek(num) {
    $.get(`/weeks/${num}`, (result) => {
      let stats = result? result.stats : {};
      this.setState({ stats: stats, loading: false });
    });
  }

  render() {
    if(this.state.loading) return (<Loading />);

    let stats = this.state.stats;
    let statsArray = _.map(_.keys(stats), (k) => {
      return { Name: k, ...stats[k] }
    });

    return (
      <Griddle
        results={statsArray}
        resultsPerPage={statsArray.length}
        tableClassName='highlight responsive-table'
        columns={columns}
        showFilter={true}
        showPager={false}
        useGriddleStyles={false}
        filterPlaceholderText='Search players ...'
      />
    );
  }
}
