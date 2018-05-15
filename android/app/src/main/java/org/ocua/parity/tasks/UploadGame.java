package org.ocua.parity.tasks;

import android.content.Intent;
import android.os.AsyncTask;
import android.os.Build;
import android.os.Environment;
import android.view.View;

import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.util.EntityUtils;
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
            File backupDirectory = new File(pathToExternalStorage, BuildConfig.APP_FOLDER_NAME);

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

    private boolean saveGameFile(String content) {
        try {
            File pathToExternalStorage = Environment.getExternalStorageDirectory();
            String datestamp = new SimpleDateFormat("yyyy-MM-dd").format(new Date());
            File statsDirectory = new File(pathToExternalStorage, BuildConfig.APP_FOLDER_NAME + File.separator + "Stats" + File.separator + datestamp);

            String timestamp = new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss").format(new Date());

            String fileName = "Stats" + timestamp + ".csv";

            statsDirectory.mkdirs();

            File file = new File(statsDirectory, fileName);
            FileOutputStream fos = new FileOutputStream(file);
            fos.write(content.getBytes());
            fos.close();
            return true;
        } catch (Exception e) {
            error = true;
            e.printStackTrace();
            return false;
        }
    }

    private boolean upload(String json) {
        String url = BuildConfig.UPLOAD_URL;

        try {
            HttpClient httpclient = new DefaultHttpClient();
            HttpPost httpPost = new HttpPost(url);
            StringEntity se = new StringEntity(json);
            httpPost.setEntity(se);
            httpPost.setHeader("Accept", "application/json");
            httpPost.setHeader("Content-type", "application/json");
            HttpResponse httpResponse = httpclient.execute(httpPost);

            if (BuildConfig.SAVE_CSV) {
                String csvResponse = EntityUtils.toString(httpResponse.getEntity());
                return saveGameFile(csvResponse);
            }

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
        bookkeeper = null;

        Intent intent = new Intent(parent, ChooseTeams.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        parent.startActivity(intent);
    }
}
