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

import org.json.JSONObject;
import org.ocua.parity.BuildConfig;
import org.ocua.parity.ChooseTeams;
import org.ocua.parity.model.League;

public class LoadSchedule extends AsyncTask<String, String, Long> {
    private ProgressDialog dialog;
    private ChooseTeams parent;
    private JSONObject json;

    public LoadSchedule(ChooseTeams parent) {
        this.parent = parent;
        this.dialog = new ProgressDialog(parent);
    }

    @Override
    protected void onPreExecute() {
        this.dialog.setMessage("Loading schedule");
        this.dialog.show();
    }

    @Override
    protected Long doInBackground(String... strings) {
        String scheduleUrl = String.format(BuildConfig.SCHEDULE_URL, League.id);
        String resString = "";

        try {
            HttpClient httpclient = new DefaultHttpClient();
            HttpGet httpget = new HttpGet(scheduleUrl);
            HttpResponse response = httpclient.execute(httpget);

            resString = EntityUtils.toString(response.getEntity());
            json = new JSONObject(resString);
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
            parent.loadSchedule(json);
        }
    }
}
