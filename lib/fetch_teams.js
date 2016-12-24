// @flow

import _ from 'lodash'
import request from 'request-promise'
import cheerio from 'cheerio'

const loginUrl = `http://www.ocua.ca/user/login`
const baseUrl = 'http://www.ocua.ca/zuluru'

// Parity 2015 / 16
// const leagueID = 494
// const leaguePath = `${baseUrl}/leagues/view/league:${leagueID}`

// Parity 2016 / 17
const leagueID = 940
const leaguePath = `${baseUrl}/divisions/view/division:${leagueID}`

let fetchTeams = async function () {
  if (missingCredentials()) {
    console.log('Missing Zuluru Credentials')
    console.log('Skipping Fetch')
    return
  }

  await loginToZuluru()
  let teamIds = await fetchTeamIds()
  // teamIds = ['9261'] for debugging faster
  let teams = await buildTeams(teamIds)
  return teams
}

let missingCredentials = function () {
  return !(process.env.ZULURU_USER && process.env.ZULURU_PASSWORD)
}

// send an error if missing creds
let loginToZuluru = async function () {
  let loginHtml = await request.get(loginUrl)
  let $ = cheerio.load(loginHtml)
  let formId = $('[name=form_build_id]').val()

  let form = {
    name: process.env.ZULURU_USER,
    pass: process.env.ZULURU_PASSWORD,
    form_build_id: formId,
    form_id: 'user_login',
    op: 'log_in'
  }

  return request.post(loginUrl, {form: form, simple: false, jar: true})
}

let fetchTeamIds = async function () {
  let teamsHtml = await request.get(leaguePath, {jar: true})
  let $ = cheerio.load(teamsHtml)

  let anchorTags = $('tr > td > a.trigger')

  let teamIds = _.map(anchorTags, (tag) => {
    return tag.attribs.id.replace('teams_team_', '')
  })

  return teamIds
}

let buildTeams = async function (teamIds) {
  let teams = {}

  for (let Id of teamIds) {
    let teamHtml = await request.get(teamPath(Id), {jar: true})
    let teamName = nameFromTeamPage(teamHtml)

    let teamRoster = playersFromTeamPage(teamHtml)
    let malePlayers = playersFromTeamPage(teamHtml, 'Male')
    let femalePlayers = playersFromTeamPage(teamHtml, 'Female')

    teams[teamName] = {
      players: teamRoster,
      malePlayers: malePlayers,
      femalePlayers: femalePlayers
    }
  }

  return teams
}

let teamPath = function (teamId) {
  return `${baseUrl}/teams/view/team:${teamId}`
}

let nameFromTeamPage = function (teamHtml) {
  let $ = cheerio.load(teamHtml)
  return $('div.teams > h2').text()
}

let playersFromTeamPage = function (teamHtml, gender = null) {
  let $ = cheerio.load(teamHtml)

  let tableRows = $('table.list > tr')
  tableRows = tableRows.slice(1, tableRows.length - 1)

  // optional gender filter
  if (gender) {
    tableRows = _.filter(tableRows, (row) => {
      let genderCell = $(row).find('td').eq(3)
      return genderCell.text() === gender
    })
  }

  let playerNames = _.map(tableRows, (row) => {
    let nameCell = $(row).find('td').eq(0).find('a')
    return nameCell.text()
  })

  return playerNames
}

module.exports = fetchTeams
