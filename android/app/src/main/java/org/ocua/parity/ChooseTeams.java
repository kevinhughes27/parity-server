package org.ocua.parity;

import android.app.Activity;
import android.content.Intent;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.os.Bundle;

import org.json.JSONException;
import org.json.JSONObject;
import org.ocua.parity.model.League;
import org.ocua.parity.model.Matchup;
import org.ocua.parity.model.Matchups;
import org.ocua.parity.model.Team;
import org.ocua.parity.model.Teams;
import org.ocua.parity.tasks.LoadSchedule;

import java.util.ArrayList;

public class ChooseTeams extends Activity {
    private final ChooseTeams myself = this;

    private League league;
    private Teams teams;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_choose_teams);

        loadIntent();
    }

    private void loadIntent() {
        Intent intent = this.getIntent();
        league = (League) intent.getSerializableExtra("league");
    }

    @Override
    protected void onStart() {
        super.onStart();
        teams = new Teams();
        new LoadSchedule(myself, league).execute();
    }

    public void loadSchedule(JSONObject response) {
        try {
            if (response == null) {
                new AlertDialog.Builder(this)
                        .setTitle("Error")
                        .setMessage("Failed to load schedule. Please try again.")
                        .setPositiveButton("Ok", new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialogInterface, int i) {
                                new LoadSchedule(myself, league).execute();
                            }
                        }).setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialogInterface, int i) {
                                myself.finish();
                            }
                        }).show();

                return;
            }

            teams.load(response.getJSONArray("teams"));
            final ArrayList<Matchup> games = Matchups.load(response.getJSONArray("matchups"));

            if (games.size() < 1){
                openDialog(1);
                return;
            }

            final int week = games.get(0).week;

            String[] matchups = Matchups.matchupList(games, teams.teamNames());

            new AlertDialog.Builder(myself)
                    .setTitle("Choose Game")
                    .setItems(matchups, new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface dialog, int which) {
                            if (which >= games.size()) {
                                openDialog(week);
                                return;
                            }

                            Matchup game = games.get(which);

                            Team homeTeam = teams.findTeam(game.homeTeamId);
                            Team awayTeam = teams.findTeam(game.awayTeamId);

                            editRosters(week, homeTeam, awayTeam);
                        }
                    }).show();
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    public void openDialog(final int week) {
        new AlertDialog.Builder(myself)
                .setTitle("Choose Home Team")
                .setItems(teams.getNames(), new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int which) {
                        final Team homeTeam = teams.getTeam(which);
                        new AlertDialog.Builder(myself)
                                .setTitle("Choose Away Team")
                                .setItems(teams.getNames(), new DialogInterface.OnClickListener() {
                                    public void onClick(DialogInterface dialog, int which) {
                                        Team awayTeam = teams.getTeam(which);
                                        editRosters(week, homeTeam, awayTeam);
                                    }
                                }).show();
                    }
                }).show();
    }

    private void editRosters(int week, Team homeTeam, Team awayTeam) {
        Intent intent = new Intent(myself, EditRosters.class);
        Bundle bundle = new Bundle();
        bundle.putSerializable("league", league);
        bundle.putSerializable("teams", teams);

        Bookkeeper bookkeeper = new Bookkeeper();
        bookkeeper.startGame(league, week, homeTeam, awayTeam);
        bundle.putSerializable("bookkeeper", bookkeeper);

        intent.putExtras(bundle);
        intent.setFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION);
        startActivity(intent);
    }
}
