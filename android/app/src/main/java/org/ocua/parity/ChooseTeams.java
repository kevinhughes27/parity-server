package org.ocua.parity;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.support.v4.app.ActivityCompat;
import android.support.v4.content.ContextCompat;
import android.support.v4.content.PermissionChecker;

import org.json.JSONArray;

import org.ocua.parity.model.Team;
import org.ocua.parity.model.Teams;
import org.ocua.parity.tasks.FetchRoster;

public class ChooseTeams extends Activity {
    private Context context;
    private final ChooseTeams myself = this;
    private final int permissionRequestCode = 647662;

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

        int result = ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE);
        if (result != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, permissionRequestCode);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode ==  permissionRequestCode) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // happy path
            } else {
                if (ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)) {
                    new AlertDialog.Builder(context)
                            .setTitle("Storage Permissions")
                            .setMessage("Storage is used to save game backups. Stats data could be lost without this!")
                            .setPositiveButton("Ok", new DialogInterface.OnClickListener() {
                                @Override
                                public void onClick(DialogInterface dialog, int which) {
                                    dialog.dismiss();
                                    ActivityCompat.requestPermissions(myself, new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, permissionRequestCode);
                                }
                            })
                            .show();
                }
            }
        }
    }

    public void initTeams(JSONArray response) {
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
