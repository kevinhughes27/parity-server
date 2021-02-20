package org.ocua.parity;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.support.v4.app.ActivityCompat;
import android.support.v4.content.ContextCompat;

import org.json.JSONException;
import org.json.JSONObject;

import org.ocua.parity.model.League;
import org.ocua.parity.tasks.LoadCurrentLeague;

public class Launch extends Activity {
    private final Launch myself = this;
    private final int permissionRequestCode = 647662;

    private League league;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_choose_teams);
    }

    @Override
    protected void onStart() {
        super.onStart();
        league = new League();
        new LoadCurrentLeague(myself).execute();

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
                    new AlertDialog.Builder(myself)
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

    public void setLeague(JSONObject response) {
        try {
            if (response == null) {
                new AlertDialog.Builder(this)
                        .setTitle("Error")
                        .setMessage("Failed to load league. Please try again.")
                        .setPositiveButton("Ok", new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialogInterface, int i) {
                                new LoadCurrentLeague(myself).execute();
                            }
                        }).setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialogInterface, int i) {
                                myself.finish();
                            }
                        }).show();

                return;
            }

            league.load(response.getJSONObject("league"));
            chooseTeams(league);
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    private void chooseTeams(League league) {
        Intent intent = new Intent(myself, ChooseTeams.class);
        Bundle bundle = new Bundle();
        bundle.putSerializable("league", league);

        intent.putExtras(bundle);
        intent.setFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION);
        startActivity(intent);
    }
}
