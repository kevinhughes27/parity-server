package org.ocua.parity.tasks;

import android.app.ProgressDialog;
import android.content.Context;
import android.os.AsyncTask;
import android.os.Environment;
import android.support.annotation.RequiresPermission;

import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.util.EntityUtils;
import org.json.JSONArray;

import org.ocua.parity.BuildConfig;
import org.ocua.parity.ChooseTeams;
import org.ocua.parity.TeamData;
import org.ocua.parity.model.Gender;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.Writer;

public class FetchRoster extends AsyncTask<String, String, Long> {

    public Context context;
    private ProgressDialog dialog;
    private ChooseTeams parent;
    private JSONArray json;

    public FetchRoster(Context context, ChooseTeams parent) {
        this.context = context;
        this.parent = parent;
        this.dialog = new ProgressDialog(context);
    }

    @Override
    protected void onPreExecute() {
        this.dialog.setMessage("Fetching latest rosters");
        this.dialog.show();
    }

    @Override
    protected Long doInBackground(String... strings) {
        if (BuildConfig.FLAVOR.equalsIgnoreCase("team")) {
            ReadTeams();
            return null;
        }

        String strRosterUrl = BuildConfig.TEAMS_URL;
        String resString = "";

        try {
            HttpClient httpclient = new DefaultHttpClient();
            HttpGet httpget = new HttpGet(strRosterUrl);
            HttpResponse response = httpclient.execute(httpget);

            resString = EntityUtils.toString(response.getEntity());
            json = new JSONArray(resString.toString());
        } catch (Exception e) {
            this.dialog.setMessage(resString);
            e.printStackTrace();
        }
        return null;
    }

    @Override
    protected void onPostExecute(Long result) {
        if (dialog != null && dialog.isShowing()) {
            dialog.dismiss();
            if (json == null) {

            } else {
                parent.initTeams(json);
            }
            parent.openDialog();
        }
    }

    private void ReadTeams() {
        try {
            // Per team
            File pathToExternalStorage = Environment.getExternalStorageDirectory();
            File teamsDirectory = new File(pathToExternalStorage, BuildConfig.APP_FOLDER_NAME + File.separator + "Teams");

            teamsDirectory.mkdirs();

            File[] teamFiles = teamsDirectory.listFiles();
            if (teamFiles.length == 0) {
                File newTeam = new File(teamsDirectory, "Stella.txt");
                TeamData stella = TeamData.Stella();
                try (BufferedWriter writer = new BufferedWriter(new FileWriter(newTeam))) {
                    for (String player : stella.players) {
                        writer.write(player);
                        writer.newLine();
                    }
                }
            }


            int teamCount = 0;
            for (File teamFile : teamFiles) {
                try (BufferedReader reader = new BufferedReader(new FileReader(teamFile))) {
                    String teamName = teamFile.getName().replace(".txt", "");
                    TeamData team = new TeamData(teamName, Gender.Female);

                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (!line.isEmpty()) {
                            team.addPlayer(line);
                        }
                    }

                    parent.createTeam(team);
                    teamCount++;
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            if (teamCount == 0) {
                parent.createTeam(TeamData.Stella());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
