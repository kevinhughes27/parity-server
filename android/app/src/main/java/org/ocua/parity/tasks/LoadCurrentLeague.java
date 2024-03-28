package org.ocua.parity.tasks;

import android.app.ProgressDialog;
import android.os.AsyncTask;

import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.util.EntityUtils;
import org.json.JSONObject;
import org.ocua.parity.BuildConfig;
import org.ocua.parity.Launch;

public class LoadCurrentLeague extends AsyncTask<String, String, Long> {
    private ProgressDialog dialog;
    private Launch parent;
    private JSONObject json;

    public LoadCurrentLeague(Launch parent) {
        this.parent = parent;
        this.dialog = new ProgressDialog(parent);
    }

    @Override
    protected void onPreExecute() {
        this.dialog.setMessage("Loading league");
        this.dialog.show();
    }

    @Override
    protected Long doInBackground(String... strings) {
        String leagueUrl = BuildConfig.LEAGUE_URL;
        String resString = "";

        try {
            HttpClient httpclient = new DefaultHttpClient();
            HttpGet httpget = new HttpGet(leagueUrl);
            HttpResponse response = httpclient.execute(httpget);

            resString = EntityUtils.toString(response.getEntity());
            json = new JSONObject(resString);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    @Override
    protected void onPostExecute(Long result) {
        if (dialog != null && dialog.isShowing()) {
            dialog.dismiss();
            parent.setLeague(json);
        }
    }
}
