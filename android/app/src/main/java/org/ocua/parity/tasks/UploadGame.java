package org.ocua.parity.tasks;

import android.content.Intent;
import android.os.AsyncTask;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;

import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.DefaultHttpClient;
import org.ocua.parity.Bookkeeper;
import org.ocua.parity.ChooseTeams;
import org.ocua.parity.SubmitGame;

import java.io.File;
import java.io.FileOutputStream;
import java.lang.ref.WeakReference;
import java.text.SimpleDateFormat;
import java.util.Date;

import org.ocua.parity.BuildConfig;

public class UploadGame extends AsyncTask<String, String, String> {
    private WeakReference<SubmitGame> parentRef;
    private Bookkeeper bookkeeper;

    private SubmitGame parent;
    private boolean error;

    public UploadGame(Bookkeeper bookkeeper, SubmitGame parent) {
        this.bookkeeper = bookkeeper;
        this.parentRef = new WeakReference(parent);
    }

    @Override
    protected void onPreExecute() {
        error = false;
        parent = parentRef.get();

        if (parent != null) {
            parent.progress_bar.setProgress(0);
            parent.progress_area.setVisibility(View.VISIBLE);
        }

        super.onPreExecute();
    }

    @Override
    protected void onProgressUpdate(String... progress) {
        parent = parentRef.get();

        if (parent != null) {
            parent.progress_bar.setProgress(Integer.parseInt(progress[0]));
        }
    }

    @Override
    protected String doInBackground(String... params) {
        publishProgress("0");
        String json = bookkeeper.serialize().toString();

        publishProgress("33");
        saveBackup(json);

        publishProgress("66");
        upload(json);

        publishProgress("100");
        return null;
    }

    private void saveBackup(String json) {
        try {
            File pathToExternalStorage = Environment.getExternalStorageDirectory();
            File backupDirectory = new File(pathToExternalStorage, "ParityLeagueStats");

            String timestamp = new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss").format(new Date());

            String fileName = "ParityBackup_" + timestamp + ".json";

            backupDirectory.mkdir();

            File file = new File(backupDirectory, fileName);
            FileOutputStream fos = new FileOutputStream(file);
            fos.write(json.getBytes());
            fos.close();
        } catch (Exception e) {
            error = true;
            e.printStackTrace();
        }
    }

    private boolean upload(String json) {
        String url = BuildConfig.UPLOAD_URL;

        try {
            HttpClient httpclient = new DefaultHttpClient();
            HttpPost httpPost = new HttpPost(url);
            StringEntity se = new StringEntity(json, "UTF-8");
            httpPost.setEntity(se);
            httpPost.setHeader("Accept", "application/json");
            httpPost.setHeader("Content-type", "application/json");
            HttpResponse httpResponse = httpclient.execute(httpPost);
            return httpResponse.getStatusLine().getStatusCode() == 201;
        } catch (Exception e) {
            error = true;
            e.printStackTrace();
        }
        return false;
    }

    @Override
    protected void onPostExecute(String result) {
        parent = parentRef.get();

        if (parent != null) {
            parent.progress_area.setVisibility(View.INVISIBLE);
            parent.progress_bar.setProgress(0);

            if (error) {
                retry();
            } else {
                resetApp();
            }
        }

        super.onPostExecute(result);
    }

    private void retry() {
        parent.openDialog("Error. Please try again");
    }

    private void resetApp() {
        Intent intent = new Intent(parent, ChooseTeams.class);
        Bundle bundle = new Bundle();
        bundle.putSerializable("league", bookkeeper.league);

        intent.putExtras(bundle);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        parent.startActivity(intent);
    }
}
