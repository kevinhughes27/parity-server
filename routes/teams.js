// @flow

import express from 'express'
let router = express.Router()

import _ from 'lodash'
import request from 'request-promise'
import cheerio from 'cheerio'

const loginUrl = `http://www.ocua.ca/user/login`
const baseUrl = 'http://www.ocua.ca/zuluru'
const leagueID = 940
const leaguePath = `${baseUrl}/divisions/view/division:${leagueID}`

/**
 * @api {get} /teams List of teams with current players
 * @apiName GetTeams
 * @apiGroup Teams
 *
 * @apiSuccess (200)
 */
router.get('/teams', async function (req, res) {
  await loginToZuluru()
  let teamIds = await fetchTeamIds()
  let teams = await buildTeams(teamIds)
  res.json(teams)
})

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
    let teamRoster = rosterFromTeamPage(teamHtml)

    teams[teamName] = teamRoster
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

let rosterFromTeamPage = function (teamHtml) {
  let $ = cheerio.load(teamHtml)
  let anchorTags = $('tr > td > a')

  let playerNames = _.map(anchorTags, (tag) => {
    return $(tag).text()
  })

  return playerNames
}

module.exports = router
