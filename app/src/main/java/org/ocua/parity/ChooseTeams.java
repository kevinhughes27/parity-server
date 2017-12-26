package org.ocua.parity;

import android.app.Activity;
import android.content.Intent;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.os.Bundle;

import org.json.JSONObject;

import org.ocua.parity.model.Team;
import org.ocua.parity.model.Teams;
import org.ocua.parity.tasks.FetchRoster;

public class ChooseTeams extends Activity {
    private Context context;
    private final ChooseTeams myself = this;

    private Teams teams;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_choose_teams);
        context = this;
    }

    @Override
    protected void onStart() {
        super.onStart();
        teams = new Teams();
        new FetchRoster(this, myself).execute();
    }

    public void initTeams(JSONObject response) {
        teams.load(response);
    }

    public void openDialog() {
        new AlertDialog.Builder(context)
                .setTitle("Choose Home Team")
                .setItems(teams.getNames(), new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int which) {
                        final Team homeTeam = teams.getTeam(which);
                        new AlertDialog.Builder(context)
                                .setTitle("Choose Away Team")
                                .setItems(teams.getNames(), new DialogInterface.OnClickListener() {
                                    public void onClick(DialogInterface dialog, int which) {
                                        Team awayTeam = teams.getTeam(which);
                                        editRosters(homeTeam, awayTeam);
                                    }
                                }).show();
                    }
                }).show();
    }

    private void editRosters(Team homeTeam, Team awayTeam) {
        Intent intent = new Intent(context, EditRosters.class);
        Bundle bundle = new Bundle();
        bundle.putSerializable("teams", teams);

        Bookkeeper bookkeeper = new Bookkeeper();
        bookkeeper.startGame(homeTeam, awayTeam);
        bundle.putSerializable("bookkeeper", bookkeeper);

        intent.putExtras(bundle);
        intent.setFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION);
        startActivity(intent);
    }
}
