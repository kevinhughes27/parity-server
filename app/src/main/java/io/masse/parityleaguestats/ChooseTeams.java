package io.masse.parityleaguestats;

import android.app.Activity;
import android.content.Intent;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.os.Bundle;

import org.json.JSONObject;

import io.masse.parityleaguestats.model.Team;
import io.masse.parityleaguestats.model.Teams;
import io.masse.parityleaguestats.tasks.fetchRoster;

public class ChooseTeams extends Activity {
    private Context context;
    private final ChooseTeams myself = this;

    private Teams teams;
    private Team leftTeam;
    private Team rightTeam;

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
        new fetchRoster(this, myself).execute();
    }

    public void initTeams(JSONObject response) {
        teams.load(response);
    }

    public void openDialog() {
        new AlertDialog.Builder(context)
                .setTitle("Choose Home Team")
                .setItems(teams.getNames(), new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int which) {
                        leftTeam = teams.getTeam(which);
                        new AlertDialog.Builder(context)
                                .setTitle("Choose Away Team")
                                .setItems(teams.getNames(), new DialogInterface.OnClickListener() {
                                    public void onClick(DialogInterface dialog, int which) {
                                        rightTeam = teams.getTeam(which);
                                        Intent intent = new Intent(context, EditPlayers.class);
                                        Bundle bundle = new Bundle();
                                        bundle.putSerializable("teams", teams);
                                        bundle.putSerializable("leftTeam", leftTeam);
                                        bundle.putSerializable("rightTeam", rightTeam);
                                        intent.putExtras(bundle);
                                        intent.setFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION);
                                        startActivity(intent);
                                    }
                                }).show();
                    }
                }).show();
    }
}
