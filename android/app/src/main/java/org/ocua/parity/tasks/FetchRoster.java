package org.ocua.parity.tasks;

import android.app.ProgressDialog;
import android.content.Context;
import android.os.AsyncTask;

import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.util.EntityUtils;
import org.json.JSONArray;

import org.ocua.parity.BuildConfig;
import org.ocua.parity.ChooseTeams;

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
            parent.initTeams(json);
            parent.openDialog();
        }
    }
}
