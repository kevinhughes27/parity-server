// @flow

import 'whatwg-fetch'
import Stats from './Stats'

class Loader {
  async fetchWeeks () {
    let response = await fetch('/weeks')
    return await response.json()
  }

  async fetchStats (weekNum: number) {
    let url = `/weeks/${weekNum}`
    if (weekNum === 0) url = '/stats'

    let response = await fetch(url)
    let json = await response.json()
    let data = json.stats || {}
    return new Stats(data)
  }
}

let loader = new Loader()
module.exports = loader
